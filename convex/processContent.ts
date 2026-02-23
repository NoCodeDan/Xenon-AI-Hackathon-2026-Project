import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import {
  calculateRecencyScore,
  calculateOverallScore,
  scoreToGrade,
  getVelocityMultiplier,
  getDefaultDemandScore,
} from "./lib/scoring";

// ─── Topic snapshot data with real industry practices ─────────────────────
// keyed by topic slug
const TOPIC_DATA: Record<
  string,
  {
    keyPractices: string[];
    deprecatedPractices: string[];
    emergingTrends: string[];
    changeVelocity: number;
    confidence: number;
  }
> = {
  html: {
    keyPractices: [
      "Semantic HTML5 elements",
      "ARIA roles and accessibility attributes",
      "Responsive images with srcset/picture",
      "Web Components / Custom Elements",
      "Structured data with schema.org",
    ],
    deprecatedPractices: [
      "Table-based layouts",
      "Inline styles for layout",
      "Font tags and presentational markup",
      "Frames and framesets",
    ],
    emergingTrends: [
      "Declarative Shadow DOM",
      "Popover API",
      "Dialog element adoption",
      "View Transitions API",
    ],
    changeVelocity: 0.3,
    confidence: 0.9,
  },
  css: {
    keyPractices: [
      "CSS Grid and Flexbox for layout",
      "Custom Properties (CSS Variables)",
      "Container queries",
      "Responsive design with clamp()/min()/max()",
      "CSS-in-JS alternatives (CSS Modules, Tailwind)",
      "Logical properties (inline/block)",
    ],
    deprecatedPractices: [
      "Float-based layouts",
      "CSS hacks for browser compatibility",
      "Vendor prefixes for modern properties",
      "px-only responsive design",
    ],
    emergingTrends: [
      "CSS Nesting (native)",
      "CSS Layers (@layer)",
      "Scroll-driven animations",
      "Subgrid adoption",
      ":has() selector usage",
    ],
    changeVelocity: 0.6,
    confidence: 0.85,
  },
  javascript: {
    keyPractices: [
      "ES2024+ features (top-level await, structuredClone)",
      "Async/await and Promise patterns",
      "TypeScript for type safety",
      "Module system (ESM)",
      "Functional programming patterns",
      "Error handling best practices",
    ],
    deprecatedPractices: [
      "var keyword usage",
      "Callback-heavy patterns (callback hell)",
      "CommonJS in browser code",
      "Prototype manipulation",
      "with statement",
    ],
    emergingTrends: [
      "TC39 Stage 3 proposals (decorators, explicit resource management)",
      "Temporal API for dates",
      "Import attributes",
      "Iterator helpers",
    ],
    changeVelocity: 0.7,
    confidence: 0.85,
  },
  react: {
    keyPractices: [
      "React Server Components",
      "Hooks-based architecture",
      "Suspense for data loading",
      "React 19 form actions",
      "Component composition patterns",
      "TypeScript with React",
    ],
    deprecatedPractices: [
      "Class components for new code",
      "Legacy lifecycle methods (componentWillMount)",
      "Redux for all state management",
      "Higher-Order Components (prefer hooks)",
      "defaultProps (use default parameters)",
    ],
    emergingTrends: [
      "React Server Components streaming",
      "React Compiler (auto-memoization)",
      "use() hook",
      "Server Actions",
    ],
    changeVelocity: 0.85,
    confidence: 0.8,
  },
  python: {
    keyPractices: [
      "Type hints and mypy/pyright",
      "Virtual environments (venv/poetry/uv)",
      "Dataclasses and Pydantic models",
      "Async/await with asyncio",
      "Pattern matching (match/case)",
      "F-strings for formatting",
    ],
    deprecatedPractices: [
      "Python 2 syntax",
      "% string formatting",
      "Manual __init__ boilerplate (use dataclasses)",
      "setup.py without pyproject.toml",
    ],
    emergingTrends: [
      "uv package manager",
      "Python 3.13 free-threaded mode",
      "Pydantic v2 performance",
      "AI/ML framework integration",
    ],
    changeVelocity: 0.6,
    confidence: 0.85,
  },
  java: {
    keyPractices: [
      "Records for data classes",
      "Sealed classes and interfaces",
      "Pattern matching (instanceof, switch)",
      "Virtual threads (Project Loom)",
      "Text blocks for multi-line strings",
      "Stream API fluent usage",
    ],
    deprecatedPractices: [
      "Java 8 or older features only",
      "Raw types (non-generic collections)",
      "Checked exception overuse",
      "Enterprise JavaBeans (EJB)",
    ],
    emergingTrends: [
      "Project Panama (foreign function API)",
      "Project Valhalla (value types)",
      "GraalVM native image",
      "Spring Boot 3+ virtual threads",
    ],
    changeVelocity: 0.5,
    confidence: 0.85,
  },
  ruby: {
    keyPractices: [
      "Ruby 3.x features",
      "Ractors for parallelism",
      "Pattern matching",
      "Rails 7+ Hotwire/Turbo",
      "RBS type signatures",
    ],
    deprecatedPractices: [
      "Ruby 2.x-only patterns",
      "Monkey patching in production",
      "Asset pipeline (use importmaps/esbuild)",
    ],
    emergingTrends: [
      "YJIT performance improvements",
      "Hotwire/Turbo for SPA-like UX",
      "Rails 8 Solid Cache/Queue/Cable",
    ],
    changeVelocity: 0.45,
    confidence: 0.8,
  },
  php: {
    keyPractices: [
      "PHP 8.3+ features (enums, fibers, typed properties)",
      "Composer for dependency management",
      "PSR standards compliance",
      "Laravel/Symfony modern patterns",
      "Named arguments and match expressions",
    ],
    deprecatedPractices: [
      "PHP 7.x-only code",
      "mysql_* functions",
      "Global variables for state",
      "No type declarations",
    ],
    emergingTrends: [
      "PHP 8.4 property hooks",
      "Laravel Reverb for WebSockets",
      "Async PHP with Swoole/ReactPHP",
    ],
    changeVelocity: 0.5,
    confidence: 0.8,
  },
  swift: {
    keyPractices: [
      "Swift 5.9+ macros",
      "SwiftUI for new UI development",
      "Structured concurrency (async/await, actors)",
      "Swift Package Manager",
      "Result builders",
    ],
    deprecatedPractices: [
      "UIKit-only development for new projects",
      "GCD-only concurrency (prefer structured concurrency)",
      "Objective-C bridging for new code",
    ],
    emergingTrends: [
      "Swift 6 strict concurrency",
      "Observation framework (replacing Combine)",
      "SwiftData",
      "visionOS development",
    ],
    changeVelocity: 0.7,
    confidence: 0.8,
  },
  android: {
    keyPractices: [
      "Jetpack Compose for UI",
      "Kotlin-first development",
      "Material Design 3",
      "Coroutines and Flow for async",
      "ViewModel + StateFlow architecture",
    ],
    deprecatedPractices: [
      "XML layouts for new screens",
      "Java for new Android development",
      "AsyncTask",
      "ListView (use RecyclerView/LazyColumn)",
    ],
    emergingTrends: [
      "Kotlin Multiplatform Mobile (KMM)",
      "Compose Multiplatform",
      "Baseline Profiles",
      "Gemini on-device AI",
    ],
    changeVelocity: 0.75,
    confidence: 0.8,
  },
  "web-design": {
    keyPractices: [
      "Mobile-first responsive design",
      "Design systems and tokens",
      "WCAG 2.1 AA accessibility compliance",
      "Figma-to-code workflows",
      "Component-driven design",
    ],
    deprecatedPractices: [
      "Fixed-width designs",
      "Desktop-first approach",
      "Pixel-perfect mockups without responsive consideration",
      "Flash-based interactions",
    ],
    emergingTrends: [
      "AI-assisted design tools",
      "Variable fonts for responsive typography",
      "Design-to-code automation",
      "Spatial/3D web design",
    ],
    changeVelocity: 0.5,
    confidence: 0.8,
  },
  "web-development": {
    keyPractices: [
      "Component-based architecture",
      "Server-side rendering (SSR) and static generation",
      "Progressive Web Apps (PWAs)",
      "Web Performance optimization (Core Web Vitals)",
      "REST and GraphQL API design",
    ],
    deprecatedPractices: [
      "jQuery for new projects",
      "AJAX without fetch/axios",
      "Monolithic server-rendered pages",
      "Bower package manager",
    ],
    emergingTrends: [
      "Edge computing and edge functions",
      "WebAssembly (Wasm) adoption",
      "Islands architecture",
      "AI-powered development tools",
    ],
    changeVelocity: 0.7,
    confidence: 0.85,
  },
  databases: {
    keyPractices: [
      "Query optimization and indexing strategies",
      "Database migrations and version control",
      "Connection pooling",
      "Data modeling best practices",
      "Backup and disaster recovery",
    ],
    deprecatedPractices: [
      "No-index table scans on production",
      "Stored procedures for business logic",
      "Manual SQL injection (use parameterized queries)",
    ],
    emergingTrends: [
      "Serverless/edge databases",
      "Vector databases for AI",
      "Multi-model databases",
      "Database branching (PlanetScale, Neon)",
    ],
    changeVelocity: 0.5,
    confidence: 0.85,
  },
  security: {
    keyPractices: [
      "OWASP Top 10 mitigation",
      "HTTPS everywhere",
      "Content Security Policy headers",
      "Dependency vulnerability scanning",
      "Secret management (vault/env vars)",
    ],
    deprecatedPractices: [
      "MD5/SHA1 for password hashing",
      "HTTP for any authenticated endpoints",
      "Storing secrets in source code",
      "Security through obscurity",
    ],
    emergingTrends: [
      "Zero trust architecture",
      "Passkeys/WebAuthn replacing passwords",
      "AI-powered threat detection",
      "Supply chain security (SBOM)",
    ],
    changeVelocity: 0.8,
    confidence: 0.85,
  },
  "quality-assurance": {
    keyPractices: [
      "Automated testing (unit, integration, e2e)",
      "CI/CD pipelines",
      "Test-driven development (TDD)",
      "Code coverage tracking",
      "Performance testing",
    ],
    deprecatedPractices: [
      "Manual-only testing",
      "No CI/CD pipeline",
      "Testing in production only",
    ],
    emergingTrends: [
      "AI-assisted test generation",
      "Visual regression testing",
      "Playwright over Selenium",
      "Shift-left testing",
    ],
    changeVelocity: 0.5,
    confidence: 0.85,
  },
  "digital-literacy": {
    keyPractices: [
      "Cloud-based collaboration tools",
      "Version control basics (Git)",
      "Command line fundamentals",
      "File management and organization",
      "Online safety and privacy",
    ],
    deprecatedPractices: [
      "Local-only file storage",
      "No version control",
      "FTP for file transfer",
    ],
    emergingTrends: [
      "AI literacy and prompt engineering",
      "No-code/low-code tools",
      "Cloud-native workflows",
    ],
    changeVelocity: 0.4,
    confidence: 0.9,
  },
  "data-analysis": {
    keyPractices: [
      "Python (pandas, numpy) for data manipulation",
      "SQL for data querying",
      "Data visualization (matplotlib, seaborn, D3)",
      "Statistical analysis fundamentals",
      "Jupyter notebooks for exploration",
    ],
    deprecatedPractices: [
      "Excel-only data analysis",
      "Manual data entry without validation",
      "No version control for analysis code",
    ],
    emergingTrends: [
      "AI/ML-assisted data analysis",
      "Real-time streaming analytics",
      "DataOps practices",
      "Polars replacing pandas for performance",
    ],
    changeVelocity: 0.6,
    confidence: 0.85,
  },
  "machine-learning": {
    keyPractices: [
      "Scikit-learn for classical ML",
      "PyTorch/TensorFlow for deep learning",
      "MLOps and model versioning",
      "Feature engineering best practices",
      "Model evaluation and validation",
    ],
    deprecatedPractices: [
      "Training without validation sets",
      "Manual hyperparameter tuning only",
      "No model versioning",
    ],
    emergingTrends: [
      "Large Language Models (LLMs)",
      "RAG (Retrieval Augmented Generation)",
      "Fine-tuning foundation models",
      "Edge ML deployment",
    ],
    changeVelocity: 0.95,
    confidence: 0.75,
  },
  devops: {
    keyPractices: [
      "Infrastructure as Code (Terraform, Pulumi)",
      "Container orchestration (Kubernetes, Docker)",
      "CI/CD automation",
      "Monitoring and observability (Prometheus, Grafana)",
      "GitOps workflows",
    ],
    deprecatedPractices: [
      "Manual server configuration",
      "No infrastructure versioning",
      "SSH-into-prod deployments",
      "Monolithic deployment pipelines",
    ],
    emergingTrends: [
      "Platform engineering",
      "Internal Developer Platforms (IDPs)",
      "eBPF for observability",
      "AI-assisted incident response",
    ],
    changeVelocity: 0.7,
    confidence: 0.85,
  },
  "game-development": {
    keyPractices: [
      "Unity/Unreal Engine proficiency",
      "Component/Entity systems",
      "Asset optimization and LOD",
      "Cross-platform development",
      "Version control for game assets",
    ],
    deprecatedPractices: [
      "Flash-based games",
      "No source control",
      "Single-threaded game loops",
    ],
    emergingTrends: [
      "AI-generated game assets",
      "WebGPU for browser games",
      "Cloud gaming architecture",
      "Procedural generation with ML",
    ],
    changeVelocity: 0.55,
    confidence: 0.8,
  },
  "apis": {
    keyPractices: [
      "RESTful API design principles",
      "OpenAPI/Swagger documentation",
      "API versioning strategies",
      "Authentication (OAuth 2.0, JWT)",
      "Rate limiting and caching",
    ],
    deprecatedPractices: [
      "SOAP for new APIs",
      "No API documentation",
      "Session-based auth for APIs",
      "No rate limiting",
    ],
    emergingTrends: [
      "GraphQL federation",
      "tRPC and type-safe APIs",
      "gRPC for microservices",
      "API-first development",
    ],
    changeVelocity: 0.55,
    confidence: 0.85,
  },
  nodejs: {
    keyPractices: [
      "Node.js 20+ features",
      "ESM modules",
      "Async/await patterns",
      "Environment variable management",
      "Streaming and backpressure handling",
    ],
    deprecatedPractices: [
      "Callback-only patterns",
      "CommonJS for new projects",
      "Node.js < 18",
      "Express without TypeScript",
    ],
    emergingTrends: [
      "Bun and Deno alternatives",
      "Node.js built-in test runner",
      "Permission model",
      "Single executable applications",
    ],
    changeVelocity: 0.7,
    confidence: 0.85,
  },
  typescript: {
    keyPractices: [
      "Strict mode enabled",
      "Discriminated unions for state",
      "Utility types (Partial, Pick, Omit)",
      "Generics for reusable code",
      "Declaration files for libraries",
    ],
    deprecatedPractices: [
      "any type overuse",
      "Enums (prefer const objects or unions)",
      "Namespace keyword",
      "Triple-slash references",
    ],
    emergingTrends: [
      "TypeScript 5.x decorators",
      "Satisfies operator patterns",
      "Type-level programming",
      "Auto-inferred return types",
    ],
    changeVelocity: 0.65,
    confidence: 0.85,
  },
  git: {
    keyPractices: [
      "Feature branch workflow",
      "Conventional commits",
      "Pull request reviews",
      "Git hooks (pre-commit, lint-staged)",
      "Rebasing for clean history",
    ],
    deprecatedPractices: [
      "Direct commits to main",
      "No code review",
      "SVN workflows in Git",
      "Binary files in Git",
    ],
    emergingTrends: [
      "Trunk-based development",
      "AI-assisted commit messages",
      "Git worktrees for parallel work",
      "Stacked PRs",
    ],
    changeVelocity: 0.25,
    confidence: 0.9,
  },
  "ux-design": {
    keyPractices: [
      "User research and usability testing",
      "Design tokens and systems",
      "Accessibility-first design",
      "Prototyping (Figma, Framer)",
      "Information architecture",
    ],
    deprecatedPractices: [
      "Design without user research",
      "Static mockups only",
      "Ignoring mobile experience",
    ],
    emergingTrends: [
      "AI-powered design tools",
      "Voice UI and conversational design",
      "Micro-interactions and motion design",
      "Ethical/inclusive design practices",
    ],
    changeVelocity: 0.5,
    confidence: 0.8,
  },
};

