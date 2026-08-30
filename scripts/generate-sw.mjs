#!/usr/bin/env node
/**
 * Build the production service worker.
 *
 * Vite hashes every asset filename, so a hand-written precache list goes stale
 * on the first build. This reads `dist/.vite/manifest.json` (emitted because
 * `build.manifest` is on) and stamps the real filenames into `dist/sw.js`,
 * together with a build id that doubles as the cache name — a new build gets a
 * new cache and the old one is dropped on activate.
 *
 * Deliberately hand-rolled rather than pulling in vite-plugin-pwa/workbox: the
 * app needs four caching rules, and the stack is pinned (CLAUDE.md §11).
 *
 * Run automatically by `pnpm run build`.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(projectRoot, "dist");
const manifestPath = path.join(distDir, ".vite", "manifest.json");
const templatePath = path.join(projectRoot, "scripts", "sw-template.js");
const outputPath = path.join(distDir, "sw.js");

if (!fs.existsSync(manifestPath)) {
  console.error(`[generate-sw] missing ${path.relative(projectRoot, manifestPath)} — run vite build first`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

/**
 * The app shell: every entry chunk plus its STATIC import graph and CSS.
 *
 * That graph is exactly what `index.html` modulepreloads, so it is what a cold
 * offline boot needs. `dynamicImports` are deliberately not walked — route
 * pages are lazy, and precaching all of them would download the whole app on
 * first visit for a user who may only ever open the POS. A visited page lands
 * in the runtime cache and works offline from then on; the warm-up in
 * `useOfflineBootstrap` is what makes its DATA work.
 */
const precache = new Set(["/", "/index.html", "/manifest.json"]);

/** Add a chunk and everything it statically imports, depth-first. */
function addWithStaticImports(key, seen = new Set()) {
  if (seen.has(key)) return;
  seen.add(key);
  const entry = manifest[key];
  if (!entry) return;
  if (entry.file) precache.add(`/${entry.file}`);
  for (const css of entry.css ?? []) precache.add(`/${css}`);
  for (const imported of entry.imports ?? []) addWithStaticImports(imported, seen);
}

for (const [key, entry] of Object.entries(manifest)) {
  if (!entry.isEntry && !key.endsWith(".html")) continue;
  addWithStaticImports(key);
}

// Static files that live in public/ and never appear in the Vite manifest.
for (const name of ["icon-192.png", "icon-512.png"]) {
  if (fs.existsSync(path.join(distDir, name))) precache.add(`/${name}`);
}

const assets = [...precache].sort();
const buildId = createHash("sha256").update(assets.join("|")).digest("hex").slice(0, 12);

const template = fs.readFileSync(templatePath, "utf8");
const output = template
  .replace("__BUILD_ID__", buildId)
  .replace("__PRECACHE_ASSETS__", JSON.stringify(assets, null, 2));

fs.writeFileSync(outputPath, output);
console.log(`[generate-sw] wrote dist/sw.js — build ${buildId}, ${assets.length} precached assets`);
