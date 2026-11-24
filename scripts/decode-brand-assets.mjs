#!/usr/bin/env node
/**
 * Decode brand-assets/*.png.b64 into public/brand/*.png before the build.
 *
 * Binary brand images (full-res logo PNG, app-icon / favicon PNGs) are stored
 * as base64 text so they can be committed through text-only tooling. Vite then
 * copies public/brand/*.png into the output like any other static file.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "brand-assets");
const out = join(root, "public", "brand");

if (existsSync(src)) {
  mkdirSync(out, { recursive: true });
  let n = 0;
  for (const name of readdirSync(src)) {
    if (!name.endsWith(".b64")) continue;
    const bytes = Buffer.from(readFileSync(join(src, name), "utf8").replace(/\s+/g, ""), "base64");
    writeFileSync(join(out, name.slice(0, -4)), bytes);
    n += 1;
  }
  console.log(`[brand] decoded ${n} brand asset(s) into public/brand/`);
}
