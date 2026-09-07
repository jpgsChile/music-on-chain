#!/usr/bin/env node
/**
 * docs-validate.mjs — living documentation gate (docs-as-code).
 * Ensures: catalog coverage, required metadata, Related Documents links.
 *
 * Usage: node scripts/docs-validate.mjs
 * Exit 1 on failure.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DOCS = path.join(ROOT, "docs");
const REQUIRED = [
  "**Purpose**",
  "**Dependencies**",
  "**Status**",
  "**Owner**",
  "**Last Updated**",
  "**Related Documents**",
];

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "prisma") continue;
      walk(p, acc);
    } else if (ent.name.endsWith(".md")) {
      acc.push(p);
    }
  }
  return acc;
}

function rel(p) {
  return path.relative(DOCS, p).split(path.sep).join("/");
}

const hub = fs.readFileSync(path.join(DOCS, "README.md"), "utf8");
const files = walk(DOCS);
const errors = [];
const warnings = [];

for (const file of files) {
  const id = rel(file);
  const body = fs.readFileSync(file, "utf8");

  for (const field of REQUIRED) {
    if (!body.includes(field)) {
      errors.push(`${id}: missing metadata field ${field}`);
    }
  }

  const relatedIdx = body.indexOf("**Related Documents**");
  if (relatedIdx >= 0) {
    const slice = body.slice(relatedIdx, relatedIdx + 500);
    if (!/\[[^\]]+\]\([^)]+\)/.test(slice)) {
      errors.push(`${id}: Related Documents must include at least one link`);
    }
  }

  if (id === "README.md" || id === "_system/STANDARDS.md") continue;

  let cataloged =
    hub.includes(id) ||
    hub.includes(path.basename(id)) ||
    hub.includes(id.replace(/\.md$/, ""));

  const folderReadme = path.join(path.dirname(file), "README.md");
  if (!cataloged && fs.existsSync(folderReadme) && folderReadme !== file) {
    const fr = fs.readFileSync(folderReadme, "utf8");
    cataloged =
      fr.includes(path.basename(id)) ||
      fr.includes("./" + path.basename(id)) ||
      fr.includes(path.basename(id, ".md"));
  }

  const top = id.split("/")[0];
  if (
    ["backend-architecture", "data-model", "sprints", "_system"].includes(top) &&
    (hub.includes(top + "/") || hub.includes(top + "/README"))
  ) {
    cataloged = true;
  }

  if (!cataloged) {
    warnings.push(
      `${id}: not clearly cataloged from docs/README.md or folder README`
    );
  }
}

if (warnings.length) {
  console.log("Warnings:");
  warnings.forEach((w) => console.log("  -", w));
}
if (errors.length) {
  console.error("Errors:");
  errors.forEach((e) => console.error("  -", e));
  console.error(`\n${errors.length} error(s). See docs/_system/STANDARDS.md`);
  process.exit(1);
}
console.log(
  `OK: ${files.length} docs passed metadata checks (${warnings.length} warning(s))`
);
