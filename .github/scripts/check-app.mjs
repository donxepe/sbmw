#!/usr/bin/env node
// CI gate for the single-file PWA. Run from the repo root.
//  1. Extract the <script type="text/babel"> block to argv[2] so it can be compiled —
//     a syntax error there is a blank page at the gym, not a build error.
//  2. Every URL index.html loads via <script src>/<link href> must be listed in ASSETS
//     in sw.js, or the app breaks offline (AGENTS.md rule 4).
import { readFileSync, writeFileSync } from "node:fs";

const out = process.argv[2] || "/tmp/app.jsx";
const html = readFileSync("index.html", "utf8");
const sw = readFileSync("sw.js", "utf8");
const fail = [];

const block = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
if (!block) fail.push('index.html: no <script type="text/babel"> block found');
else writeFileSync(out, block[1]);

const arr = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
if (!arr) fail.push("sw.js: could not find the ASSETS array");
const assets = arr
  ? [...arr[1].matchAll(/"([^"]+)"/g)].map((m) => m[1].replace(/^\.\//, ""))
  : [];

const refs = new Set(
  [...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => !u.startsWith("#") && !u.startsWith("data:"))
    .map((u) => u.replace(/^\.\//, ""))
);

for (const r of refs) {
  if (!assets.includes(r)) {
    fail.push(`sw.js ASSETS is missing "${r}" — index.html loads it, so offline breaks`);
  }
}

if (fail.length) {
  for (const f of fail) console.error("FAIL " + f);
  process.exit(1);
}
console.log(`OK  JSX -> ${out}; ${refs.size} page asset(s) all present in sw.js ASSETS`);
