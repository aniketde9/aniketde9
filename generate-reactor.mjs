/**
 * Generate RBMK reactor-core SVGs for the last N contribution days (default 100).
 *
 * Env: GH_USERNAME, GH_TOKEN|GITHUB_TOKEN, DAYS (default 100),
 *      RBMK_CORE (path to packages/core), PROFILE_ROOT, OUTPUT_DIR (default dist)
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const USERNAME = process.env.GH_USERNAME;
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const DAYS = Number.parseInt(process.env.DAYS || "100", 10) || 100;
const OUT_DIR = process.env.OUTPUT_DIR || "dist";
const PROFILE_ROOT =
  process.env.PROFILE_ROOT ||
  path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")));

if (!USERNAME) {
  console.error("Missing GH_USERNAME");
  process.exit(1);
}
if (!TOKEN) {
  console.error("Missing GH_TOKEN / GITHUB_TOKEN");
  process.exit(1);
}

const candidates = [
  process.env.RBMK_CORE,
  path.resolve(PROFILE_ROOT, ".rbmk/packages/core"),
  path.resolve(PROFILE_ROOT, "../markdown-rbmk/packages/core"),
  "C:/Users/Aniket-Laptop/OneDrive/Documents/Github_Animation/markdown-rbmk/packages/core",
].filter(Boolean);

let coreDir = null;
for (const c of candidates) {
  if (fs.existsSync(path.join(c, "src", "index.ts"))) {
    coreDir = c;
    break;
  }
}
if (!coreDir) {
  console.error("Could not find markdown-rbmk packages/core. Set RBMK_CORE.");
  process.exit(1);
}

// Resolve @octokit/* from the core package's node_modules
process.chdir(coreDir);

const { collectContributions, render } = await import(
  pathToFileURL(path.join(coreDir, "src", "index.ts")).href
);

console.log(`Fetching last ${DAYS} contribution days for ${USERNAME}...`);
const contributions = await collectContributions({
  username: USERNAME,
  token: TOKEN,
  days: DAYS,
});
console.log(
  `Got ${contributions.days.length} days, ${contributions.totalContributions} total contributions`,
);

const outAbs = path.resolve(PROFILE_ROOT, OUT_DIR);
fs.mkdirSync(outAbs, { recursive: true });

for (const theme of ["dark", "light"]) {
  const svg = render({
    mode: "commit",
    username: USERNAME,
    theme,
    contributions,
  });
  const out = path.join(outAbs, `reactor-${theme}.svg`);
  fs.writeFileSync(out, svg, "utf8");
  console.log(`Wrote ${out} (${svg.length} bytes)`);
}
