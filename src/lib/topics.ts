/**
 * Official Treehouse topics — single source of truth.
 * Derived from teamtreehouse.com/library topic list.
 *
 * The `slug` is stored as the `domain` field on the topics table
 * and used as the category identifier throughout the UI.
 */

export interface TopicDef {
  slug: string;
  label: string;
}

export const TREEHOUSE_TOPICS: TopicDef[] = [
  { slug: "ai", label: "AI" },
  { slug: "vibe-coding", label: "Vibe Coding" },
  { slug: "javascript", label: "JavaScript" },
  { slug: "python", label: "Python" },
  { slug: "nocode", label: "No-Code" },
  { slug: "react", label: "React" },
  { slug: "coding-for-kids", label: "Coding for Kids" },
  { slug: "design", label: "Design" },
  { slug: "html", label: "HTML" },
  { slug: "css", label: "CSS" },
  { slug: "game-development", label: "Game Development" },
  { slug: "data-analysis", label: "Data Analysis" },
  { slug: "development-tools", label: "Development Tools" },
  { slug: "databases", label: "Databases" },
  { slug: "security", label: "Security" },
  { slug: "digital-literacy", label: "Digital Literacy" },
  { slug: "swift", label: "Swift" },
  { slug: "java", label: "Java" },
  { slug: "machine-learning", label: "Machine Learning" },
  { slug: "apis", label: "APIs" },
  { slug: "professional-growth", label: "Professional Growth" },
  { slug: "computer-science", label: "Computer Science" },
  { slug: "ruby", label: "Ruby" },
  { slug: "quality-assurance", label: "Quality Assurance" },
  { slug: "php", label: "PHP" },
  { slug: "go", label: "Go Language" },
  { slug: "learning-resources", label: "Learning Resources" },
  { slug: "college-credit", label: "College Credit" },
];

/** slug → display label */
export const topicLabel: Record<string, string> = Object.fromEntries(
  TREEHOUSE_TOPICS.map((t) => [t.slug, t.label])
);

/** Category filter options for dropdowns (includes "all") */
export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Topics" },
  ...TREEHOUSE_TOPICS.map((t) => ({ value: t.slug, label: t.label })),
];

/**
 * Badge colors by topic slug.
 * Uses a rotating palette so every topic gets a distinct color.
 */
export const topicBadgeColor: Record<string, string> = {
  ai: "bg-violet-100 text-violet-800 border-violet-200",
  "vibe-coding": "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  javascript: "bg-amber-100 text-amber-800 border-amber-200",
  python: "bg-emerald-100 text-emerald-800 border-emerald-200",
  nocode: "bg-lime-100 text-lime-800 border-lime-200",
  react: "bg-sky-100 text-sky-800 border-sky-200",
  "coding-for-kids": "bg-pink-100 text-pink-800 border-pink-200",
  design: "bg-rose-100 text-rose-800 border-rose-200",
  html: "bg-orange-100 text-orange-800 border-orange-200",
  css: "bg-blue-100 text-blue-800 border-blue-200",
  "game-development": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "data-analysis": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "development-tools": "bg-slate-100 text-slate-800 border-slate-200",
  databases: "bg-teal-100 text-teal-800 border-teal-200",
  security: "bg-red-100 text-red-800 border-red-200",
  "digital-literacy": "bg-purple-100 text-purple-800 border-purple-200",
  swift: "bg-orange-100 text-orange-800 border-orange-200",
  java: "bg-amber-100 text-amber-800 border-amber-200",
  "machine-learning": "bg-violet-100 text-violet-800 border-violet-200",
  apis: "bg-green-100 text-green-800 border-green-200",
  "professional-growth": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "computer-science": "bg-indigo-100 text-indigo-800 border-indigo-200",
  ruby: "bg-red-100 text-red-800 border-red-200",
  "quality-assurance": "bg-teal-100 text-teal-800 border-teal-200",
  php: "bg-blue-100 text-blue-800 border-blue-200",
  go: "bg-cyan-100 text-cyan-800 border-cyan-200",
  "learning-resources": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "college-credit": "bg-stone-100 text-stone-800 border-stone-200",
};

/** Fallback color for unknown slugs */
export const DEFAULT_BADGE_COLOR = "bg-gray-100 text-gray-800 border-gray-200";
