// ---------------------------------------------------------------------------
// Library snapshots -- periodic aggregation of content grades for trend
// tracking and dashboard charting.
// ---------------------------------------------------------------------------

import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Generate a library snapshot by aggregating all current grades.
 *
 * Reads every contentLatestGrade record, computes grade distribution,
 * average score, and per-topic breakdown, then inserts a new
 * librarySnapshots record.
 *
 * Designed to be called from a cron job (daily).
 */
export const generateSnapshot = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // ------ 1. Gather all latest grades ------
    const allGrades = await ctx.db.query("contentLatestGrade").collect();

    // ------ 2. Compute grade distribution ------
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    let totalScore = 0;

    for (const entry of allGrades) {
      const grade = entry.grade as keyof typeof gradeDistribution;
      if (grade in gradeDistribution) {
        gradeDistribution[grade]++;
      }
      totalScore += entry.overallScore;
    }

    const totalContent = allGrades.length;
    const averageScore = totalContent > 0 ? totalScore / totalContent : 0;

    // ------ 3. Per-topic breakdown ------
    // Map contentId -> grade entry for quick lookup
    const gradeByContent = new Map(
      allGrades.map((g) => [g.contentId.toString(), g]),
    );

    // Fetch all content items so we can group by topic
    const allContent = await ctx.db.query("contentItems").collect();

    // Fetch all topics for name resolution
    const allTopics = await ctx.db.query("topics").collect();
    const topicNameMap = new Map(
      allTopics.map((t) => [t._id.toString(), t.name]),
    );

    // Accumulate per-topic scores
    const topicAccumulator = new Map<
      string,
      { totalScore: number; count: number }
    >();

    for (const content of allContent) {
      const gradeEntry = gradeByContent.get(content._id.toString());
      if (!gradeEntry) continue;

      for (const topicId of content.topicIds) {
        const key = topicId.toString();
        const existing = topicAccumulator.get(key);
        if (existing) {
          existing.totalScore += gradeEntry.overallScore;
          existing.count++;
        } else {
          topicAccumulator.set(key, {
            totalScore: gradeEntry.overallScore,
            count: 1,
          });
        }
      }
    }

    // Build the topic breakdown array
    const topicBreakdown: {
      topicId: any;
      topicName: string;
      averageScore: number;
      contentCount: number;
    }[] = [];

    for (const [topicIdStr, acc] of topicAccumulator) {
      // Find the original topic ID from allTopics
      const topic = allTopics.find((t) => t._id.toString() === topicIdStr);
      if (!topic) continue;

      topicBreakdown.push({
        topicId: topic._id,
        topicName: topicNameMap.get(topicIdStr) ?? "Unknown Topic",
        averageScore: acc.count > 0 ? acc.totalScore / acc.count : 0,
        contentCount: acc.count,
      });
    }

    // Sort breakdown by average score ascending (worst topics first)
    topicBreakdown.sort((a, b) => a.averageScore - b.averageScore);

    // ------ 4. Insert snapshot ------
    const snapshotId = await ctx.db.insert("librarySnapshots", {
      totalContent,
      gradeDistribution,
      averageScore: Math.round(averageScore * 100) / 100,
      topicBreakdown,
      createdAt: now,
    });

    console.log(
      `Library snapshot created: ${totalContent} items, avg score ${averageScore.toFixed(1)}, distribution: A=${gradeDistribution.A} B=${gradeDistribution.B} C=${gradeDistribution.C} D=${gradeDistribution.D} F=${gradeDistribution.F}`,
    );

    return snapshotId;
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get the most recent library snapshot.
 */
export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("librarySnapshots")
      .withIndex("by_created")
      .order("desc")
      .first();
  },
});

/**
 * Get the last N library snapshots for trend charting.
 * Returns snapshots ordered oldest-first so charts read left-to-right.
 */
export const getTrend = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const snapshots = await ctx.db
      .query("librarySnapshots")
      .withIndex("by_created")
      .order("desc")
      .take(args.limit);

    // Reverse so the array is oldest-first for charting
    return snapshots.reverse();
  },
});
