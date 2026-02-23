import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Re-resolve topicIds for all content items based on the course they belong to.
 * Courses get their topic from their URL slug matched against the topics table.
 * Stages/videos/practices inherit from their parent course via contentEdges.
 *
 * Also updates the `domain` field on topics to match their slug (official Treehouse scheme).
 */

/** Step 1: Fix topic domains to match their slug */
export const fixTopicDomains = internalMutation({
  args: {},
  handler: async (ctx) => {
    const topics = await ctx.db.query("topics").collect();
    let updated = 0;
    for (const topic of topics) {
      if (topic.domain !== topic.slug) {
        await ctx.db.patch(topic._id, { domain: topic.slug });
        updated++;
      }
    }
    return { updated, total: topics.length };
  },
});

/** Step 2: Build a mapping of course URL → best topic, then fix assignments */
export const fixContentTopics = internalMutation({
  args: {
    offset: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Load all topics
    const topics = await ctx.db.query("topics").collect();
    const topicBySlug = new Map(topics.map((t) => [t.slug, t]));

    // Keyword → topic slug mapping for content that doesn't have a direct match
    const keywordMap: [RegExp, string][] = [
      [/\breact\b/i, "react"],
      [/\bjavascript\b|\bjs\b/i, "javascript"],
      [/\bcss\b|flexbox|grid layout|sass|responsive design/i, "css"],
      [/\bhtml\b/i, "html"],
      [/\bpython\b/i, "python"],
      [/\bruby\b|rails/i, "ruby"],
      [/\bjava\b(?!script)/i, "java"],
      [/\bswift\b|ios\b|swiftui/i, "swift"],
      [/\bphp\b|laravel|wordpress/i, "php"],
      [/\bc#\b|c sharp|\.net|asp\.net/i, "csharp"],
      [/\bgo\b|golang/i, "go"],
      [/\bsql\b|database|mysql|postgres|mongodb|sequelize/i, "databases"],
      [/\bapi\b|rest api|graphql|ajax|fetch api/i, "apis"],
      [/\bai\b|artificial intelligence|chatgpt|llm|large language|gpt|generative|prompt/i, "ai"],
      [/\bmachine learning\b|neural|deep learning|tensorflow|pytorch/i, "machine-learning"],
      [/\bsecurity\b|authentication|oauth|csrf|xss|encryption/i, "security"],
      [/\bdesign\b|ux\b|ui\b|figma|sketch|mockup|wireframe|photoshop|illustrator|color theory/i, "design"],
      [/\bgit\b|github|command line|terminal|npm|webpack|devtools|debugging|chrome dev/i, "development-tools"],
      [/\bdata analysis\b|data science|pandas|numpy|tableau|statistics/i, "data-analysis"],
      [/\bdigital literacy\b|computer basics|internet basics|email/i, "digital-literacy"],
      [/\bgame\b|unity|unreal|phaser|pygame/i, "game-development"],
      [/\bno.?code\b|zapier|bubble|airtable/i, "nocode"],
      [/\bvibe coding\b/i, "vibe-coding"],
      [/\bcomputer science\b|algorithm|data structure|big.?o|recursion|sorting/i, "computer-science"],
      [/\bquality assurance\b|\bqa\b|testing|selenium|cypress|jest\b|mocha\b/i, "quality-assurance"],
      [/\bcoding for kids\b|scratch\b|beginner coding/i, "coding-for-kids"],
      [/\bresume\b|interview|career|job|recruiter|freelance|business|professional/i, "professional-growth"],
      [/\blearning\b|study|practice|getting started|how to learn/i, "learning-resources"],
    ];

    function guessTopicSlug(title: string, description?: string): string | null {
      const text = `${title} ${description || ""}`;
      for (const [regex, slug] of keywordMap) {
        if (regex.test(text)) return slug;
      }
      return null;
    }

    // Get a batch of content items
    const allItems = await ctx.db.query("contentItems").collect();
    const batch = allItems.slice(args.offset, args.offset + args.limit);

    // Load all edges to find parent courses
    const allEdges = await ctx.db.query("contentEdges").collect();
    const childToParent = new Map<string, string>();
    for (const edge of allEdges) {
      if (edge.edgeType === "contains") {
        childToParent.set(edge.childId as string, edge.parentId as string);
      }
    }

    // Cache of content items by ID
    const itemById = new Map(allItems.map((item) => [item._id as string, item]));

    // Find the C# topic ID to detect items that need fixing
    const csharpTopic = topics.find((t) => t.slug === "csharp");
    const csharpId = csharpTopic?._id as string | undefined;

    let fixed = 0;
    let skipped = 0;

    for (const item of batch) {
      const currentTopicId = item.topicIds[0] as string | undefined;

      // Only fix items that have C# as their topic (the fallback)
      if (currentTopicId !== csharpId) {
        skipped++;
        continue;
      }

      // Try to guess topic from this item's title/description
      let slug = guessTopicSlug(item.title, item.description);

      // If no match, walk up the parent chain to find a course with a known topic
      if (!slug) {
        let parentId = childToParent.get(item._id as string);
        let depth = 0;
        while (parentId && depth < 5) {
          const parent = itemById.get(parentId);
          if (parent) {
            slug = guessTopicSlug(parent.title, parent.description);
            if (slug) break;
          }
          parentId = childToParent.get(parentId);
          depth++;
        }
      }

      if (slug) {
        const topic = topicBySlug.get(slug);
        if (topic) {
          await ctx.db.patch(item._id, { topicIds: [topic._id] });
          fixed++;
          continue;
        }
      }

      // Last resort: assign to "professional-growth" instead of C#
      const fallbackTopic = topicBySlug.get("professional-growth");
      if (fallbackTopic && currentTopicId === csharpId) {
        await ctx.db.patch(item._id, { topicIds: [fallbackTopic._id] });
        fixed++;
      } else {
        skipped++;
      }
    }

    return { fixed, skipped, total: batch.length };
  },
});

/** Add College Credit topic */
export const addCollegeCredit = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("topics")
      .withIndex("by_slug", (q) => q.eq("slug", "college-credit"))
      .unique();
    if (existing) return { status: "already exists", id: existing._id };

    const now = Date.now();
    const topicId = await ctx.db.insert("topics", {
      name: "College Credit",
      slug: "college-credit",
      domain: "college-credit",
      description:
        "Earn college credit while learning to code. Treehouse partners with accredited institutions to offer credit-eligible coursework.",
    });

    const snapshotId = await ctx.db.insert("topicSnapshots", {
      topicId,
      keyPractices: ["Credit-eligible coursework", "Accredited institution partnerships"],
      deprecatedPractices: [],
      emergingTrends: ["Expanding credit partnerships"],
      changeVelocity: 0.2,
      confidence: 0.8,
      notes: "College Credit topic for credit-eligible Treehouse content.",
      createdAt: now,
    });

    await ctx.db.patch(topicId, { activeSnapshotId: snapshotId });
    return { status: "created", id: topicId };
  },
});

