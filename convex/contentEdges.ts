import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    parentId: v.id("contentItems"),
    childId: v.id("contentItems"),
    edgeType: v.union(
      v.literal("contains"),
      v.literal("prerequisite"),
      v.literal("related")
    ),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const edgeId = await ctx.db.insert("contentEdges", {
      parentId: args.parentId,
      childId: args.childId,
      edgeType: args.edgeType,
      order: args.order,
    });
    return edgeId;
  },
});

export const getByParent = query({
  args: {
    parentId: v.id("contentItems"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentEdges")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();
  },
});

export const getByParentOfType = query({
  args: {
    parentId: v.id("contentItems"),
    edgeType: v.union(
      v.literal("contains"),
      v.literal("prerequisite"),
      v.literal("related")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentEdges")
      .withIndex("by_parent_type", (q) =>
        q.eq("parentId", args.parentId).eq("edgeType", args.edgeType)
      )
      .collect();
  },
});

export const getByChild = query({
  args: {
    childId: v.id("contentItems"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentEdges")
      .withIndex("by_child", (q) => q.eq("childId", args.childId))
      .collect();
  },
});

export const bulkCreate = mutation({
  args: {
    edges: v.array(
      v.object({
        parentId: v.id("contentItems"),
        childId: v.id("contentItems"),
        edgeType: v.union(
          v.literal("contains"),
          v.literal("prerequisite"),
          v.literal("related")
        ),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const edgeIds = [];
    for (const edge of args.edges) {
      const edgeId = await ctx.db.insert("contentEdges", {
        parentId: edge.parentId,
        childId: edge.childId,
        edgeType: edge.edgeType,
        order: edge.order,
      });
      edgeIds.push(edgeId);
    }
    return edgeIds;
  },
});
