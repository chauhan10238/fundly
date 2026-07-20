# DIOS v3.3 - PDF and Share Report

This patch adds:

- one-click branded PDF generation;
- a DIOS report logo;
- a four-page A4 investment report;
- executive summary;
- recommendation and confidence;
- financial health pillars;
- normalized financial metrics;
- earnings intelligence;
- news sentiment and headlines;
- SEC filing links;
- scenarios and source list;
- a 30-day signed share link;
- a public read-only report page;
- PDF download from the shared report page.

## 1. Install the PDF dependency

Run from the project root:

```bash
npm install @react-pdf/renderer
```

React-pdf supports generating PDFs in the browser and on the server.

## 2. Copy the patch

Copy all files into the project root, preserving folders.

## 3. Update the Analyse page

Follow `PATCH-ANALYSE-PAGE.md`.

## 4. Add the sharing secret

In Vercel:

```text
Settings -> Environment Variables
```

Add:

```text
REPORT_SHARE_SECRET
```

Use a long random value of at least 32 characters.

Create one locally with:

```bash
openssl rand -base64 48
```

Apply it to Production and Preview. Never prefix it with `NEXT_PUBLIC_`.

## 5. Commit and deploy

```bash
git add .
git commit -m "DIOS v3.3 PDF and share reports"
git push
```

## Test

1. Open `/analyse?ticker=AAPL`.
2. Wait for the analysis to finish.
3. Click `Download PDF`.
4. Click `Share report`.
5. Open the copied `/share/...` link in a private browser window.
6. Download the PDF from the shared report page.

## Sharing model

This version does not require a database. It creates a compressed, signed,
read-only report token. The signature prevents alteration, and the link expires
after 30 days.

Anyone who possesses the link can view the report, so do not include private
account details, transaction history, account numbers or personal information.

For short permanent links, revocation and access analytics, the next upgrade
should store reports in a database or Redis and use a random report ID.
