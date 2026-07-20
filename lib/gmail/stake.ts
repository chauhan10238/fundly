import { google, gmail_v1 } from "googleapis";
import { gmailConfig } from "./config";
import { createAuthenticatedOAuthClient } from "./oauth";

export type StakeEmailSummary = {
  messageId: string;
  threadId: string | null;
  subject: string;
  from: string;
  date: string;
  snippet: string;
};

function header(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string,
): string {
  return (
    headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())
      ?.value ?? ""
  );
}

export async function listStakeEmails(
  refreshToken: string,
  maxResults = 50,
): Promise<StakeEmailSummary[]> {
  const auth = createAuthenticatedOAuthClient(refreshToken);
  const gmail = google.gmail({ version: "v1", auth });

  const query = `from:${gmailConfig.stakeEmail} newer_than:365d`;

  const list = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: Math.min(Math.max(maxResults, 1), 100),
  });

  const messages = list.data.messages ?? [];

  const detailed = await Promise.all(
    messages.map(async ({ id }) => {
      if (!id) return null;

      const result = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      });

      const message = result.data;
      const headers = message.payload?.headers;

      return {
        messageId: message.id ?? id,
        threadId: message.threadId ?? null,
        subject: header(headers, "Subject") || "(No subject)",
        from: header(headers, "From"),
        date: header(headers, "Date"),
        snippet: message.snippet ?? "",
      } satisfies StakeEmailSummary;
    }),
  );

  return detailed.filter(
    (item): item is StakeEmailSummary => item !== null,
  );
}