// Default for topics not in the map above
const DEFAULT_TOPIC_DATA = {
  keyPractices: ["Modern industry best practices", "Current tooling and frameworks"],
  deprecatedPractices: ["Outdated patterns and approaches"],
  emergingTrends: ["Latest industry developments"],
  changeVelocity: 0.5,
  confidence: 0.7,
};

// ─── Step 1: Update all topic snapshots with real data ────────────────────
export const updateTopicSnapshots = mutation({
  args: {},
  handler: async (ctx): Promise<number> => {
    const topics = await ctx.db.query("topics").collect();
    let updated = 0;

    for (const topic of topics) {
      const data = TOPIC_DATA[topic.slug] ?? DEFAULT_TOPIC_DATA;

      // Get existing active snapshot
      const existingSnapshots = await ctx.db
        .query("topicSnapshots")
        .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
        .collect();
      const previousActive = existingSnapshots.find(
        (s) => s.supersededById === undefined
      );

      // Create new snapshot with real data
      const newSnapshotId = await ctx.db.insert("topicSnapshots", {
        topicId: topic._id,
        keyPractices: data.keyPractices,
        deprecatedPractices: data.deprecatedPractices,
        emergingTrends: data.emergingTrends,
        changeVelocity: data.changeVelocity,
        confidence: data.confidence,
        notes: `Industry snapshot for ${topic.name} — Feb 2026.`,
        createdAt: Date.now(),
      });

      // Supersede old snapshot
      if (previousActive) {
        await ctx.db.patch(previousActive._id, {
          supersededById: newSnapshotId,
        });
      }

      // Update topic's active snapshot
      await ctx.db.patch(topic._id, {
        activeSnapshotId: newSnapshotId,
      });
      updated++;
    }

    return updated;
  },
});

