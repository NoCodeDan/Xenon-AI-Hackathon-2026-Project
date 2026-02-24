"use client";

import React, { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/hooks/use-role";
import {
  Radar as RadarIcon,
  TrendingUp,
  Users,
  Briefcase,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function alignmentGrade(score: number): { grade: string; color: string } {
  if (score >= 85) return { grade: "A", color: "text-emerald-600" };
  if (score >= 70) return { grade: "B", color: "text-emerald-500" };
  if (score >= 55) return { grade: "C+", color: "text-yellow-600" };
  if (score >= 40) return { grade: "D", color: "text-orange-600" };
  return { grade: "F", color: "text-red-600" };
}

const COVERAGE_COLORS: Record<string, string> = {
  deep: "bg-emerald-100 text-emerald-800 border-emerald-200",
  moderate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  shallow: "bg-orange-100 text-orange-800 border-orange-200",
  none: "bg-red-100 text-red-800 border-red-200",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
};

const SOURCE_LABELS: Record<string, string> = {
  github_trending: "GitHub",
  stackoverflow: "Stack Overflow",
  job_postings: "Jobs",
  google_trends: "Google",
  ai_synthesized: "AI Analysis",
};

const GROWTH_ICONS: Record<string, React.ReactNode> = {
  rising: <ArrowUpRight className="size-3.5 text-emerald-600" />,
  stable: <ArrowRight className="size-3.5 text-yellow-600" />,
  declining: <ArrowDownRight className="size-3.5 text-red-600" />,
};

const COMPETITOR_COLORS: Record<string, string> = {
  deep: "#059669",
  moderate: "#eab308",
  shallow: "#f97316",
  none: "#ef4444",
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function MarketIntelSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Cards
// ---------------------------------------------------------------------------

function MarketSummaryStats({
  snapshot,
  loading,
}: {
  snapshot: {
    overallAlignmentScore: number;
    trendGapCount: number;
    competitorGapCount: number;
    jobAlignmentScore: number;
  } | null;
  loading: boolean;
}) {
  const stats = [
    {
      icon: RadarIcon,
      value: snapshot ? `${snapshot.overallAlignmentScore}%` : "—",
      label: "Market Alignment",
    },
    {
      icon: TrendingUp,
      value: snapshot ? snapshot.trendGapCount : "—",
      label: "Trend Gaps",
    },
    {
      icon: Users,
      value: snapshot ? snapshot.competitorGapCount : "—",
      label: "Competitor Gaps",
    },
    {
      icon: Briefcase,
      value: snapshot ? `${snapshot.jobAlignmentScore}%` : "—",
      label: "Job Alignment",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col items-center gap-1 rounded-xl border bg-card p-5"
        >
          {loading ? (
            <>
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-20" />
            </>
          ) : (
            <>
              <stat.icon className="h-5 w-5 text-emerald-600" />
              <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend Radar Widget
// ---------------------------------------------------------------------------

function TrendRadarWidget({
  signalsBySource,
  treehouseCoverage,
}: {
  signalsBySource: Record<string, Array<{ topicSlug: string; signalName: string; signalScore: number }>>;
  treehouseCoverage: Record<string, number>;
}) {
  // Aggregate signals by domain/topic to build radar data
  const domains = ["javascript", "python", "react", "css", "nodejs", "typescript", "sql", "rust", "go", "ai-ml", "docker", "aws"];
  const domainLabels: Record<string, string> = {
    javascript: "JavaScript", python: "Python", react: "React", css: "CSS",
    nodejs: "Node.js", typescript: "TypeScript", sql: "SQL", rust: "Rust",
    go: "Go", "ai-ml": "AI/ML", docker: "Docker", aws: "AWS",
  };

  // Average signal score per topic across all sources
  const signalScores = new Map<string, number[]>();
  for (const signals of Object.values(signalsBySource)) {
    for (const s of signals) {
      if (!signalScores.has(s.topicSlug)) signalScores.set(s.topicSlug, []);
      signalScores.get(s.topicSlug)!.push(s.signalScore);
    }
  }

  const radarData = domains.map((slug) => {
    const scores = signalScores.get(slug) ?? [];
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const contentCount = treehouseCoverage[slug] ?? 0;
    // Normalize Treehouse coverage to 0-100 scale (10+ items = 100)
    const coverageScore = Math.min(100, contentCount * 10);
    return {
      topic: domainLabels[slug] ?? slug,
      marketDemand: avgScore,
      treehouseCoverage: coverageScore,
    };
  }).filter((d) => d.marketDemand > 0 || d.treehouseCoverage > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market vs Coverage</CardTitle>
        <CardDescription>Treehouse coverage vs market demand by topic</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} outerRadius="70%">
            <PolarGrid stroke="#d1d5db" />
            <PolarAngleAxis dataKey="topic" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Radar
              name="Market Demand"
              dataKey="marketDemand"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Radar
              name="Treehouse"
              dataKey="treehouseCoverage"
              stroke="#059669"
              fill="#059669"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Trend Gap Card
// ---------------------------------------------------------------------------

function TrendGapCard({
  gaps,
}: {
  gaps: Array<{ topicLabel: string; gapType: string; severity: string }>;
}) {
  const gapTypeLabels: Record<string, string> = {
    trending_not_covered: "Trending — Not Covered",
    high_demand_low_coverage: "High Demand — Low Coverage",
    competitor_gap: "Competitors Cover This",
    job_demand_gap: "Job Demand Gap",
    needs_update: "Needs Content Update",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gap Analysis</CardTitle>
        <CardDescription>Prioritized content gaps sorted by severity</CardDescription>
      </CardHeader>
      <CardContent>
        {gaps.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="size-4" />
            No critical gaps identified
          </div>
        ) : (
          <ul className="space-y-2.5">
            {gaps.map((gap, i) => (
              <li key={i} className="flex items-start gap-3">
                <Badge
                  variant="outline"
                  className={`shrink-0 text-xs ${SEVERITY_COLORS[gap.severity] ?? ""}`}
                >
                  {gap.severity}
                </Badge>
                <div className="min-w-0">
                  <span className="text-sm font-medium">{gap.topicLabel}</span>
                  <p className="text-xs text-muted-foreground">
                    {gapTypeLabels[gap.gapType] ?? gap.gapType}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Competitor Matrix Table
// ---------------------------------------------------------------------------

function CoverageBadge({ level }: { level: string }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs ${COVERAGE_COLORS[level] ?? ""}`}
    >
      {level}
    </Badge>
  );
}

function CompetitorMatrixTable({
  matrix,
}: {
  matrix: Array<{
    topicSlug: string;
    topicLabel: string;
    treehouse: { contentCount: number; level: string };
    codecademy: string;
    freecodecamp: string;
    udemy: string;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitor Coverage Matrix</CardTitle>
        <CardDescription>Topic coverage comparison across platforms</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Topic</TableHead>
              <TableHead>Treehouse</TableHead>
              <TableHead>Codecademy</TableHead>
              <TableHead>freeCodeCamp</TableHead>
              <TableHead>Udemy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.map((row) => (
              <TableRow key={row.topicSlug}>
                <TableCell className="font-medium">{row.topicLabel}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <CoverageBadge level={row.treehouse.level} />
                    <span className="text-xs text-muted-foreground">
                      ({row.treehouse.contentCount})
                    </span>
                  </div>
                </TableCell>
                <TableCell><CoverageBadge level={row.codecademy} /></TableCell>
                <TableCell><CoverageBadge level={row.freecodecamp} /></TableCell>
                <TableCell><CoverageBadge level={row.udemy} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Competitor Bar Chart
// ---------------------------------------------------------------------------

function CompetitorBarChart({
  matrix,
}: {
  matrix: Array<{
    topicLabel: string;
    codecademy: string;
    freecodecamp: string;
    udemy: string;
  }>;
}) {
  // Count coverage levels per competitor
  const competitors = ["codecademy", "freecodecamp", "udemy"] as const;
  const competitorLabels: Record<string, string> = {
    codecademy: "Codecademy",
    freecodecamp: "freeCodeCamp",
    udemy: "Udemy",
  };
  const levels = ["deep", "moderate", "shallow", "none"] as const;

  const chartData = competitors.map((comp) => {
    const counts: Record<string, number> = { deep: 0, moderate: 0, shallow: 0, none: 0 };
    for (const row of matrix) {
      const level = row[comp] as string;
      counts[level] = (counts[level] ?? 0) + 1;
    }
    return { name: competitorLabels[comp], ...counts };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coverage Depth by Platform</CardTitle>
        <CardDescription>Number of topics at each coverage level</CardDescription>
      </CardHeader>
      <CardContent className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="20%">
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <RechartsTooltip contentStyle={{ borderRadius: "8px", fontSize: "13px" }} />
            {levels.map((level) => (
              <Bar key={level} dataKey={level} stackId="a" fill={COMPETITOR_COLORS[level]} radius={level === "deep" ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
            ))}
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Competitor Gap List ("They have, you don't")
// ---------------------------------------------------------------------------

function CompetitorGapList({
  competitorGaps,
}: {
  competitorGaps: Array<{ topicSlug: string; topicLabel: string; competitorsWithCoverage: number }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>They Have, You Don&apos;t</CardTitle>
        <CardDescription>Topics covered by competitors but not Treehouse</CardDescription>
      </CardHeader>
      <CardContent>
        {competitorGaps.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="size-4" />
            Great coverage — no major gaps!
          </div>
        ) : (
          <ul className="space-y-2">
            {competitorGaps.map((gap) => (
              <li key={gap.topicSlug} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                <AlertTriangle className="size-4 shrink-0 text-orange-500" />
                <span className="flex-1 text-sm font-medium">{gap.topicLabel}</span>
                <span className="text-xs text-muted-foreground">
                  {gap.competitorsWithCoverage} competitors
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Job Alignment Chart (Horizontal Bar)
// ---------------------------------------------------------------------------

function JobAlignmentChart({
  data,
}: {
  data: Array<{
    topicLabel: string;
    demandScore: number;
    treehouseContentCount: number;
    treehouseAvgScore: number | null;
  }>;
}) {
  const chartData = data.slice(0, 12).map((d) => ({
    topic: d.topicLabel,
    demand: d.demandScore,
    coverage: Math.min(100, d.treehouseContentCount * 10),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Market Demand vs Coverage</CardTitle>
        <CardDescription>Market demand score vs Treehouse content coverage</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" barCategoryGap="15%">
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="topic" tick={{ fontSize: 11 }} width={90} />
            <RechartsTooltip contentStyle={{ borderRadius: "8px", fontSize: "13px" }} />
            <Bar dataKey="demand" name="Demand" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={10} />
            <Bar dataKey="coverage" name="Coverage" fill="#059669" radius={[0, 4, 4, 0]} barSize={10} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Job Alignment Score Card
// ---------------------------------------------------------------------------

function JobAlignmentScoreCard({
  score,
}: {
  score: number;
}) {
  const { grade, color } = alignmentGrade(score);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Alignment Score</CardTitle>
        <CardDescription>How well Treehouse covers in-demand job skills</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 py-4">
        <div className="flex items-baseline gap-2">
          <span className={`text-5xl font-bold tabular-nums ${color}`}>{score}</span>
          <span className="text-lg text-muted-foreground">/100</span>
        </div>
        <Badge
          variant="outline"
          className={`text-sm px-3 py-1 font-semibold ${
            score >= 70
              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
              : score >= 55
                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                : "bg-orange-100 text-orange-800 border-orange-200"
          }`}
        >
          Grade: {grade}
        </Badge>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Priority Recommendations
// ---------------------------------------------------------------------------

function PriorityRecommendations({
  jobData,
  gaps,
}: {
  jobData: Array<{
    topicLabel: string;
    demandScore: number;
    treehouseContentCount: number;
    growthTrend: string;
  }>;
  gaps: Array<{ topicLabel: string; gapType: string; severity: string }>;
}) {
  // Build recommendations from gaps + high-demand low-coverage topics
  const recommendations: Array<{ label: string; reason: string; urgency: string }> = [];

  // From gap analysis (critical/high first)
  for (const gap of gaps.filter((g) => g.severity === "critical" || g.severity === "high")) {
    recommendations.push({
      label: gap.topicLabel,
      reason: gap.gapType === "trending_not_covered"
        ? "Trending topic — no coverage"
        : gap.gapType === "high_demand_low_coverage"
          ? "High demand — needs more content"
          : gap.gapType === "competitor_gap"
            ? "Competitors cover this"
            : "Job market gap",
      urgency: gap.severity,
    });
  }

  // From job data: high demand, low coverage
  for (const job of jobData) {
    if (job.demandScore >= 75 && job.treehouseContentCount === 0 && !recommendations.find((r) => r.label === job.topicLabel)) {
      recommendations.push({
        label: job.topicLabel,
        reason: `Demand: ${job.demandScore}, Coverage: None`,
        urgency: "high",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Priority Recommendations</CardTitle>
        <CardDescription>Actionable steps to improve market alignment</CardDescription>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No urgent recommendations at this time.</p>
        ) : (
          <ol className="space-y-3">
            {recommendations.slice(0, 8).map((rec, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  {i + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{rec.label}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${SEVERITY_COLORS[rec.urgency] ?? ""}`}
                    >
                      {rec.urgency}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.reason}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Trending Topics with Source Tabs
// ---------------------------------------------------------------------------

function TrendingTopicsWidget({
  signalsBySource,
}: {
  signalsBySource: Record<string, Array<{ topicSlug: string; signalName: string; signalScore: number; source: string }>>;
}) {
  const allSignals = Object.values(signalsBySource).flat().sort((a, b) => b.signalScore - a.signalScore);
  const sources = Object.keys(signalsBySource);

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Trending Topics</CardTitle>
        <CardDescription>Top signals across all data sources</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {sources.map((source) => (
              <TabsTrigger key={source} value={source}>
                {SOURCE_LABELS[source] ?? source}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <TrendSignalList signals={allSignals.slice(0, 15)} />
          </TabsContent>
          {sources.map((source) => (
            <TabsContent key={source} value={source} className="mt-4">
              <TrendSignalList signals={signalsBySource[source]} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TrendSignalList({
  signals,
}: {
  signals: Array<{ signalName: string; signalScore: number; source: string }>;
}) {
  return (
    <ul className="space-y-2">
      {signals.map((signal, i) => (
        <li key={i} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <div className="h-2 flex-1 max-w-40 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${signal.signalScore}%` }}
            />
          </div>
          <span className="w-8 text-right text-xs font-semibold tabular-nums text-emerald-700">
            {signal.signalScore}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {signal.signalName}
          </span>
          <Badge variant="secondary" className="text-xs">
            {SOURCE_LABELS[signal.source] ?? signal.source}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MarketIntelPage() {
  const [refreshing, setRefreshing] = useState(false);
  const { isEditor } = useRole();

  const overview = useQuery(api.marketIntel.getMarketOverview);
  const competitorMatrix = useQuery(api.marketIntel.getCompetitorMatrix);
  const jobAlignment = useQuery(api.marketIntel.getJobAlignmentData);
  const triggerRefresh = useAction(api.marketIntelFetch.triggerRefresh);

  const loading = overview === undefined;

  if (loading) return <MarketIntelSkeleton />;

  const snapshot = overview.latestSnapshot;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await triggerRefresh({});
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Market Intelligence</h1>
          {overview.latestFetchedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Last refreshed {timeAgo(overview.latestFetchedAt)}
            </p>
          )}
        </div>
        {isEditor && (
          <Button
            size="sm"
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
        )}
      </div>

      {/* Stat Cards */}
      <section>
        <MarketSummaryStats snapshot={snapshot} loading={false} />
      </section>

      {/* Trending Topics (full width with tabs) */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-emerald-700/60">
          Trending Topics
        </h2>
        <TrendingTopicsWidget signalsBySource={overview.signalsBySource} />
      </section>

      {/* Radar + Gap Analysis */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-emerald-700/60">
          Market Analysis
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <TrendRadarWidget
            signalsBySource={overview.signalsBySource}
            treehouseCoverage={overview.treehouseCoverage}
          />
          <TrendGapCard gaps={snapshot?.topGaps ?? []} />
        </div>
      </section>

      {/* Competitor Coverage */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-emerald-700/60">
          Competitor Coverage
        </h2>
        <div className="space-y-6">
          {competitorMatrix !== undefined && (
            <>
              <CompetitorMatrixTable matrix={competitorMatrix} />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <CompetitorBarChart matrix={competitorMatrix} />
                <CompetitorGapList competitorGaps={overview.competitorGaps} />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Job Market Alignment */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-emerald-700/60">
          Job Market Alignment
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {jobAlignment !== undefined && (
            <JobAlignmentChart data={jobAlignment} />
          )}
          <JobAlignmentScoreCard score={snapshot?.jobAlignmentScore ?? 0} />
        </div>
        {jobAlignment !== undefined && snapshot && (
          <div className="mt-6">
            <PriorityRecommendations
              jobData={jobAlignment}
              gaps={snapshot.topGaps}
            />
          </div>
        )}
      </section>
    </div>
  );
}
