import { access, readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const required = [
  "index.html",
  "schedule/index.html",
  "rooms/index.html",
  "visit/index.html",
  "questions/index.html",
  "questions/status/index.html",
  "admin/index.html",
  "manifest.webmanifest",
  "sw.js"
];

await Promise.all(required.map((path) => access(join(dist, path))));

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

const builtHtml = await htmlFiles(dist);
for (const file of builtHtml) {
  const html = await readFile(file, "utf8");
  const rootAsset = /(?:href|src)="\/(?!nextbridge\/|\/)/;
  if (rootAsset.test(html)) {
    throw new Error("Root-relative asset escapes the GitHub Pages base path: " + file);
  }
  if (!html.includes('lang="ko"')) {
    throw new Error("Missing Korean document language: " + file);
  }
  if (!html.includes('name="viewport"')) {
    throw new Error("Missing responsive viewport metadata: " + file);
  }
  if ((html.match(/<h1\b/g) ?? []).length !== 1) {
    throw new Error("Every route must have exactly one h1: " + file);
  }
  for (const image of html.match(/<img\b[^>]*>/g) ?? []) {
    if (!/\balt=/.test(image)) throw new Error("Image is missing alt text: " + file);
  }
}

async function allFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await allFiles(path)));
    else files.push(path);
  }
  return files;
}

const perFileBudgets = new Map([
  [".css", 80_000],
  [".js", 250_000],
  [".png", 250_000]
]);
for (const file of await allFiles(dist)) {
  const budget = perFileBudgets.get(extname(file));
  if (budget && (await stat(file)).size > budget) {
    throw new Error(`Asset exceeds ${budget} byte budget: ${relative(dist, file)}`);
  }
}

console.log("Build output passed route, accessibility, base-path, and asset-budget checks.");
