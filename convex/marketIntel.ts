// ---------------------------------------------------------------------------
// Market Intelligence queries + internal mutations (NO "use node")
// ---------------------------------------------------------------------------

import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * getMarketOverview — Single composite query powering most widgets:
 * - Latest marketIntelSnapshots entry
 * - Top trend signals grouped by source
 * - Competitor gap summary
 * - Job alignment per topic + overall score
 */
export const getMarketOverview = query({
  args: {},
  handler: async (ctx) => {
    const [latestSnapshot, allSignals, allCompetitorCoverage, allJobDemand, allTopics, allContent] =
      await Promise.all([
        ctx.db.query("marketIntelSnapshots").withIndex("by_created").order("desc").first(),
        ctx.db.query("marketTrendSignals").collect(),
        ctx.db.query("competitorCoverage").collect(),
        ctx.db.query("jobMarketDemand").collect(),
        ctx.db.query("topics").collect(),
        ctx.db.query("contentItems").collect(),
      ]);

    // Build Treehouse topic coverage map (slug → content count)
    const treehouseCoverage = new Map<string, number>();
    const topicSlugMap = new Map(allTopics.map((t) => [t._id.toString(), t.slug]));
    for (const item of allContent) {
      for (const topicId of item.topicIds) {
        const slug = topicSlugMap.get(topicId.toString());
        if (slug) {
          treehouseCoverage.set(slug, (treehouseCoverage.get(slug) ?? 0) + 1);
        }
      }
    }

    // Group signals by source
    const signalsBySource: Record<string, typeof allSignals> = {};
    for (const signal of allSignals) {
      if (!signalsBySource[signal.source]) signalsBySource[signal.source] = [];
      signalsBySource[signal.source].push(signal);
    }
    // Sort each group by score desc
    for (const source of Object.keys(signalsBySource)) {
      signalsBySource[source].sort((a, b) => b.signalScore - a.signalScore);
    }

    // Competitor gap summary: topics where at least 2 competitors have deep/moderate coverage but Treehouse has 0 content
    const competitorTopicDepth = new Map<string, number>();
    for (const cc of allCompetitorCoverage) {
      if (cc.coverageLevel === "deep" || cc.coverageLevel === "moderate") {
        competitorTopicDepth.set(cc.topicSlug, (competitorTopicDepth.get(cc.topicSlug) ?? 0) + 1);
      }
    }
    const competitorGaps: Array<{ topicSlug: string; topicLabel: string; competitorsWithCoverage: number }> = [];
    const topicLabelMap = new Map<string, string>();
    for (const cc of allCompetitorCoverage) {
      topicLabelMap.set(cc.topicSlug, cc.topicLabel);
    }
    for (const [slug, count] of competitorTopicDepth.entries()) {
      if (count >= 2 && (treehouseCoverage.get(slug) ?? 0) === 0) {
        competitorGaps.push({ topicSlug: slug, topicLabel: topicLabelMap.get(slug) ?? slug, competitorsWithCoverage: count });
      }
    }

    // Latest fetch timestamp
    const latestFetchedAt = allSignals.length > 0
      ? Math.max(...allSignals.map((s) => s.fetchedAt))
      : null;

    return {
      latestSnapshot,
      signalsBySource,
      competitorGaps,
      treehouseCoverage: Object.fromEntries(treehouseCoverage),
      latestFetchedAt,
    };
  },
});

/**
 * getTrendSignals — All signals from latest fetch, sorted by score. Optional source filter.
 */
export const getTrendSignals = query({
  args: {
    source: v.optional(
      v.union(
        v.literal("github_trending"),
        v.literal("stackoverflow"),
        v.literal("job_postings"),
        v.literal("google_trends"),
        v.literal("ai_synthesized")
      )
    ),
  },
  handler: async (ctx, args) => {
    let signals;
    if (args.source) {
      signals = await ctx.db
        .query("marketTrendSignals")
        .withIndex("by_source", (q) => q.eq("source", args.source!))
        .collect();
    } else {
      signals = await ctx.db.query("marketTrendSignals").collect();
    }
    return signals.sort((a, b) => b.signalScore - a.signalScore);
  },
});

