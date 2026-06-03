import {cp, mkdir, rm} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "www");
const outDir = path.join(root, "dist");

await rm(outDir, {recursive: true, force: true});
await mkdir(path.join(outDir, "assets"), {recursive: true});
await cp(path.join(srcDir, "index.html"), path.join(outDir, "index.html"));
await cp(path.join(srcDir, "styles.css"), path.join(outDir, "styles.css"));

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
