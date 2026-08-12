import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const scanRoots = ["src", "public", "supabase", "docs", ".github", "dist"];
const textExtensions = new Set([
  ".astro",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".sql",
  ".toml",
  ".ts",
  ".txt",
  ".webmanifest",
  ".yml",
  ".yaml"
]);
const forbidden = [
  ["GitHub classic PAT", /ghp_[A-Za-z0-9]{30,}/g],
  ["GitHub fine-grained PAT", /github_pat_[A-Za-z0-9_]{30,}/g],
  ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{16,}/g],
  ["Legacy JWT key", /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g],
  ["Slack webhook", /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/g],
  [
    "Discord webhook",
    /https:\/\/(?:canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g
  ],
  ["Private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g]
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await walk(path)));
    else if (textExtensions.has(extname(entry.name)) || entry.name === ".env.example")
      paths.push(path);
  }
  return paths;
}

const findings = [];
for (const scanRoot of scanRoots) {
  const path = join(root, scanRoot);
  try {
    for (const file of await walk(path)) {
      const contents = await readFile(file, "utf8");
      for (const [label, pattern] of forbidden) {
        pattern.lastIndex = 0;
        if (pattern.test(contents)) {
          findings.push(label + ": " + relative(root, file));
        }
      }
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") continue;
    throw error;
  }
}

if (findings.length > 0) {
  console.error("Potential secrets found:\n" + findings.map((item) => "- " + item).join("\n"));
  process.exit(1);
}

console.log("Secret scan passed.");
