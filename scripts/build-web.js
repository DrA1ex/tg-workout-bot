import {cp, mkdir, readFile, rm, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import * as esbuild from "esbuild";

import {generatePwaAssets, getStartupImageLinks} from './pwa-assets.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "www");
const outDir = path.join(root, "dist");

await rm(outDir, {recursive: true, force: true});
await mkdir(path.join(outDir, "assets"), {recursive: true});
await generatePwaAssets(outDir);

const sourceHtml = await readFile(path.join(srcDir, "index.html"), "utf8");
const html = sourceHtml.replace(
    "    <!-- IOS_STARTUP_IMAGES -->",
    getStartupImageLinks(),
);
await writeFile(path.join(outDir, "index.html"), html);
await cp(path.join(srcDir, "styles.css"), path.join(outDir, "styles.css"));
await cp(path.join(srcDir, "manifest.webmanifest"), path.join(outDir, "manifest.webmanifest"));
await cp(path.join(srcDir, "sw.js"), path.join(outDir, "sw.js"));
await cp(path.join(srcDir, "icons"), path.join(outDir, "icons"), {recursive: true});

await esbuild.build({
    entryPoints: [path.join(srcDir, "scripts", "main.js")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    outfile: path.join(outDir, "assets", "app.js"),
    sourcemap: true,
    minify: process.env.NODE_ENV === "production",
});

console.log(`WebUI bundle written to ${path.relative(root, outDir)}`);