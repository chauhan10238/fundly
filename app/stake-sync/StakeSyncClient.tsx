"use client";

import { useEffect, useState } from "react";

type StakeEmail = {
  messageId: string;
  threadId: string | null;
  subject: string;
  from: string;
  date: string;
  snippet: string;
};

type ApiResponse = {
  connected: boolean;
  scannedAt?: string;
  count?: number;
  emails: StakeEmail[];
  error?: string;
};

export default function StakeSyncClient() {
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function scan() {
    setLoading(true);

    try {
      const response = await fetch("/api/stake/emails", {
        cache: "no-store",
      });

      const data = (await response.json()) as ApiResponse;
      setResult(data);
    } catch {
      setResult({
        connected: false,
        emails: [],
        error: "Unable to contact the DIOS Gmail sync service.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void scan();
  }, []);

  if (loading) {
    return <p>Checking Gmail connection…</p>;
  }

  if (!result?.connected) {
    return (
      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Connect Stake Gmail</h2>
        <p>
          DIOS will request read-only Gmail access and search only for messages
          sent by notifications@hellostake.com.
        </p>
        {result?.error ? <p role="alert">{result.error}</p> : null}
        <a href="/api/auth/google" style={primaryButtonStyle}>
          Connect Gmail
        </a>
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Gmail connected</h2>
            <p style={{ marginBottom: 0 }}>
              {result.count ?? 0} Stake emails found
              {result.scannedAt
                ? ` · scanned ${new Date(result.scannedAt).toLocaleString()}`
                : ""}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => void scan()} style={buttonStyle}>
              Scan again
            </button>

            <form action="/api/auth/google/disconnect" method="post">
              <button type="submit" style={buttonStyle}>
                Disconnect
              </button>
            </form>
          </div>
        </div>

        {result.error ? (
          <p role="alert" style={{ marginBottom: 0 }}>
            {result.error}
          </p>
        ) : null}
      </section>

      {result.emails.length === 0 ? (
        <section style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>No matching emails found</h3>
          <p style={{ marginBottom: 0 }}>
            Gmail was searched for messages from
            notifications@hellostake.com received within the last 365 days.
          </p>
        </section>
      ) : (
        result.emails.map((email) => (
          <article key={email.messageId} style={cardStyle}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>{email.subject}</h3>
            <p style={{ margin: "4px 0" }}>
              <strong>From:</strong> {email.from}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Date:</strong> {email.date}
            </p>
            <p style={{ marginBottom: 0 }}>{email.snippet}</p>
          </article>
        ))
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(127,127,127,.3)",
  borderRadius: 12,
  padding: 20,
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid rgba(127,127,127,.5)",
  borderRadius: 8,
  background: "transparent",
  padding: "10px 14px",
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-block",
  borderRadius: 8,
  padding: "10px 14px",
  textDecoration: "none",
  background: "currentColor",
  color: "Canvas",
};
