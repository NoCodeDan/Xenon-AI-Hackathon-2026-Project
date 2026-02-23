import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Import items from the parsed master list.
 * Expects pre-parsed JSON with topic slugs resolved to IDs by the caller script.
 * Deduplicates by URL — skips items whose URL already exists.
 */
export const importBatch = internalMutation({
  args: {
    items: v.array(
      v.object({
        title: v.string(),
        type: v.union(
          v.literal("track"),
          v.literal("course"),
          v.literal("workshop"),
          v.literal("practice"),
          v.literal("bonus"),
          v.literal("stage"),
          v.literal("video")
        ),
        description: v.optional(v.string()),
        topicSlug: v.string(),
        url: v.string(),
        skillLevel: v.optional(
          v.union(
            v.literal("Beginner"),
            v.literal("Intermediate"),
            v.literal("Advanced")
          )
        ),
        estimatedMinutes: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Load all topics for slug→ID resolution
    const topics = await ctx.db.query("topics").collect();
    const topicBySlug = new Map(topics.map((t) => [t.slug, t]));

    // Load existing URLs for deduplication
    const existingItems = await ctx.db.query("contentItems").collect();
    const existingUrls = new Set(
      existingItems.filter((i) => i.url).map((i) => i.url!)
    );

    const now = Date.now();
    let imported = 0;
    let skipped = 0;
    let missingTopics: string[] = [];

    for (const item of args.items) {
      // Skip if URL already exists
      if (existingUrls.has(item.url)) {
        // Update existing item with new fields if they're missing
        const existing = existingItems.find((e) => e.url === item.url);
        if (existing) {
          const patch: Record<string, unknown> = {};
          if (item.skillLevel && !existing.skillLevel) {
            patch.skillLevel = item.skillLevel;
          }
          if (item.estimatedMinutes && !existing.estimatedMinutes) {
            patch.estimatedMinutes = item.estimatedMinutes;
          }
          if (item.description && !existing.description) {
            patch.description = item.description;
          }
          if (Object.keys(patch).length > 0) {
            patch.updatedAt = now;
            await ctx.db.patch(existing._id, patch);
          }
        }
        skipped++;
        continue;
      }

      // Resolve topic
      const topic = topicBySlug.get(item.topicSlug);
      if (!topic) {
        if (!missingTopics.includes(item.topicSlug)) {
          missingTopics.push(item.topicSlug);
        }
        skipped++;
        continue;
      }

      await ctx.db.insert("contentItems", {
        title: item.title,
        type: item.type,
        description: item.description,
        topicIds: [topic._id],
        url: item.url,
        skillLevel: item.skillLevel,
        estimatedMinutes: item.estimatedMinutes,
        createdAt: now,
        updatedAt: now,
        gradingStatus: "pending",
      });

      imported++;
    }

    return { imported, skipped, missingTopics };
  },
});
