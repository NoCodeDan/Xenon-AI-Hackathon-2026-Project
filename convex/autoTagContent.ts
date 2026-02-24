import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Auto-tag all content items with a topic based on keyword matching
 * against title, description, and URL, plus parent-course inheritance.
 *
 * Runs in batches to stay within Convex mutation limits.
 * Call repeatedly with increasing offset until result.remaining === 0.
 */

// Keyword → topic slug mapping. Order matters — first match wins.
// More specific patterns come before generic ones.
const KEYWORD_MAP: [RegExp, string][] = [
  // Specific frameworks / languages first
  [/\breact\s*native\b/i, "react"],
  [/\breact\b|\bnext\.?js\b|\bredux\b|\bjsx\b/i, "react"],
  [/\bangular\b/i, "javascript"],
  [/\bvue\.?js\b|\bvue\b/i, "javascript"],
  [/\btypescript\b|\bts\b/i, "javascript"],
  [/\bnode\.?js\b|\bexpress\b/i, "javascript"],
  [/\bjavascript\b|\bjs\b|\bjquery\b|\bes6\b|\becmascript\b/i, "javascript"],
  [/\bswift\b|\bios\b|\bswiftui\b|\bxcode\b|\bobjective.?c\b/i, "swift"],
  [/\bkotlin\b|\bandroid\b/i, "java"],
  [/\bjava\b(?!script)/i, "java"],
  [/\bpython\b|\bdjango\b|\bflask\b/i, "python"],
  [/\bruby\b|\brails\b|\bsinatra\b/i, "ruby"],
  [/\bphp\b|\blaravel\b|\bwordpress\b|\bdrupal\b|\bsymfony\b/i, "php"],
  [/\bc#\b|\bc sharp\b|\.net\b|\basp\.net\b|\bunity\s+c#/i, "javascript"], // map to JS as fallback; Unity goes to game-dev
  [/\bgo\b(?:\s+language|\s+programming)?|\bgolang\b/i, "go"],
  [/\brust\b/i, "development-tools"],

  // Web fundamentals
  [/\bhtml\b|\bhypertext\b|\bmarkup\b|\bweb\s*page\b|\bdom\b/i, "html"],
  [/\bcss\b|\bflexbox\b|\bgrid\s*layout\b|\bsass\b|\bscss\b|\bless\b|\bresponsive\s*design\b|\bbootstrap\b|\btailwind\b|\bstylesheets?\b/i, "css"],

  // AI & ML
  [/\bmachine\s*learning\b|\bneural\b|\bdeep\s*learning\b|\btensorflow\b|\bpytorch\b|\bscikit/i, "machine-learning"],
  [/\bai\b|\bartificial\s*intelligence\b|\bchatgpt\b|\bllm\b|\blarge\s*language\b|\bgpt\b|\bgenerative\b|\bprompt\s*engineer/i, "ai"],
  [/\bvibe\s*coding\b/i, "vibe-coding"],

  // Data & DBs
  [/\bsql\b|\bdatabase\b|\bmysql\b|\bpostgres\b|\bmongodb\b|\bsequelize\b|\bsqlite\b|\bfirebase\b|\borm\b/i, "databases"],
  [/\bdata\s*analysis\b|\bdata\s*science\b|\bpandas\b|\bnumpy\b|\btableau\b|\bstatistics\b|\bexcel\b|\bspreadsheet/i, "data-analysis"],

  // Security
  [/\bsecurity\b|\bauthentication\b|\boauth\b|\bcsrf\b|\bxss\b|\bencryption\b|\bcybersecurity\b|\bpassword/i, "security"],

  // APIs
  [/\bapi\b|\brest\s*api\b|\bgraphql\b|\bajax\b|\bfetch\s*api\b|\bendpoint\b|\bwebhook/i, "apis"],

  // Design
  [/\bdesign\b|\bux\b|\bui\b|\bfigma\b|\bsketch\b|\bmockup\b|\bwireframe\b|\bphotoshop\b|\billustrator\b|\bcolor\s*theory\b|\baccessibility\b|\bprototyp/i, "design"],

  // DevTools
  [/\bgit\b|\bgithub\b|\bcommand\s*line\b|\bterminal\b|\bnpm\b|\bwebpack\b|\bdevtools\b|\bdebugging\b|\bchrome\s*dev\b|\bvscode\b|\beditor\b|\bide\b|\bdocker\b|\bci\s*\/?\s*cd\b|\bdeployment\b|\bheroku\b|\baws\b|\bvercel\b/i, "development-tools"],

  // Game dev
  [/\bgame\b|\bunity\b|\bunreal\b|\bphaser\b|\bpygame\b|\bsprite\b|\b3d\b|\bgameplay/i, "game-development"],

  // CS
  [/\bcomputer\s*science\b|\balgorithm\b|\bdata\s*structure\b|\bbig[\s-]?o\b|\brecursion\b|\bsorting\b|\bbinary\s*tree\b|\blinked\s*list\b|\bstack\b|\bqueue\b|\bhash\s*table/i, "computer-science"],

  // QA
  [/\bquality\s*assurance\b|\bqa\b|\btesting\b|\bselenium\b|\bcypress\b|\bjest\b|\bmocha\b|\bunit\s*test\b|\btest\s*driven\b|\btdd\b|\bintegration\s*test/i, "quality-assurance"],

  // No-code
  [/\bno[\s-]?code\b|\bzapier\b|\bbubble\b|\bairtable\b|\bwebflow\b|\bwix\b|\bsquarespace/i, "nocode"],

  // Kids
  [/\bcoding\s*for\s*kids\b|\bscratch\b|\bbeginner\s*coding\b|\bkids?\b/i, "coding-for-kids"],

  // Digital literacy
  [/\bdigital\s*literacy\b|\bcomputer\s*basics\b|\binternet\s*basics\b|\bemail\b|\btech\s*literacy/i, "digital-literacy"],

  // Professional growth
  [/\bresume\b|\binterview\b|\bcareer\b|\bjob\b|\brecruiter\b|\bfreelance\b|\bbusiness\b|\bprofessional\b|\bsoft\s*skills\b|\bleadership\b|\bmanagement\b|\bworkplace\b|\bremote\s*work/i, "professional-growth"],

  // College credit
  [/\bcollege\s*credit\b|\baccredited\b/i, "college-credit"],

  // Learning resources — very generic, keep near bottom
  [/\blearning\b|\bstudy\b|\bgetting\s*started\b|\bhow\s*to\s*learn\b|\bbeginners?\s*guide\b|\bintroduction\s*to\b|\bwhat\s*is\b/i, "learning-resources"],
];

function guessTopicSlug(title: string, description?: string, url?: string): string | null {
  const text = `${title} ${description || ""} ${url || ""}`;
  for (const [regex, slug] of KEYWORD_MAP) {
    if (regex.test(text)) return slug;
  }
  return null;
}

export const autoTagBatch = internalMutation({
  args: {
    offset: v.number(),
    limit: v.number(),
    overwriteExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const overwrite = args.overwriteExisting ?? false;

    // Load all topics
    const topics = await ctx.db.query("topics").collect();
    const topicBySlug = new Map(topics.map((t) => [t.slug, t]));

    // Load all content items and edges
    const allItems = await ctx.db.query("contentItems").collect();
    const allEdges = await ctx.db.query("contentEdges").collect();

    // Build parent lookup: childId → parentId
    const childToParent = new Map<string, string>();
    for (const edge of allEdges) {
      if (edge.edgeType === "contains") {
        childToParent.set(edge.childId as string, edge.parentId as string);
      }
    }

    // Item lookup by ID
    const itemById = new Map(allItems.map((item) => [item._id as string, item]));

    // Get the batch
    const batch = allItems.slice(args.offset, args.offset + args.limit);

    let tagged = 0;
    let skipped = 0;
    let alreadyTagged = 0;
    const slugCounts: Record<string, number> = {};

    for (const item of batch) {
      // Skip items that already have a valid topic unless overwriting
      if (!overwrite && item.topicIds.length > 0) {
        // Verify the existing topic actually exists
        const existingTopic = await ctx.db.get(item.topicIds[0]);
        if (existingTopic) {
          alreadyTagged++;
          continue;
        }
      }

      // Try keyword match on this item
      let slug = guessTopicSlug(item.title, item.description, item.url);

      // If no match, walk up the parent chain
      if (!slug) {
        let parentId = childToParent.get(item._id as string);
        let depth = 0;
        while (parentId && depth < 5) {
          const parent = itemById.get(parentId);
          if (parent) {
            slug = guessTopicSlug(parent.title, parent.description, parent.url);
            if (slug) break;

            // Also check if parent already has a valid topic we can inherit
            if (parent.topicIds.length > 0) {
              const parentTopic = topics.find((t) => t._id === parent.topicIds[0]);
              if (parentTopic) {
                slug = parentTopic.slug;
                break;
              }
            }
          }
          parentId = childToParent.get(parentId);
          depth++;
        }
      }

      if (!slug) {
        skipped++;
        continue;
      }

      const topic = topicBySlug.get(slug);
      if (!topic) {
        skipped++;
        continue;
      }

      await ctx.db.patch(item._id, { topicIds: [topic._id] });
      tagged++;
      slugCounts[slug] = (slugCounts[slug] ?? 0) + 1;
    }

    return {
      tagged,
      skipped,
      alreadyTagged,
      batchSize: batch.length,
      remaining: Math.max(0, allItems.length - (args.offset + args.limit)),
      total: allItems.length,
      slugCounts,
    };
  },
});

/**
 * Public wrapper to run auto-tagging in one go for smaller datasets.
 * For 3,625 items this may hit limits — use autoTagBatch in batches if needed.
 */
export const autoTagAll = mutation({
  args: {
    overwriteExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const overwrite = args.overwriteExisting ?? false;

    const topics = await ctx.db.query("topics").collect();
    const topicBySlug = new Map(topics.map((t) => [t.slug, t]));

    const allItems = await ctx.db.query("contentItems").collect();
    const allEdges = await ctx.db.query("contentEdges").collect();

    const childToParent = new Map<string, string>();
    for (const edge of allEdges) {
      if (edge.edgeType === "contains") {
        childToParent.set(edge.childId as string, edge.parentId as string);
      }
    }

    const itemById = new Map(allItems.map((item) => [item._id as string, item]));

    let tagged = 0;
    let skipped = 0;
    let alreadyTagged = 0;
    const slugCounts: Record<string, number> = {};

    for (const item of allItems) {
      if (!overwrite && item.topicIds.length > 0) {
        const existingTopic = await ctx.db.get(item.topicIds[0]);
        if (existingTopic) {
          alreadyTagged++;
          continue;
        }
      }

      let slug = guessTopicSlug(item.title, item.description, item.url);

      if (!slug) {
        let parentId = childToParent.get(item._id as string);
        let depth = 0;
        while (parentId && depth < 5) {
          const parent = itemById.get(parentId);
          if (parent) {
            slug = guessTopicSlug(parent.title, parent.description, parent.url);
            if (slug) break;

            if (parent.topicIds.length > 0) {
              const parentTopic = topics.find((t) => t._id === parent.topicIds[0]);
              if (parentTopic) {
                slug = parentTopic.slug;
                break;
              }
            }
          }
          parentId = childToParent.get(parentId);
          depth++;
        }
      }

      if (!slug) {
        skipped++;
        continue;
      }

      const topic = topicBySlug.get(slug);
      if (!topic) {
        skipped++;
        continue;
      }

      await ctx.db.patch(item._id, { topicIds: [topic._id] });
      tagged++;
      slugCounts[slug] = (slugCounts[slug] ?? 0) + 1;
    }

    return {
      tagged,
      skipped,
      alreadyTagged,
      total: allItems.length,
      slugCounts,
    };
  },
});