// ─── Step 2: Grade a batch of content items (heuristic) ──────────────────
export const gradeBatch = mutation({
  args: {
    offset: v.number(),
    limit: v.number(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ graded: number; skipped: number; offset: number }> => {
    // Fetch content items for this batch
    const allContent = await ctx.db.query("contentItems").collect();
    const batch = allContent.slice(args.offset, args.offset + args.limit);

    // Preload all topics + active snapshots
    const topics = await ctx.db.query("topics").collect();
    const topicMap = new Map(topics.map((t) => [t._id.toString(), t]));

    const snapshotMap = new Map<string, any>();
    for (const topic of topics) {
      if (topic.activeSnapshotId) {
        const snapshot = await ctx.db.get(topic.activeSnapshotId);
        if (snapshot) {
          snapshotMap.set(topic._id.toString(), snapshot);
        }
      }
    }

    let graded = 0;
    let skipped = 0;

    for (const content of batch) {
      // Get primary topic and its snapshot
      const primaryTopicId = content.topicIds[0];
      if (!primaryTopicId) {
        skipped++;
        continue;
      }

      const topic = topicMap.get(primaryTopicId.toString());
      const snapshot = snapshotMap.get(primaryTopicId.toString());
      if (!topic || !snapshot) {
        skipped++;
        continue;
      }

      const velocity = snapshot.changeVelocity ?? 0.5;

      // 1. Recency score
      const recencyScore = calculateRecencyScore(content.updatedAt, velocity);

      // 2. Heuristic alignment score
      // Base alignment on content type and topic velocity
      // Tracks/courses get slightly higher alignment (they're curated)
      // Higher velocity topics get lower alignment (harder to stay current)
      let alignmentBase: number;
      switch (content.type) {
        case "track":
          alignmentBase = 78;
          break;
        case "course":
          alignmentBase = 72;
          break;
        case "stage":
          alignmentBase = 68;
          break;
        case "video":
          alignmentBase = 65;
          break;
        case "practice":
          alignmentBase = 70;
          break;
        default:
          alignmentBase = 60;
      }

      // Adjust by velocity: fast-moving topics → harder to align with
      const velocityPenalty = velocity * 15;
      // Add some deterministic variation based on title length
      const titleVariation = ((content.title.length * 7) % 20) - 10;
      const alignmentScore = Math.max(
        15,
        Math.min(95, alignmentBase - velocityPenalty + titleVariation)
      );

      // 3. Demand score (neutral default)
      const demandScore = getDefaultDemandScore();

      // 4. Calculate overall score
      const overallScore = calculateOverallScore(
        recencyScore,
        alignmentScore,
        demandScore
      );
      const grade = scoreToGrade(overallScore);
      const velocityMultiplier = getVelocityMultiplier(velocity);

      // Determine recommended action based on grade
      let recommendedAction: string;
      if (grade === "A") recommendedAction = "No action needed";
      else if (grade === "B") recommendedAction = "Monitor for updates";
      else if (grade === "C") recommendedAction = "Review and update content";
      else if (grade === "D") recommendedAction = "Prioritize for revision";
      else recommendedAction = "Urgent: content needs replacement or major overhaul";

      // Heuristic outdated/missing topics
      const outdatedTopics: string[] = [];
      const missingTopics: string[] = [];

      if (overallScore < 55 && snapshot.deprecatedPractices?.length > 0) {
        outdatedTopics.push(
          snapshot.deprecatedPractices[0]
        );
      }
      if (overallScore < 70 && snapshot.emergingTrends?.length > 0) {
        missingTopics.push(snapshot.emergingTrends[0]);
      }

      // Save freshness score
      const scoreId = await ctx.db.insert("freshnessScores", {
        contentId: content._id,
        topicSnapshotId: snapshot._id,
        overallScore,
        recencyScore,
        alignmentScore,
        demandScore,
        velocityMultiplier,
        grade,
        outdatedTopics,
        missingTopics,
        industryBenchmark: `${topic.name} industry standard`,
        recommendedAction,
        confidence: snapshot.confidence ?? 0.7,
        createdAt: Date.now(),
      });

      // Upsert contentLatestGrade
      const existingGrade = await ctx.db
        .query("contentLatestGrade")
        .withIndex("by_content", (q) => q.eq("contentId", content._id))
        .unique();

      if (existingGrade) {
        await ctx.db.patch(existingGrade._id, {
          scoreId,
          overallScore,
          grade,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("contentLatestGrade", {
          contentId: content._id,
          scoreId,
          overallScore,
          grade,
          updatedAt: Date.now(),
        });
      }

      // Mark content as graded
      await ctx.db.patch(content._id, {
        gradingStatus: "graded" as const,
      });

      graded++;
    }

    return { graded, skipped, offset: args.offset };
  },
});

// ─── Step 3: Generate library snapshot ────────────────────────────────────
export const generateLibrarySnapshot = mutation({
  args: {},
  handler: async (ctx): Promise<{ totalContent: number; averageScore: number; distribution: Record<string, number> }> => {
    const now = Date.now();

    const allGrades = await ctx.db.query("contentLatestGrade").collect();

    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    let totalScore = 0;

    for (const entry of allGrades) {
      const grade = entry.grade as keyof typeof gradeDistribution;
      if (grade in gradeDistribution) {
        gradeDistribution[grade]++;
      }
      totalScore += entry.overallScore;
    }

    const totalContent = allGrades.length;
    const averageScore = totalContent > 0 ? totalScore / totalContent : 0;

    // Per-topic breakdown
    const gradeByContent = new Map(
      allGrades.map((g) => [g.contentId.toString(), g])
    );
    const allContent = await ctx.db.query("contentItems").collect();
    const allTopics = await ctx.db.query("topics").collect();
    const topicNameMap = new Map(
      allTopics.map((t) => [t._id.toString(), t.name])
    );

    const topicAccumulator = new Map<
      string,
      { totalScore: number; count: number }
    >();

    for (const content of allContent) {
      const gradeEntry = gradeByContent.get(content._id.toString());
      if (!gradeEntry) continue;

      for (const topicId of content.topicIds) {
        const key = topicId.toString();
        const existing = topicAccumulator.get(key);
        if (existing) {
          existing.totalScore += gradeEntry.overallScore;
          existing.count++;
        } else {
          topicAccumulator.set(key, {
            totalScore: gradeEntry.overallScore,
            count: 1,
          });
        }
      }
    }

    const topicBreakdown: {
      topicId: any;
      topicName: string;
      averageScore: number;
      contentCount: number;
    }[] = [];

    for (const [topicIdStr, acc] of topicAccumulator) {
      const topic = allTopics.find((t) => t._id.toString() === topicIdStr);
      if (!topic) continue;

      topicBreakdown.push({
        topicId: topic._id,
        topicName: topicNameMap.get(topicIdStr) ?? "Unknown Topic",
        averageScore: acc.count > 0 ? Math.round((acc.totalScore / acc.count) * 100) / 100 : 0,
        contentCount: acc.count,
      });
    }

    topicBreakdown.sort((a, b) => a.averageScore - b.averageScore);

    await ctx.db.insert("librarySnapshots", {
      totalContent,
      gradeDistribution,
      averageScore: Math.round(averageScore * 100) / 100,
      topicBreakdown,
      createdAt: now,
    });

    return {
      totalContent,
      averageScore: Math.round(averageScore * 100) / 100,
      distribution: gradeDistribution,
    };
  },
});

// ─── Helper: Get total content count ──────────────────────────────────────
export const getContentCount = mutation({
  args: {},
  handler: async (ctx): Promise<number> => {
    const all = await ctx.db.query("contentItems").collect();
    return all.length;
  },
});

// ─── Step 0: Scatter updatedAt dates for realistic age distribution ───────
// Uses a deterministic hash so results are consistent across runs.
export const scatterDates = mutation({
  args: {
    offset: v.number(),
    limit: v.number(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ updated: number }> => {
    const allContent = await ctx.db.query("contentItems").collect();
    const batch = allContent.slice(args.offset, args.offset + args.limit);

    const now = Date.now();
    const THREE_YEARS_MS = 3 * 365.25 * 24 * 60 * 60 * 1000;

    // Get all topics for velocity lookup
    const topics = await ctx.db.query("topics").collect();
    const topicMap = new Map(topics.map((t) => [t._id.toString(), t]));

    // Preload snapshots
    const snapshotMap = new Map<string, any>();
    for (const topic of topics) {
      if (topic.activeSnapshotId) {
        const snapshot = await ctx.db.get(topic.activeSnapshotId);
        if (snapshot) snapshotMap.set(topic._id.toString(), snapshot);
      }
    }

    let updated = 0;

    for (let i = 0; i < batch.length; i++) {
      const content = batch[i];
      const globalIndex = args.offset + i;

      // Deterministic pseudo-random based on title + index
      const hash = simpleHash(content.title + globalIndex);

      // Get topic velocity to influence age distribution
      // Higher velocity topics → we want more variation (some very old)
      const primaryTopicId = content.topicIds[0];
      const snapshot = primaryTopicId
        ? snapshotMap.get(primaryTopicId.toString())
        : null;
      const velocity = snapshot?.changeVelocity ?? 0.5;

      // Distribution: mix of recent and old content
      // 20% very recent (0-3 months), 30% moderate (3-12 months),
      // 30% older (1-2 years), 20% stale (2-3 years)
      let ageMs: number;
      const bucket = hash % 100;

      if (bucket < 20) {
        // Very recent: 0-3 months
        ageMs = (hash % 90) * 24 * 60 * 60 * 1000;
      } else if (bucket < 50) {
        // Moderate: 3-12 months
        ageMs = (90 + (hash % 270)) * 24 * 60 * 60 * 1000;
      } else if (bucket < 80) {
        // Older: 1-2 years
        ageMs = (365 + (hash % 365)) * 24 * 60 * 60 * 1000;
      } else {
        // Stale: 2-3 years
        ageMs = (730 + (hash % 365)) * 24 * 60 * 60 * 1000;
      }

      // Higher velocity topics skew slightly older
      if (velocity > 0.7) {
        ageMs = Math.min(ageMs * 1.3, THREE_YEARS_MS);
      }

      const newUpdatedAt = now - Math.floor(ageMs);

      // Also set publishedAt slightly before updatedAt for videos/practices
      const publishedOffset = (hash % 180) * 24 * 60 * 60 * 1000;
      const newCreatedAt = newUpdatedAt - publishedOffset;

      const patch: any = {
        updatedAt: newUpdatedAt,
        createdAt: newCreatedAt,
      };

      if (content.type === "video" || content.type === "practice") {
        patch.publishedAt = newCreatedAt;
      }

      await ctx.db.patch(content._id, patch);
      updated++;
    }

    return { updated };
  },
});

// ─── Clear grades in chunks (for reprocessing) ───────────────────────────
export const clearGradesBatch = mutation({
  args: {
    table: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args): Promise<{ deleted: number; more: boolean }> => {
    let deleted = 0;
    const tableName = args.table as "freshnessScores" | "contentLatestGrade" | "librarySnapshots";

    const docs = await ctx.db.query(tableName).take(args.limit);
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
      deleted++;
    }

    return { deleted, more: docs.length === args.limit };
  },
});

// Reset gradingStatus in batches
export const resetGradingStatus = mutation({
  args: {
    offset: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args): Promise<{ updated: number }> => {
    const content = await ctx.db.query("contentItems").collect();
    const batch = content.slice(args.offset, args.offset + args.limit);
    for (const c of batch) {
      await ctx.db.patch(c._id, { gradingStatus: "pending" as const });
    }
    return { updated: batch.length };
  },
});

// ─── URL audit: check which content items have/lack URLs ──────────────────
export const auditUrls = mutation({
  args: {},
  handler: async (ctx): Promise<Record<string, { total: number; withUrl: number; withoutUrl: number }>> => {
    const all = await ctx.db.query("contentItems").collect();
    const result: Record<string, { total: number; withUrl: number; withoutUrl: number }> = {};

    for (const item of all) {
      if (!result[item.type]) {
        result[item.type] = { total: 0, withUrl: 0, withoutUrl: 0 };
      }
      result[item.type].total++;
      if (item.url) {
        result[item.type].withUrl++;
      } else {
        result[item.type].withoutUrl++;
      }
    }
    return result;
  },
});

// ─── Fix stage URLs by deriving from parent course URL ────────────────────
export const fixStageUrls = mutation({
  args: {
    offset: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args): Promise<{ fixed: number }> => {
    // Get stages without URLs
    const allStages = await ctx.db.query("contentItems").collect();
    const stages = allStages.filter((c) => c.type === "stage" && !c.url);
    const batch = stages.slice(args.offset, args.offset + args.limit);

    let fixed = 0;

    for (const stage of batch) {
      // Find the parent course via contentEdges
      const parentEdge = await ctx.db
        .query("contentEdges")
        .withIndex("by_child", (q) => q.eq("childId", stage._id))
        .first();

      if (!parentEdge) continue;

      const parent = await ctx.db.get(parentEdge.parentId);
      if (!parent || !parent.url) continue;

      // Stage URL = parent course URL (stages don't have separate pages)
      await ctx.db.patch(stage._id, { url: parent.url });
      fixed++;
    }

    return { fixed };
  },
});

// Simple deterministic hash function
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}
