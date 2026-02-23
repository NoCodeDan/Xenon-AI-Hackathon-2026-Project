import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

// ---------- Mutations ----------

export const create = mutation({
  args: {
    title: v.string(),
    type: v.union(
      v.literal("track"),
      v.literal("course"),
      v.literal("stage"),
      v.literal("video"),
      v.literal("practice"),
      v.literal("workshop"),
      v.literal("bonus")
    ),
    description: v.optional(v.string()),
    topicIds: v.array(v.id("topics")),
    url: v.optional(v.string()),
    duration: v.optional(v.number()),
    skillLevel: v.optional(
      v.union(
        v.literal("Beginner"),
        v.literal("Intermediate"),
        v.literal("Advanced")
      )
    ),
    estimatedMinutes: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("contentItems", {
      ...args,
      createdAt: now,
      updatedAt: now,
      gradingStatus: "pending",
    });
    return id;
  },
});

export const bulkImport = mutation({
  args: {
    items: v.array(
      v.object({
        title: v.string(),
        type: v.union(
          v.literal("track"),
          v.literal("course"),
          v.literal("stage"),
          v.literal("video"),
          v.literal("practice"),
          v.literal("workshop"),
          v.literal("bonus")
        ),
        description: v.optional(v.string()),
        topicIds: v.array(v.id("topics")),
        url: v.optional(v.string()),
        duration: v.optional(v.number()),
        skillLevel: v.optional(
          v.union(
            v.literal("Beginner"),
            v.literal("Intermediate"),
            v.literal("Advanced")
          )
        ),
        estimatedMinutes: v.optional(v.number()),
        publishedAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids = [];
    for (const item of args.items) {
      const id = await ctx.db.insert("contentItems", {
        ...item,
        createdAt: now,
        updatedAt: now,
        gradingStatus: "pending",
      });
      ids.push(id);
    }
    return ids;
  },
});

export const update = mutation({
  args: {
    id: v.id("contentItems"),
    title: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("track"),
        v.literal("course"),
        v.literal("stage"),
        v.literal("video"),
        v.literal("practice")
      )
    ),
    description: v.optional(v.string()),
    topicIds: v.optional(v.array(v.id("topics"))),
    url: v.optional(v.string()),
    duration: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    // Remove undefined fields so we only patch what was provided
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const setGradingStatus = mutation({
  args: {
    id: v.id("contentItems"),
    gradingStatus: v.union(
      v.literal("pending"),
      v.literal("grading"),
      v.literal("graded"),
      v.literal("failed")
    ),
    lastGradingError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      gradingStatus: args.gradingStatus,
      updatedAt: Date.now(),
    };
    if (args.lastGradingError !== undefined) {
      patch.lastGradingError = args.lastGradingError;
    }
    await ctx.db.patch(args.id, patch);
    return args.id;
  },
});

// ---------- Queries ----------

export const getById = query({
  args: { id: v.id("contentItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return null;

    // Resolve topics
    const topics = await Promise.all(
      item.topicIds.map(async (topicId) => {
        const topic = await ctx.db.get(topicId);
        return topic ? { _id: topic._id, name: topic.name, slug: topic.slug, domain: topic.domain } : null;
      })
    );

    return {
      ...item,
      topics: topics.filter(Boolean),
    };
  },
});

export const getAll = query({
  args: {
    paginationOpts: v.optional(
      v.object({
        cursor: v.optional(v.string()),
        numItems: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (args.paginationOpts) {
      // Use the Convex built-in paginate helper on the table scan
      const results = await ctx.db
        .query("contentItems")
        .order("desc")
        .paginate({
          cursor: (args.paginationOpts.cursor ?? null) as any,
          numItems: args.paginationOpts.numItems,
        });
      return results;
    }
    // No pagination — return everything
    return await ctx.db.query("contentItems").order("desc").collect();
  },
});

export const search = query({
  args: {
    searchTerm: v.string(),
    type: v.optional(
      v.union(
        v.literal("track"),
        v.literal("course"),
        v.literal("stage"),
        v.literal("video"),
        v.literal("practice"),
        v.literal("workshop"),
        v.literal("bonus")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("contentItems")
      .withSearchIndex("search_title", (q) => {
        const base = q.search("title", args.searchTerm);
        if (args.type) {
          return base.eq("type", args.type);
        }
        return base;
      });
    return await q.take(args.limit ?? 50);
  },
});

export const getByType = query({
  args: {
    type: v.union(
      v.literal("track"),
      v.literal("course"),
      v.literal("stage"),
      v.literal("video"),
      v.literal("practice"),
      v.literal("workshop"),
      v.literal("bonus")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentItems")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();
  },
});

export const getByTopic = query({
  args: { topicId: v.id("topics") },
  handler: async (ctx, args) => {
    // Convex does not support indexing into array fields, so we scan all
    // contentItems and filter in-memory by whether topicIds includes the
    // given topicId.
    const all = await ctx.db.query("contentItems").collect();
    return all.filter((item) => item.topicIds.includes(args.topicId));
  },
});

export const getWithGrades = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("contentItems").collect();

    // Preload all topics for category resolution
    const allTopics = await ctx.db.query("topics").collect();
    const topicMap = new Map(
      allTopics.map((t) => [t._id.toString(), t])
    );

    const results = await Promise.all(
      items.map(async (item) => {
        const latestGrade = await ctx.db
          .query("contentLatestGrade")
          .withIndex("by_content", (q) => q.eq("contentId", item._id))
          .unique();

        // Resolve primary topic for category
        const primaryTopicId = item.topicIds[0];
        const primaryTopic = primaryTopicId
          ? topicMap.get(primaryTopicId.toString())
          : null;

        return {
          ...item,
          latestGrade: latestGrade ?? null,
          topicName: primaryTopic?.name ?? null,
          category: primaryTopic?.domain ?? null,
        };
      })
    );

    return results;
  },
});

export const getChildren = query({
  args: {
    parentId: v.id("contentItems"),
    edgeType: v.optional(
      v.union(
        v.literal("contains"),
        v.literal("prerequisite"),
        v.literal("related")
      )
    ),
  },
  handler: async (ctx, args) => {
    let edgesQuery;
    if (args.edgeType) {
      edgesQuery = ctx.db
        .query("contentEdges")
        .withIndex("by_parent_type", (q) =>
          q.eq("parentId", args.parentId).eq("edgeType", args.edgeType!)
        );
    } else {
      edgesQuery = ctx.db
        .query("contentEdges")
        .withIndex("by_parent", (q) => q.eq("parentId", args.parentId));
    }

    const edges = await edgesQuery.collect();
    // Sort by the order field
    edges.sort((a, b) => a.order - b.order);

    // Resolve each child content item
    const children = await Promise.all(
      edges.map(async (edge) => {
        const child = await ctx.db.get(edge.childId);
        return {
          edge,
          content: child,
        };
      })
    );

    return children;
  },
});

// ---------- Paginated + Stats Queries ----------

export const getContentPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    type: v.optional(
      v.union(
        v.literal("track"),
        v.literal("course"),
        v.literal("stage"),
        v.literal("video"),
        v.literal("practice"),
        v.literal("workshop"),
        v.literal("bonus")
      )
    ),
    grade: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Preload all topics once for enrichment
    const allTopics = await ctx.db.query("topics").collect();
    const topicMap = new Map(
      allTopics.map((t) => [t._id.toString(), t])
    );

    if (args.grade) {
      // When filtering by grade, paginate contentLatestGrade via by_grade index
      const gradePage = await ctx.db
        .query("contentLatestGrade")
        .withIndex("by_grade", (q) => q.eq("grade", args.grade!))
        .paginate(args.paginationOpts);

      // Resolve each content item and apply type filter in-memory
      const enrichedPage = [];
      for (const gradeEntry of gradePage.page) {
        const item = await ctx.db.get(gradeEntry.contentId);
        if (!item) continue;
        if (args.type && item.type !== args.type) continue;

        const primaryTopicId = item.topicIds[0];
        const primaryTopic = primaryTopicId
          ? topicMap.get(primaryTopicId.toString())
          : null;

        enrichedPage.push({
          ...item,
          latestGrade: gradeEntry,
          topicName: primaryTopic?.name ?? null,
          category: primaryTopic?.domain ?? null,
        });
      }

      return {
        ...gradePage,
        page: enrichedPage,
      };
    }

    // No grade filter — paginate contentItems directly
    let q;
    if (args.type) {
      q = ctx.db
        .query("contentItems")
        .withIndex("by_type", (idx) => idx.eq("type", args.type!));
    } else {
      q = ctx.db.query("contentItems").order("desc");
    }

    const itemPage = await q.paginate(args.paginationOpts);

    // Enrich with grade + topic info
    const enrichedPage = await Promise.all(
      itemPage.page.map(async (item) => {
        const latestGrade = await ctx.db
          .query("contentLatestGrade")
          .withIndex("by_content", (q) => q.eq("contentId", item._id))
          .unique();

        const primaryTopicId = item.topicIds[0];
        const primaryTopic = primaryTopicId
          ? topicMap.get(primaryTopicId.toString())
          : null;

        return {
          ...item,
          latestGrade: latestGrade ?? null,
          topicName: primaryTopic?.name ?? null,
          category: primaryTopic?.domain ?? null,
        };
      })
    );

    return {
      ...itemPage,
      page: enrichedPage,
    };
  },
});

export const getContentStats = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("contentItems").collect();
    const allTopics = await ctx.db.query("topics").collect();
    const topicMap = new Map(
      allTopics.map((t) => [t._id.toString(), t])
    );

    const typeCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    for (const item of items) {
      typeCounts[item.type] = (typeCounts[item.type] ?? 0) + 1;

      const primaryTopicId = item.topicIds[0];
      const primaryTopic = primaryTopicId
        ? topicMap.get(primaryTopicId.toString())
        : null;
      const category = primaryTopic?.domain ?? "other";
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    }

    return {
      total: items.length,
      typeCounts,
      categoryCounts,
    };
  },
});

export const getParents = query({
  args: {
    childId: v.id("contentItems"),
    edgeType: v.optional(
      v.union(
        v.literal("contains"),
        v.literal("prerequisite"),
        v.literal("related")
      )
    ),
  },
  handler: async (ctx, args) => {
    const edges = await ctx.db
      .query("contentEdges")
      .withIndex("by_child", (q) => q.eq("childId", args.childId))
      .collect();

    // Filter by edgeType in-memory if specified (by_child index only covers childId)
    const filtered = args.edgeType
      ? edges.filter((e) => e.edgeType === args.edgeType)
      : edges;

    // Resolve each parent content item
    const parents = await Promise.all(
      filtered.map(async (edge) => {
        const parent = await ctx.db.get(edge.parentId);
        return {
          edge,
          content: parent,
        };
      })
    );

    return parents;
  },
});
