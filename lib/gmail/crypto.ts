import crypto from "node:crypto";
import { gmailConfig } from "./config";

const deriveKey = (secret: string): Buffer =>
  crypto.createHash("sha256").update(secret, "utf8").digest();

const tokenKey = deriveKey(gmailConfig.tokenEncryptionKey);
const stateKey = deriveKey(gmailConfig.stateSecret);

export function encryptToken(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", tokenKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptToken(payload: string): string {
  const [ivRaw, tagRaw, encryptedRaw] = payload.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Invalid encrypted token format");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    tokenKey,
    Buffer.from(ivRaw, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function signState(state: string): string {
  return crypto
    .createHmac("sha256", stateKey)
    .update(state, "utf8")
    .digest("base64url");
}

export function verifyState(state: string, signature: string): boolean {
  const expected = signState(state);
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);

  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
