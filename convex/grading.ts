"use node";

// ---------------------------------------------------------------------------
// Freshness grading engine -- Convex actions that call OpenAI for alignment
// scoring, then compute and persist overall freshness grades.
// ---------------------------------------------------------------------------

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import OpenAI from "openai";

import {
  calculateRecencyScore,
  calculateOverallScore,
  scoreToGrade,
  getVelocityMultiplier,
  getDefaultDemandScore,
} from "./lib/scoring";
import { buildGradingPrompt } from "./prompts/grading";

// ---------------------------------------------------------------------------
// OpenAI client (lazily initialised so env var is read at runtime)
// ---------------------------------------------------------------------------

function getClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ---------------------------------------------------------------------------
// Retry helper -- exponential back-off
// ---------------------------------------------------------------------------

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        // Exponential back-off: 1s, 2s, 4s ...
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// OpenAI alignment scoring
// ---------------------------------------------------------------------------

interface AlignmentResult {
  alignmentScore: number;
  outdatedTopics: string[];
  missingTopics: string[];
  industryBenchmark: string;
  recommendedAction: string;
  confidence: number;
}

async function callAIForAlignment(prompt: string): Promise<AlignmentResult> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("OpenAI returned no text content");
  }

  const parsed = JSON.parse(text) as AlignmentResult;

  // Basic validation
  if (
    typeof parsed.alignmentScore !== "number" ||
    !Array.isArray(parsed.outdatedTopics) ||
    !Array.isArray(parsed.missingTopics) ||
    typeof parsed.confidence !== "number"
  ) {
    throw new Error("OpenAI returned an invalid response shape");
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Delay helper
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Grade a single content item.
 *
 * 1. Fetches the content item and its topic snapshots.
 * 2. Calls OpenAI (gpt-4o-mini) for alignment scoring (with retries).
 * 3. Computes recency + overall scores.
 * 4. Persists the result via grades.saveScore.
 * 5. Updates the content item's gradingStatus.
 */
export const gradeContent = internalAction({
  args: {
    contentId: v.id("contentItems"),
  },
  handler: async (ctx, args) => {
    // ------ 1. Fetch content item ------
    const content = await ctx.runQuery(api.content.getById, {
      id: args.contentId,
    });
    if (!content) {
      throw new Error(`Content item ${args.contentId} not found`);
    }

    // Mark as grading
    await ctx.runMutation(api.content.setGradingStatus, {
      id: args.contentId,
      gradingStatus: "grading",
    });

    try {
      // ------ 2. Fetch topic snapshots ------
      if (content.topicIds.length === 0) {
        throw new Error(
          `Content item "${content.title}" has no associated topics`,
        );
      }

      // Get active snapshots for all topics on this content item
      const snapshotMap = await ctx.runQuery(api.topicSnapshots.getActiveBatch, {
        topicIds: content.topicIds,
      });

      // Use the first topic that has an active snapshot
      let chosenTopicId: string | null = null;
      let chosenSnapshot: {
        _id: any;
        topicId: any;
        keyPractices: string[];
        deprecatedPractices: string[];
        emergingTrends?: string[];
        changeVelocity: number;
        confidence: number;
      } | null = null;

      for (const topicId of content.topicIds) {
        const snap = snapshotMap[topicId];
        if (snap) {
          chosenTopicId = topicId;
          chosenSnapshot = snap;
          break;
        }
      }

      if (!chosenSnapshot || !chosenTopicId) {
        throw new Error(
          `No active topic snapshot found for content "${content.title}"`,
        );
      }

      // ------ 3. Call OpenAI for alignment ------
      const prompt = buildGradingPrompt(
        {
          title: content.title,
          type: content.type,
          description: content.description,
          updatedAt: content.updatedAt,
          skillLevel: content.skillLevel,
        },
        {
          keyPractices: chosenSnapshot.keyPractices,
          deprecatedPractices: chosenSnapshot.deprecatedPractices,
          emergingTrends: chosenSnapshot.emergingTrends,
          changeVelocity: chosenSnapshot.changeVelocity,
        },
      );

      const alignment = await withRetry(
        () => callAIForAlignment(prompt),
        3,
      );

      // ------ 4. Calculate scores ------
      const recencyScore = calculateRecencyScore(
        content.updatedAt,
        chosenSnapshot.changeVelocity,
      );
      const demandScore = getDefaultDemandScore();
      const overallScore = calculateOverallScore(
        recencyScore,
        alignment.alignmentScore,
        demandScore,
      );
      const grade = scoreToGrade(overallScore);
      const velocityMultiplier = getVelocityMultiplier(
        chosenSnapshot.changeVelocity,
      );

      // ------ 5. Save ------
      await ctx.runMutation(api.grades.saveScore, {
        contentId: args.contentId,
        topicSnapshotId: chosenSnapshot._id,
        overallScore,
        recencyScore,
        alignmentScore: alignment.alignmentScore,
        demandScore,
        velocityMultiplier,
        grade,
        outdatedTopics: alignment.outdatedTopics,
        missingTopics: alignment.missingTopics,
        industryBenchmark: alignment.industryBenchmark,
        recommendedAction: alignment.recommendedAction,
        confidence: alignment.confidence,
      });

      // ------ 6. Mark graded ------
      await ctx.runMutation(api.content.setGradingStatus, {
        id: args.contentId,
        gradingStatus: "graded",
      });

      return { contentId: args.contentId, grade, overallScore };
    } catch (error) {
      // Mark as failed and record the error
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await ctx.runMutation(api.content.setGradingStatus, {
        id: args.contentId,
        gradingStatus: "failed",
        lastGradingError: errorMessage,
      });

      throw error;
    }
  },
});

/**
 * Grade a batch of content items sequentially.
 *
 * If no contentIds are provided, all items with gradingStatus "pending" are
 * graded.  Individual failures are logged but do not stop the batch.
 */
export const batchGrade = internalAction({
  args: {
    contentIds: v.optional(v.array(v.id("contentItems"))),
  },
  handler: async (ctx, args) => {
    let ids: string[] = args.contentIds ?? [];

    // If no explicit IDs provided, get all pending items
    if (ids.length === 0) {
      const pending = await ctx.runQuery(api.content.getAll, {});

      // getAll returns either paginated results or an array.  We need the
      // plain array path (no pagination opts passed).
      const items = Array.isArray(pending) ? pending : (pending as any).page ?? [];
      ids = items
        .filter(
          (item: any) => item.gradingStatus === "pending",
        )
        .map((item: any) => item._id);
    }

    const results: {
      contentId: string;
      success: boolean;
      grade?: string;
      error?: string;
    }[] = [];

    for (let i = 0; i < ids.length; i++) {
      const contentId = ids[i] as any;

      try {
        const result = await ctx.runAction(internal.grading.gradeContent, {
          contentId,
        });
        results.push({
          contentId,
          success: true,
          grade: (result as any)?.grade,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `Failed to grade content ${contentId}: ${errorMessage}`,
        );
        results.push({ contentId, success: false, error: errorMessage });
      }

      // 2-second delay between items to avoid rate-limiting
      if (i < ids.length - 1) {
        await sleep(2000);
      }
    }

    return results;
  },
});

/**
 * Grade all content associated with a specific topic.
 */
export const gradeByTopic = internalAction({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args): Promise<{ topicId: string; graded?: number; results?: any }> => {
    const contentItems = await ctx.runQuery(api.content.getByTopic, {
      topicId: args.topicId,
    });

    if (!contentItems || contentItems.length === 0) {
      return { topicId: args.topicId, graded: 0 };
    }

    const contentIds = contentItems.map((item: any) => item._id);

    const results = await ctx.runAction(internal.grading.batchGrade, {
      contentIds,
    });

    return { topicId: args.topicId, results };
  },
});

/**
 * Grade a batch of content items with controlled parallelism.
 *
 * Splits the IDs into concurrent groups of `concurrency` size, running each
 * group in parallel. This is much faster than sequential batchGrade for large
 * batches while respecting API rate limits.
 */
export const parallelBatchGrade = internalAction({
  args: {
    contentIds: v.array(v.id("contentItems")),
    concurrency: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ids = args.contentIds;
    const concurrency = args.concurrency ?? 5;

    const results: {
      contentId: string;
      success: boolean;
      grade?: string;
      error?: string;
    }[] = [];

    // Process in chunks of `concurrency`
    for (let i = 0; i < ids.length; i += concurrency) {
      const chunk = ids.slice(i, i + concurrency);

      const chunkResults = await Promise.allSettled(
        chunk.map(async (contentId) => {
          const result = await ctx.runAction(internal.grading.gradeContent, {
            contentId,
          });
          return { contentId: contentId as string, result };
        }),
      );

      for (const settled of chunkResults) {
        if (settled.status === "fulfilled") {
          results.push({
            contentId: settled.value.contentId,
            success: true,
            grade: (settled.value.result as any)?.grade,
          });
        } else {
          const errorMessage =
            settled.reason instanceof Error
              ? settled.reason.message
              : String(settled.reason);
          results.push({
            contentId: "unknown",
            success: false,
            error: errorMessage,
          });
        }
      }

      // Brief pause between chunks to avoid rate limits
      if (i + concurrency < ids.length) {
        await sleep(1000);
      }
    }

    return results;
  },
});

/**
 * Rolling re-grade: pick up the 50 oldest graded items plus any failed items
 * and re-grade them.  Designed to be called on a cron schedule.
 */
export const rollingRegrade = internalAction({
  args: {},
  handler: async (ctx): Promise<{ regraded: number; results?: any }> => {
    // Get all content items so we can find oldest graded + failed
    const allItems: any = await ctx.runQuery(api.content.getAll, {});
    const items: any[] = Array.isArray(allItems) ? allItems : allItems?.page ?? [];

    // Failed items -- always re-attempt
    const failedIds: any[] = items
      .filter((item: any) => item.gradingStatus === "failed")
      .map((item: any) => item._id);

    // Oldest graded items by updatedAt ascending (oldest first)
    const gradedItems: any[] = items
      .filter((item: any) => item.gradingStatus === "graded")
      .sort((a: any, b: any) => a.updatedAt - b.updatedAt);

    const oldestGradedIds: any[] = gradedItems
      .slice(0, 50)
      .map((item: any) => item._id);

    // De-duplicate (in case a failed item is also somehow in oldest graded)
    const uniqueIds: any[] = [...new Set([...failedIds, ...oldestGradedIds])];

    if (uniqueIds.length === 0) {
      return { regraded: 0 };
    }

    const results: any = await ctx.runAction(internal.grading.batchGrade, {
      contentIds: uniqueIds,
    });

    return { regraded: uniqueIds.length, results };
  },
});
