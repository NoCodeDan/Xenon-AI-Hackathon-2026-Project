import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new topic snapshot.
 * Automatically supersedes the previous active snapshot for the same topic
 * by setting its `supersededById` to the newly created snapshot.
 */
export const create = mutation({
  args: {
    topicId: v.id("topics"),
    keyPractices: v.array(v.string()),
    deprecatedPractices: v.array(v.string()),
    emergingTrends: v.optional(v.array(v.string())),
    changeVelocity: v.number(),
    confidence: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the current active snapshot for this topic (the one without supersededById)
    const existingSnapshots = await ctx.db
      .query("topicSnapshots")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .collect();

    const previousActive = existingSnapshots.find(
      (s) => s.supersededById === undefined
    );

    // Create the new snapshot
    const newSnapshotId = await ctx.db.insert("topicSnapshots", {
      topicId: args.topicId,
      keyPractices: args.keyPractices,
      deprecatedPractices: args.deprecatedPractices,
      emergingTrends: args.emergingTrends,
      changeVelocity: args.changeVelocity,
      confidence: args.confidence,
      notes: args.notes,
      createdAt: Date.now(),
    });

    // Mark the previous active snapshot as superseded
    if (previousActive) {
      await ctx.db.patch(previousActive._id, {
        supersededById: newSnapshotId,
      });
    }

    // Update the topic's activeSnapshotId
    await ctx.db.patch(args.topicId, {
      activeSnapshotId: newSnapshotId,
    });

    return newSnapshotId;
  },
});

/**
 * Get all snapshots for a topic, using the by_topic index.
 */
export const getByTopic = query({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("topicSnapshots")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .collect();
  },
});

/**
 * Get the active (non-superseded) snapshot for a topic.
 */
export const getActive = query({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    const snapshots = await ctx.db
      .query("topicSnapshots")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .collect();

    return snapshots.find((s) => s.supersededById === undefined) ?? null;
  },
});

/**
 * Get active snapshots for multiple topics at once.
 * Returns a record mapping topic ID to its active snapshot (or null).
 */
export const getActiveBatch = query({
  args: {
    topicIds: v.array(v.id("topics")),
  },
  handler: async (ctx, args) => {
    const results: Record<string, any> = {};

    for (const topicId of args.topicIds) {
      const snapshots = await ctx.db
        .query("topicSnapshots")
        .withIndex("by_topic", (q) => q.eq("topicId", topicId))
        .collect();

      const active = snapshots.find((s) => s.supersededById === undefined);
      results[topicId] = active ?? null;
    }

    return results;
  },
});
