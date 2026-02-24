import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper: resolve the current user from auth identity, falling back to guest user
async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q: any) => q.eq("externalId", identity.subject))
      .unique();
    if (user) return user;
  }
  // Fall back to guest user (dev/demo mode)
  return await ctx.db
    .query("users")
    .withIndex("by_externalId", (q: any) => q.eq("externalId", "guest"))
    .unique();
}

export const toggleBookmark = mutation({
  args: {
    contentId: v.id("contentItems"),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("contentBookmarks")
      .withIndex("by_user_content", (q: any) =>
        q.eq("userId", user._id).eq("contentId", args.contentId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return null;
    }

    return await ctx.db.insert("contentBookmarks", {
      userId: user._id,
      contentId: args.contentId,
      priority: args.priority,
      createdAt: Date.now(),
    });
  },
});

export const updatePriority = mutation({
  args: {
    contentId: v.id("contentItems"),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("contentBookmarks")
      .withIndex("by_user_content", (q: any) =>
        q.eq("userId", user._id).eq("contentId", args.contentId)
      )
      .unique();

    if (!existing) throw new Error("Bookmark not found");

    await ctx.db.patch(existing._id, { priority: args.priority });
  },
});

export const getMyBookmarks = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const bookmarks = await ctx.db
      .query("contentBookmarks")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    // Batch-join with contentItems + contentLatestGrade
    const contentIds = bookmarks.map((b) => b.contentId);
    const contentItems = await Promise.all(contentIds.map((id) => ctx.db.get(id)));

    // Collect all grades via index, build Map
    const gradeEntries = await Promise.all(
      contentIds.map((id) =>
        ctx.db
          .query("contentLatestGrade")
          .withIndex("by_content", (q: any) => q.eq("contentId", id))
          .unique()
      )
    );
    const gradeMap = new Map(
      gradeEntries
        .filter((g): g is NonNullable<typeof g> => g !== null)
        .map((g) => [g.contentId, g])
    );

    return bookmarks
      .map((bookmark, i) => {
        const content = contentItems[i];
        if (!content) return null;
        const grade = gradeMap.get(content._id) ?? null;
        return {
          ...bookmark,
          title: content.title,
          type: content.type,
          grade: grade?.grade ?? null,
          overallScore: grade?.overallScore ?? null,
        };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);
  },
});

export const getBookmarkForContent = query({
  args: {
    contentId: v.id("contentItems"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    return await ctx.db
      .query("contentBookmarks")
      .withIndex("by_user_content", (q: any) =>
        q.eq("userId", user._id).eq("contentId", args.contentId)
      )
      .unique();
  },
});
