// ---------------------------------------------------------------------------
// Prompt builder for the Claude-powered market intelligence analysis.
// ---------------------------------------------------------------------------

export interface MarketIntelInput {
  treehouseTopics: Array<{
    slug: string;
    name: string;
    domain: string;
    contentCount: number;
  }>;
  githubTrending?: Array<{ name: string; language: string; stars: number; description: string }>;
  stackoverflowTags?: Array<{ name: string; count: number }>;
}

/**
 * Build a prompt that asks Claude to analyze market signals and produce
 * competitor coverage estimates, job demand scores, trend gaps, and recommendations.
 *
 * Expected response is **strict JSON** with the following shape:
 *
 * ```json
 * {
 *   "competitorCoverage": [...],
 *   "jobMarketDemand": [...],
 *   "trendingTopics": [...],
 *   "gapAnalysis": [...],
 *   "overallAlignmentScore": 0-100,
 *   "jobAlignmentScore": 0-100
 * }
 * ```
 */
export function buildMarketIntelPrompt(input: MarketIntelInput): string {
  const topicList = input.treehouseTopics
    .map((t) => `  - ${t.name} (${t.slug}, domain: ${t.domain}, ${t.contentCount} pieces of content)`)
    .join("\n");

  const githubSection = input.githubTrending && input.githubTrending.length > 0
    ? `## GitHub Trending Repositories (recent)\n${input.githubTrending.map((r) => `  - ${r.name} (${r.language}, ${r.stars} stars): ${r.description}`).join("\n")}`
    : "## GitHub Trending: (no data available — use your knowledge)";

  const soSection = input.stackoverflowTags && input.stackoverflowTags.length > 0
    ? `## StackOverflow Popular Tags (recent activity)\n${input.stackoverflowTags.map((t) => `  - ${t.name}: ${t.count} recent questions`).join("\n")}`
    : "## StackOverflow Tags: (no data available — use your knowledge)";

  return `You are a market intelligence analyst for Treehouse, an online tech education platform. Your job is to analyze the current technology education market and identify gaps in Treehouse's content library.

## Treehouse's Current Topic Coverage
${topicList}

${githubSection}

${soSection}

## Your Task

Analyze the current tech education market and produce a comprehensive market intelligence report. Use the real API data above combined with your extensive knowledge of:
- What Codecademy, freeCodeCamp, and Udemy teach
- Current job market demand for tech skills
- Technology trends and popularity

Respond with **only** a JSON object (no markdown fences, no extra text) in this exact format:

{
  "competitorCoverage": [
    {
      "competitor": "codecademy" | "freecodecamp" | "udemy",
      "topicSlug": "<slug>",
      "topicLabel": "<display name>",
      "coverageLevel": "deep" | "moderate" | "shallow" | "none"
    }
  ],
  "jobMarketDemand": [
    {
      "topicSlug": "<slug>",
      "topicLabel": "<display name>",
      "demandScore": <0-100>,
      "jobPostingCount": <estimated number>,
      "avgSalarySignal": "<e.g. $130k>",
      "growthTrend": "rising" | "stable" | "declining"
    }
  ],
  "trendingTopics": [
    {
      "topicSlug": "<slug>",
      "signalName": "<display name>",
      "signalScore": <0-100>,
      "treehouseCovers": <boolean>
    }
  ],
  "gapAnalysis": [
    {
      "topicLabel": "<display name>",
      "gapType": "trending_not_covered" | "high_demand_low_coverage" | "competitor_gap" | "job_demand_gap" | "needs_update",
      "severity": "critical" | "high" | "medium" | "low",
      "recommendation": "<actionable recommendation>"
    }
  ],
  "overallAlignmentScore": <0-100, how well Treehouse aligns with market trends>,
  "jobAlignmentScore": <0-100, how well Treehouse covers in-demand job skills>
}

Include at least:
- 3 competitors × 15+ topics for competitorCoverage
- 12+ topics for jobMarketDemand
- 15+ entries for trendingTopics
- 5-10 entries for gapAnalysis, sorted by severity (critical first)

Be realistic and data-driven. Treehouse is strong in web development (JS, React, CSS, Python, Node.js) but may lack coverage in DevOps, cloud, AI/ML, systems programming, and mobile.`;
}
