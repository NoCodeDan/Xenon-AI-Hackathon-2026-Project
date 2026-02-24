import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const lookupContent = internalQuery({
  args: {
    url: v.optional(v.string()),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let content = null;

    // 1. Try exact URL match (strip trailing slash + query params)
    if (args.url) {
      const normalizedUrl = args.url.split("?")[0].replace(/\/+$/, "");
      const allContent = await ctx.db.query("contentItems").collect();
      content =
        allContent.find((c) => {
          if (!c.url) return false;
          const norm = c.url.split("?")[0].replace(/\/+$/, "");
          return norm === normalizedUrl;
        }) ?? null;
    }

    // 2. Fallback to title search
    if (!content && args.title) {
      const results = await ctx.db
        .query("contentItems")
        .withSearchIndex("search_title", (q) => q.search("title", args.title!))
        .take(1);
      content = results[0] ?? null;
    }

    if (!content) {
      return { found: false as const };
    }

    // 3. Fetch latest grade
    const gradeRow = await ctx.db
      .query("contentLatestGrade")
      .withIndex("by_content", (q) => q.eq("contentId", content!._id))
      .first();

    // 4. Fetch latest freshness score
    const freshnessRow = await ctx.db
      .query("freshnessScores")
      .withIndex("by_content_created", (q) =>
        q.eq("contentId", content!._id)
      )
      .order("desc")
      .first();

    // 5. Resolve topic objects
    const topics = await Promise.all(
      content.topicIds.map((id) => ctx.db.get(id))
    );

    return {
      found: true as const,
      content: {
        _id: content._id,
        title: content.title,
        type: content.type,
        url: content.url,
        description: content.description,
        skillLevel: content.skillLevel,
        updatedAt: content.updatedAt,
        publishedAt: content.publishedAt,
      },
      grade: gradeRow
        ? {
            grade: gradeRow.grade,
            overallScore: gradeRow.overallScore,
            updatedAt: gradeRow.updatedAt,
          }
        : null,
      freshness: freshnessRow
        ? {
            overallScore: freshnessRow.overallScore,
            recencyScore: freshnessRow.recencyScore,
            alignmentScore: freshnessRow.alignmentScore,
            demandScore: freshnessRow.demandScore,
            confidence: freshnessRow.confidence,
            outdatedTopics: freshnessRow.outdatedTopics,
            missingTopics: freshnessRow.missingTopics,
            industryBenchmark: freshnessRow.industryBenchmark,
            recommendedAction: freshnessRow.recommendedAction,
            grade: freshnessRow.grade,
            createdAt: freshnessRow.createdAt,
          }
        : null,
      topics: topics
        .filter((t): t is NonNullable<typeof t> => t !== null)
        .map((t) => ({
          _id: t._id,
          name: t.name,
          slug: t.slug,
          domain: t.domain,
        })),
    };
  },
});
