import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Save a freshness score and upsert the contentLatestGrade record.
 * Creates a new freshnessScores row, then either inserts or updates
 * the corresponding contentLatestGrade entry.
 */
export const saveScore = mutation({
  args: {
    contentId: v.id("contentItems"),
    topicSnapshotId: v.id("topicSnapshots"),
    overallScore: v.number(),
    recencyScore: v.number(),
    alignmentScore: v.number(),
    demandScore: v.number(),
    velocityMultiplier: v.number(),
    grade: v.string(),
    outdatedTopics: v.array(v.string()),
    missingTopics: v.array(v.string()),
    industryBenchmark: v.optional(v.string()),
    recommendedAction: v.optional(v.string()),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Create the freshnessScores record
    const scoreId = await ctx.db.insert("freshnessScores", {
      contentId: args.contentId,
      topicSnapshotId: args.topicSnapshotId,
      overallScore: args.overallScore,
      recencyScore: args.recencyScore,
      alignmentScore: args.alignmentScore,
      demandScore: args.demandScore,
      velocityMultiplier: args.velocityMultiplier,
      grade: args.grade,
      outdatedTopics: args.outdatedTopics,
      missingTopics: args.missingTopics,
      industryBenchmark: args.industryBenchmark,
      recommendedAction: args.recommendedAction,
      confidence: args.confidence,
      createdAt: now,
    });

    // Upsert contentLatestGrade
    const existing = await ctx.db
      .query("contentLatestGrade")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        scoreId,
        overallScore: args.overallScore,
        grade: args.grade,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("contentLatestGrade", {
        contentId: args.contentId,
        scoreId,
        overallScore: args.overallScore,
        grade: args.grade,
        updatedAt: now,
      });
    }

    return scoreId;
  },
});

/**
 * Get the latest grade for a content item from contentLatestGrade.
 */
export const getLatest = query({
  args: {
    contentId: v.id("contentItems"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentLatestGrade")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .unique();
  },
});

/**
 * Get the full scoring history for a content item, newest first.
 */
export const getHistory = query({
  args: {
    contentId: v.id("contentItems"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("freshnessScores")
      .withIndex("by_content_created", (q) => q.eq("contentId", args.contentId))
      .order("desc")
      .collect();
  },
});

/**
 * Get the distribution of content items by grade from contentLatestGrade.
 * Returns a record like { A: 10, B: 25, C: 15, D: 5, F: 2 }.
 */
export const getDistribution = query({
  args: {},
  handler: async (ctx) => {
    const allGrades = await ctx.db.query("contentLatestGrade").collect();

    const distribution: Record<string, number> = {};
    for (const entry of allGrades) {
      distribution[entry.grade] = (distribution[entry.grade] ?? 0) + 1;
    }

    return distribution;
  },
});

/**
 * Get the N lowest-scoring content items from contentLatestGrade,
 * joined with contentItems for title and type.
 */
export const getWorstPerformers = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const worstGrades = await ctx.db
      .query("contentLatestGrade")
      .withIndex("by_score")
      .order("asc")
      .take(args.limit);

    const results = await Promise.all(
      worstGrades.map(async (gradeEntry) => {
        const contentItem = await ctx.db.get(gradeEntry.contentId);
        return {
          ...gradeEntry,
          title: contentItem?.title ?? null,
          type: contentItem?.type ?? null,
        };
      })
    );

    return results;
  },
});

/**
 * Get the N highest-scoring content items from contentLatestGrade,
 * joined with contentItems for title, type, and updatedAt.
 */
export const getBestPerformers = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const bestGrades = await ctx.db
      .query("contentLatestGrade")
      .withIndex("by_score")
      .order("desc")
      .take(args.limit);

    const results = await Promise.all(
      bestGrades.map(async (gradeEntry) => {
        const contentItem = await ctx.db.get(gradeEntry.contentId);
        return {
          ...gradeEntry,
          title: contentItem?.title ?? null,
          type: contentItem?.type ?? null,
          updatedAt: contentItem?.updatedAt ?? null,
        };
      })
    );

    return results;
  },
});

/**
 * Get the N most stale content items — graded content sorted by
 * oldest updatedAt on the underlying contentItem.
 */
export const getStalestContent = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const allGraded = await ctx.db.query("contentLatestGrade").collect();

    const withContent = await Promise.all(
      allGraded.map(async (gradeEntry) => {
        const contentItem = await ctx.db.get(gradeEntry.contentId);
        return {
          ...gradeEntry,
          title: contentItem?.title ?? null,
          type: contentItem?.type ?? null,
          contentUpdatedAt: contentItem?.updatedAt ?? null,
        };
      })
    );

    // Sort by content updatedAt ascending (oldest first), filter out nulls
    return withContent
      .filter((item) => item.contentUpdatedAt !== null)
      .sort((a, b) => a.contentUpdatedAt! - b.contentUpdatedAt!)
      .slice(0, args.limit);
  },
});