/** Remove C# topic: reassign any remaining content, delete snapshot, delete topic */
export const removeCsharp = internalMutation({
  args: {},
  handler: async (ctx) => {
    const csharp = await ctx.db
      .query("topics")
      .withIndex("by_slug", (q) => q.eq("slug", "csharp"))
      .unique();
    if (!csharp) return { status: "not found" };

    // Find a fallback topic for any content still referencing C#
    const jsTopic = await ctx.db
      .query("topics")
      .withIndex("by_slug", (q) => q.eq("slug", "javascript"))
      .unique();

    // Reassign any content items that still reference C#
    const allItems = await ctx.db.query("contentItems").collect();
    let reassigned = 0;
    for (const item of allItems) {
      const idx = (item.topicIds as string[]).indexOf(csharp._id as string);
      if (idx !== -1) {
        const newTopicIds = [...item.topicIds];
        if (jsTopic) {
          newTopicIds[idx] = jsTopic._id;
        } else {
          newTopicIds.splice(idx, 1);
        }
        await ctx.db.patch(item._id, { topicIds: newTopicIds });
        reassigned++;
      }
    }

    // Delete topic snapshot(s)
    const snapshots = await ctx.db
      .query("topicSnapshots")
      .withIndex("by_topic", (q) => q.eq("topicId", csharp._id))
      .collect();
    for (const snap of snapshots) {
      await ctx.db.delete(snap._id);
    }

    // Delete the topic itself
    await ctx.db.delete(csharp._id);

    return { status: "deleted", reassigned, snapshotsDeleted: snapshots.length };
  },
});
