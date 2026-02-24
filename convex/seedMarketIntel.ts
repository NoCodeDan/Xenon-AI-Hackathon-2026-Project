import { internalMutation } from "./_generated/server";

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("marketTrendSignals").first();
    if (existing) return "Market intel already seeded";

    const now = Date.now();

    // ─── MARKET TREND SIGNALS ────────────────────────────────────────────

    const trendSignals: Array<{
      topicSlug: string;
      source: "github_trending" | "stackoverflow" | "job_postings" | "google_trends" | "ai_synthesized";
      signalName: string;
      signalScore: number;
      fetchedAt: number;
    }> = [
      // GitHub trending
      { topicSlug: "react", source: "github_trending", signalName: "React Server Components", signalScore: 92, fetchedAt: now },
      { topicSlug: "rust", source: "github_trending", signalName: "Rust", signalScore: 88, fetchedAt: now },
      { topicSlug: "typescript", source: "github_trending", signalName: "TypeScript", signalScore: 90, fetchedAt: now },
      { topicSlug: "go", source: "github_trending", signalName: "Go", signalScore: 78, fetchedAt: now },
      { topicSlug: "svelte", source: "github_trending", signalName: "Svelte / SvelteKit", signalScore: 72, fetchedAt: now },
      { topicSlug: "htmx", source: "github_trending", signalName: "HTMX", signalScore: 65, fetchedAt: now },
      { topicSlug: "ai-ml", source: "github_trending", signalName: "AI/ML Libraries", signalScore: 95, fetchedAt: now },

      // StackOverflow
      { topicSlug: "python", source: "stackoverflow", signalName: "Python", signalScore: 94, fetchedAt: now },
      { topicSlug: "javascript", source: "stackoverflow", signalName: "JavaScript", signalScore: 91, fetchedAt: now },
      { topicSlug: "typescript", source: "stackoverflow", signalName: "TypeScript", signalScore: 87, fetchedAt: now },
      { topicSlug: "sql", source: "stackoverflow", signalName: "SQL", signalScore: 80, fetchedAt: now },
      { topicSlug: "docker", source: "stackoverflow", signalName: "Docker", signalScore: 76, fetchedAt: now },
      { topicSlug: "react", source: "stackoverflow", signalName: "React", signalScore: 85, fetchedAt: now },
      { topicSlug: "aws", source: "stackoverflow", signalName: "AWS", signalScore: 73, fetchedAt: now },

      // Job postings
      { topicSlug: "python", source: "job_postings", signalName: "Python", signalScore: 95, fetchedAt: now },
      { topicSlug: "javascript", source: "job_postings", signalName: "JavaScript", signalScore: 92, fetchedAt: now },
      { topicSlug: "aws", source: "job_postings", signalName: "AWS / Cloud", signalScore: 88, fetchedAt: now },
      { topicSlug: "ai-ml", source: "job_postings", signalName: "AI/ML Engineering", signalScore: 92, fetchedAt: now },
      { topicSlug: "sql", source: "job_postings", signalName: "SQL / Databases", signalScore: 82, fetchedAt: now },
      { topicSlug: "docker", source: "job_postings", signalName: "Docker / Kubernetes", signalScore: 78, fetchedAt: now },
      { topicSlug: "typescript", source: "job_postings", signalName: "TypeScript", signalScore: 88, fetchedAt: now },
      { topicSlug: "react", source: "job_postings", signalName: "React", signalScore: 85, fetchedAt: now },

      // AI synthesized
      { topicSlug: "rust", source: "ai_synthesized", signalName: "Rust Systems Programming", signalScore: 82, fetchedAt: now },
      { topicSlug: "webassembly", source: "ai_synthesized", signalName: "WebAssembly", signalScore: 68, fetchedAt: now },
      { topicSlug: "deno", source: "ai_synthesized", signalName: "Deno Runtime", signalScore: 55, fetchedAt: now },
    ];

    for (const signal of trendSignals) {
      await ctx.db.insert("marketTrendSignals", signal);
    }

    // ─── COMPETITOR COVERAGE ─────────────────────────────────────────────

    type CoverageLevel = "deep" | "moderate" | "shallow" | "none";
    type Competitor = "codecademy" | "freecodecamp" | "udemy";

    const topics: Array<{ slug: string; label: string }> = [
      { slug: "javascript", label: "JavaScript" },
      { slug: "python", label: "Python" },
      { slug: "react", label: "React" },
      { slug: "css", label: "CSS" },
      { slug: "nodejs", label: "Node.js" },
      { slug: "typescript", label: "TypeScript" },
      { slug: "sql", label: "SQL" },
      { slug: "go", label: "Go" },
      { slug: "rust", label: "Rust" },
      { slug: "docker", label: "Docker" },
      { slug: "aws", label: "AWS" },
      { slug: "ai-ml", label: "AI/ML" },
      { slug: "svelte", label: "Svelte" },
      { slug: "swift", label: "Swift" },
      { slug: "kotlin", label: "Kotlin" },
      { slug: "php", label: "PHP" },
      { slug: "ruby", label: "Ruby" },
    ];

    const coverageMatrix: Record<Competitor, Record<string, CoverageLevel>> = {
      codecademy: {
        javascript: "deep", python: "deep", react: "deep", css: "deep",
        nodejs: "moderate", typescript: "moderate", sql: "deep", go: "moderate",
        rust: "shallow", docker: "none", aws: "none", "ai-ml": "moderate",
        svelte: "none", swift: "moderate", kotlin: "moderate", php: "moderate", ruby: "moderate",
      },
      freecodecamp: {
        javascript: "deep", python: "deep", react: "moderate", css: "deep",
        nodejs: "moderate", typescript: "moderate", sql: "moderate", go: "none",
        rust: "shallow", docker: "shallow", aws: "shallow", "ai-ml": "moderate",
        svelte: "none", swift: "none", kotlin: "none", php: "shallow", ruby: "none",
      },
      udemy: {
        javascript: "deep", python: "deep", react: "deep", css: "deep",
        nodejs: "deep", typescript: "deep", sql: "deep", go: "deep",
        rust: "deep", docker: "deep", aws: "deep", "ai-ml": "deep",
        svelte: "moderate", swift: "deep", kotlin: "deep", php: "deep", ruby: "moderate",
      },
    };

    const competitors: Competitor[] = ["codecademy", "freecodecamp", "udemy"];
    for (const competitor of competitors) {
      for (const topic of topics) {
        await ctx.db.insert("competitorCoverage", {
          competitor,
          topicSlug: topic.slug,
          topicLabel: topic.label,
          coverageLevel: coverageMatrix[competitor][topic.slug] ?? "none",
          fetchedAt: now,
        });
      }
    }

    // ─── JOB MARKET DEMAND ───────────────────────────────────────────────

    const jobDemand: Array<{
      topicSlug: string;
      topicLabel: string;
      demandScore: number;
      jobPostingCount?: number;
      avgSalarySignal?: string;
      growthTrend: "rising" | "stable" | "declining";
      fetchedAt: number;
    }> = [
      { topicSlug: "python", topicLabel: "Python", demandScore: 95, jobPostingCount: 42000, avgSalarySignal: "$135k", growthTrend: "rising", fetchedAt: now },
      { topicSlug: "javascript", topicLabel: "JavaScript", demandScore: 92, jobPostingCount: 38000, avgSalarySignal: "$125k", growthTrend: "stable", fetchedAt: now },
      { topicSlug: "ai-ml", topicLabel: "AI/ML", demandScore: 92, jobPostingCount: 28000, avgSalarySignal: "$160k", growthTrend: "rising", fetchedAt: now },
      { topicSlug: "typescript", topicLabel: "TypeScript", demandScore: 88, jobPostingCount: 25000, avgSalarySignal: "$130k", growthTrend: "rising", fetchedAt: now },
      { topicSlug: "react", topicLabel: "React", demandScore: 85, jobPostingCount: 22000, avgSalarySignal: "$128k", growthTrend: "stable", fetchedAt: now },
      { topicSlug: "aws", topicLabel: "AWS", demandScore: 80, jobPostingCount: 20000, avgSalarySignal: "$140k", growthTrend: "rising", fetchedAt: now },
      { topicSlug: "sql", topicLabel: "SQL", demandScore: 82, jobPostingCount: 30000, avgSalarySignal: "$110k", growthTrend: "stable", fetchedAt: now },
      { topicSlug: "docker", topicLabel: "Docker", demandScore: 78, jobPostingCount: 18000, avgSalarySignal: "$135k", growthTrend: "rising", fetchedAt: now },
      { topicSlug: "nodejs", topicLabel: "Node.js", demandScore: 76, jobPostingCount: 16000, avgSalarySignal: "$120k", growthTrend: "stable", fetchedAt: now },
      { topicSlug: "go", topicLabel: "Go", demandScore: 70, jobPostingCount: 12000, avgSalarySignal: "$140k", growthTrend: "rising", fetchedAt: now },
      { topicSlug: "rust", topicLabel: "Rust", demandScore: 65, jobPostingCount: 8000, avgSalarySignal: "$145k", growthTrend: "rising", fetchedAt: now },
      { topicSlug: "kotlin", topicLabel: "Kotlin", demandScore: 62, jobPostingCount: 9000, avgSalarySignal: "$125k", growthTrend: "stable", fetchedAt: now },
      { topicSlug: "swift", topicLabel: "Swift", demandScore: 60, jobPostingCount: 7500, avgSalarySignal: "$130k", growthTrend: "stable", fetchedAt: now },
      { topicSlug: "css", topicLabel: "CSS", demandScore: 58, jobPostingCount: 15000, avgSalarySignal: "$100k", growthTrend: "stable", fetchedAt: now },
      { topicSlug: "php", topicLabel: "PHP", demandScore: 45, jobPostingCount: 10000, avgSalarySignal: "$95k", growthTrend: "declining", fetchedAt: now },
    ];

    for (const demand of jobDemand) {
      await ctx.db.insert("jobMarketDemand", demand);
    }

    // ─── MARKET INTEL SNAPSHOT ───────────────────────────────────────────

    await ctx.db.insert("marketIntelSnapshots", {
      overallAlignmentScore: 68,
      trendGapCount: 7,
      competitorGapCount: 5,
      jobAlignmentScore: 72,
      topGaps: [
        { topicLabel: "Rust", gapType: "trending_not_covered", severity: "critical" },
        { topicLabel: "AI/ML", gapType: "high_demand_low_coverage", severity: "critical" },
        { topicLabel: "Docker", gapType: "competitor_gap", severity: "high" },
        { topicLabel: "AWS", gapType: "job_demand_gap", severity: "high" },
        { topicLabel: "Go", gapType: "trending_not_covered", severity: "high" },
        { topicLabel: "TypeScript", gapType: "needs_update", severity: "medium" },
        { topicLabel: "Svelte", gapType: "trending_not_covered", severity: "medium" },
      ],
      createdAt: now,
    });

    return "Market intel seeded successfully";
  },
});
