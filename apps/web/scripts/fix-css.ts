/**
 * Post-shadcn install script
 * Fixes the tw-animate-css import for Turbopack compatibility
 *
 * Run this after adding shadcn components if the import gets overwritten:
 * bun run fix:css
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const globalsPath = join(__dirname, "app", "globals.css");
const localAnimatePath = join(__dirname, "app", "tw-animate.css");
const nodeModulesAnimatePath = join(
  __dirname,
  "..",
  "..",
  "node_modules",
  "tw-animate-css",
  "dist",
  "tw-animate.css",
);

// Ensure local copy of tw-animate.css exists
if (!existsSync(localAnimatePath) && existsSync(nodeModulesAnimatePath)) {
  copyFileSync(nodeModulesAnimatePath, localAnimatePath);
  console.log("✓ Copied tw-animate.css to app folder");
}

// Fix the import in globals.css
if (existsSync(globalsPath)) {
  let content = readFileSync(globalsPath, "utf-8");

  // Replace direct package import with local file import
  const oldImport = '@import "tw-animate-css";';
  const newImport = '@import "./tw-animate.css";';

  if (content.includes(oldImport)) {
    content = content.replace(oldImport, newImport);
    writeFileSync(globalsPath, content);
    console.log("✓ Fixed tw-animate-css import in globals.css");
  } else if (content.includes(newImport)) {
    console.log("✓ globals.css already using local tw-animate.css");
  } else {
    console.log("⚠ No tw-animate import found in globals.css");
  }
}

console.log("Done!");
