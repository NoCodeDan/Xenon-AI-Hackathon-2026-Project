import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

// ---------------------------------------------------------------------------
// Query: look up cached OG data by URL
// ---------------------------------------------------------------------------

export const get = query({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ogCache")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .unique();
  },
});

// ---------------------------------------------------------------------------
// Internal mutation: store OG data in cache
// ---------------------------------------------------------------------------

export const store = internalMutation({
  args: {
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    siteName: v.optional(v.string()),
    failed: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if already cached (avoid duplicates from race conditions)
    const existing = await ctx.db
      .query("ogCache")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("ogCache", {
      ...args,
      fetchedAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Mutation: clear all failed cache entries so they get re-fetched
// ---------------------------------------------------------------------------

export const clearFailed = mutation({
  handler: async (ctx) => {
    const failed = await ctx.db.query("ogCache").collect();
    let count = 0;
    for (const entry of failed) {
      if (entry.failed) {
        await ctx.db.delete(entry._id);
        count++;
      }
    }
    return { deleted: count };
  },
});
