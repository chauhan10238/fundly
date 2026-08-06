const { execSync } = require("node:child_process")

// GitHub is currently used as the profile-data persistence layer. Those data-only
// commits must never start a Vercel build. Check the commit message first because
// it is reliable even when VERCEL_GIT_PREVIOUS_SHA is unavailable during a burst.
const message = process.env.VERCEL_GIT_COMMIT_MESSAGE || ""
if (/\[fundly-data\]|^(Update|Create) DIOS .+ portfolio data/i.test(message.trim())) {
  process.exit(0)
}

try {
  const previous = process.env.VERCEL_GIT_PREVIOUS_SHA
  const current = process.env.VERCEL_GIT_COMMIT_SHA
  if (!previous || !current) process.exit(1)
  const output = execSync(`git diff --name-only ${previous} ${current}`, { encoding: "utf8" })
  const files = output.split(/\r?\n/).filter(Boolean)
  const dataOnly = files.length > 0 && files.every((file) =>
    file === "data/portfolio.json" || file.startsWith("data/profiles/")
  )
  process.exit(dataOnly ? 0 : 1)
} catch {
  // Build when uncertain; skipping a real source-code change would be worse.
  process.exit(1)
}
