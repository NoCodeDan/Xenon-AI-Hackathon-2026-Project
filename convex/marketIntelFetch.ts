"use node";

// ---------------------------------------------------------------------------
// Market Intelligence fetch actions — GitHub/SO API calls + Claude analysis
// Pattern: follows convex/topicHealth.ts — lazy Anthropic client, structured
// Claude prompt, JSON parse, ctx.runMutation to persist.
// ---------------------------------------------------------------------------

import { v } from "convex/values";
import { internalAction, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { buildMarketIntelPrompt } from "./prompts/marketIntel";

// ---------------------------------------------------------------------------
// Anthropic client (lazily initialised so env var is read at runtime)
// ---------------------------------------------------------------------------

function getClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ---------------------------------------------------------------------------
// GitHub Trending
// ---------------------------------------------------------------------------

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
}

export const fetchGitHubTrending = internalAction({
  args: {},
  handler: async (): Promise<Array<{ name: string; language: string; stars: number; description: string }>> => {
    const results: Array<{ name: string; language: string; stars: number; description: string }> = [];

    // Search for recently popular repos across key languages
    const languages = ["javascript", "typescript", "python", "rust", "go"];
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    for (const lang of languages) {
      try {
        const url = `https://api.github.com/search/repositories?q=language:${lang}+created:>${oneWeekAgo}&sort=stars&order=desc&per_page=5`;
        const res = await fetch(url, {
          headers: { Accept: "application/vnd.github.v3+json" },
        });

        if (!res.ok) {
          console.warn(`GitHub API returned ${res.status} for ${lang}`);
          continue;
        }

        const data = await res.json();
        for (const repo of (data.items ?? []) as GitHubRepo[]) {
          results.push({
            name: repo.full_name,
            language: repo.language ?? lang,
            stars: repo.stargazers_count,
            description: repo.description ?? "",
          });
        }

        // Small delay to respect rate limits
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.warn(`Failed to fetch GitHub trending for ${lang}:`, err);
      }
    }

    return results;
  },
});

// ---------------------------------------------------------------------------
// StackOverflow Tags
// ---------------------------------------------------------------------------

export const fetchStackOverflowTags = internalAction({
  args: {},
  handler: async (): Promise<Array<{ name: string; count: number }>> => {
    try {
      const res = await fetch(
        "https://api.stackexchange.com/2.3/tags?order=desc&sort=popular&site=stackoverflow&pagesize=30"
      );

      if (!res.ok) {
        console.warn(`StackOverflow API returned ${res.status}`);
        return [];
      }

      const data = await res.json();
      return (data.items ?? []).map((tag: { name: string; count: number }) => ({
        name: tag.name,
        count: tag.count,
      }));
    } catch (err) {
      console.warn("Failed to fetch StackOverflow tags:", err);
      return [];
    }
  },
});

// ---------------------------------------------------------------------------
// Claude Market Analysis
// ---------------------------------------------------------------------------

