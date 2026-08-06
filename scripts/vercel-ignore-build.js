const { execSync } = require("node:child_process")

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
  process.exit(1)
}
