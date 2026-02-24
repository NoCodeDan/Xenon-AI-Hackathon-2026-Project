import { internalMutation } from "./_generated/server";

/**
 * Add college credit content items linked to the college-credit topic.
 * Safe to run multiple times — checks by title before inserting.
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const DAY = 86_400_000;
    const WEEK = 7 * DAY;
    const MONTH = 30 * DAY;

    // Find or create the college-credit topic
    let collegeCreditTopic = await ctx.db
      .query("topics")
      .withIndex("by_slug", (q) => q.eq("slug", "college-credit"))
      .unique();

    if (!collegeCreditTopic) {
      const topicId = await ctx.db.insert("topics", {
        name: "College Credit",
        slug: "college-credit",
        domain: "college-credit",
        description:
          "Earn college credit while learning to code. Treehouse partners with accredited institutions to offer credit-eligible coursework.",
      });
      const snapId = await ctx.db.insert("topicSnapshots", {
        topicId,
        keyPractices: [
          "Credit-eligible coursework",
          "Accredited institution partnerships",
          "Portfolio-ready projects",
        ],
        deprecatedPractices: [],
        emergingTrends: ["Expanding credit partnerships", "Stackable micro-credentials"],
        changeVelocity: 0.2,
        confidence: 0.85,
        notes: "Treehouse college credit tracks let students earn transferable credit through partner institutions.",
        createdAt: now,
      });
      await ctx.db.patch(topicId, { activeSnapshotId: snapId });
      collegeCreditTopic = await ctx.db.get(topicId);
    }

    const ccTopicId = collegeCreditTopic!._id;

    // Look up related topics for cross-referencing
    const htmlTopic = await ctx.db.query("topics").withIndex("by_slug", (q) => q.eq("slug", "html")).unique();
    const cssTopic = await ctx.db.query("topics").withIndex("by_slug", (q) => q.eq("slug", "css")).unique();
    const jsTopic = await ctx.db.query("topics").withIndex("by_slug", (q) => q.eq("slug", "javascript")).unique();
    const secTopic = await ctx.db.query("topics").withIndex("by_slug", (q) => q.eq("slug", "security")).unique();

    // Collect existing titles
    const allItems = await ctx.db.query("contentItems").collect();
    const existingTitles = new Set(allItems.map((i) => i.title));

    const contentToAdd: Array<{
      title: string;
      type: "track" | "course" | "video";
      description: string;
      topicIds: any[];
      updatedAt: number;
      createdAt: number;
      url?: string;
      duration?: number;
      publishedAt?: number;
    }> = [
      // College Credit Tracks
      {
        title: "College Credit: HTML & CSS",
        type: "track",
        description:
          "Earn transferable college credit while learning HTML and CSS. This accredited track covers semantic markup, responsive design, CSS layout, and accessibility — all mapped to college-level learning outcomes.",
        topicIds: [ccTopicId, ...(htmlTopic ? [htmlTopic._id] : []), ...(cssTopic ? [cssTopic._id] : [])],
        updatedAt: now - 2 * WEEK,
        createdAt: now - 6 * MONTH,
      },
      {
        title: "College Credit: JavaScript",
        type: "track",
        description:
          "Earn transferable college credit while learning JavaScript. This accredited track covers programming fundamentals, DOM manipulation, async patterns, and modern ES2024+ features.",
        topicIds: [ccTopicId, ...(jsTopic ? [jsTopic._id] : [])],
        updatedAt: now - 1 * WEEK,
        createdAt: now - 5 * MONTH,
      },
      {
        title: "College Credit: Cybersecurity Foundations",
        type: "track",
        description:
          "Earn transferable college credit while learning cybersecurity fundamentals. Covers network security, common vulnerabilities, encryption, and security best practices.",
        topicIds: [ccTopicId, ...(secTopic ? [secTopic._id] : [])],
        updatedAt: now - 3 * WEEK,
        createdAt: now - 4 * MONTH,
      },

      // College Credit Courses
      {
        title: "College Credit: Intro to Web Development",
        type: "course",
        description:
          "A credit-eligible introduction to web development. Covers HTML structure, CSS styling, and publishing your first website.",
        topicIds: [ccTopicId, ...(htmlTopic ? [htmlTopic._id] : [])],
        updatedAt: now - 1 * MONTH,
        createdAt: now - 6 * MONTH,
      },
      {
        title: "College Credit: CSS Fundamentals",
        type: "course",
        description:
          "A credit-eligible deep dive into CSS. Selectors, box model, Flexbox, Grid, and responsive design.",
        topicIds: [ccTopicId, ...(cssTopic ? [cssTopic._id] : [])],
        updatedAt: now - 1 * MONTH,
        createdAt: now - 6 * MONTH,
      },
      {
        title: "College Credit: Programming Fundamentals with JavaScript",
        type: "course",
        description:
          "A credit-eligible course on programming fundamentals using JavaScript. Variables, loops, functions, and problem-solving.",
        topicIds: [ccTopicId, ...(jsTopic ? [jsTopic._id] : [])],
        updatedAt: now - 3 * WEEK,
        createdAt: now - 5 * MONTH,
      },
      {
        title: "College Credit: Interactive JavaScript",
        type: "course",
        description:
          "A credit-eligible course on interactive web programming. DOM manipulation, event handling, and building dynamic user interfaces.",
        topicIds: [ccTopicId, ...(jsTopic ? [jsTopic._id] : [])],
        updatedAt: now - 2 * WEEK,
        createdAt: now - 5 * MONTH,
      },
      {
        title: "College Credit: Network Security Essentials",
        type: "course",
        description:
          "A credit-eligible course covering network security principles, threat modeling, and defense strategies.",
        topicIds: [ccTopicId, ...(secTopic ? [secTopic._id] : [])],
        updatedAt: now - 1 * MONTH,
        createdAt: now - 4 * MONTH,
      },

      // College Credit Videos
      {
        title: "How College Credit Works at Treehouse",
        type: "video",
        description: "Video lesson: An overview of how Treehouse's college credit program works with accredited partner institutions.",
        topicIds: [ccTopicId],
        updatedAt: now - 2 * WEEK,
        createdAt: now - 6 * MONTH,
        url: "https://teamtreehouse.com/library/how-college-credit-works",
        duration: 360,
        publishedAt: now - 6 * MONTH,
      },
      {
        title: "College Credit: Building Your First Web Page",
        type: "video",
        description: "Video lesson: Create a complete web page from scratch as part of the credit-eligible HTML & CSS track.",
        topicIds: [ccTopicId, ...(htmlTopic ? [htmlTopic._id] : [])],
        updatedAt: now - 1 * MONTH,
        createdAt: now - 6 * MONTH,
        url: "https://teamtreehouse.com/library/college-credit-first-web-page",
        duration: 540,
        publishedAt: now - 6 * MONTH,
      },
      {
        title: "College Credit: JavaScript Variables & Functions",
        type: "video",
        description: "Video lesson: Learn JavaScript variables, data types, and functions in this credit-eligible lesson.",
        topicIds: [ccTopicId, ...(jsTopic ? [jsTopic._id] : [])],
        updatedAt: now - 3 * WEEK,
        createdAt: now - 5 * MONTH,
        url: "https://teamtreehouse.com/library/college-credit-js-variables-functions",
        duration: 600,
        publishedAt: now - 5 * MONTH,
      },
    ];

    let added = 0;
    for (const item of contentToAdd) {
      if (existingTitles.has(item.title)) continue;
      await ctx.db.insert("contentItems", {
        title: item.title,
        type: item.type,
        description: item.description,
        topicIds: item.topicIds.filter(Boolean),
        updatedAt: item.updatedAt,
        createdAt: item.createdAt,
        gradingStatus: "pending",
        ...(item.url ? { url: item.url } : {}),
        ...(item.duration ? { duration: item.duration } : {}),
        ...(item.publishedAt ? { publishedAt: item.publishedAt } : {}),
      } as any);
      added++;
    }

    return `Added ${added} college credit content items`;
  },
});