export const analyzeMarketWithClaude = internalAction({
  args: {
    githubData: v.optional(v.array(v.object({
      name: v.string(),
      language: v.string(),
      stars: v.number(),
      description: v.string(),
    }))),
    stackoverflowData: v.optional(v.array(v.object({
      name: v.string(),
      count: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    // Fetch Treehouse's current topics + content counts
    const topics: Array<{ _id: string; name: string; slug: string; domain: string }> =
      await ctx.runQuery(api.topics.getAll, {});
    const allContentResult = await ctx.runQuery(api.content.getAll, {});
    const allContent = Array.isArray(allContentResult) ? allContentResult : allContentResult.page;

    // Count content per topic slug
    const topicIdToSlug = new Map(topics.map((t) => [t._id, t.slug]));
    const contentCountBySlug = new Map<string, number>();
    for (const item of allContent) {
      for (const topicId of item.topicIds) {
        const slug = topicIdToSlug.get(topicId);
        if (slug) {
          contentCountBySlug.set(slug, (contentCountBySlug.get(slug) ?? 0) + 1);
        }
      }
    }

    const treehouseTopics = topics.map((t) => ({
      slug: t.slug,
      name: t.name,
      domain: t.domain,
      contentCount: contentCountBySlug.get(t.slug) ?? 0,
    }));

    const prompt = buildMarketIntelPrompt({
      treehouseTopics,
      githubTrending: args.githubData,
      stackoverflowTags: args.stackoverflowData,
    });

    const client = getClient();
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude returned no text content for market analysis");
    }

    const parsed = JSON.parse(textBlock.text);
    const now = Date.now();

    // Store competitor coverage
    if (parsed.competitorCoverage && Array.isArray(parsed.competitorCoverage)) {
      await ctx.runMutation(internal.marketIntel.storeCompetitorCoverage, {
        coverage: parsed.competitorCoverage.map((c: any) => ({
          competitor: c.competitor,
          topicSlug: c.topicSlug,
          topicLabel: c.topicLabel,
          coverageLevel: c.coverageLevel,
          fetchedAt: now,
        })),
      });
    }

    // Store job market demand
    if (parsed.jobMarketDemand && Array.isArray(parsed.jobMarketDemand)) {
      await ctx.runMutation(internal.marketIntel.storeJobMarketDemand, {
        demand: parsed.jobMarketDemand.map((d: any) => ({
          topicSlug: d.topicSlug,
          topicLabel: d.topicLabel,
          demandScore: d.demandScore,
          jobPostingCount: d.jobPostingCount,
          avgSalarySignal: d.avgSalarySignal,
          growthTrend: d.growthTrend,
          fetchedAt: now,
        })),
      });
    }

    // Store AI-synthesized trend signals from Claude's analysis
    if (parsed.trendingTopics && Array.isArray(parsed.trendingTopics)) {
      await ctx.runMutation(internal.marketIntel.storeTrendSignals, {
        signals: parsed.trendingTopics.map((t: any) => ({
          topicSlug: t.topicSlug,
          source: "ai_synthesized" as const,
          signalName: t.signalName,
          signalScore: t.signalScore,
          fetchedAt: now,
        })),
      });
    }

    // Generate snapshot
    const gapAnalysis = parsed.gapAnalysis ?? [];
    await ctx.runMutation(internal.marketIntel.generateMarketSnapshot, {
      overallAlignmentScore: parsed.overallAlignmentScore ?? 0,
      trendGapCount: gapAnalysis.filter((g: any) =>
        g.gapType === "trending_not_covered" || g.gapType === "high_demand_low_coverage"
      ).length,
      competitorGapCount: gapAnalysis.filter((g: any) => g.gapType === "competitor_gap").length,
      jobAlignmentScore: parsed.jobAlignmentScore ?? 0,
      topGaps: gapAnalysis.slice(0, 10).map((g: any) => ({
        topicLabel: g.topicLabel,
        gapType: g.gapType,
        severity: g.severity,
      })),
    });

    return { success: true, gapCount: gapAnalysis.length };
  },
});

// ---------------------------------------------------------------------------
// Orchestrator — refresh all market intel
// ---------------------------------------------------------------------------

export const refreshAllMarketIntel = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Starting market intel refresh...");

    // Fetch external data (failures are non-fatal)
    let githubData;
    let stackoverflowData;

    try {
      githubData = await ctx.runAction(internal.marketIntelFetch.fetchGitHubTrending, {});
      console.log(`Fetched ${githubData.length} GitHub trending repos`);
    } catch (err) {
      console.warn("GitHub fetch failed, continuing without:", err);
    }

    // Store GitHub signals if available
    if (githubData && githubData.length > 0) {
      // Map repos to topic-level signals
      const langScoreMap = new Map<string, { name: string; maxStars: number }>();
      for (const repo of githubData) {
        const lang = repo.language.toLowerCase();
        const existing = langScoreMap.get(lang);
        if (!existing || repo.stars > existing.maxStars) {
          langScoreMap.set(lang, { name: repo.language, maxStars: repo.stars });
        }
      }

      const signals = [...langScoreMap.entries()].map(([slug, data]) => ({
        topicSlug: slug,
        source: "github_trending" as const,
        signalName: data.name,
        signalScore: Math.min(100, Math.round((data.maxStars / 1000) * 10 + 50)),
        fetchedAt: Date.now(),
      }));

      await ctx.runMutation(internal.marketIntel.storeTrendSignals, { signals });
    }

    try {
      stackoverflowData = await ctx.runAction(internal.marketIntelFetch.fetchStackOverflowTags, {});
      console.log(`Fetched ${stackoverflowData.length} StackOverflow tags`);
    } catch (err) {
      console.warn("StackOverflow fetch failed, continuing without:", err);
    }

    // Store SO signals if available
    if (stackoverflowData && stackoverflowData.length > 0) {
      const maxCount = Math.max(...stackoverflowData.map((t) => t.count));
      const signals = stackoverflowData.slice(0, 20).map((tag) => ({
        topicSlug: tag.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        source: "stackoverflow" as const,
        signalName: tag.name,
        signalScore: Math.round((tag.count / maxCount) * 100),
        fetchedAt: Date.now(),
      }));

      await ctx.runMutation(internal.marketIntel.storeTrendSignals, { signals });
    }

    // Run Claude analysis
    try {
      const result = await ctx.runAction(internal.marketIntelFetch.analyzeMarketWithClaude, {
        githubData,
        stackoverflowData,
      });
      console.log(`Market intel refresh complete: ${result.gapCount} gaps identified`);
    } catch (err) {
      console.error("Claude analysis failed:", err);
      throw err;
    }
  },
});

// ---------------------------------------------------------------------------
// Public action — for the "Refresh Data" button
// ---------------------------------------------------------------------------

export const triggerRefresh = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runAction(internal.marketIntelFetch.refreshAllMarketIntel, {});
    return { success: true };
  },
});
