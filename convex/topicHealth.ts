"use node";

// ---------------------------------------------------------------------------
// Topic health checks -- Convex actions that call Claude to assess whether
// a topic snapshot's key/deprecated practices are still current.
// ---------------------------------------------------------------------------

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Anthropic client (lazily initialised so env var is read at runtime)
// ---------------------------------------------------------------------------

function getClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HealthCheckSuggestion {
  topicId: string;
  topicName: string;
  stillCurrent: boolean;
  practiceChanges: {
    newKeyPractices: string[];
    newlyDeprecated: string[];
    removedFromDeprecated: string[];
  };
  emergingTrends: string[];
  suggestedVelocityAdjustment: number | null;
  reasoning: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Claude health-check call
// ---------------------------------------------------------------------------

async function callClaudeForHealthCheck(
  topicName: string,
  domain: string,
  keyPractices: string[],
  deprecatedPractices: string[],
  emergingTrends: string[] | undefined,
  changeVelocity: number,
): Promise<HealthCheckSuggestion & { topicId: string; topicName: string }> {
  const client = getClient();

  const emergingSection =
    emergingTrends && emergingTrends.length > 0
      ? `Emerging Trends (previously identified):\n${emergingTrends.map((t) => `  - ${t}`).join("\n")}`
      : "Emerging Trends: (none previously identified)";

  const prompt = `You are an expert technology analyst assessing whether an educational topic snapshot is still accurate and up-to-date.

## Topic: ${topicName}
## Domain: ${domain}
## Current Change Velocity: ${changeVelocity.toFixed(2)}

Current Key Practices (what we say is recommended):
${keyPractices.map((p) => `  - ${p}`).join("\n")}

Current Deprecated Practices (what we say is no longer recommended):
${deprecatedPractices.map((p) => `  - ${p}`).join("\n")}

${emergingSection}

## Your Task

Assess whether the above practices lists are still accurate as of today. Consider:

1. Are any of the "key practices" now outdated or superseded?
2. Are there important new practices that should be added?
3. Are any "deprecated practices" actually making a comeback or were incorrectly deprecated?
4. Are there new emerging trends not captured above?
5. Has the pace of change (velocity) in this domain shifted?

Respond with **only** a JSON object (no markdown fences, no extra text) in this exact format:

{
  "stillCurrent": <boolean - true if the snapshot is broadly accurate, false if significant changes needed>,
  "practiceChanges": {
    "newKeyPractices": [<practices that should be added to key practices>],
    "newlyDeprecated": [<practices that should move from key to deprecated>],
    "removedFromDeprecated": [<practices that should be removed from deprecated list>]
  },
  "emergingTrends": [<current emerging trends for this topic>],
  "suggestedVelocityAdjustment": <number or null - suggested new velocity if changed, null if unchanged>,
  "reasoning": "<2-3 sentence explanation of your assessment>",
  "confidence": <number 0-1, your confidence in this assessment>
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content");
  }

  const parsed = JSON.parse(textBlock.text);

  // Basic validation
  if (
    typeof parsed.stillCurrent !== "boolean" ||
    typeof parsed.practiceChanges !== "object" ||
    typeof parsed.confidence !== "number"
  ) {
    throw new Error("Claude returned an invalid response shape for health check");
  }

  return {
    topicId: "", // filled in by caller
    topicName,
    ...parsed,
  };
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
 * Check whether a single topic's active snapshot is still current.
 *
 * Fetches the topic and its active snapshot, then calls Claude to assess
 * whether the keyPractices / deprecatedPractices are still accurate.
 *
 * Returns a suggestion object -- does NOT auto-update anything.
 */
export const checkTopicCurrency = internalAction({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args): Promise<HealthCheckSuggestion> => {
    // Fetch the topic
    const topics = await ctx.runQuery(api.topics.getAll, {});
    const topic = topics.find((t: any) => t._id === args.topicId);
    if (!topic) {
      throw new Error(`Topic ${args.topicId} not found`);
    }

    // Fetch the active snapshot
    const snapshot = await ctx.runQuery(api.topicSnapshots.getActive, {
      topicId: args.topicId,
    });
    if (!snapshot) {
      throw new Error(
        `No active snapshot found for topic "${topic.name}" (${args.topicId})`,
      );
    }

    // Call Claude to assess currency
    const suggestion = await callClaudeForHealthCheck(
      topic.name,
      topic.domain,
      snapshot.keyPractices,
      snapshot.deprecatedPractices,
      snapshot.emergingTrends,
      snapshot.changeVelocity,
    );

    // Fill in the topicId
    suggestion.topicId = args.topicId;

    console.log(
      `Health check for "${topic.name}": stillCurrent=${suggestion.stillCurrent}, confidence=${suggestion.confidence}`,
    );

    return suggestion;
  },
});

/**
 * Check all topics sequentially with delays between each call.
 *
 * Iterates over every topic in the database, checks its health, and
 * collects the results. Individual failures are logged but do not
 * stop the batch.
 */
export const batchCheckTopics = internalAction({
  args: {},
  handler: async (ctx): Promise<{ checked: number; results: any[] }> => {
    const topics: any[] = await ctx.runQuery(api.topics.getAll, {});

    if (!topics || topics.length === 0) {
      console.log("No topics found for health check.");
      return { checked: 0, results: [] };
    }

    const results: {
      topicId: string;
      topicName: string;
      success: boolean;
      suggestion?: HealthCheckSuggestion;
      error?: string;
    }[] = [];

    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];

      // Skip topics without an active snapshot
      if (!topic.activeSnapshotId) {
        console.log(
          `Skipping topic "${topic.name}" -- no active snapshot.`,
        );
        results.push({
          topicId: topic._id,
          topicName: topic.name,
          success: false,
          error: "No active snapshot",
        });
        continue;
      }

      try {
        const suggestion = await ctx.runAction(
          internal.topicHealth.checkTopicCurrency,
          { topicId: topic._id },
        );
        results.push({
          topicId: topic._id,
          topicName: topic.name,
          success: true,
          suggestion: suggestion as HealthCheckSuggestion,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `Health check failed for "${topic.name}": ${errorMessage}`,
        );
        results.push({
          topicId: topic._id,
          topicName: topic.name,
          success: false,
          error: errorMessage,
        });
      }

      // 3-second delay between topics to avoid rate-limiting
      if (i < topics.length - 1) {
        await sleep(3000);
      }
    }

    console.log(
      `Topic health batch complete: ${results.filter((r) => r.success).length}/${topics.length} succeeded.`,
    );

    return { checked: topics.length, results };
  },
});
