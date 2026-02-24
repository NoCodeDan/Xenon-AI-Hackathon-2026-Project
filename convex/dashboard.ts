// ---------------------------------------------------------------------------
// Composite dashboard queries — combine multiple small queries into fewer
// round-trips for the dashboard page.
// ---------------------------------------------------------------------------

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * getSummary — combines:
 *   - snapshots.getLatest (latest library snapshot)
 *   - content.getContentStats (total, typeCounts, categoryCounts)
 *   - requests.getByStatus("open") (open request count)
 *
 * Returns a single object with all dashboard summary data.
 */
export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    // Run all three data fetches in parallel
    const [latestSnapshot, allItems, allTopics, openRequests] =
      await Promise.all([
        ctx.db
          .query("librarySnapshots")
          .withIndex("by_created")
          .order("desc")
          .first(),
        ctx.db.query("contentItems").collect(),
        ctx.db.query("topics").collect(),
        ctx.db
          .query("contentRequests")
          .withIndex("by_status", (q) => q.eq("status", "open"))
          .collect(),
      ]);

    // Compute content stats inline
    const topicMap = new Map(
      allTopics.map((t) => [t._id.toString(), t])
    );

    const typeCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    for (const item of allItems) {
      typeCounts[item.type] = (typeCounts[item.type] ?? 0) + 1;

      const primaryTopicId = item.topicIds[0];
      const primaryTopic = primaryTopicId
        ? topicMap.get(primaryTopicId.toString())
        : null;
      const category = primaryTopic?.domain ?? "other";
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    }

    return {
      latestSnapshot,
      contentStats: {
        total: allItems.length,
        typeCounts,
        categoryCounts,
      },
      openRequestCount: openRequests.length,
    };
  },
});

/**
 * getWidgetData — combines:
 *   - grades.getDistribution
 *   - grades.getWorstPerformers(5)
 *   - grades.getBestPerformers(5)
 *   - grades.getStalestContent(5)
 *   - topics.getTrendingTopics(5)
 *
 * Returns a single object with all widget data.
 */
export const getWidgetData = query({
  args: {},
  handler: async (ctx) => {
    // Fetch shared data once
    const [allGrades, allContent, allTopics] = await Promise.all([
      ctx.db.query("contentLatestGrade").collect(),
      ctx.db.query("contentItems").collect(),
      ctx.db.query("topics").collect(),
    ]);

    // --- Grade distribution ---
    const distribution: Record<string, number> = {};
    for (const entry of allGrades) {
      distribution[entry.grade] = (distribution[entry.grade] ?? 0) + 1;
    }

    // --- Build content lookup map ---
    const contentMap = new Map(
      allContent.map((c) => [c._id.toString(), c])
    );

    // --- Sort grades by score for worst/best ---
    const sortedByScore = [...allGrades].sort(
      (a, b) => a.overallScore - b.overallScore
    );

    // Worst performers (lowest scores)
    const worstPerformers = sortedByScore.slice(0, 5).map((gradeEntry) => {
      const contentItem = contentMap.get(gradeEntry.contentId.toString());
      return {
        ...gradeEntry,
        title: contentItem?.title ?? null,
        type: contentItem?.type ?? null,
      };
    });

    // Best performers (highest scores)
    const bestPerformers = sortedByScore
      .slice(-5)
      .reverse()
      .map((gradeEntry) => {
        const contentItem = contentMap.get(gradeEntry.contentId.toString());
        return {
          ...gradeEntry,
          title: contentItem?.title ?? null,
          type: contentItem?.type ?? null,
          updatedAt: contentItem?.updatedAt ?? null,
        };
      });

    // Stalest content (oldest updatedAt)
    const withContentDate = allGrades
      .map((gradeEntry) => {
        const contentItem = contentMap.get(gradeEntry.contentId.toString());
        return {
          ...gradeEntry,
          title: contentItem?.title ?? null,
          type: contentItem?.type ?? null,
          contentUpdatedAt: contentItem?.updatedAt ?? null,
        };
      })
      .filter((item) => item.contentUpdatedAt !== null);

    withContentDate.sort((a, b) => a.contentUpdatedAt! - b.contentUpdatedAt!);
    const stalestContent = withContentDate.slice(0, 5);

    // --- Trending topics ---
    const contentCountByTopic = new Map<string, number>();
    for (const item of allContent) {
      for (const topicId of item.topicIds) {
        contentCountByTopic.set(
          topicId as string,
          (contentCountByTopic.get(topicId as string) ?? 0) + 1
        );
      }
    }

    // Batch-fetch all active snapshots
    const snapshotIds = allTopics
      .map((t) => t.activeSnapshotId)
      .filter((id): id is NonNullable<typeof id> => id !== undefined);
    const snapshots = await Promise.all(
      snapshotIds.map((id) => ctx.db.get(id))
    );
    const snapshotMap = new Map(
      snapshots
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .map((s) => [s._id.toString(), s])
    );

    const trendingTopics = allTopics
      .map((topic) => {
        const activeSnapshot = topic.activeSnapshotId
          ? snapshotMap.get(topic.activeSnapshotId.toString()) ?? null
          : null;

        return {
          _id: topic._id,
          name: topic.name,
          domain: topic.domain,
          changeVelocity: activeSnapshot?.changeVelocity ?? 0,
          emergingTrends: activeSnapshot?.emergingTrends ?? [],
          contentCount:
            contentCountByTopic.get(topic._id as string) ?? 0,
        };
      })
      .sort((a, b) => b.changeVelocity - a.changeVelocity)
      .slice(0, 5);

    return {
      distribution,
      worstPerformers,
      bestPerformers,
      stalestContent,
      trendingTopics,
    };
  },
});

/**
 * getBatchWithGrades — fetches multiple content items with their grades
 * in a single query. Used by ContentPreviewCard components to avoid N+1.
 */
export const getBatchWithGrades = query({
  args: {
    contentIds: v.array(v.id("contentItems")),
  },
  handler: async (ctx, args) => {
    if (args.contentIds.length === 0) return [];

    // Batch-fetch all content items
    const items = await Promise.all(
      args.contentIds.map((id) => ctx.db.get(id))
    );

    // Batch-fetch all grades
    const allGrades = await ctx.db.query("contentLatestGrade").collect();
    const gradeMap = new Map(
      allGrades.map((g) => [g.contentId.toString(), g])
    );

    return args.contentIds.map((id, i) => {
      const item = items[i];
      if (!item) return null;

      const grade = gradeMap.get(id.toString()) ?? null;

      return {
        ...item,
        latestGrade: grade,
      };
    });
  },
});
