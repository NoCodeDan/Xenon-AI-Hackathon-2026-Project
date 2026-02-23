/**
 * Local script that processes all content:
 * 1. Scatter updatedAt dates across 0-3 years for realistic age distribution
 * 2. Clear existing grades (chunked)
 * 3. Update topic snapshots with real industry data
 * 4. Grade all content items in batches (heuristic scoring)
 * 5. Generate a library snapshot for the dashboard
 */
import { execSync } from "child_process";
import * as path from "path";

function convexRun(fnName: string, args: Record<string, any> = {}): any {
  const argsJson = JSON.stringify(args);
  try {
    const result = execSync(
      `npx convex run --no-push "${fnName}" '${argsJson.replace(/'/g, "'\\''")}'`,
      {
        maxBuffer: 50 * 1024 * 1024,
        encoding: "utf-8",
        cwd: path.resolve(__dirname, ".."),
      }
    );
    const trimmed = result.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  } catch (err: any) {
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout.trim());
      } catch {}
    }
    console.error(
      `Error running ${fnName}:`,
      err.stderr?.slice(0, 500) || err.message
    );
    throw err;
  }
}

function clearTable(table: string) {
  let totalDeleted = 0;
  let more = true;
  while (more) {
    const result = convexRun("processContent:clearGradesBatch", {
      table,
      limit: 500,
    });
    totalDeleted += result.deleted;
    more = result.more;
    if (result.deleted > 0) {
      process.stdout.write(`.`);
    }
  }
  return totalDeleted;
}

function main() {
  console.log("===== Content Processing Pipeline =====\n");

  // Step 0: Get content count
  console.log("Step 0: Getting content count...");
  const totalContent = convexRun("processContent:getContentCount");
  console.log(`  Total content items: ${totalContent}\n`);

  // Step 1: Scatter dates
  console.log("Step 1: Scattering updatedAt dates (0-3 year range)...");
  const SCATTER_BATCH = 100;
  const scatterBatches = Math.ceil(totalContent / SCATTER_BATCH);

  for (let i = 0; i < totalContent; i += SCATTER_BATCH) {
    const batchNum = Math.floor(i / SCATTER_BATCH) + 1;
    process.stdout.write(`  Scatter ${batchNum}/${scatterBatches}...`);
    try {
      const result = convexRun("processContent:scatterDates", {
        offset: i,
        limit: SCATTER_BATCH,
      });
      console.log(` ${result.updated}`);
    } catch {
      console.log(` FAILED`);
    }
  }

  // Step 2: Clear existing grades (chunked)
  console.log("\nStep 2: Clearing existing grades...");
  process.stdout.write("  freshnessScores");
  const s1 = clearTable("freshnessScores");
  console.log(` (${s1})`);

  process.stdout.write("  contentLatestGrade");
  const s2 = clearTable("contentLatestGrade");
  console.log(` (${s2})`);

  process.stdout.write("  librarySnapshots");
  const s3 = clearTable("librarySnapshots");
  console.log(` (${s3})`);

  // Reset grading status
  console.log("  Resetting gradingStatus...");
  const RESET_BATCH = 200;
  for (let i = 0; i < totalContent; i += RESET_BATCH) {
    convexRun("processContent:resetGradingStatus", {
      offset: i,
      limit: RESET_BATCH,
    });
  }
  console.log(`  Done clearing.\n`);

  // Step 3: Update topic snapshots
  console.log("Step 3: Updating topic snapshots with real industry data...");
  const topicsUpdated = convexRun("processContent:updateTopicSnapshots");
  console.log(`  Updated ${topicsUpdated} topic snapshots\n`);

  // Step 4: Grade in batches
  console.log("Step 4: Grading all content (heuristic scoring)...");
  const GRADE_BATCH = 50;
  const gradeBatches = Math.ceil(totalContent / GRADE_BATCH);
  let totalGraded = 0;
  let totalSkipped = 0;

  for (let i = 0; i < totalContent; i += GRADE_BATCH) {
    const batchNum = Math.floor(i / GRADE_BATCH) + 1;
    process.stdout.write(`  Grade ${batchNum}/${gradeBatches}...`);

    try {
      const result = convexRun("processContent:gradeBatch", {
        offset: i,
        limit: GRADE_BATCH,
      });
      totalGraded += result.graded;
      totalSkipped += result.skipped;
      console.log(` +${result.graded}`);
    } catch {
      console.log(` FAILED`);
    }
  }

  console.log(`\n  Total graded: ${totalGraded}`);
  console.log(`  Total skipped: ${totalSkipped}\n`);

  // Step 5: Generate library snapshot
  console.log("Step 5: Generating library snapshot...");
  const snapshot = convexRun("processContent:generateLibrarySnapshot");
  console.log(`  Total content: ${snapshot.totalContent}`);
  console.log(`  Average score: ${snapshot.averageScore}`);
  console.log(
    `  Distribution: A=${snapshot.distribution.A} B=${snapshot.distribution.B} C=${snapshot.distribution.C} D=${snapshot.distribution.D} F=${snapshot.distribution.F}`
  );

  console.log("\n===== Processing Complete! =====");
}

main();
