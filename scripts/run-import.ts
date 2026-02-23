/**
 * Local script that reads parsed Treehouse data and imports it into Convex
 * by calling mutations via `npx convex run`.
 */
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const DATA_PATH = "/tmp/treehouse-data.json";

function convexRun(fnName: string, args: Record<string, any> = {}): any {
  // convex run takes args as a positional JSON string
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
    // Try to parse stdout even on error (convex run sometimes exits nonzero but has output)
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout.trim());
      } catch {}
    }
    console.error(`Error running ${fnName}:`, err.stderr?.slice(0, 500) || err.message);
    throw err;
  }
}

function main() {
  console.log("Reading parsed data...");
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

  console.log(
    `Data: ${data.topics.length} topics, ${data.tracks.length} tracks, ${data.courses.length} courses`
  );

  // Step 1: Clear
  console.log("\nStep 1: Clearing existing data...");
  const deleted = convexRun("importTreehouseMutations:clearAll");
  console.log(`  Deleted: ${deleted}`);

  // Step 2: Topics
  console.log("\nStep 2: Importing topics...");
  const topicSlugToId = convexRun("importTreehouseMutations:importTopics", {
    topics: data.topics,
  });
  console.log(`  Created ${Object.keys(topicSlugToId).length} topics`);

  // Step 3: Tracks
  console.log("\nStep 3: Importing tracks...");
  const trackTitleToId = convexRun("importTreehouseMutations:importTracks", {
    tracks: data.tracks,
    topicSlugToId,
  });
  console.log(`  Created ${Object.keys(trackTitleToId).length} tracks`);

  // Step 4: Courses in batches
  console.log("\nStep 4: Importing courses in batches...");
  const BATCH_SIZE = 15;
  let totalCourses = 0,
    totalStages = 0,
    totalLessons = 0,
    totalEdges = 0;
  const totalBatches = Math.ceil(data.courses.length / BATCH_SIZE);

  for (let i = 0; i < data.courses.length; i += BATCH_SIZE) {
    const batch = data.courses.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`  Batch ${batchNum}/${totalBatches}...`);

    try {
      const result = convexRun("importTreehouseMutations:importCourseBatch", {
        courses: batch,
        topicSlugToId,
        trackTitleToId,
      });

      totalCourses += result.courses;
      totalStages += result.stages;
      totalLessons += result.lessons;
      totalEdges += result.edges;
      console.log(
        ` +${result.courses} courses, +${result.stages} stages, +${result.lessons} lessons`
      );
    } catch (err) {
      console.log(` FAILED (skipping batch)`);
    }
  }

  console.log(`\n===== Import complete! =====`);
  console.log(`  Topics:  ${Object.keys(topicSlugToId).length}`);
  console.log(`  Tracks:  ${Object.keys(trackTitleToId).length}`);
  console.log(`  Courses: ${totalCourses}`);
  console.log(`  Stages:  ${totalStages}`);
  console.log(`  Lessons: ${totalLessons}`);
  console.log(`  Edges:   ${totalEdges}`);
  console.log(
    `  Total content items: ${
      Object.keys(trackTitleToId).length +
      totalCourses +
      totalStages +
      totalLessons
    }`
  );
}

main();
