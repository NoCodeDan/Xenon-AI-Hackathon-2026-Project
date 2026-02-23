import { internalMutation } from "./_generated/server";

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("topics").first();
    if (existing) return "Already seeded";

    const now = Date.now();
    const DAY = 86_400_000;
    const WEEK = 7 * DAY;
    const MONTH = 30 * DAY;

    // ─── TOPICS ───────────────────────────────────────────────────────
    const reactTopicId = await ctx.db.insert("topics", {
      name: "React",
      slug: "react",
      domain: "react",
      description:
        "A JavaScript library for building user interfaces with a component-based architecture.",
    });

    const jsTopicId = await ctx.db.insert("topics", {
      name: "JavaScript",
      slug: "javascript",
      domain: "javascript",
      description:
        "A versatile programming language that powers the web, server-side, and beyond.",
    });

    const cssTopicId = await ctx.db.insert("topics", {
      name: "CSS",
      slug: "css",
      domain: "css",
      description:
        "Cascading Style Sheets for styling and laying out web pages.",
    });

    const pythonTopicId = await ctx.db.insert("topics", {
      name: "Python",
      slug: "python",
      domain: "python",
      description:
        "A high-level general-purpose language popular in data science, web development, and automation.",
    });

    const nodeTopicId = await ctx.db.insert("topics", {
      name: "Node.js",
      slug: "nodejs",
      domain: "javascript",
      description:
        "A JavaScript runtime built on Chrome's V8 engine for server-side applications.",
    });

    // ─── TOPIC SNAPSHOTS ──────────────────────────────────────────────
    const reactSnapshotId = await ctx.db.insert("topicSnapshots", {
      topicId: reactTopicId,
      keyPractices: [
        "Functional components with hooks",
        "Server Components (React 19+)",
        "Concurrent rendering",
        "Suspense for data fetching",
        "React Compiler for automatic memoization",
        "useActionState for form handling",
      ],
      deprecatedPractices: [
        "Class components for new code",
        "Legacy context API",
        "findDOMNode",
        "componentWillMount and other UNSAFE_ lifecycle methods",
        "defaultProps on function components",
      ],
      emergingTrends: [
        "React Server Components in production",
        "React Compiler (auto-memoization)",
        "Server Actions for mutations",
        "Fine-grained reactivity patterns",
      ],
      changeVelocity: 0.82,
      confidence: 0.91,
      notes:
        "React 19 shipped stable. Server Components are now mainstream. The React Compiler is in public beta.",
      createdAt: now - 2 * DAY,
    });

    const jsSnapshotId = await ctx.db.insert("topicSnapshots", {
      topicId: jsTopicId,
      keyPractices: [
        "ES2024+ features (Array.groupBy, Promise.withResolvers)",
        "TypeScript for type safety",
        "Modules (ESM) over CommonJS",
        "Async/await for asynchronous code",
        "Structured clone for deep copies",
        "Iterator helpers",
      ],
      deprecatedPractices: [
        "var declarations",
        "CommonJS require in new projects",
        "Callback-based async patterns",
        "arguments object (use rest parameters)",
        "with statement",
      ],
      emergingTrends: [
        "TC39 Stage 3: Decorators",
        "Signals proposal",
        "Type annotations proposal (types-as-comments)",
        "Import attributes",
      ],
      changeVelocity: 0.55,
      confidence: 0.94,
      notes:
        "Language continues to mature with steady annual releases. TypeScript adoption is near-universal in professional settings.",
      createdAt: now - 5 * DAY,
    });

    const cssSnapshotId = await ctx.db.insert("topicSnapshots", {
      topicId: cssTopicId,
      keyPractices: [
        "CSS Grid and Flexbox for layout",
        "Custom properties (CSS variables)",
        "Container queries",
        "CSS nesting (native)",
        ":has() pseudo-class",
        "Logical properties",
      ],
      deprecatedPractices: [
        "Float-based layouts",
        "Vendor prefixes for modern features",
        "CSS-in-JS runtime libraries (moving to zero-runtime)",
        "Table-based layouts",
      ],
      emergingTrends: [
        "CSS anchor positioning",
        "View Transitions API",
        "Scroll-driven animations",
        "@scope rule",
      ],
      changeVelocity: 0.68,
      confidence: 0.88,
      notes:
        "CSS has seen a renaissance. Native nesting, container queries, and :has() are fully supported across browsers.",
      createdAt: now - 3 * DAY,
    });

    const pythonSnapshotId = await ctx.db.insert("topicSnapshots", {
      topicId: pythonTopicId,
      keyPractices: [
        "Type hints (PEP 484+)",
        "Pattern matching (match/case)",
        "Dataclasses and Pydantic models",
        "Virtual environments (uv, poetry)",
        "Async with asyncio",
        "f-strings for formatting",
      ],
      deprecatedPractices: [
        "Python 2 syntax",
        "format() and %-formatting for simple cases",
        "setup.py without pyproject.toml",
        "Global interpreter lock workarounds (GIL removal in 3.13+)",
      ],
      emergingTrends: [
        "Free-threaded Python (no-GIL)",
        "JIT compilation in CPython",
        "UV package manager adoption",
        "AI/ML framework evolution (PyTorch 2, JAX)",
      ],
      changeVelocity: 0.6,
      confidence: 0.9,
      notes:
        "Python 3.13 brought experimental free-threading. The ecosystem is rapidly modernizing its tooling (uv, ruff).",
      createdAt: now - 7 * DAY,
    });

    const nodeSnapshotId = await ctx.db.insert("topicSnapshots", {
      topicId: nodeTopicId,
      keyPractices: [
        "ESM modules by default",
        "Built-in test runner (node:test)",
        "Built-in watch mode",
        "Permission model for security",
        "Streams API (Web Streams compatible)",
        "Single executable applications",
      ],
      deprecatedPractices: [
        "CommonJS for new projects",
        "Callback-style APIs (use promise versions)",
        "Express.js without considering alternatives",
        "Manual process management (use systemd/containers)",
      ],
      emergingTrends: [
        "Node.js native TypeScript support (--experimental-strip-types)",
        "Corepack for package manager management",
        "Built-in .env file support",
        "Web-standard API alignment",
      ],
      changeVelocity: 0.65,
      confidence: 0.87,
      notes:
        "Node.js continues aligning with web standards. Native TypeScript execution is a game-changer for DX.",
      createdAt: now - 4 * DAY,
    });

    // Patch topics with activeSnapshotId
    await ctx.db.patch(reactTopicId, { activeSnapshotId: reactSnapshotId });
    await ctx.db.patch(jsTopicId, { activeSnapshotId: jsSnapshotId });
    await ctx.db.patch(cssTopicId, { activeSnapshotId: cssSnapshotId });
    await ctx.db.patch(pythonTopicId, { activeSnapshotId: pythonSnapshotId });
    await ctx.db.patch(nodeTopicId, { activeSnapshotId: nodeSnapshotId });

    // ─── TRACKS ───────────────────────────────────────────────────────
    const trackBeginningJS = await ctx.db.insert("contentItems", {
      title: "Beginning JavaScript",
      type: "track",
      description:
        "Start your coding journey with JavaScript fundamentals. Learn variables, functions, loops, and the DOM.",
      topicIds: [jsTopicId],
      updatedAt: now - 10 * DAY,
      createdAt: now - 6 * MONTH,
      gradingStatus: "pending",
    });

    const trackReactDev = await ctx.db.insert("contentItems", {
      title: "React Development",
      type: "track",
      description:
        "Master React from basics to advanced patterns. Build modern, interactive UIs with the most popular frontend library.",
      topicIds: [reactTopicId, jsTopicId],
      updatedAt: now - 3 * DAY,
      createdAt: now - 4 * MONTH,
      gradingStatus: "pending",
    });

    const trackFullStack = await ctx.db.insert("contentItems", {
      title: "Full-Stack JavaScript",
      type: "track",
      description:
        "Become a full-stack developer with JavaScript on both client and server. Covers Node.js, React, databases, and deployment.",
      topicIds: [jsTopicId, nodeTopicId, reactTopicId],
      updatedAt: now - 14 * DAY,
      createdAt: now - 8 * MONTH,
      gradingStatus: "pending",
    });

    // ─── COURSES ──────────────────────────────────────────────────────
    // Course 1: Intro to JavaScript (Track: Beginning JS)
    const courseIntroJS = await ctx.db.insert("contentItems", {
      title: "Intro to JavaScript",
      type: "course",
      description:
        "Your first steps into JavaScript. Learn syntax, data types, variables, and basic control flow.",
      topicIds: [jsTopicId],
      updatedAt: now - 4 * MONTH,
      createdAt: now - 6 * MONTH,
      gradingStatus: "pending",
    });

    // Course 2: JavaScript and the DOM (Track: Beginning JS)
    const courseJSDOM = await ctx.db.insert("contentItems", {
      title: "JavaScript and the DOM",
      type: "course",
      description:
        "Learn how to manipulate web pages with JavaScript. Select elements, handle events, and update the DOM dynamically.",
      topicIds: [jsTopicId],
      updatedAt: now - 3 * MONTH,
      createdAt: now - 5 * MONTH,
      gradingStatus: "pending",
    });

    // Course 3: Async JavaScript (Track: Beginning JS)
    const courseAsyncJS = await ctx.db.insert("contentItems", {
      title: "Async JavaScript",
      type: "course",
      description:
        "Master asynchronous programming with callbacks, promises, and async/await.",
      topicIds: [jsTopicId],
      updatedAt: now - 6 * MONTH,
      createdAt: now - 8 * MONTH,
      gradingStatus: "pending",
    });

    // Course 4: React Basics (Track: React Dev)
    const courseReactBasics = await ctx.db.insert("contentItems", {
      title: "React Basics",
      type: "course",
      description:
        "Get started with React. Learn JSX, components, props, and state to build your first React application.",
      topicIds: [reactTopicId, jsTopicId],
      updatedAt: now - 2 * WEEK,
      createdAt: now - 4 * MONTH,
      gradingStatus: "pending",
    });

    // Course 5: React Hooks (Track: React Dev)
    const courseReactHooks = await ctx.db.insert("contentItems", {
      title: "React Hooks",
      type: "course",
      description:
        "Deep-dive into React Hooks: useState, useEffect, useContext, useReducer, custom hooks, and more.",
      topicIds: [reactTopicId],
      updatedAt: now - 1 * WEEK,
      createdAt: now - 3 * MONTH,
      gradingStatus: "pending",
    });

    // Course 6: Advanced React Patterns (Track: React Dev)
    const courseAdvancedReact = await ctx.db.insert("contentItems", {
      title: "Advanced React Patterns",
      type: "course",
      description:
        "Level up with compound components, render props, higher-order components, and React Server Components.",
      topicIds: [reactTopicId],
      updatedAt: now - 9 * MONTH,
      createdAt: now - 12 * MONTH,
      gradingStatus: "pending",
    });

    // Course 7: CSS Layouts (Track: Full-Stack JS)
    const courseCSSLayouts = await ctx.db.insert("contentItems", {
      title: "CSS Layouts",
      type: "course",
      description:
        "Master modern CSS layout techniques including Flexbox, Grid, and responsive design patterns.",
      topicIds: [cssTopicId],
      updatedAt: now - 2 * MONTH,
      createdAt: now - 5 * MONTH,
      gradingStatus: "pending",
    });

    // Course 8: CSS Grid and Flexbox (Track: Full-Stack JS)
    const courseCSSGridFlex = await ctx.db.insert("contentItems", {
      title: "CSS Grid and Flexbox",
      type: "course",
      description:
        "A focused deep-dive into CSS Grid and Flexbox for building any layout you can imagine.",
      topicIds: [cssTopicId],
      updatedAt: now - 5 * MONTH,
      createdAt: now - 7 * MONTH,
      gradingStatus: "pending",
    });

    // Course 9: Node.js Basics (Track: Full-Stack JS)
    const courseNodeBasics = await ctx.db.insert("contentItems", {
      title: "Node.js Basics",
      type: "course",
      description:
        "Learn server-side JavaScript with Node.js. Build APIs, work with files, and understand the event loop.",
      topicIds: [nodeTopicId, jsTopicId],
      updatedAt: now - 3 * MONTH,
      createdAt: now - 7 * MONTH,
      gradingStatus: "pending",
    });

    // Course 10: Python Basics (standalone, added to Full-Stack for variety)
    const coursePythonBasics = await ctx.db.insert("contentItems", {
      title: "Python Basics",
      type: "course",
      description:
        "Get started with Python. Learn syntax, data structures, functions, and object-oriented programming.",
      topicIds: [pythonTopicId],
      updatedAt: now - 8 * MONTH,
      createdAt: now - 10 * MONTH,
      gradingStatus: "pending",
    });

    // ─── TRACK -> COURSE EDGES ────────────────────────────────────────
    // Beginning JavaScript track
    await ctx.db.insert("contentEdges", {
      parentId: trackBeginningJS,
      childId: courseIntroJS,
      edgeType: "contains",
      order: 0,
    });
    await ctx.db.insert("contentEdges", {
      parentId: trackBeginningJS,
      childId: courseJSDOM,
      edgeType: "contains",
      order: 1,
    });
    await ctx.db.insert("contentEdges", {
      parentId: trackBeginningJS,
      childId: courseAsyncJS,
      edgeType: "contains",
      order: 2,
    });

    // React Development track
    await ctx.db.insert("contentEdges", {
      parentId: trackReactDev,
      childId: courseReactBasics,
      edgeType: "contains",
      order: 0,
    });
    await ctx.db.insert("contentEdges", {
      parentId: trackReactDev,
      childId: courseReactHooks,
      edgeType: "contains",
      order: 1,
    });
    await ctx.db.insert("contentEdges", {
      parentId: trackReactDev,
      childId: courseAdvancedReact,
      edgeType: "contains",
      order: 2,
    });

    // Full-Stack JavaScript track
    await ctx.db.insert("contentEdges", {
      parentId: trackFullStack,
      childId: courseCSSLayouts,
      edgeType: "contains",
      order: 0,
    });
    await ctx.db.insert("contentEdges", {
      parentId: trackFullStack,
      childId: courseCSSGridFlex,
      edgeType: "contains",
      order: 1,
    });
    await ctx.db.insert("contentEdges", {
      parentId: trackFullStack,
      childId: courseNodeBasics,
      edgeType: "contains",
      order: 2,
    });
    await ctx.db.insert("contentEdges", {
      parentId: trackFullStack,
      childId: coursePythonBasics,
      edgeType: "contains",
      order: 3,
    });

    // ─── STAGES (5 per course) ────────────────────────────────────────
    const stageTemplates = [
      "Getting Started",
      "Core Concepts",
      "Practice",
      "Advanced Topics",
      "Review",
    ];

    const allCourses = [
      { id: courseIntroJS, topicIds: [jsTopicId], base: now - 4 * MONTH },
      { id: courseJSDOM, topicIds: [jsTopicId], base: now - 3 * MONTH },
      { id: courseAsyncJS, topicIds: [jsTopicId], base: now - 6 * MONTH },
      {
        id: courseReactBasics,
        topicIds: [reactTopicId, jsTopicId],
        base: now - 2 * WEEK,
      },
      { id: courseReactHooks, topicIds: [reactTopicId], base: now - 1 * WEEK },
      {
        id: courseAdvancedReact,
        topicIds: [reactTopicId],
        base: now - 9 * MONTH,
      },
      { id: courseCSSLayouts, topicIds: [cssTopicId], base: now - 2 * MONTH },
      {
        id: courseCSSGridFlex,
        topicIds: [cssTopicId],
        base: now - 5 * MONTH,
      },
      {
        id: courseNodeBasics,
        topicIds: [nodeTopicId, jsTopicId],
        base: now - 3 * MONTH,
      },
      {
        id: coursePythonBasics,
        topicIds: [pythonTopicId],
        base: now - 8 * MONTH,
      },
    ];

    // Map to hold stageId arrays per course for video/practice creation
    const courseStages: Record<string, any[]> = {};

    for (const course of allCourses) {
      const stages: any[] = [];
      for (let i = 0; i < stageTemplates.length; i++) {
        const stageId = await ctx.db.insert("contentItems", {
          title: stageTemplates[i],
          type: "stage" as const,
          description: `${stageTemplates[i]} for this course.`,
          topicIds: course.topicIds as any,
          updatedAt: course.base + i * DAY,
          createdAt: course.base - MONTH,
          gradingStatus: "pending" as const,
        });

        await ctx.db.insert("contentEdges", {
          parentId: course.id,
          childId: stageId,
          edgeType: "contains" as const,
          order: i,
        });

        stages.push(stageId);
      }
      courseStages[course.id as string] = stages;
    }

    // ─── VIDEOS (~30 total, spread across stages) ─────────────────────
    // Helper to create a video and attach it to a stage
    const createVideo = async (
      title: string,
      topicIds: any[],
      stageId: any,
      order: number,
      updatedAt: number,
      createdAt: number,
      duration: number,
      url: string
    ) => {
      const videoId = await ctx.db.insert("contentItems", {
        title,
        type: "video",
        description: `Video lesson: ${title}`,
        topicIds,
        url,
        duration,
        publishedAt: createdAt,
        updatedAt,
        createdAt,
        gradingStatus: "pending",
      });
      await ctx.db.insert("contentEdges", {
        parentId: stageId,
        childId: videoId,
        edgeType: "contains",
        order,
      });
      return videoId;
    };

    // Intro to JavaScript videos
    const introJSStages = courseStages[courseIntroJS as string];
    await createVideo(
      "What is JavaScript?",
      [jsTopicId],
      introJSStages[0],
      0,
      now - 4 * MONTH,
      now - 6 * MONTH,
      420,
      "https://teamtreehouse.com/library/what-is-javascript"
    );
    await createVideo(
      "Variables and Data Types",
      [jsTopicId],
      introJSStages[1],
      0,
      now - 4 * MONTH,
      now - 6 * MONTH,
      540,
      "https://teamtreehouse.com/library/variables-and-data-types"
    );
    await createVideo(
      "Conditional Statements",
      [jsTopicId],
      introJSStages[1],
      1,
      now - 4 * MONTH,
      now - 6 * MONTH,
      380,
      "https://teamtreehouse.com/library/conditional-statements"
    );

    // JavaScript and the DOM videos
    const jsDOMStages = courseStages[courseJSDOM as string];
    await createVideo(
      "Selecting Elements",
      [jsTopicId],
      jsDOMStages[0],
      0,
      now - 3 * MONTH,
      now - 5 * MONTH,
      360,
      "https://teamtreehouse.com/library/selecting-elements"
    );
    await createVideo(
      "Handling Events",
      [jsTopicId],
      jsDOMStages[1],
      0,
      now - 3 * MONTH,
      now - 5 * MONTH,
      480,
      "https://teamtreehouse.com/library/handling-events"
    );
    await createVideo(
      "Traversing the DOM",
      [jsTopicId],
      jsDOMStages[3],
      0,
      now - 3 * MONTH,
      now - 5 * MONTH,
      300,
      "https://teamtreehouse.com/library/traversing-the-dom"
    );

    // Async JavaScript videos
    const asyncJSStages = courseStages[courseAsyncJS as string];
    await createVideo(
      "Understanding Callbacks",
      [jsTopicId],
      asyncJSStages[0],
      0,
      now - 6 * MONTH,
      now - 8 * MONTH,
      450,
      "https://teamtreehouse.com/library/understanding-callbacks"
    );
    await createVideo(
      "Promises in Depth",
      [jsTopicId],
      asyncJSStages[1],
      0,
      now - 6 * MONTH,
      now - 8 * MONTH,
      600,
      "https://teamtreehouse.com/library/promises-in-depth"
    );
    await createVideo(
      "Async/Await Syntax",
      [jsTopicId],
      asyncJSStages[3],
      0,
      now - 6 * MONTH,
      now - 8 * MONTH,
      510,
      "https://teamtreehouse.com/library/async-await-syntax"
    );

    // React Basics videos
    const reactBasicsStages = courseStages[courseReactBasics as string];
    await createVideo(
      "Setting Up a React Project",
      [reactTopicId, jsTopicId],
      reactBasicsStages[0],
      0,
      now - 2 * WEEK,
      now - 4 * MONTH,
      300,
      "https://teamtreehouse.com/library/setting-up-react"
    );
    await createVideo(
      "JSX and Rendering",
      [reactTopicId],
      reactBasicsStages[1],
      0,
      now - 2 * WEEK,
      now - 4 * MONTH,
      420,
      "https://teamtreehouse.com/library/jsx-and-rendering"
    );
    await createVideo(
      "Props and State",
      [reactTopicId],
      reactBasicsStages[1],
      1,
      now - 2 * WEEK,
      now - 4 * MONTH,
      540,
      "https://teamtreehouse.com/library/props-and-state"
    );

    // React Hooks videos
    const reactHooksStages = courseStages[courseReactHooks as string];
    await createVideo(
      "useState and useEffect",
      [reactTopicId],
      reactHooksStages[0],
      0,
      now - 1 * WEEK,
      now - 3 * MONTH,
      600,
      "https://teamtreehouse.com/library/usestate-and-useeffect"
    );
    await createVideo(
      "useContext and useReducer",
      [reactTopicId],
      reactHooksStages[1],
      0,
      now - 1 * WEEK,
      now - 3 * MONTH,
      540,
      "https://teamtreehouse.com/library/usecontext-usereducer"
    );
    await createVideo(
      "Building Custom Hooks",
      [reactTopicId],
      reactHooksStages[3],
      0,
      now - 1 * WEEK,
      now - 3 * MONTH,
      480,
      "https://teamtreehouse.com/library/building-custom-hooks"
    );

    // Advanced React Patterns videos
    const advReactStages = courseStages[courseAdvancedReact as string];
    await createVideo(
      "Compound Components",
      [reactTopicId],
      advReactStages[0],
      0,
      now - 9 * MONTH,
      now - 12 * MONTH,
      510,
      "https://teamtreehouse.com/library/compound-components"
    );
    await createVideo(
      "Render Props Pattern",
      [reactTopicId],
      advReactStages[1],
      0,
      now - 9 * MONTH,
      now - 12 * MONTH,
      420,
      "https://teamtreehouse.com/library/render-props-pattern"
    );
    await createVideo(
      "React Server Components",
      [reactTopicId],
      advReactStages[3],
      0,
      now - 9 * MONTH,
      now - 12 * MONTH,
      660,
      "https://teamtreehouse.com/library/react-server-components"
    );

    // CSS Layouts videos
    const cssLayoutStages = courseStages[courseCSSLayouts as string];
    await createVideo(
      "The Box Model",
      [cssTopicId],
      cssLayoutStages[0],
      0,
      now - 2 * MONTH,
      now - 5 * MONTH,
      360,
      "https://teamtreehouse.com/library/the-box-model"
    );
    await createVideo(
      "Flexbox Fundamentals",
      [cssTopicId],
      cssLayoutStages[1],
      0,
      now - 2 * MONTH,
      now - 5 * MONTH,
      480,
      "https://teamtreehouse.com/library/flexbox-fundamentals"
    );
    await createVideo(
      "Responsive Design Basics",
      [cssTopicId],
      cssLayoutStages[3],
      0,
      now - 2 * MONTH,
      now - 5 * MONTH,
      420,
      "https://teamtreehouse.com/library/responsive-design-basics"
    );

    // CSS Grid and Flexbox videos
    const cssGridStages = courseStages[courseCSSGridFlex as string];
    await createVideo(
      "CSS Grid Basics",
      [cssTopicId],
      cssGridStages[0],
      0,
      now - 5 * MONTH,
      now - 7 * MONTH,
      540,
      "https://teamtreehouse.com/library/css-grid-basics"
    );
    await createVideo(
      "Grid Template Areas",
      [cssTopicId],
      cssGridStages[1],
      0,
      now - 5 * MONTH,
      now - 7 * MONTH,
      420,
      "https://teamtreehouse.com/library/grid-template-areas"
    );
    await createVideo(
      "Combining Grid and Flexbox",
      [cssTopicId],
      cssGridStages[3],
      0,
      now - 5 * MONTH,
      now - 7 * MONTH,
      480,
      "https://teamtreehouse.com/library/combining-grid-and-flexbox"
    );

    // Node.js Basics videos
    const nodeStages = courseStages[courseNodeBasics as string];
    await createVideo(
      "Intro to Node.js",
      [nodeTopicId],
      nodeStages[0],
      0,
      now - 3 * MONTH,
      now - 7 * MONTH,
      360,
      "https://teamtreehouse.com/library/intro-to-nodejs"
    );
    await createVideo(
      "Working with Modules",
      [nodeTopicId, jsTopicId],
      nodeStages[1],
      0,
      now - 3 * MONTH,
      now - 7 * MONTH,
      480,
      "https://teamtreehouse.com/library/working-with-modules"
    );
    await createVideo(
      "Building a REST API",
      [nodeTopicId],
      nodeStages[3],
      0,
      now - 3 * MONTH,
      now - 7 * MONTH,
      720,
      "https://teamtreehouse.com/library/building-a-rest-api"
    );

    // Python Basics videos
    const pythonStages = courseStages[coursePythonBasics as string];
    await createVideo(
      "Getting Started with Python",
      [pythonTopicId],
      pythonStages[0],
      0,
      now - 8 * MONTH,
      now - 10 * MONTH,
      300,
      "https://teamtreehouse.com/library/getting-started-with-python"
    );
    await createVideo(
      "Lists, Dicts, and Loops",
      [pythonTopicId],
      pythonStages[1],
      0,
      now - 8 * MONTH,
      now - 10 * MONTH,
      540,
      "https://teamtreehouse.com/library/lists-dicts-loops"
    );
    await createVideo(
      "Functions and Scope",
      [pythonTopicId],
      pythonStages[3],
      0,
      now - 8 * MONTH,
      now - 10 * MONTH,
      450,
      "https://teamtreehouse.com/library/functions-and-scope"
    );

    // ─── PRACTICE SESSIONS (3 total) ──────────────────────────────────
    // Practice 1: JS Practice (in Intro to JS, stage 2 "Practice")
    const practiceJS = await ctx.db.insert("contentItems", {
      title: "JavaScript Variables Challenge",
      type: "practice",
      description:
        "Test your knowledge of JavaScript variables, data types, and basic operators.",
      topicIds: [jsTopicId],
      updatedAt: now - 4 * MONTH,
      createdAt: now - 6 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentEdges", {
      parentId: introJSStages[2],
      childId: practiceJS,
      edgeType: "contains",
      order: 0,
    });

    // Practice 2: React Practice (in React Hooks, stage 2 "Practice")
    const practiceReact = await ctx.db.insert("contentItems", {
      title: "React Hooks Quiz",
      type: "practice",
      description:
        "Practice using useState, useEffect, and custom hooks to solve real-world problems.",
      topicIds: [reactTopicId],
      updatedAt: now - 1 * WEEK,
      createdAt: now - 3 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentEdges", {
      parentId: reactHooksStages[2],
      childId: practiceReact,
      edgeType: "contains",
      order: 0,
    });

    // Practice 3: CSS Practice (in CSS Layouts, stage 2 "Practice")
    const practiceCSS = await ctx.db.insert("contentItems", {
      title: "Flexbox Layout Challenge",
      type: "practice",
      description:
        "Build a responsive page layout using only Flexbox. Match the provided mockup.",
      topicIds: [cssTopicId],
      updatedAt: now - 2 * MONTH,
      createdAt: now - 5 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentEdges", {
      parentId: cssLayoutStages[2],
      childId: practiceCSS,
      edgeType: "contains",
      order: 0,
    });

    return "Seeded successfully";
  },
});
