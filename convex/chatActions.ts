import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Public action wrapper around the internal chatAgent.sendMessage action.
 * This allows the frontend to call the AI chat agent via useAction.
 */
export const sendMessage = action({
  args: {
    sessionId: v.id("chatSessions"),
    message: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const result = await ctx.runAction(internal.chatAgent.sendMessage, {
      sessionId: args.sessionId,
      userMessage: args.message,
      userId: args.userId,
    });
    return result as string;
  },
});
