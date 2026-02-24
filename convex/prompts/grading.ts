// ---------------------------------------------------------------------------
// Prompt builder for the Claude-powered alignment grading step.
// ---------------------------------------------------------------------------

export interface GradingContentInput {
  title: string;
  type: string;
  description: string | undefined;
  updatedAt: number;
  skillLevel?: string;
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

  const skillLevelLine = content.skillLevel
    ? `- Skill Level: ${content.skillLevel}`
    : "";

  return `You are an expert curriculum reviewer evaluating the freshness and alignment of educational content against current industry practices.

## Content Under Review
- Title: ${content.title}
- Type: ${content.type}
- Last Updated: ${updatedDate}
${skillLevelLine}
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

## IMPORTANT: Scoring Guidelines for Foundational & Evergreen Content

**Foundational content** (beginner courses, introductory tracks, core language basics, practice exercises) teaches concepts that remain stable over time. Apply these rules:

- **Core language fundamentals** (variables, loops, functions, arrays, data types, conditionals, OOP basics) are EVERGREEN. These concepts have NOT changed meaningfully in years. Score alignment 80-95 if the content teaches correct fundamentals, even if it doesn't mention the latest framework features.
- **HTML/CSS fundamentals** (semantic elements, box model, selectors, forms, layout basics) are HIGHLY STABLE. Score 75-90 for content teaching correct fundamentals.
- **Practice exercises and workshops** that drill core skills (arrays, loops, component rendering, data structures) should score 75-95 on alignment — the skill being practiced is still relevant.
- **Beginner/introductory content** should NOT be penalized for not covering advanced emerging trends. Beginners need stable foundations first.
- **Only penalize** content that teaches genuinely **deprecated or harmful practices** (e.g., var instead of let/const as default, class components as the primary React pattern, jQuery as modern best practice for new projects, Python 2 syntax).
- Content about **stable tools** (Git, terminal, IDEs, project management) should score 70-85 unless the specific tool version is very outdated.

Do NOT give low alignment scores just because content is older or doesn't cover cutting-edge topics. The question is: "Does this content teach things that are WRONG or HARMFUL?" — if not, it deserves a good score.

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
