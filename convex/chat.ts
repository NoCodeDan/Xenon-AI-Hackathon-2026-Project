import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Chat session & message management
// ---------------------------------------------------------------------------

/**
 * Create a new chat session for a user.
 */
export const createSession = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionId = await ctx.db.insert("chatSessions", {
      userId: args.userId,
      title: "New Chat",
      createdAt: now,
      updatedAt: now,
    });
    return sessionId;
  },
});

/**
 * Get all chat sessions for the current authenticated user, ordered by
 * most-recently-updated first.
 */
export const getSessions = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // If userId passed directly, use it (guest mode)
    if (args.userId) {
      const sessions = await ctx.db
        .query("chatSessions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId!))
        .collect();
      sessions.sort((a, b) => b.updatedAt - a.updatedAt);
      return sessions;
    }

    // Otherwise try auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const sessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    sessions.sort((a, b) => b.updatedAt - a.updatedAt);

    return sessions;
  },
});

/**
 * Get all messages for a given chat session, using the by_session index.
 */
export const getMessages = query({
  args: {
    sessionId: v.id("chatSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

/**
 * Save a chat message with all fields.
 */
export const saveMessage = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    contentIdsShown: v.optional(v.array(v.id("contentItems"))),
    requestIdCreated: v.optional(v.id("contentRequests")),
    requestIdUpvoted: v.optional(v.id("contentRequests")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const messageId = await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      contentIdsShown: args.contentIdsShown,
      requestIdCreated: args.requestIdCreated,
      requestIdUpvoted: args.requestIdUpvoted,
      createdAt: now,
    });

    // Update the session's updatedAt timestamp
    await ctx.db.patch(args.sessionId, { updatedAt: now });

    return messageId;
  },
});

/**
 * Update the title of a chat session.
 */
export const updateSessionTitle = mutation({
  args: {
    sessionId: v.id("chatSessions"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a chat session and all of its messages.
 */
export const deleteSession = mutation({
  args: {
    sessionId: v.id("chatSessions"),
  },
  handler: async (ctx, args) => {
    // First, delete all messages belonging to this session
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Then delete the session itself
    await ctx.db.delete(args.sessionId);
  },
});
