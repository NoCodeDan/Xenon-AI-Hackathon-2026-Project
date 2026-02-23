// ---------------------------------------------------------------------------
// Prompt builder for the Claude-powered alignment grading step.
// ---------------------------------------------------------------------------

export interface GradingContentInput {
  title: string;
  type: string;
  description: string | undefined;
  updatedAt: number;
}

export interface GradingTopicSnapshotInput {
  keyPractices: string[];
  deprecatedPractices: string[];
  emergingTrends: string[] | undefined;
  changeVelocity: number;
}

/**
 * Build a prompt that asks Claude to evaluate how well a piece of educational
 * content aligns with current industry practices described by a topic snapshot.
 *
 * The expected response is **strict JSON** with the following shape:
 *
 * ```json
 * {
 *   "alignmentScore": 0-100,
 *   "outdatedTopics": ["..."],
 *   "missingTopics": ["..."],
 *   "industryBenchmark": "...",
 *   "recommendedAction": "...",
 *   "confidence": 0-1
 * }
 * ```
 */
export function buildGradingPrompt(
  content: GradingContentInput,
  topicSnapshot: GradingTopicSnapshotInput,
): string {
  const updatedDate = new Date(content.updatedAt).toISOString().split("T")[0];

  const emergingSection =
    topicSnapshot.emergingTrends && topicSnapshot.emergingTrends.length > 0
      ? `Emerging Trends:\n${topicSnapshot.emergingTrends.map((t) => `  - ${t}`).join("\n")}`
      : "Emerging Trends: (none listed)";

  return `You are an expert curriculum reviewer evaluating the freshness and alignment of educational content against current industry practices.

## Content Under Review
- Title: ${content.title}
- Type: ${content.type}
- Last Updated: ${updatedDate}
- Description: ${content.description ?? "(no description provided)"}

## Current Industry Snapshot (change velocity: ${topicSnapshot.changeVelocity.toFixed(2)})

Key Practices (currently recommended):
${topicSnapshot.keyPractices.map((p) => `  - ${p}`).join("\n")}

Deprecated Practices (no longer recommended):
${topicSnapshot.deprecatedPractices.map((p) => `  - ${p}`).join("\n")}

${emergingSection}

## Your Task

Evaluate how well the content aligns with the current industry snapshot above. Consider:

1. Does the content teach or reference any **deprecated** practices?
2. Does the content cover the **key practices** that are currently recommended?
3. Does the content mention or prepare learners for **emerging trends**?
4. Given the content type ("${content.type}") and last-update date (${updatedDate}), how current is this material likely to be?

Respond with **only** a JSON object (no markdown fences, no extra text) in this exact format:

{
  "alignmentScore": <number 0-100, where 100 = perfectly aligned with current practices>,
  "outdatedTopics": [<list of specific topics/practices in the content that are outdated or deprecated>],
  "missingTopics": [<list of key current practices or emerging trends NOT covered by the content>],
  "industryBenchmark": "<one-sentence summary of where the industry currently stands>",
  "recommendedAction": "<one of: 'none' | 'minor_update' | 'major_revision' | 'retire_and_replace'>",
  "confidence": <number 0-1, your confidence in this assessment>
}`;
}
