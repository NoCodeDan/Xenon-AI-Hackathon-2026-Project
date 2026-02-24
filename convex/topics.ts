import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    domain: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const topicId = await ctx.db.insert("topics", {
      name: args.name,
      slug: args.slug,
      domain: args.domain,
      description: args.description,
    });
    return topicId;
  },
});

export const update = mutation({
  args: {
    id: v.id("topics"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    domain: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    // Filter out undefined values so we only patch provided fields
    const updates: Record<string, string> = {};
    if (fields.name !== undefined) updates.name = fields.name;
    if (fields.slug !== undefined) updates.slug = fields.slug;
    if (fields.domain !== undefined) updates.domain = fields.domain;
    if (fields.description !== undefined) updates.description = fields.description;

    await ctx.db.patch(id, updates);
    return id;
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("topics").collect();
  },
});

export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("topics")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const getByDomain = query({
  args: {
    domain: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("topics")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .collect();
  },
});

/**
 * Get the N topics with the highest changeVelocity from their active snapshots.
 * Returns topic info + snapshot velocity data.
 */
export const getTrendingTopics = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const allTopics = await ctx.db.query("topics").collect();
    // Fetch content items ONCE, then count per topic in memory
    const allContent = await ctx.db.query("contentItems").collect();

    // Build a map of topicId -> content count
    const contentCountByTopic = new Map<string, number>();
    for (const item of allContent) {
      for (const topicId of item.topicIds) {
        contentCountByTopic.set(
          topicId,
          (contentCountByTopic.get(topicId) ?? 0) + 1
        );
      }
    }

    // Batch-fetch all active snapshots in one pass
    const snapshotIds = allTopics
      .map((t) => t.activeSnapshotId)
      .filter((id): id is typeof id & {} => id !== undefined);
    const snapshots = await Promise.all(snapshotIds.map((id) => ctx.db.get(id)));
    const snapshotMap = new Map(
      snapshots
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .map((s) => [s._id.toString(), s])
    );

    const topicsWithSnapshots = allTopics.map((topic) => {
      const activeSnapshot = topic.activeSnapshotId
        ? snapshotMap.get(topic.activeSnapshotId.toString()) ?? null
        : null;

      return {
        _id: topic._id,
        name: topic.name,
        domain: topic.domain,
        changeVelocity: activeSnapshot?.changeVelocity ?? 0,
        emergingTrends: activeSnapshot?.emergingTrends ?? [],
        contentCount: contentCountByTopic.get(topic._id as string) ?? 0,
      };
    });

    // Sort by changeVelocity descending and take limit
    return topicsWithSnapshots
      .sort((a, b) => b.changeVelocity - a.changeVelocity)
      .slice(0, args.limit);
  },
});

export const setActiveSnapshot = mutation({
  args: {
    id: v.id("topics"),
    activeSnapshotId: v.id("topicSnapshots"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      activeSnapshotId: args.activeSnapshotId,
    });
    return args.id;
  },
});