/**
 * getCompetitorMatrix — Topics × competitors matrix with coverage levels.
 * Joins with Treehouse topics + contentItems to show Treehouse's own coverage.
 */
export const getCompetitorMatrix = query({
  args: {},
  handler: async (ctx) => {
    const [allCoverage, allTopics, allContent] = await Promise.all([
      ctx.db.query("competitorCoverage").collect(),
      ctx.db.query("topics").collect(),
      ctx.db.query("contentItems").collect(),
    ]);

    // Build Treehouse coverage by slug
    const topicSlugMap = new Map(allTopics.map((t) => [t._id.toString(), t.slug]));
    const treehouseContentCount = new Map<string, number>();
    for (const item of allContent) {
      for (const topicId of item.topicIds) {
        const slug = topicSlugMap.get(topicId.toString());
        if (slug) {
          treehouseContentCount.set(slug, (treehouseContentCount.get(slug) ?? 0) + 1);
        }
      }
    }

    // Collect unique topic slugs from competitor coverage
    const topicSlugs = [...new Set(allCoverage.map((c) => c.topicSlug))];

    // Build matrix: per topic, { topicSlug, topicLabel, treehouse, codecademy, freecodecamp, udemy }
    type CoverageLevel = "deep" | "moderate" | "shallow" | "none";
    const matrix: Array<{
      topicSlug: string;
      topicLabel: string;
      treehouse: { contentCount: number; level: CoverageLevel };
      codecademy: CoverageLevel;
      freecodecamp: CoverageLevel;
      udemy: CoverageLevel;
    }> = [];

    const coverageLookup = new Map<string, CoverageLevel>();
    for (const c of allCoverage) {
      coverageLookup.set(`${c.competitor}:${c.topicSlug}`, c.coverageLevel);
    }

    for (const slug of topicSlugs) {
      const label = allCoverage.find((c) => c.topicSlug === slug)?.topicLabel ?? slug;
      const thCount = treehouseContentCount.get(slug) ?? 0;
      const thLevel: CoverageLevel = thCount >= 10 ? "deep" : thCount >= 4 ? "moderate" : thCount >= 1 ? "shallow" : "none";

      matrix.push({
        topicSlug: slug,
        topicLabel: label,
        treehouse: { contentCount: thCount, level: thLevel },
        codecademy: coverageLookup.get(`codecademy:${slug}`) ?? "none",
        freecodecamp: coverageLookup.get(`freecodecamp:${slug}`) ?? "none",
        udemy: coverageLookup.get(`udemy:${slug}`) ?? "none",
      });
    }

    return matrix;
  },
});

/**
 * getJobAlignmentData — jobMarketDemand rows joined with Treehouse topic coverage.
 */
export const getJobAlignmentData = query({
  args: {},
  handler: async (ctx) => {
    const [allJobDemand, allTopics, allContent, allGrades] = await Promise.all([
      ctx.db.query("jobMarketDemand").collect(),
      ctx.db.query("topics").collect(),
      ctx.db.query("contentItems").collect(),
      ctx.db.query("contentLatestGrade").collect(),
    ]);

    // Build Treehouse coverage
    const topicSlugMap = new Map(allTopics.map((t) => [t._id.toString(), t.slug]));
    const contentBySlug = new Map<string, string[]>();
    for (const item of allContent) {
      for (const topicId of item.topicIds) {
        const slug = topicSlugMap.get(topicId.toString());
        if (slug) {
          if (!contentBySlug.has(slug)) contentBySlug.set(slug, []);
          contentBySlug.get(slug)!.push(item._id.toString());
        }
      }
    }

    // Build grade lookup
    const gradeMap = new Map(allGrades.map((g) => [g.contentId.toString(), g]));

    return allJobDemand
      .sort((a, b) => b.demandScore - a.demandScore)
      .map((demand) => {
        const contentIds = contentBySlug.get(demand.topicSlug) ?? [];
        const grades = contentIds
          .map((id) => gradeMap.get(id))
          .filter((g): g is NonNullable<typeof g> => g !== undefined);
        const avgGrade = grades.length > 0
          ? Math.round(grades.reduce((sum, g) => sum + g.overallScore, 0) / grades.length)
          : null;

        return {
          ...demand,
          treehouseContentCount: contentIds.length,
          treehouseAvgScore: avgGrade,
        };
      });
  },
});

