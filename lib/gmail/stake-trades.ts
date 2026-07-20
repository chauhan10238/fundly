import crypto from "node:crypto";
import { google, gmail_v1 } from "googleapis";
import { gmailConfig } from "./config";
import { createAuthenticatedOAuthClient } from "./oauth";

export type StakeTradeStatus = "Ready" | "Needs Review";

export type ParsedStakeTrade = {
  messageId: string;
  threadId: string | null;
  subject: string;
  emailDate: string;
  ticker: string | null;
  side: "Buy" | "Sell" | null;
  quantity: number | null;
  price: number | null;
  currency: string;
  brokerageFee: number;
  fxFee: number;
  tradeDate: string;
  orderType: string | null;
  status: StakeTradeStatus;
  fingerprint: string;
  preview: string;
  issues: string[];
};

function decodeBase64Url(value?: string | null): string {
  if (!value) return "";
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return "";
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/tr>|<\/li>|<\/h\d>/gi, "\n")
    .replace(/<\/td>|<\/th>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function collectBodies(part?: gmail_v1.Schema$MessagePart): {
  plain: string[];
  html: string[];
} {
  const result = { plain: [] as string[], html: [] as string[] };
  if (!part) return result;

  const decoded = decodeBase64Url(part.body?.data);
  if (decoded) {
    if (part.mimeType === "text/plain") result.plain.push(decoded);
    if (part.mimeType === "text/html") result.html.push(decoded);
  }

  for (const child of part.parts ?? []) {
    const nested = collectBodies(child);
    result.plain.push(...nested.plain);
    result.html.push(...nested.html);
  }

  return result;
}

function header(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string,
): string {
  return (
    headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())
      ?.value ?? ""
  );
}

function cleanText(value: string): string {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function numberFrom(raw?: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw.replace(/,/g, ""));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function parseTicker(subject: string, text: string): string | null {
  const raw =
    firstMatch(subject, [
      /^\s*([A-Z][A-Z0-9.\-]{0,9})\s+trade confirmation/i,
      /^\s*([A-Z][A-Z0-9.\-]{0,9})\s+order/i,
    ]) ??
    firstMatch(text, [
      /\bTicker\s*[:|]\s*([A-Z][A-Z0-9.\-]{0,9})\b/i,
      /\bSymbol\s*[:|]\s*([A-Z][A-Z0-9.\-]{0,9})\b/i,
      /\bYour\s+([A-Z][A-Z0-9.\-]{0,9})\s+order\s+has\s+been\s+filled\b/i,
    ]);

  return raw?.toUpperCase() ?? null;
}

function parseSide(text: string): "Buy" | "Sell" | null {
  const raw = firstMatch(text, [
    /\b(?:MARKET|LIMIT|STOP|STOP LIMIT|TRAILING STOP)?\s*(BUY|SELL)\s+order\b/i,
    /\bSide\s*[:|]\s*(BUY|SELL)\b/i,
    /\bAction\s*[:|]\s*(BUY|SELL)\b/i,
    /\b(BUY|SELL)\s+(?:filled|executed)\b/i,
  ]);

  if (!raw) return null;
  return raw.toUpperCase() === "BUY" ? "Buy" : "Sell";
}

function parseQuantity(text: string): number | null {
  const raw = firstMatch(text, [
    /\b(?:Filled quantity|Quantity filled|Quantity|Qty|Shares)\s*[:|]\s*([\d,.]+)\b/i,
    /\b([\d,.]+)\s+shares?\s+(?:filled|executed|at|@)\b/i,
    /\bfilled\s+([\d,.]+)\s+shares?\b/i,
  ]);
  return numberFrom(raw);
}

function parsePrice(text: string): number | null {
  const raw = firstMatch(text, [
    /\b(?:Average fill price|Average price|Filled price|Execution price|Price)\s*[:|]\s*(?:USD|US\$|\$)?\s*([\d,.]+)\b/i,
    /\b[\d,.]+\s+shares?\s+(?:at|@)\s*(?:USD|US\$|\$)?\s*([\d,.]+)\b/i,
    /\bfilled\s+(?:at|@)\s*(?:USD|US\$|\$)?\s*([\d,.]+)\b/i,
  ]);
  return numberFrom(raw);
}

function parseFee(text: string, label: "brokerage" | "fx"): number {
  const patterns =
    label === "brokerage"
      ? [
          /\b(?:Brokerage|Commission|Trading fee|Broker fee)\s*[:|]\s*(?:USD|US\$|\$)?\s*([\d,.]+)/i,
        ]
      : [
          /\b(?:FX fee|Foreign exchange fee|Currency conversion fee)\s*[:|]\s*(?:USD|US\$|\$)?\s*([\d,.]+)/i,
        ];

  return numberFrom(firstMatch(text, patterns)) ?? 0;
}

function parseOrderType(text: string): string | null {
  const raw = firstMatch(text, [
    /\bYour filled\s+([A-Z ]+?)\s+(?:BUY|SELL)\s+order\b/i,
    /\bOrder type\s*[:|]\s*([A-Z ]+)\b/i,
  ]);
  return raw ? raw.replace(/\s+/g, " ").trim().toUpperCase() : null;
}

function toIsoDate(headerDate: string, internalDate?: string | null): string {
  const internal = internalDate ? Number(internalDate) : NaN;
  const parsed = Number.isFinite(internal) ? new Date(internal) : new Date(headerDate);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString().slice(0, 10)
    : parsed.toISOString().slice(0, 10);
}

function makeFingerprint(input: {
  ticker: string | null;
  side: "Buy" | "Sell" | null;
  quantity: number | null;
  price: number | null;
  tradeDate: string;
}): string {
  const raw = [
    input.tradeDate,
    input.ticker ?? "?",
    input.side ?? "?",
    input.quantity ?? "?",
    input.price ?? "?",
  ].join("|");

  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 20);
}

