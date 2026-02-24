import { internalMutation } from "./_generated/server";

/**
 * Additive seed — adds new topics + content that don't exist yet.
 * Safe to run multiple times; checks by slug/title before inserting.
 */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const DAY = 86_400_000;
    const WEEK = 7 * DAY;
    const MONTH = 30 * DAY;

    // Helper: find or create a topic
    async function ensureTopic(
      name: string,
      slug: string,
      domain: string,
      description: string
    ) {
      const existing = await ctx.db
        .query("topics")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (existing) return existing._id;
      return ctx.db.insert("topics", { name, slug, domain, description });
    }

    // Collect all existing content titles once to avoid repeated full scans
    const allExistingItems = await ctx.db.query("contentItems").collect();
    const existingTitles = new Set(allExistingItems.map((i) => i.title));

    // ─── TOPICS ─────────────────────────────────────────────────────
    const vibeCodingTopicId = await ensureTopic(
      "Vibe Coding", "vibe-coding", "vibe-coding",
      "AI-assisted development tools that let you build apps by describing what you want in natural language."
    );
    const noCodeTopicId = await ensureTopic(
      "No-Code", "nocode", "nocode",
      "Build applications without writing code using visual builders and drag-and-drop platforms."
    );
    const aiTopicId = await ensureTopic(
      "AI", "ai", "ai",
      "Artificial intelligence concepts, tools, and practical applications for developers."
    );
    const htmlTopicId = await ensureTopic(
      "HTML", "html", "html",
      "The standard markup language for creating web pages and web applications."
    );
    const designTopicId = await ensureTopic(
      "Design", "design", "design",
      "User interface and user experience design principles for building great products."
    );
    const databasesTopicId = await ensureTopic(
      "Databases", "databases", "databases",
      "Relational and non-relational database concepts, SQL, and data modeling."
    );
    const devToolsTopicId = await ensureTopic(
      "Development Tools", "development-tools", "development-tools",
      "Tools and workflows for modern software development including Git, CLI, and debugging."
    );
    const securityTopicId = await ensureTopic(
      "Security", "security", "security",
      "Web security fundamentals including authentication, authorization, and common vulnerabilities."
    );
    const javaTopicId = await ensureTopic(
      "Java", "java", "java",
      "A robust, object-oriented programming language used in enterprise, mobile, and web development."
    );
    const swiftTopicId = await ensureTopic(
      "Swift", "swift", "swift",
      "Apple's modern programming language for iOS, macOS, watchOS, and tvOS development."
    );
    const phpTopicId = await ensureTopic(
      "PHP", "php", "php",
      "A widely-used server-side scripting language for web development."
    );
    const rubyTopicId = await ensureTopic(
      "Ruby", "ruby", "ruby",
      "A dynamic, object-oriented language known for developer happiness and the Rails framework."
    );
    const dataAnalysisTopicId = await ensureTopic(
      "Data Analysis", "data-analysis", "data-analysis",
      "Techniques for analyzing and visualizing data to drive decisions."
    );
    const gameDevTopicId = await ensureTopic(
      "Game Development", "game-development", "game-development",
      "Building interactive games using various engines, frameworks, and languages."
    );
    const apisTopicId = await ensureTopic(
      "APIs", "apis", "apis",
      "Designing, building, and consuming APIs for web and mobile applications."
    );

    // Lookup existing topics we'll reference
    const jsTopicRow = await ctx.db.query("topics").withIndex("by_slug", (q) => q.eq("slug", "javascript")).unique();
    const jsTopicId = jsTopicRow?._id;
    const pythonTopicRow = await ctx.db.query("topics").withIndex("by_slug", (q) => q.eq("slug", "python")).unique();
    const pythonTopicId = pythonTopicRow?._id;
    const nodeTopicRow = await ctx.db.query("topics").withIndex("by_slug", (q) => q.eq("slug", "nodejs")).unique();
    const nodeTopicId = nodeTopicRow?._id;
    const cssTopicRow = await ctx.db.query("topics").withIndex("by_slug", (q) => q.eq("slug", "css")).unique();
    const cssTopicId = cssTopicRow?._id;

    // ─── TOPIC SNAPSHOTS (only for new topics that lack one) ────────
    const vibeTopic = await ctx.db.get(vibeCodingTopicId);
    if (vibeTopic && !vibeTopic.activeSnapshotId) {
      const snapId = await ctx.db.insert("topicSnapshots", {
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
        notes: "Vibe coding is the fastest-growing category in 2026.",
        createdAt: now,
      });
      await ctx.db.patch(vibeCodingTopicId, { activeSnapshotId: snapId });
    }

    const noCodeTopic = await ctx.db.get(noCodeTopicId);
    if (noCodeTopic && !noCodeTopic.activeSnapshotId) {
      const snapId = await ctx.db.insert("topicSnapshots", {
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
        notes: "No-code platforms are maturing rapidly.",
        createdAt: now,
      });
      await ctx.db.patch(noCodeTopicId, { activeSnapshotId: snapId });
    }

    const aiTopic = await ctx.db.get(aiTopicId);
    if (aiTopic && !aiTopic.activeSnapshotId) {
      const snapId = await ctx.db.insert("topicSnapshots", {
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
        notes: "AI is transforming every industry.",
        createdAt: now,
      });
      await ctx.db.patch(aiTopicId, { activeSnapshotId: snapId });
    }

    // ─── CONTENT ITEMS ──────────────────────────────────────────────
    // Only insert content that doesn't already exist (by title check)

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
      // Vibe Coding
      { title: "Vibe Coding", type: "track", description: "Learn to build apps using AI-powered development tools.", topicIds: [vibeCodingTopicId, aiTopicId], updatedAt: now - 2 * DAY, createdAt: now - 2 * MONTH },
      { title: "Introduction to Vibe Coding", type: "course", description: "What is vibe coding? Learn how AI-assisted tools are changing development.", topicIds: [vibeCodingTopicId, aiTopicId], updatedAt: now - 1 * WEEK, createdAt: now - 2 * MONTH },
      { title: "Building with Cursor", type: "course", description: "Master Cursor AI — the AI-first code editor for prompt-driven development.", topicIds: [vibeCodingTopicId, aiTopicId], updatedAt: now - 3 * DAY, createdAt: now - 1 * MONTH },
      { title: "Rapid Prototyping with Lovable", type: "course", description: "Use Lovable to go from idea to working web app in minutes.", topicIds: [vibeCodingTopicId], updatedAt: now - 5 * DAY, createdAt: now - 1 * MONTH },
      { title: "Windsurf IDE Essentials", type: "course", description: "Get started with Windsurf — the AI-native IDE with Cascade.", topicIds: [vibeCodingTopicId, aiTopicId], updatedAt: now - 1 * WEEK, createdAt: now - 3 * WEEK },
      { title: "AI Development with Replit", type: "course", description: "Build and deploy apps with Replit Agent — cloud-based AI development.", topicIds: [vibeCodingTopicId, aiTopicId], updatedAt: now - 10 * DAY, createdAt: now - 6 * WEEK },
      { title: "What is Vibe Coding?", type: "video", description: "An overview of the vibe coding movement.", topicIds: [vibeCodingTopicId, aiTopicId], updatedAt: now - 1 * WEEK, createdAt: now - 2 * MONTH, url: "https://teamtreehouse.com/library/what-is-vibe-coding", duration: 480, publishedAt: now - 2 * MONTH },
      { title: "Cursor AI: Your First Project", type: "video", description: "Set up Cursor and build your first app.", topicIds: [vibeCodingTopicId], updatedAt: now - 3 * DAY, createdAt: now - 1 * MONTH, url: "https://teamtreehouse.com/library/cursor-ai-first-project", duration: 720, publishedAt: now - 1 * MONTH },
      { title: "Building a Full App with Lovable", type: "video", description: "Go from a text prompt to a deployed web app.", topicIds: [vibeCodingTopicId], updatedAt: now - 5 * DAY, createdAt: now - 3 * WEEK, url: "https://teamtreehouse.com/library/building-full-app-lovable", duration: 900, publishedAt: now - 3 * WEEK },
      { title: "Windsurf Cascade Deep Dive", type: "video", description: "Master Windsurf's Cascade feature.", topicIds: [vibeCodingTopicId, aiTopicId], updatedAt: now - 1 * WEEK, createdAt: now - 2 * WEEK, url: "https://teamtreehouse.com/library/windsurf-cascade-deep-dive", duration: 660, publishedAt: now - 2 * WEEK },
      { title: "Replit Agent: Build & Deploy", type: "video", description: "Use Replit Agent to build, test, and deploy.", topicIds: [vibeCodingTopicId], updatedAt: now - 10 * DAY, createdAt: now - 6 * WEEK, url: "https://teamtreehouse.com/library/replit-agent-build-deploy", duration: 600, publishedAt: now - 6 * WEEK },
      { title: "Comparing Vibe Coding Tools", type: "video", description: "Cursor vs Lovable vs Windsurf vs Replit.", topicIds: [vibeCodingTopicId], updatedAt: now - 2 * DAY, createdAt: now - 1 * WEEK, url: "https://teamtreehouse.com/library/comparing-vibe-coding-tools", duration: 540, publishedAt: now - 1 * WEEK },

      // No-Code
      { title: "No-Code Development", type: "track", description: "Build real applications without writing code.", topicIds: [noCodeTopicId], updatedAt: now - 1 * WEEK, createdAt: now - 3 * MONTH },
      { title: "No-Code Fundamentals", type: "course", description: "Understand the no-code landscape and when to use it.", topicIds: [noCodeTopicId], updatedAt: now - 3 * WEEK, createdAt: now - 3 * MONTH },
      { title: "Building Mobile Apps with Adalo", type: "course", description: "Create native mobile apps visually with Adalo.", topicIds: [noCodeTopicId], updatedAt: now - 2 * WEEK, createdAt: now - 3 * MONTH },
      { title: "Web Apps with WeWeb", type: "course", description: "Build responsive, data-driven web applications with WeWeb.", topicIds: [noCodeTopicId], updatedAt: now - 1 * WEEK, createdAt: now - 2 * MONTH },
      { title: "Getting Started with Adalo", type: "video", description: "Build your first mobile app screen in Adalo.", topicIds: [noCodeTopicId], updatedAt: now - 2 * WEEK, createdAt: now - 3 * MONTH, url: "https://teamtreehouse.com/library/getting-started-with-adalo", duration: 480, publishedAt: now - 3 * MONTH },
      { title: "WeWeb: Connecting External APIs", type: "video", description: "Connect your WeWeb app to REST APIs.", topicIds: [noCodeTopicId], updatedAt: now - 1 * WEEK, createdAt: now - 2 * MONTH, url: "https://teamtreehouse.com/library/weweb-connecting-apis", duration: 540, publishedAt: now - 2 * MONTH },
      { title: "Automating Workflows with Zapier", type: "video", description: "Automate workflows between your apps.", topicIds: [noCodeTopicId], updatedAt: now - 3 * WEEK, createdAt: now - 2 * MONTH, url: "https://teamtreehouse.com/library/automating-workflows-zapier", duration: 420, publishedAt: now - 2 * MONTH },
      { title: "Building with Glide Apps", type: "video", description: "Turn spreadsheets into mobile apps with Glide.", topicIds: [noCodeTopicId], updatedAt: now - 3 * WEEK, createdAt: now - 2.5 * MONTH, url: "https://teamtreehouse.com/library/building-with-glide", duration: 360, publishedAt: now - 2.5 * MONTH },

      // AI
      { title: "AI for Developers", type: "course", description: "AI fundamentals for developers — prompt engineering, LLM APIs, and AI-powered features.", topicIds: [aiTopicId, ...(pythonTopicId ? [pythonTopicId] : [])], updatedAt: now - 1 * WEEK, createdAt: now - 2 * MONTH },
      { title: "Prompt Engineering Basics", type: "video", description: "Write effective prompts for AI models.", topicIds: [aiTopicId], updatedAt: now - 1 * WEEK, createdAt: now - 2 * MONTH, url: "https://teamtreehouse.com/library/prompt-engineering-basics", duration: 540, publishedAt: now - 2 * MONTH },
      { title: "Building with the OpenAI API", type: "video", description: "Integrate OpenAI's API into your apps.", topicIds: [aiTopicId, ...(pythonTopicId ? [pythonTopicId] : [])], updatedAt: now - 2 * WEEK, createdAt: now - 6 * WEEK, url: "https://teamtreehouse.com/library/building-with-openai-api", duration: 720, publishedAt: now - 6 * WEEK },
      { title: "Introduction to RAG", type: "video", description: "Build a Retrieval-Augmented Generation system.", topicIds: [aiTopicId], updatedAt: now - 10 * DAY, createdAt: now - 1 * MONTH, url: "https://teamtreehouse.com/library/introduction-to-rag", duration: 660, publishedAt: now - 1 * MONTH },

      // HTML
      { title: "HTML Basics", type: "course", description: "Semantic HTML, forms, accessibility, and modern markup.", topicIds: [htmlTopicId], updatedAt: now - 3 * MONTH, createdAt: now - 9 * MONTH },
      { title: "HTML Forms and Validation", type: "course", description: "Master HTML forms, inputs, and validation.", topicIds: [htmlTopicId], updatedAt: now - 4 * MONTH, createdAt: now - 8 * MONTH },

      // Databases
      { title: "SQL Basics", type: "course", description: "Write queries, filter data, join tables.", topicIds: [databasesTopicId], updatedAt: now - 2 * MONTH, createdAt: now - 6 * MONTH },
      { title: "Modifying Data with SQL", type: "course", description: "INSERT, UPDATE, DELETE, and transactions.", topicIds: [databasesTopicId], updatedAt: now - 3 * MONTH, createdAt: now - 7 * MONTH },

      // Design
      { title: "UX Design Foundations", type: "course", description: "User-centered design, wireframing, and usability testing.", topicIds: [designTopicId], updatedAt: now - 1 * MONTH, createdAt: now - 5 * MONTH },
      { title: "Web Design Process", type: "course", description: "From mood boards to mockups — the complete web design process.", topicIds: [designTopicId, ...(cssTopicId ? [cssTopicId] : [])], updatedAt: now - 2 * MONTH, createdAt: now - 6 * MONTH },

      // Other languages & topics
      { title: "Java Basics", type: "course", description: "Get started with Java, OOP, and data structures.", topicIds: [javaTopicId], updatedAt: now - 4 * MONTH, createdAt: now - 10 * MONTH },
      { title: "Swift Basics", type: "course", description: "Build iOS apps with Swift, Xcode, and UIKit.", topicIds: [swiftTopicId], updatedAt: now - 5 * MONTH, createdAt: now - 10 * MONTH },
      { title: "PHP Basics", type: "course", description: "Server-side web development with PHP and the LAMP stack.", topicIds: [phpTopicId], updatedAt: now - 6 * MONTH, createdAt: now - 12 * MONTH },
      { title: "Ruby Basics", type: "course", description: "Ruby programming fundamentals for web development.", topicIds: [rubyTopicId], updatedAt: now - 7 * MONTH, createdAt: now - 12 * MONTH },
      { title: "Data Analysis with Python", type: "course", description: "Pandas, NumPy, and Matplotlib for data analysis.", topicIds: [dataAnalysisTopicId, ...(pythonTopicId ? [pythonTopicId] : [])], updatedAt: now - 2 * MONTH, createdAt: now - 5 * MONTH },
      { title: "Introduction to Game Development", type: "course", description: "Game loops, physics, sprites, and input handling.", topicIds: [gameDevTopicId, ...(jsTopicId ? [jsTopicId] : [])], updatedAt: now - 3 * MONTH, createdAt: now - 8 * MONTH },
      { title: "REST APIs with Express", type: "course", description: "Build RESTful APIs with Express.js.", topicIds: [apisTopicId, ...(nodeTopicId ? [nodeTopicId] : [])], updatedAt: now - 2 * MONTH, createdAt: now - 6 * MONTH },
      { title: "Git Basics", type: "course", description: "Version control with Git — commits, branches, merges.", topicIds: [devToolsTopicId], updatedAt: now - 3 * MONTH, createdAt: now - 9 * MONTH },
      { title: "Web Security Basics", type: "course", description: "Common vulnerabilities (XSS, CSRF, SQL injection) and prevention.", topicIds: [securityTopicId], updatedAt: now - 4 * MONTH, createdAt: now - 8 * MONTH },
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

    return `Added ${added} new content items`;
  },
});
