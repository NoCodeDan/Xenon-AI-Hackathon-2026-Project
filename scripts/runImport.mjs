#!/usr/bin/env node
/**
 * Import parsed master list data into Convex in batches.
 *
 * Usage:
 *   node scripts/runImport.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = resolve(__dirname, "master-list-parsed.json");

const data = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
const BATCH_SIZE = 50;

console.log(`Importing ${data.length} items in batches of ${BATCH_SIZE}...`);

let totalImported = 0;
let totalSkipped = 0;
const allMissingTopics = new Set();

for (let i = 0; i < data.length; i += BATCH_SIZE) {
  const batch = data.slice(i, i + BATCH_SIZE);
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  const totalBatches = Math.ceil(data.length / BATCH_SIZE);

  // Serialize to a temp file to avoid shell escaping issues with JSON
  const tmpFile = `/tmp/import-batch-${batchNum}.json`;
  const { writeFileSync } = await import("fs");
  writeFileSync(tmpFile, JSON.stringify({ items: batch }));

  try {
    const result = execSync(
      `npx convex run --no-push importMasterList:importBatch --prod < "${tmpFile}"`,
      { cwd: resolve(__dirname, ".."), encoding: "utf-8", timeout: 30000 }
    );

    // Parse the result
    try {
      const parsed = JSON.parse(result.trim());
      totalImported += parsed.imported || 0;
      totalSkipped += parsed.skipped || 0;
      if (parsed.missingTopics) {
        parsed.missingTopics.forEach((t) => allMissingTopics.add(t));
      }
      console.log(
        `  Batch ${batchNum}/${totalBatches}: ${parsed.imported} imported, ${parsed.skipped} skipped`
      );
    } catch {
      console.log(`  Batch ${batchNum}/${totalBatches}: ${result.trim()}`);
    }
  } catch (err) {
    console.error(`  Batch ${batchNum} FAILED:`, err.message);
  }
}

console.log(`\nDone! Imported: ${totalImported}, Skipped: ${totalSkipped}`);
if (allMissingTopics.size > 0) {
  console.log("Missing topics:", [...allMissingTopics]);
}
