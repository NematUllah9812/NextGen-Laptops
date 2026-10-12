// Build the client into dist/:
//   1. esbuild bundles client/src/main.tsx -> dist/assets/index.js,
//      emitting the imported .webp product photos next to it (file
//      loader) — dealImages.ts imports them, so keys resolve to URLs.
//   2. The Tailwind CLI compiles client/src/theme.css ->
//      dist/assets/index.css (theme.css uses Tailwind v4 @import
//      directives, which esbuild does not process).
//   3. index.html is copied to dist/index.html.

import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "assets"), { recursive: true });

await build({
  entryPoints: [join(root, "client/src/main.tsx")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2020"],
  minify: true,
  sourcemap: false,
  outfile: join(dist, "assets/index.js"),
  assetNames: "[name]-[hash]",
  loader: { ".webp": "file", ".png": "file", ".jpg": "file", ".svg": "file" },
  alias: {
    "@hatch/space-sdk/client": join(
      root,
      "client/src/shims/space-sdk-client.tsx",
    ),
  },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
});

const tailwindBin = join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tailwindcss.cmd" : "tailwindcss",
);
execFileSync(
  tailwindBin,
  [
    "-i",
    join(root, "client/src/theme.css"),
    "-o",
    join(dist, "assets/index.css"),
    "--minify",
  ],
  { stdio: "inherit" },
);

copyFileSync(join(root, "index.html"), join(dist, "index.html"));
console.log("Built dist/ (assets/index.js, assets/index.css, index.html)");