function parseMessage(message: gmail_v1.Schema$Message): ParsedStakeTrade {
  const headers = message.payload?.headers;
  const subject = header(headers, "Subject") || "(No subject)";
  const emailDate = header(headers, "Date");
  const bodies = collectBodies(message.payload);
  const body = cleanText(
    bodies.plain.join("\n") ||
      bodies.html.map(htmlToText).join("\n") ||
      message.snippet ||
      "",
  );

  const ticker = parseTicker(subject, body);
  const side = parseSide(body);
  const quantity = parseQuantity(body);
  const price = parsePrice(body);
  const brokerageFee = parseFee(body, "brokerage");
  const fxFee = parseFee(body, "fx");
  const orderType = parseOrderType(body);
  const tradeDate = toIsoDate(emailDate, message.internalDate);

  const issues: string[] = [];
  if (!ticker) issues.push("Ticker not identified");
  if (!side) issues.push("Buy/Sell side not identified");
  if (quantity === null || quantity <= 0) issues.push("Quantity not identified");
  if (price === null || price <= 0) issues.push("Execution price not identified");

  const fingerprint = makeFingerprint({
    ticker,
    side,
    quantity,
    price,
    tradeDate,
  });

  return {
    messageId: message.id ?? "",
    threadId: message.threadId ?? null,
    subject,
    emailDate,
    ticker,
    side,
    quantity,
    price,
    currency: "USD",
    brokerageFee,
    fxFee,
    tradeDate,
    orderType,
    status: issues.length === 0 ? "Ready" : "Needs Review",
    fingerprint,
    preview: cleanText(body).slice(0, 500),
    issues,
  };
}

export async function listParsedStakeTrades(
  refreshToken: string,
  maxResults = 100,
): Promise<ParsedStakeTrade[]> {
  const auth = createAuthenticatedOAuthClient(refreshToken);
  const gmail = google.gmail({ version: "v1", auth });

  const list = await gmail.users.messages.list({
    userId: "me",
    q: `from:${gmailConfig.stakeEmail} ("trade confirmation" OR "order has been filled") newer_than:730d`,
    maxResults: Math.min(Math.max(maxResults, 1), 100),
  });

  const messages = list.data.messages ?? [];

  const parsed = await Promise.all(
    messages.map(async ({ id }) => {
      if (!id) return null;
      const result = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "full",
      });
      return parseMessage(result.data);
    }),
  );

  return parsed
    .filter((item): item is ParsedStakeTrade => item !== null)
    .sort((a, b) => b.tradeDate.localeCompare(a.tradeDate));
}