/**
 * getMarketIntelTrend — Last N snapshots for trend charts.
 */
export const getMarketIntelTrend = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 12;
    return ctx.db
      .query("marketIntelSnapshots")
      .withIndex("by_created")
      .order("desc")
      .take(limit);
  },
});

// ---------------------------------------------------------------------------
// Internal mutations (called from fetch actions)
// ---------------------------------------------------------------------------

export const storeTrendSignals = internalMutation({
  args: {
    signals: v.array(
      v.object({
        topicSlug: v.string(),
        source: v.union(
          v.literal("github_trending"),
          v.literal("stackoverflow"),
          v.literal("job_postings"),
          v.literal("google_trends"),
          v.literal("ai_synthesized")
        ),
        signalName: v.string(),
        signalScore: v.number(),
        rawData: v.optional(v.string()),
        fetchedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Delete old signals for same sources being updated
    const sourcesBeingUpdated = [...new Set(args.signals.map((s) => s.source))];
    for (const source of sourcesBeingUpdated) {
      const old = await ctx.db
        .query("marketTrendSignals")
        .withIndex("by_source", (q) => q.eq("source", source))
        .collect();
      for (const row of old) {
        await ctx.db.delete(row._id);
      }
    }
    // Insert new
    for (const signal of args.signals) {
      await ctx.db.insert("marketTrendSignals", signal);
    }
  },
});

export const storeCompetitorCoverage = internalMutation({
  args: {
    coverage: v.array(
      v.object({
        competitor: v.union(
          v.literal("codecademy"),
          v.literal("freecodecamp"),
          v.literal("udemy")
        ),
        topicSlug: v.string(),
        topicLabel: v.string(),
        coverageLevel: v.union(
          v.literal("deep"),
          v.literal("moderate"),
          v.literal("shallow"),
          v.literal("none")
        ),
        contentCount: v.optional(v.number()),
        sourceUrl: v.optional(v.string()),
        fetchedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Delete old coverage
    const old = await ctx.db.query("competitorCoverage").collect();
    for (const row of old) {
      await ctx.db.delete(row._id);
    }
    for (const row of args.coverage) {
      await ctx.db.insert("competitorCoverage", row);
    }
  },
});

export const storeJobMarketDemand = internalMutation({
  args: {
    demand: v.array(
      v.object({
        topicSlug: v.string(),
        topicLabel: v.string(),
        demandScore: v.number(),
        jobPostingCount: v.optional(v.number()),
        avgSalarySignal: v.optional(v.string()),
        growthTrend: v.union(
          v.literal("rising"),
          v.literal("stable"),
          v.literal("declining")
        ),
        fetchedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Delete old demand
    const old = await ctx.db.query("jobMarketDemand").collect();
    for (const row of old) {
      await ctx.db.delete(row._id);
    }
    for (const row of args.demand) {
      await ctx.db.insert("jobMarketDemand", row);
    }
  },
});

export const generateMarketSnapshot = internalMutation({
  args: {
    overallAlignmentScore: v.number(),
    trendGapCount: v.number(),
    competitorGapCount: v.number(),
    jobAlignmentScore: v.number(),
    topGaps: v.array(
      v.object({
        topicLabel: v.string(),
        gapType: v.string(),
        severity: v.union(
          v.literal("critical"),
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("marketIntelSnapshots", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
