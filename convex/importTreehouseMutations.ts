import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";

// ─── Step 1: Clear all existing data ───────────────────────────────────────
export const clearAll = mutation({
  args: {},
  handler: async (ctx): Promise<number> => {
    let deleted = 0;
    const tables = [
      "chatMessages",
      "chatSessions",
      "requestVotes",
      "contentRequests",
      "librarySnapshots",
      "contentLatestGrade",
      "freshnessScores",
      "contentEdges",
      "contentItems",
      "topicSnapshots",
      "topics",
    ] as const;

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
        deleted++;
      }
    }
    return deleted;
  },
});

// ─── Step 2: Import topics + snapshots ─────────────────────────────────────
export const importTopics = mutation({
  args: {
    topics: v.array(
      v.object({
        name: v.string(),
        slug: v.string(),
        domain: v.string(),
        description: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args): Promise<Record<string, string>> => {
    const now = Date.now();
    const slugToId: Record<string, string> = {};

    for (const topic of args.topics) {
      const topicId = await ctx.db.insert("topics", {
        name: topic.name,
        slug: topic.slug,
        domain: topic.domain,
        description: topic.description,
      });
      slugToId[topic.slug] = topicId as string;

      const snapshotId = await ctx.db.insert("topicSnapshots", {
        topicId,
        keyPractices: [`Current ${topic.name} best practices`],
        deprecatedPractices: [],
        emergingTrends: [`Emerging trends in ${topic.name}`],
        changeVelocity: 0.5,
        confidence: 0.7,
        notes: `Auto-imported topic snapshot for ${topic.name}.`,
        createdAt: now,
      });

      await ctx.db.patch(topicId, { activeSnapshotId: snapshotId });
    }
    return slugToId;
  },
});

// ─── Step 3: Import a batch of tracks ──────────────────────────────────────
export const importTracks = mutation({
  args: {
    tracks: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        url: v.string(),
        duration: v.optional(v.number()),
        topicSlugs: v.array(v.string()),
      })
    ),
    topicSlugToId: v.any(),
  },
  handler: async (ctx, args): Promise<Record<string, string>> => {
    const now = Date.now();
    const titleToId: Record<string, string> = {};

    const resolveTopicIds = (slugs: string[]) => {
      const ids: any[] = [];
      for (const slug of slugs) {
        const id = (args.topicSlugToId as Record<string, any>)[slug];
        if (id) ids.push(id);
      }
      if (ids.length === 0) {
        const firstId = Object.values(args.topicSlugToId as Record<string, any>)[0];
        if (firstId) ids.push(firstId);
      }
      return ids;
    };

    for (const track of args.tracks) {
      const trackId = await ctx.db.insert("contentItems", {
        title: track.title,
        type: "track" as const,
        description: track.description,
        topicIds: resolveTopicIds(track.topicSlugs),
        url: track.url,
        duration: track.duration,
        updatedAt: now,
        createdAt: now,
        gradingStatus: "pending" as const,
      });
      titleToId[track.title] = trackId as string;
    }
    return titleToId;
  },
});

// ─── Step 4: Import a batch of courses with stages + lessons ───────────────
export const importCourseBatch = mutation({
  args: {
    courses: v.any(),
    topicSlugToId: v.any(),
    trackTitleToId: v.any(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ courses: number; stages: number; lessons: number; edges: number }> => {
    const now = Date.now();
    const tsMap = args.topicSlugToId as Record<string, any>;
    const ttMap = args.trackTitleToId as Record<string, any>;
    let courses = 0, stages = 0, lessons = 0, edges = 0;

    const resolveTopicIds = (slugs: string[]) => {
      const ids: any[] = [];
      for (const slug of slugs) {
        if (tsMap[slug]) ids.push(tsMap[slug]);
      }
      if (ids.length === 0) {
        const firstId = Object.values(tsMap)[0];
        if (firstId) ids.push(firstId);
      }
      return ids;
    };

    for (const course of args.courses as any[]) {
      const topicIds = resolveTopicIds(course.topicSlugs || []);

      const courseId = await ctx.db.insert("contentItems", {
        title: course.title,
        type: "course" as const,
        description: course.description || "",
        topicIds,
        url: course.url,
        duration: course.duration,
        updatedAt: now,
        createdAt: now,
        gradingStatus: "pending" as const,
      });
      courses++;

      if (course.trackTitle && ttMap[course.trackTitle]) {
        await ctx.db.insert("contentEdges", {
          parentId: ttMap[course.trackTitle],
          childId: courseId,
          edgeType: "contains" as const,
          order: course.trackOrder ?? 0,
        });
        edges++;
      }

      for (const stage of course.stages || []) {
        const stageId = await ctx.db.insert("contentItems", {
          title: stage.title,
          type: "stage" as const,
          description: stage.description || stage.title,
          topicIds,
          updatedAt: now,
          createdAt: now,
          gradingStatus: "pending" as const,
        });
        stages++;

        await ctx.db.insert("contentEdges", {
          parentId: courseId,
          childId: stageId,
          edgeType: "contains" as const,
          order: stage.order,
        });
        edges++;

        for (const lesson of stage.lessons || []) {
          const lessonId = await ctx.db.insert("contentItems", {
            title: lesson.title,
            type: lesson.type === "practice" ? ("practice" as const) : ("video" as const),
            description: `${lesson.type === "video" ? "Video" : "Practice"}: ${lesson.title}`,
            topicIds,
            url: lesson.url,
            duration: lesson.duration,
            publishedAt: now,
            updatedAt: now,
            createdAt: now,
            gradingStatus: "pending" as const,
          });
          lessons++;

          await ctx.db.insert("contentEdges", {
            parentId: stageId,
            childId: lessonId,
            edgeType: "contains" as const,
            order: lesson.order,
          });
          edges++;
        }
      }
    }
    return { courses, stages, lessons, edges };
  },
});
