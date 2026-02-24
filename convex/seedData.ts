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

    // ─── ADDITIONAL TOPICS ─────────────────────────────────────────
    const vibeCodingTopicId = await ctx.db.insert("topics", {
      name: "Vibe Coding",
      slug: "vibe-coding",
      domain: "vibe-coding",
      description:
        "AI-assisted development tools that let you build apps by describing what you want in natural language.",
    });

    const noCodeTopicId = await ctx.db.insert("topics", {
      name: "No-Code",
      slug: "nocode",
      domain: "nocode",
      description:
        "Build applications without writing code using visual builders and drag-and-drop platforms.",
    });

    const aiTopicId = await ctx.db.insert("topics", {
      name: "AI",
      slug: "ai",
      domain: "ai",
      description:
        "Artificial intelligence concepts, tools, and practical applications for developers.",
    });

    const htmlTopicId = await ctx.db.insert("topics", {
      name: "HTML",
      slug: "html",
      domain: "html",
      description:
        "The standard markup language for creating web pages and web applications.",
    });

    const designTopicId = await ctx.db.insert("topics", {
      name: "Design",
      slug: "design",
      domain: "design",
      description:
        "User interface and user experience design principles for building great products.",
    });

    const databasesTopicId = await ctx.db.insert("topics", {
      name: "Databases",
      slug: "databases",
      domain: "databases",
      description:
        "Relational and non-relational database concepts, SQL, and data modeling.",
    });

    const devToolsTopicId = await ctx.db.insert("topics", {
      name: "Development Tools",
      slug: "development-tools",
      domain: "development-tools",
      description:
        "Tools and workflows for modern software development including Git, CLI, and debugging.",
    });

    const securityTopicId = await ctx.db.insert("topics", {
      name: "Security",
      slug: "security",
      domain: "security",
      description:
        "Web security fundamentals including authentication, authorization, and common vulnerabilities.",
    });

    const javaTopicId = await ctx.db.insert("topics", {
      name: "Java",
      slug: "java",
      domain: "java",
      description:
        "A robust, object-oriented programming language used in enterprise, mobile, and web development.",
    });

    const swiftTopicId = await ctx.db.insert("topics", {
      name: "Swift",
      slug: "swift",
      domain: "swift",
      description:
        "Apple's modern programming language for iOS, macOS, watchOS, and tvOS development.",
    });

    const phpTopicId = await ctx.db.insert("topics", {
      name: "PHP",
      slug: "php",
      domain: "php",
      description:
        "A widely-used server-side scripting language for web development.",
    });

    const rubyTopicId = await ctx.db.insert("topics", {
      name: "Ruby",
      slug: "ruby",
      domain: "ruby",
      description:
        "A dynamic, object-oriented language known for developer happiness and the Rails framework.",
    });

    const dataAnalysisTopicId = await ctx.db.insert("topics", {
      name: "Data Analysis",
      slug: "data-analysis",
      domain: "data-analysis",
      description:
        "Techniques for analyzing and visualizing data to drive decisions.",
    });

    const gameDevTopicId = await ctx.db.insert("topics", {
      name: "Game Development",
      slug: "game-development",
      domain: "game-development",
      description:
        "Building interactive games using various engines, frameworks, and languages.",
    });

    const apisTopicId = await ctx.db.insert("topics", {
      name: "APIs",
      slug: "apis",
      domain: "apis",
      description:
        "Designing, building, and consuming APIs for web and mobile applications.",
    });

    // ─── ADDITIONAL TOPIC SNAPSHOTS ─────────────────────────────────
    const vibeCodingSnapshotId = await ctx.db.insert("topicSnapshots", {
      topicId: vibeCodingTopicId,
      keyPractices: [
        "Prompt engineering for code generation",
        "Iterative refinement with AI assistants",
        "Cursor AI for full-stack development",
        "Lovable for rapid UI prototyping",
        "Windsurf IDE for AI-first workflows",
        "Replit Agent for cloud-based AI development",
      ],
      deprecatedPractices: [
        "Writing all code manually without AI assistance",
        "Copy-pasting from StackOverflow without understanding",
      ],
      emergingTrends: [
        "Multi-modal AI coding (voice + visual)",
        "AI agents that handle entire features autonomously",
        "MCP (Model Context Protocol) for tool integration",
      ],
      changeVelocity: 0.95,
      confidence: 0.75,
      notes:
        "Vibe coding is the fastest-growing category in 2026. Tools like Cursor, Lovable, and Windsurf are redefining how developers build.",
      createdAt: now - 1 * DAY,
    });

    const noCodeSnapshotId = await ctx.db.insert("topicSnapshots", {
      topicId: noCodeTopicId,
      keyPractices: [
        "Visual app building with Adalo",
        "Responsive web apps with WeWeb",
        "Database-driven apps with Airtable",
        "Workflow automation with Zapier and Make",
        "Form-based apps with Glide",
      ],
      deprecatedPractices: [
        "Building simple CRUD apps entirely from scratch",
        "Ignoring no-code for internal tools",
      ],
      emergingTrends: [
        "AI-enhanced no-code platforms",
        "No-code + custom code hybrid workflows",
        "Enterprise adoption of no-code tooling",
      ],
      changeVelocity: 0.72,
      confidence: 0.8,
      notes:
        "No-code platforms are maturing rapidly. Adalo, WeWeb, and Bubble now support production-grade applications.",
      createdAt: now - 3 * DAY,
    });

    const aiSnapshotId = await ctx.db.insert("topicSnapshots", {
      topicId: aiTopicId,
      keyPractices: [
        "Prompt engineering fundamentals",
        "Using LLM APIs (OpenAI, Anthropic, Google)",
        "RAG (Retrieval-Augmented Generation)",
        "Fine-tuning and evaluation",
        "AI safety and responsible use",
      ],
      deprecatedPractices: [
        "Rule-based chatbots for conversational AI",
        "Training models from scratch for common tasks",
      ],
      emergingTrends: [
        "Agentic AI workflows",
        "Multi-modal models (text + image + audio)",
        "On-device AI inference",
      ],
      changeVelocity: 0.98,
      confidence: 0.82,
      notes:
        "AI is transforming every industry. Focus is shifting from building models to building AI-powered applications.",
      createdAt: now - 2 * DAY,
    });

    await ctx.db.patch(vibeCodingTopicId, { activeSnapshotId: vibeCodingSnapshotId });
    await ctx.db.patch(noCodeTopicId, { activeSnapshotId: noCodeSnapshotId });
    await ctx.db.patch(aiTopicId, { activeSnapshotId: aiSnapshotId });

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

    // ─── VIBE CODING CONTENT ────────────────────────────────────────
    const trackVibeCoding = await ctx.db.insert("contentItems", {
      title: "Vibe Coding",
      type: "track",
      description:
        "Learn to build apps using AI-powered development tools. From Cursor to Lovable, discover the future of coding.",
      topicIds: [vibeCodingTopicId, aiTopicId],
      updatedAt: now - 2 * DAY,
      createdAt: now - 2 * MONTH,
      gradingStatus: "pending",
    });

    const courseVibeCodingIntro = await ctx.db.insert("contentItems", {
      title: "Introduction to Vibe Coding",
      type: "course",
      description:
        "What is vibe coding? Learn how AI-assisted development tools are changing the way we build software.",
      topicIds: [vibeCodingTopicId, aiTopicId],
      updatedAt: now - 1 * WEEK,
      createdAt: now - 2 * MONTH,
      gradingStatus: "pending",
    });

    const courseCursor = await ctx.db.insert("contentItems", {
      title: "Building with Cursor",
      type: "course",
      description:
        "Master Cursor AI — the AI-first code editor. Learn prompt-driven development, multi-file editing, and AI-powered debugging.",
      topicIds: [vibeCodingTopicId, aiTopicId],
      updatedAt: now - 3 * DAY,
      createdAt: now - 1 * MONTH,
      gradingStatus: "pending",
    });

    const courseLovable = await ctx.db.insert("contentItems", {
      title: "Rapid Prototyping with Lovable",
      type: "course",
      description:
        "Use Lovable to go from idea to working web app in minutes. Build full-stack applications by describing what you want.",
      topicIds: [vibeCodingTopicId],
      updatedAt: now - 5 * DAY,
      createdAt: now - 1 * MONTH,
      gradingStatus: "pending",
    });

    const courseWindsurf = await ctx.db.insert("contentItems", {
      title: "Windsurf IDE Essentials",
      type: "course",
      description:
        "Get started with Windsurf — the AI-native IDE. Learn its Cascade feature for multi-step code generation and refactoring.",
      topicIds: [vibeCodingTopicId, aiTopicId],
      updatedAt: now - 1 * WEEK,
      createdAt: now - 3 * WEEK,
      gradingStatus: "pending",
    });

    const courseReplit = await ctx.db.insert("contentItems", {
      title: "AI Development with Replit",
      type: "course",
      description:
        "Build and deploy apps entirely in the browser with Replit Agent. Cloud-based AI-powered development from start to ship.",
      topicIds: [vibeCodingTopicId, aiTopicId],
      updatedAt: now - 10 * DAY,
      createdAt: now - 6 * WEEK,
      gradingStatus: "pending",
    });

    // Vibe Coding track → course edges
    await ctx.db.insert("contentEdges", { parentId: trackVibeCoding, childId: courseVibeCodingIntro, edgeType: "contains", order: 0 });
    await ctx.db.insert("contentEdges", { parentId: trackVibeCoding, childId: courseCursor, edgeType: "contains", order: 1 });
    await ctx.db.insert("contentEdges", { parentId: trackVibeCoding, childId: courseLovable, edgeType: "contains", order: 2 });
    await ctx.db.insert("contentEdges", { parentId: trackVibeCoding, childId: courseWindsurf, edgeType: "contains", order: 3 });
    await ctx.db.insert("contentEdges", { parentId: trackVibeCoding, childId: courseReplit, edgeType: "contains", order: 4 });

    // Vibe Coding standalone videos
    await ctx.db.insert("contentItems", {
      title: "What is Vibe Coding?",
      type: "video",
      description: "Video lesson: An overview of the vibe coding movement and how AI is changing development.",
      topicIds: [vibeCodingTopicId, aiTopicId],
      url: "https://teamtreehouse.com/library/what-is-vibe-coding",
      duration: 480,
      publishedAt: now - 2 * MONTH,
      updatedAt: now - 1 * WEEK,
      createdAt: now - 2 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Cursor AI: Your First Project",
      type: "video",
      description: "Video lesson: Set up Cursor and build your first app using AI-assisted coding.",
      topicIds: [vibeCodingTopicId],
      url: "https://teamtreehouse.com/library/cursor-ai-first-project",
      duration: 720,
      publishedAt: now - 1 * MONTH,
      updatedAt: now - 3 * DAY,
      createdAt: now - 1 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Building a Full App with Lovable",
      type: "video",
      description: "Video lesson: Go from a text prompt to a deployed web application using Lovable.",
      topicIds: [vibeCodingTopicId],
      url: "https://teamtreehouse.com/library/building-full-app-lovable",
      duration: 900,
      publishedAt: now - 3 * WEEK,
      updatedAt: now - 5 * DAY,
      createdAt: now - 3 * WEEK,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Windsurf Cascade Deep Dive",
      type: "video",
      description: "Video lesson: Master Windsurf's Cascade feature for multi-step AI-powered code generation.",
      topicIds: [vibeCodingTopicId, aiTopicId],
      url: "https://teamtreehouse.com/library/windsurf-cascade-deep-dive",
      duration: 660,
      publishedAt: now - 2 * WEEK,
      updatedAt: now - 1 * WEEK,
      createdAt: now - 2 * WEEK,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Replit Agent: Build & Deploy",
      type: "video",
      description: "Video lesson: Use Replit Agent to build, test, and deploy an app without leaving the browser.",
      topicIds: [vibeCodingTopicId],
      url: "https://teamtreehouse.com/library/replit-agent-build-deploy",
      duration: 600,
      publishedAt: now - 6 * WEEK,
      updatedAt: now - 10 * DAY,
      createdAt: now - 6 * WEEK,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Comparing Vibe Coding Tools",
      type: "video",
      description: "Video lesson: Cursor vs Lovable vs Windsurf vs Replit — when to use each tool.",
      topicIds: [vibeCodingTopicId],
      url: "https://teamtreehouse.com/library/comparing-vibe-coding-tools",
      duration: 540,
      publishedAt: now - 1 * WEEK,
      updatedAt: now - 2 * DAY,
      createdAt: now - 1 * WEEK,
      gradingStatus: "pending",
    });

    // ─── NO-CODE CONTENT ────────────────────────────────────────────
    const trackNoCode = await ctx.db.insert("contentItems", {
      title: "No-Code Development",
      type: "track",
      description:
        "Build real applications without writing code. Learn visual development platforms from Adalo to WeWeb.",
      topicIds: [noCodeTopicId],
      updatedAt: now - 1 * WEEK,
      createdAt: now - 3 * MONTH,
      gradingStatus: "pending",
    });

    const courseAdalo = await ctx.db.insert("contentItems", {
      title: "Building Mobile Apps with Adalo",
      type: "course",
      description:
        "Create native mobile apps visually with Adalo. Design screens, connect databases, and publish to app stores.",
      topicIds: [noCodeTopicId],
      updatedAt: now - 2 * WEEK,
      createdAt: now - 3 * MONTH,
      gradingStatus: "pending",
    });

    const courseWeWeb = await ctx.db.insert("contentItems", {
      title: "Web Apps with WeWeb",
      type: "course",
      description:
        "Build responsive, data-driven web applications with WeWeb. Connect APIs, design layouts, and deploy without code.",
      topicIds: [noCodeTopicId],
      updatedAt: now - 1 * WEEK,
      createdAt: now - 2 * MONTH,
      gradingStatus: "pending",
    });

    const courseNoCodeFundamentals = await ctx.db.insert("contentItems", {
      title: "No-Code Fundamentals",
      type: "course",
      description:
        "Understand the no-code landscape. Learn when to use no-code vs low-code vs custom code.",
      topicIds: [noCodeTopicId],
      updatedAt: now - 3 * WEEK,
      createdAt: now - 3 * MONTH,
      gradingStatus: "pending",
    });

    // No-Code track → course edges
    await ctx.db.insert("contentEdges", { parentId: trackNoCode, childId: courseNoCodeFundamentals, edgeType: "contains", order: 0 });
    await ctx.db.insert("contentEdges", { parentId: trackNoCode, childId: courseAdalo, edgeType: "contains", order: 1 });
    await ctx.db.insert("contentEdges", { parentId: trackNoCode, childId: courseWeWeb, edgeType: "contains", order: 2 });

    // No-Code videos
    await ctx.db.insert("contentItems", {
      title: "Getting Started with Adalo",
      type: "video",
      description: "Video lesson: Build your first mobile app screen in Adalo with drag-and-drop components.",
      topicIds: [noCodeTopicId],
      url: "https://teamtreehouse.com/library/getting-started-with-adalo",
      duration: 480,
      publishedAt: now - 3 * MONTH,
      updatedAt: now - 2 * WEEK,
      createdAt: now - 3 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "WeWeb: Connecting External APIs",
      type: "video",
      description: "Video lesson: Connect your WeWeb app to REST APIs and display dynamic data.",
      topicIds: [noCodeTopicId],
      url: "https://teamtreehouse.com/library/weweb-connecting-apis",
      duration: 540,
      publishedAt: now - 2 * MONTH,
      updatedAt: now - 1 * WEEK,
      createdAt: now - 2 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Automating Workflows with Zapier",
      type: "video",
      description: "Video lesson: Connect your no-code apps with automated workflows using Zapier.",
      topicIds: [noCodeTopicId],
      url: "https://teamtreehouse.com/library/automating-workflows-zapier",
      duration: 420,
      publishedAt: now - 2 * MONTH,
      updatedAt: now - 3 * WEEK,
      createdAt: now - 2 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Building with Glide Apps",
      type: "video",
      description: "Video lesson: Turn spreadsheet data into a mobile app with Glide.",
      topicIds: [noCodeTopicId],
      url: "https://teamtreehouse.com/library/building-with-glide",
      duration: 360,
      publishedAt: now - 2.5 * MONTH,
      updatedAt: now - 3 * WEEK,
      createdAt: now - 2.5 * MONTH,
      gradingStatus: "pending",
    });

    // ─── AI CONTENT ─────────────────────────────────────────────────
    const courseAIBasics = await ctx.db.insert("contentItems", {
      title: "AI for Developers",
      type: "course",
      description:
        "Understand AI fundamentals as a developer. Learn prompt engineering, LLM APIs, and how to build AI-powered features.",
      topicIds: [aiTopicId, pythonTopicId],
      updatedAt: now - 1 * WEEK,
      createdAt: now - 2 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Prompt Engineering Basics",
      type: "video",
      description: "Video lesson: Write effective prompts that get consistent, high-quality responses from AI models.",
      topicIds: [aiTopicId],
      url: "https://teamtreehouse.com/library/prompt-engineering-basics",
      duration: 540,
      publishedAt: now - 2 * MONTH,
      updatedAt: now - 1 * WEEK,
      createdAt: now - 2 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Building with the OpenAI API",
      type: "video",
      description: "Video lesson: Integrate OpenAI's API into your applications for chat, completion, and embeddings.",
      topicIds: [aiTopicId, pythonTopicId],
      url: "https://teamtreehouse.com/library/building-with-openai-api",
      duration: 720,
      publishedAt: now - 6 * WEEK,
      updatedAt: now - 2 * WEEK,
      createdAt: now - 6 * WEEK,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Introduction to RAG",
      type: "video",
      description: "Video lesson: Build a Retrieval-Augmented Generation system to give AI context from your own data.",
      topicIds: [aiTopicId],
      url: "https://teamtreehouse.com/library/introduction-to-rag",
      duration: 660,
      publishedAt: now - 1 * MONTH,
      updatedAt: now - 10 * DAY,
      createdAt: now - 1 * MONTH,
      gradingStatus: "pending",
    });

    // ─── HTML CONTENT ───────────────────────────────────────────────
    const courseHTMLBasics = await ctx.db.insert("contentItems", {
      title: "HTML Basics",
      type: "course",
      description:
        "Learn the building blocks of the web. Semantic HTML, forms, accessibility, and modern markup practices.",
      topicIds: [htmlTopicId],
      updatedAt: now - 3 * MONTH,
      createdAt: now - 9 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "HTML Forms and Validation",
      type: "course",
      description:
        "Master HTML forms — inputs, selects, validation, accessibility, and modern form patterns.",
      topicIds: [htmlTopicId],
      updatedAt: now - 4 * MONTH,
      createdAt: now - 8 * MONTH,
      gradingStatus: "pending",
    });

    // ─── DATABASES CONTENT ──────────────────────────────────────────
    await ctx.db.insert("contentItems", {
      title: "SQL Basics",
      type: "course",
      description:
        "Learn SQL from scratch. Write queries, filter data, join tables, and understand relational database concepts.",
      topicIds: [databasesTopicId],
      updatedAt: now - 2 * MONTH,
      createdAt: now - 6 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Modifying Data with SQL",
      type: "course",
      description:
        "INSERT, UPDATE, DELETE, and transaction management in SQL databases.",
      topicIds: [databasesTopicId],
      updatedAt: now - 3 * MONTH,
      createdAt: now - 7 * MONTH,
      gradingStatus: "pending",
    });

    // ─── DESIGN CONTENT ─────────────────────────────────────────────
    await ctx.db.insert("contentItems", {
      title: "UX Design Foundations",
      type: "course",
      description:
        "Learn user-centered design principles, wireframing, prototyping, and usability testing.",
      topicIds: [designTopicId],
      updatedAt: now - 1 * MONTH,
      createdAt: now - 5 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Web Design Process",
      type: "course",
      description:
        "From mood boards to mockups. Learn the complete web design process using modern tools.",
      topicIds: [designTopicId, cssTopicId],
      updatedAt: now - 2 * MONTH,
      createdAt: now - 6 * MONTH,
      gradingStatus: "pending",
    });

    // ─── JAVA / SWIFT / PHP / RUBY / OTHER CONTENT ──────────────────
    await ctx.db.insert("contentItems", {
      title: "Java Basics",
      type: "course",
      description: "Get started with Java. Learn syntax, OOP, data structures, and build your first Java application.",
      topicIds: [javaTopicId],
      updatedAt: now - 4 * MONTH,
      createdAt: now - 10 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Swift Basics",
      type: "course",
      description: "Start building iOS apps with Swift. Learn the language fundamentals, Xcode, and UIKit basics.",
      topicIds: [swiftTopicId],
      updatedAt: now - 5 * MONTH,
      createdAt: now - 10 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "PHP Basics",
      type: "course",
      description: "Learn server-side web development with PHP. Build dynamic websites and understand the LAMP stack.",
      topicIds: [phpTopicId],
      updatedAt: now - 6 * MONTH,
      createdAt: now - 12 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Ruby Basics",
      type: "course",
      description: "Learn Ruby programming fundamentals. A friendly, expressive language perfect for web development with Rails.",
      topicIds: [rubyTopicId],
      updatedAt: now - 7 * MONTH,
      createdAt: now - 12 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Data Analysis with Python",
      type: "course",
      description: "Use Python with Pandas, NumPy, and Matplotlib to analyze and visualize real-world data sets.",
      topicIds: [dataAnalysisTopicId, pythonTopicId],
      updatedAt: now - 2 * MONTH,
      createdAt: now - 5 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Introduction to Game Development",
      type: "course",
      description: "Build your first game. Learn game loops, physics, sprites, and user input handling.",
      topicIds: [gameDevTopicId, jsTopicId],
      updatedAt: now - 3 * MONTH,
      createdAt: now - 8 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "REST APIs with Express",
      type: "course",
      description: "Design and build RESTful APIs using Express.js. Learn routing, middleware, error handling, and authentication.",
      topicIds: [apisTopicId, nodeTopicId],
      updatedAt: now - 2 * MONTH,
      createdAt: now - 6 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Git Basics",
      type: "course",
      description: "Learn version control with Git. Commits, branches, merges, and collaboration workflows.",
      topicIds: [devToolsTopicId],
      updatedAt: now - 3 * MONTH,
      createdAt: now - 9 * MONTH,
      gradingStatus: "pending",
    });
    await ctx.db.insert("contentItems", {
      title: "Web Security Basics",
      type: "course",
      description: "Understand common web vulnerabilities (XSS, CSRF, SQL injection) and how to prevent them.",
      topicIds: [securityTopicId],
      updatedAt: now - 4 * MONTH,
      createdAt: now - 8 * MONTH,
      gradingStatus: "pending",
    });

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
