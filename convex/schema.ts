import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    externalId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer")),
  })
    .index("by_externalId", ["externalId"])
    .index("by_email", ["email"]),

  contentItems: defineTable({
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
    updatedAt: v.number(),
    createdAt: v.number(),
    gradingStatus: v.union(
      v.literal("pending"),
      v.literal("grading"),
      v.literal("graded"),
      v.literal("failed")
    ),
    lastGradingError: v.optional(v.string()),
  })
    .index("by_type", ["type"])
    .index("by_gradingStatus", ["gradingStatus"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["type"],
    }),

  contentEdges: defineTable({
    parentId: v.id("contentItems"),
    childId: v.id("contentItems"),
    edgeType: v.union(
      v.literal("contains"),
      v.literal("prerequisite"),
      v.literal("related")
    ),
    order: v.number(),
  })
    .index("by_parent", ["parentId"])
    .index("by_parent_type", ["parentId", "edgeType"])
    .index("by_child", ["childId"]),

  topics: defineTable({
    name: v.string(),
    slug: v.string(),
    domain: v.string(),
    description: v.optional(v.string()),
    activeSnapshotId: v.optional(v.id("topicSnapshots")),
  })
    .index("by_slug", ["slug"])
    .index("by_domain", ["domain"]),

  topicSnapshots: defineTable({
    topicId: v.id("topics"),
    keyPractices: v.array(v.string()),
    deprecatedPractices: v.array(v.string()),
    emergingTrends: v.optional(v.array(v.string())),
    changeVelocity: v.number(),
    confidence: v.number(),
    notes: v.optional(v.string()),
    supersededById: v.optional(v.id("topicSnapshots")),
    createdAt: v.number(),
  }).index("by_topic", ["topicId"]),

  freshnessScores: defineTable({
    contentId: v.id("contentItems"),
    topicSnapshotId: v.id("topicSnapshots"),
    overallScore: v.number(),
    recencyScore: v.number(),
    alignmentScore: v.number(),
    demandScore: v.number(),
    velocityMultiplier: v.number(),
    grade: v.string(),
    outdatedTopics: v.array(v.string()),
    missingTopics: v.array(v.string()),
    industryBenchmark: v.optional(v.string()),
    recommendedAction: v.optional(v.string()),
    confidence: v.number(),
    createdAt: v.number(),
  })
    .index("by_content", ["contentId"])
    .index("by_content_created", ["contentId", "createdAt"])
    .index("by_grade", ["grade"]),

  contentLatestGrade: defineTable({
    contentId: v.id("contentItems"),
    scoreId: v.id("freshnessScores"),
    overallScore: v.number(),
    grade: v.string(),
    updatedAt: v.number(),
  })
    .index("by_content", ["contentId"])
    .index("by_grade", ["grade"])
    .index("by_score", ["overallScore"]),

  contentBookmarks: defineTable({
    userId: v.id("users"),
    contentId: v.id("contentItems"),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_content", ["contentId"])
    .index("by_user_content", ["userId", "contentId"]),

  contentRequests: defineTable({
    title: v.string(),
    normalizedTitle: v.string(),
    description: v.string(),
    topicIds: v.array(v.id("topics")),
    requestedBy: v.id("users"),
    status: v.union(
      v.literal("open"),
      v.literal("planned"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("declined")
    ),
    voteCount: v.number(),
    linkedContentId: v.optional(v.id("contentItems")),
    mergedIntoId: v.optional(v.id("contentRequests")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_votes", ["voteCount"])
    .searchIndex("search_title", {
      searchField: "normalizedTitle",
      filterFields: ["status"],
    }),

  requestVotes: defineTable({
    requestId: v.id("contentRequests"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_request", ["requestId"])
    .index("by_request_user", ["requestId", "userId"]),

  chatSessions: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  chatMessages: defineTable({
    sessionId: v.id("chatSessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    contentIdsShown: v.optional(v.array(v.id("contentItems"))),
    requestIdCreated: v.optional(v.id("contentRequests")),
    requestIdUpvoted: v.optional(v.id("contentRequests")),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),

  ogCache: defineTable({
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    siteName: v.optional(v.string()),
    failed: v.boolean(),
    fetchedAt: v.number(),
  }).index("by_url", ["url"]),

  // ─── Market Intelligence tables ──────────────────────────────────────

  marketTrendSignals: defineTable({
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
    .index("by_source", ["source"])
    .index("by_topic", ["topicSlug"])
    .index("by_fetched", ["fetchedAt"]),

  competitorCoverage: defineTable({
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
    .index("by_competitor", ["competitor"])
    .index("by_topic", ["topicSlug"])
    .index("by_competitor_topic", ["competitor", "topicSlug"]),

  jobMarketDemand: defineTable({
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
    .index("by_topic", ["topicSlug"])
    .index("by_demand", ["demandScore"])
    .index("by_fetched", ["fetchedAt"]),

  marketIntelSnapshots: defineTable({
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
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),

  librarySnapshots: defineTable({
    totalContent: v.number(),
    gradeDistribution: v.object({
      A: v.number(),
      B: v.number(),
      C: v.number(),
      D: v.number(),
      F: v.number(),
    }),
    averageScore: v.number(),
    topicBreakdown: v.array(
      v.object({
        topicId: v.id("topics"),
        topicName: v.string(),
        averageScore: v.number(),
        contentCount: v.number(),
      })
    ),
    createdAt: v.number(),
  }).index("by_created", ["createdAt"]),
});
