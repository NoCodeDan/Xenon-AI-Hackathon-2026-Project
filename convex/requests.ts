import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    topicIds: v.array(v.id("topics")),
    requestedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const normalizedTitle = args.title.toLowerCase().trim().replace(/\s+/g, " ");
    const now = Date.now();

    const requestId = await ctx.db.insert("contentRequests", {
      title: args.title,
      normalizedTitle,
      description: args.description,
      topicIds: args.topicIds,
      requestedBy: args.requestedBy,
      status: "open",
      voteCount: 1,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("requestVotes", {
      requestId,
      userId: args.requestedBy,
      createdAt: now,
    });

    return requestId;
  },
});

export const upvote = mutation({
  args: {
    requestId: v.id("contentRequests"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("requestVotes")
      .withIndex("by_request_user", (q) =>
        q.eq("requestId", args.requestId).eq("userId", args.userId)
      )
      .unique();

    if (existing) {
      throw new Error("User has already voted on this request");
    }

    await ctx.db.insert("requestVotes", {
      requestId: args.requestId,
      userId: args.userId,
      createdAt: Date.now(),
    });

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    await ctx.db.patch(args.requestId, {
      voteCount: request.voteCount + 1,
      updatedAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    requestId: v.id("contentRequests"),
    status: v.union(
      v.literal("open"),
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("declined")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const getLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("contentRequests")
      .withIndex("by_votes")
      .order("desc")
      .take(limit);
  },
});

export const getByStatus = query({
  args: {
    status: v.union(
      v.literal("open"),
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("declined")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentRequests")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

export const findSimilar = query({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedTitle = args.title.toLowerCase().trim().replace(/\s+/g, " ");
    return await ctx.db
      .query("contentRequests")
      .withSearchIndex("search_title", (q) =>
        q.search("normalizedTitle", normalizedTitle)
      )
      .collect();
  },
});

export const getById = query({
  args: {
    requestId: v.id("contentRequests"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.requestId);
  },
});

export const linkToContent = mutation({
  args: {
    requestId: v.id("contentRequests"),
    linkedContentId: v.id("contentItems"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, {
      linkedContentId: args.linkedContentId,
      status: "completed",
      updatedAt: Date.now(),
    });
  },
});

export const mergeInto = mutation({
  args: {
    requestId: v.id("contentRequests"),
    targetRequestId: v.id("contentRequests"),
  },
  handler: async (ctx, args) => {
    const sourceRequest = await ctx.db.get(args.requestId);
    if (!sourceRequest) {
      throw new Error("Source request not found");
    }

    const targetRequest = await ctx.db.get(args.targetRequestId);
    if (!targetRequest) {
      throw new Error("Target request not found");
    }

    // Mark the source request as merged
    await ctx.db.patch(args.requestId, {
      mergedIntoId: args.targetRequestId,
      updatedAt: Date.now(),
    });

    // Transfer votes from source to target
    const sourceVotes = await ctx.db
      .query("requestVotes")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .collect();

    for (const vote of sourceVotes) {
      // Check if the user already voted on the target
      const existingVote = await ctx.db
        .query("requestVotes")
        .withIndex("by_request_user", (q) =>
          q.eq("requestId", args.targetRequestId).eq("userId", vote.userId)
        )
        .unique();

      if (!existingVote) {
        await ctx.db.insert("requestVotes", {
          requestId: args.targetRequestId,
          userId: vote.userId,
          createdAt: Date.now(),
        });
      }
    }

    // Recalculate target vote count
    const targetVotes = await ctx.db
      .query("requestVotes")
      .withIndex("by_request", (q) => q.eq("requestId", args.targetRequestId))
      .collect();

    await ctx.db.patch(args.targetRequestId, {
      voteCount: targetVotes.length,
      updatedAt: Date.now(),
    });
  },
});
