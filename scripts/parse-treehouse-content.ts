/**
 * parse-treehouse-content.ts
 *
 * Parses Treehouse content library markdown/JSON files and outputs
 * structured JSON suitable for the importTreehouseData Convex mutation.
 *
 * Usage:
 *   npx tsx scripts/parse-treehouse-content.ts > /tmp/treehouse-data.json
 */

import * as fs from "fs";
import * as path from "path";

// ─── Configuration ────────────────────────────────────────────────────────

const CONTENT_DIR = path.join(
  __dirname,
  "..",
  "src",
  "treehouse-content-library"
);

// Topic markdown files mapped to topic name and slug
const TOPIC_FILES: Record<string, { name: string; slug: string }> = {
  "treehouse-ai.md": { name: "AI", slug: "ai" },
  "treehouse-apis.md": { name: "APIs", slug: "apis" },
  "treehouse-cs.md": { name: "Computer Science", slug: "computer-science" },
  "treehouse-csharp.md": { name: "C#", slug: "csharp" },
  "treehouse-css.md": { name: "CSS", slug: "css" },
  "treehouse-data-analysis.md": { name: "Data Analysis", slug: "data-analysis" },
  "treehouse-databases.md": { name: "Databases", slug: "databases" },
  "treehouse-design.md": { name: "Design", slug: "design" },
  "treehouse-devtools.md": { name: "Development Tools", slug: "development-tools" },
  "treehouse-digliteracy.md": { name: "Digital Literacy", slug: "digital-literacy" },
  "treehouse-gamedev.md": { name: "Game Development", slug: "game-development" },
  "treehouse-go.md": { name: "Go Language", slug: "go" },
  "treehouse-html.md": { name: "HTML", slug: "html" },
  "treehouse-java.md": { name: "Java", slug: "java" },
  "treehouse-js.md": { name: "JavaScript", slug: "javascript" },
  "treehouse-kids.md": { name: "Coding for Kids", slug: "coding-for-kids" },
  "treehouse-learning.md": { name: "Learning Resources", slug: "learning-resources" },
  "treehouse-ml.md": { name: "Machine Learning", slug: "machine-learning" },
  "treehouse-nocode.md": { name: "No-Code", slug: "nocode" },
  "treehouse-php.md": { name: "PHP", slug: "php" },
  "treehouse-profgrowth.md": { name: "Professional Growth", slug: "professional-growth" },
  "treehouse-python.md": { name: "Python", slug: "python" },
  "treehouse-qa.md": { name: "Quality Assurance", slug: "quality-assurance" },
  "treehouse-react.md": { name: "React", slug: "react" },
  "treehouse-ruby.md": { name: "Ruby", slug: "ruby" },
  "treehouse-security.md": { name: "Security", slug: "security" },
  "treehouse-swift.md": { name: "Swift", slug: "swift" },
  "treehouse-vibecoding.md": { name: "Vibe Coding", slug: "vibe-coding" },
};

// Topic name -> domain mapping
const TOPIC_DOMAIN_MAP: Record<string, string> = {
  JavaScript: "frontend",
  React: "frontend",
  HTML: "frontend",
  CSS: "frontend",
  "Vibe Coding": "frontend",
  Python: "languages",
  Ruby: "languages",
  PHP: "languages",
  Java: "languages",
  "C#": "languages",
  "Go Language": "languages",
  Swift: "languages",
  "Node.js": "backend",
  Databases: "backend",
  APIs: "backend",
  AI: "ai",
  "Machine Learning": "ai",
  Design: "design",
  "Data Analysis": "data",
  Security: "security",
  "Computer Science": "cs",
  "Development Tools": "tools",
  "Digital Literacy": "tools",
  "No-Code": "tools",
  "Professional Growth": "other",
  "Game Development": "other",
  "Quality Assurance": "other",
  "College Credit": "other",
  "Coding for Kids": "other",
  "Learning Resources": "other",
};

// Topic name -> slug lookup (inverse of TOPIC_FILES values)
const TOPIC_NAME_TO_SLUG: Record<string, string> = {};
for (const { name, slug } of Object.values(TOPIC_FILES)) {
  TOPIC_NAME_TO_SLUG[name] = slug;
}

// ─── Types ────────────────────────────────────────────────────────────────

interface Topic {
  name: string;
  slug: string;
  domain: string;
  description?: string;
}

interface Track {
  title: string;
  description: string;
  url: string;
  duration?: number;
  topicSlugs: string[];
}

interface Lesson {
  title: string;
  type: "video" | "practice";
  duration?: number;
  url?: string;
  order: number;
}

interface Stage {
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

interface Course {
  title: string;
  description: string;
  url: string;
  duration?: number;
  topicSlugs: string[];
  trackTitle?: string;
  trackOrder?: number;
  stages: Stage[];
}

// ─── Parsing Helpers ──────────────────────────────────────────────────────

/**
 * Convert a duration string like "6:20" to seconds (380).
 */
function parseDurationToSeconds(durationStr: string): number | undefined {
  // Match MM:SS format
  const timeMatch = durationStr.match(/^(\d+):(\d+)$/);
  if (timeMatch) {
    return parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
  }
  return undefined;
}

/**
 * Convert "XX min" or "XX hours" to seconds.
 */
function parseMinutesToSeconds(text: string): number | undefined {
  const minMatch = text.match(/(\d+)\s*min/i);
  if (minMatch) {
    return parseInt(minMatch[1]) * 60;
  }
  const hourMatch = text.match(/(\d+)\s*hour/i);
  if (hourMatch) {
    return parseInt(hourMatch[1]) * 3600;
  }
  return undefined;
}

/**
 * Parse hours duration from track text like "48 hours" -> seconds.
 */
function parseTrackDuration(text: string): number | undefined {
  const match = text.match(/(\d+)\s*hours?/i);
  if (match) {
    return parseInt(match[1]) * 3600;
  }
  return undefined;
}

/**
 * Resolve a topic name from the markdown to a slug.
 * The markdown uses topic names like "JavaScript", "React", "Design", etc.
 */
function topicNameToSlug(name: string): string | undefined {
  // Direct lookup
  if (TOPIC_NAME_TO_SLUG[name]) return TOPIC_NAME_TO_SLUG[name];
  // Fuzzy match (case insensitive)
  const lower = name.toLowerCase().trim();
  for (const [tName, slug] of Object.entries(TOPIC_NAME_TO_SLUG)) {
    if (tName.toLowerCase() === lower) return slug;
  }
  return undefined;
}

// ─── Parse Tracks from tracks-page.json ───────────────────────────────────

function parseTracks(): Track[] {
  const tracks: Track[] = [];

  const tracksJsonPath = path.join(CONTENT_DIR, "treehouse-tracks-page.json");
  if (!fs.existsSync(tracksJsonPath)) {
    console.error("Warning: treehouse-tracks-page.json not found");
    return tracks;
  }

  const data = JSON.parse(fs.readFileSync(tracksJsonPath, "utf-8"));
  const markdown: string = data.markdown || "";

  // Track entries look like:
  // **Track Title** \\\n\\\nDescription text...\\\n\\\nXX hours](URL)  - TopicName
  //
  // Real pattern from markdown:
  // **Front End Web Development** \\
  // \\
  // Learn to code websites using HTML, CSS, and JavaScript.\\
  // \\
  // 48 hours](https://teamtreehouse.com/tracks/front-end-web-development)  - JavaScript
  const trackPattern =
    /\*\*([^*]+)\*\*\s*\\\\\s*\\\\\s*([^\\]+?)(?:\\\\\s*\\\\\s*)?(\d+\s*hours?)\]\((https:\/\/teamtreehouse\.com\/tracks\/[^\)]+)\)\s*-\s*(\w[\w\s]*)/g;

  let match;
  while ((match = trackPattern.exec(markdown)) !== null) {
    const title = match[1].trim();
    let description = match[2].trim();
    const durationText = match[3];
    const url = match[4];
    const topicName = match[5].trim();

    // Clean up description (remove trailing backslashes and dots)
    description = description.replace(/\\+$/g, "").replace(/\.{3,}$/g, "").trim();

    const duration = parseTrackDuration(durationText);
    const slug = topicNameToSlug(topicName);
    const topicSlugs = slug ? [slug] : [];

    // Avoid duplicates
    if (!tracks.find((t) => t.title === title)) {
      tracks.push({
        title,
        description,
        url,
        duration,
        topicSlugs,
      });
    }
  }

  // Also try the alternate markdown-only file
  const tracksMdPath = path.join(CONTENT_DIR, "treehouse-tracks.md");
  if (fs.existsSync(tracksMdPath)) {
    const mdContent = fs.readFileSync(tracksMdPath, "utf-8");

    let mdMatch;
    const mdPattern =
      /\*\*([^*]+)\*\*\s*\\\\\s*\\\\\s*([^\\]+?)(?:\\\\\s*\\\\\s*)?(\d+\s*hours?)\]\((https:\/\/teamtreehouse\.com\/tracks\/[^\)]+)\)\s*-\s*(\w[\w\s]*)/g;

    while ((mdMatch = mdPattern.exec(mdContent)) !== null) {
      const title = mdMatch[1].trim();
      let description = mdMatch[2].trim();
      const durationText = mdMatch[3];
      const url = mdMatch[4];
      const topicName = mdMatch[5].trim();

      description = description.replace(/\\+$/g, "").replace(/\.{3,}$/g, "").trim();

      const duration = parseTrackDuration(durationText);
      const slug = topicNameToSlug(topicName);
      const topicSlugs = slug ? [slug] : [];

      if (!tracks.find((t) => t.title === title)) {
        tracks.push({
          title,
          description,
          url,
          duration,
          topicSlugs,
        });
      }
    }
  }

  return tracks;
}

// ─── Parse Courses from Topic Listing Pages ───────────────────────────────

function parseCoursesFromTopicFile(
  filename: string,
  topicSlug: string
): Course[] {
  const courses: Course[] = [];
  const filePath = path.join(CONTENT_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.error(`Warning: ${filename} not found`);
    return courses;
  }

  const content = fs.readFileSync(filePath, "utf-8");

  // Course entries in the topic listing pages look like:
  // **Course Title** \\
  // \\
  // Description text...](https://teamtreehouse.com/library/course-slug)  - TopicTag
  //
  //   - Difficulty
  //
  //   - XX min
  //
  // Pattern to extract course info from topic listing pages:
  const coursePattern =
    /\*\*([^*]+)\*\*\s*\\\\\s*\\\\\s*([\s\S]*?)\]\((https:\/\/teamtreehouse\.com\/library\/[^\)]+)\)\s*-\s*(\w[\w\s&]*?)(?:\n\s*-\s*(Novice|Beginner|Intermediate|Advanced)\s*\n\s*-\s*(\d+)\s*min)?/g;

  let match;
  while ((match = coursePattern.exec(content)) !== null) {
    const title = match[1].trim();
    let description = match[2].trim();
    const url = match[3];
    const listedTopic = match[4]?.trim();
    const durationMin = match[6] ? parseInt(match[6]) : undefined;

    // Clean up description
    description = description
      .replace(/\\\\/g, "")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Build topic slugs - use the file's topic and the listed topic
    const topicSlugs: string[] = [topicSlug];
    if (listedTopic) {
      const listedSlug = topicNameToSlug(listedTopic);
      if (listedSlug && listedSlug !== topicSlug) {
        topicSlugs.push(listedSlug);
      }
    }

    // Convert duration from minutes to seconds
    const duration = durationMin ? durationMin * 60 : undefined;

    // These are listing pages, no stage/lesson info available
    // We create a single default stage
    if (!courses.find((c) => c.url === url)) {
      courses.push({
        title,
        description: description || `${title} course.`,
        url,
        duration,
        topicSlugs,
        stages: [],
      });
    }
  }

  return courses;
}

// ─── Parse Sample Course with Stage/Lesson Detail ─────────────────────────

function parseSampleCourse(): Course | null {
  const filePath = path.join(CONTENT_DIR, "treehouse-sample-course.md");
  if (!fs.existsSync(filePath)) {
    console.error("Warning: treehouse-sample-course.md not found");
    return null;
  }

  const content = fs.readFileSync(filePath, "utf-8");

  // Extract course title: # JavaScript Basics
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (!titleMatch) return null;
  const courseTitle = titleMatch[1].trim();

  // Extract duration and type: ## 234-minute JavaScript Course
  const durationLineMatch = content.match(
    /^##\s+(\d+)-minute\s+(\w[\w\s]*?)\s+Course$/m
  );
  const courseDurationMin = durationLineMatch
    ? parseInt(durationLineMatch[1])
    : undefined;
  const courseTopicName = durationLineMatch
    ? durationLineMatch[2].trim()
    : "JavaScript";

  // Extract description from ### About this Course section
  const aboutMatch = content.match(
    /### About this Course\s*\n\s*\n([\s\S]*?)(?=\n####|\n## )/
  );
  const description = aboutMatch
    ? aboutMatch[1].trim().split("\n")[0].trim()
    : `${courseTitle} course.`;

  // Extract course URL from "Start Course" link
  const startMatch = content.match(
    /\[Start Course\]\((https:\/\/teamtreehouse\.com\/library\/[^\)]+)\)/
  );
  // Use the base course URL
  const topicSlug = topicNameToSlug(courseTopicName) || "javascript";

  // Build URL from slug
  const courseSlug = courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const courseUrl = `https://teamtreehouse.com/library/${courseSlug}`;

  // Parse stages by splitting on ## headings
  const stages: Stage[] = [];

  // Split content into sections by ## headings
  // We need to find all ## headings that are stage titles (not "234-minute..." or "About this Course")
  const lines = content.split("\n");
  const stageSections: { title: string; body: string }[] = [];
  let currentTitle = "";
  let currentBody = "";
  let inStage = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h2Match = line.match(/^## (.+)$/);

    if (h2Match) {
      // Save previous stage if we were in one
      if (inStage && currentTitle) {
        stageSections.push({ title: currentTitle, body: currentBody });
      }

      const heading = h2Match[1].trim();

      // Skip non-stage headings
      if (
        heading.match(/^\d+-minute/) ||
        heading === "About this Course" ||
        heading === "Topics"
      ) {
        inStage = false;
        currentTitle = "";
        currentBody = "";
        continue;
      }

      inStage = true;
      currentTitle = heading;
      currentBody = "";
    } else if (inStage) {
      currentBody += line + "\n";
    }
  }
  // Don't forget the last stage
  if (inStage && currentTitle) {
    stageSections.push({ title: currentTitle, body: currentBody });
  }

  let stageOrder = 0;
  for (const section of stageSections) {
    // Extract description (text before "Chevron")
    const chevronIdx = section.body.indexOf("Chevron");
    let stageDescription = "";
    if (chevronIdx > 0) {
      stageDescription = section.body.substring(0, chevronIdx).trim();
    }

    const lessons: Lesson[] = [];
    let lessonOrder = 0;

    // Parse lessons within this stage body
    // Patterns found in actual markdown:
    //   - [**Lesson Title** \
    //   6:20](url)                          <- video with duration
    //   - [**Lesson Title** \
    //   5 questions](url)                   <- quiz
    //   - [**Lesson Title** \
    //   4 objectives](url)                  <- code challenge
    //   - [instruction **Lesson Title**](url)  <- instruction

    // Pattern for video/quiz/challenge (two-line format):
    // In the raw file, lesson lines look like:
    //   - [**JavaScript Everywhere** \\
    //   6:20](url)
    // The \\\\ is two literal backslash chars in the file.
    const twoLinePattern =
      /- \[\*\*([^*]+)\*\*\s*\\{1,2}\s*\n\s*(\d+:\d+|\d+\s+(?:questions?|objectives?))\]\((https?:\/\/[^\)]+)\)/g;

    let lessonMatch;
    while ((lessonMatch = twoLinePattern.exec(section.body)) !== null) {
      const lessonTitle = lessonMatch[1].trim();
      const durationOrMeta = lessonMatch[2].trim();
      const lessonUrl = lessonMatch[3];

      let type: "video" | "practice";
      let duration: number | undefined;

      if (durationOrMeta.match(/^\d+:\d+$/)) {
        type = "video";
        duration = parseDurationToSeconds(durationOrMeta);
      } else if (durationOrMeta.match(/question/i)) {
        type = "practice";
      } else if (durationOrMeta.match(/objective/i)) {
        type = "practice";
      } else {
        type = "video";
      }

      lessons.push({
        title: lessonTitle,
        type,
        duration,
        url: lessonUrl,
        order: lessonOrder++,
      });
    }

    // Pattern for instruction (single-line format):
    const instructionPattern =
      /- \[instruction \*\*([^*]+)\*\*\]\((https?:\/\/[^\)]+)\)/g;

    while ((lessonMatch = instructionPattern.exec(section.body)) !== null) {
      const lessonTitle = lessonMatch[1].trim();
      const lessonUrl = lessonMatch[2];

      lessons.push({
        title: lessonTitle,
        type: "video", // instruction -> treat as video/reading
        duration: undefined,
        url: lessonUrl,
        order: lessonOrder++,
      });
    }

    stages.push({
      title: section.title,
      description: stageDescription || undefined,
      order: stageOrder++,
      lessons,
    });
  }

  const topicSlugs = [topicSlug];

  return {
    title: courseTitle,
    description,
    url: courseUrl,
    duration: courseDurationMin ? courseDurationMin * 60 : undefined,
    topicSlugs,
    stages,
  };
}

// ─── Parse All Topic Descriptions ─────────────────────────────────────────

function parseTopicDescriptions(): Record<string, string> {
  const descriptions: Record<string, string> = {};

  for (const [filename, { slug }] of Object.entries(TOPIC_FILES)) {
    const filePath = path.join(CONTENT_DIR, filename);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, "utf-8");

    // The description is the paragraph right after the H1 heading
    // # JavaScript Courses\n\nJavaScript is a programming language...
    // or # CSS Courses for Beginners\n\nCascading Style Sheets...
    const descMatch = content.match(
      /^# .+?\n\n([A-Z][^\n]+)/m
    );
    if (descMatch) {
      descriptions[slug] = descMatch[1].trim();
    }
  }

  return descriptions;
}

// ─── Main ─────────────────────────────────────────────────────────────────

function main() {
  // 1. Build topics list
  const topicDescriptions = parseTopicDescriptions();
  const topics: Topic[] = [];

  for (const { name, slug } of Object.values(TOPIC_FILES)) {
    const domain = TOPIC_DOMAIN_MAP[name] || "other";
    topics.push({
      name,
      slug,
      domain,
      description: topicDescriptions[slug],
    });
  }

  // 2. Parse tracks
  const tracks = parseTracks();

  // 3. Parse courses from each topic listing file
  const allCourses: Course[] = [];
  const courseUrlSet = new Set<string>();

  // First, add the sample course with full stage/lesson detail
  const sampleCourse = parseSampleCourse();
  if (sampleCourse) {
    allCourses.push(sampleCourse);
    courseUrlSet.add(sampleCourse.url);
  }

  // Then parse courses from each topic listing page
  for (const [filename, { slug }] of Object.entries(TOPIC_FILES)) {
    const courses = parseCoursesFromTopicFile(filename, slug);
    for (const course of courses) {
      if (!courseUrlSet.has(course.url)) {
        courseUrlSet.add(course.url);
        allCourses.push(course);
      }
    }
  }

  // 4. For courses without stages, create a default stage
  for (const course of allCourses) {
    if (course.stages.length === 0) {
      course.stages.push({
        title: "Course Content",
        description: `Main content for ${course.title}.`,
        order: 0,
        lessons: [
          {
            title: `${course.title} - Introduction`,
            type: "video",
            duration: course.duration
              ? Math.round(course.duration * 0.3)
              : undefined,
            url: course.url,
            order: 0,
          },
          {
            title: `${course.title} - Core Material`,
            type: "video",
            duration: course.duration
              ? Math.round(course.duration * 0.5)
              : undefined,
            url: course.url,
            order: 1,
          },
          {
            title: `${course.title} - Practice`,
            type: "practice",
            duration: course.duration
              ? Math.round(course.duration * 0.2)
              : undefined,
            url: course.url,
            order: 2,
          },
        ],
      });
    }
  }

  // 5. Try to link courses to tracks by matching track topic with course topic
  // This is a best-effort mapping since we don't have explicit track->course relationships
  // from the topic listing pages. The sample track page shows the actual composition.
  linkCoursesToTracks(allCourses, tracks);

  // 6. Output JSON
  const output = {
    topics,
    tracks,
    courses: allCourses,
  };

  console.log(JSON.stringify(output, null, 2));

  // Summary to stderr
  console.error(`\nParsed content summary:`);
  console.error(`  Topics:  ${topics.length}`);
  console.error(`  Tracks:  ${tracks.length}`);
  console.error(`  Courses: ${allCourses.length}`);
  console.error(
    `  Courses with detailed stages: ${allCourses.filter((c) => c.stages.length > 1 || (c.stages[0] && c.stages[0].title !== "Course Content")).length}`
  );
  console.error(
    `  Total lessons: ${allCourses.reduce((sum, c) => sum + c.stages.reduce((s, st) => s + st.lessons.length, 0), 0)}`
  );
}

// ─── Link Courses to Tracks ───────────────────────────────────────────────

function linkCoursesToTracks(courses: Course[], tracks: Track[]) {
  // Parse the sample track to get actual track->course mappings
  const sampleTrackPath = path.join(CONTENT_DIR, "treehouse-sample-track.md");
  if (!fs.existsSync(sampleTrackPath)) return;

  const content = fs.readFileSync(sampleTrackPath, "utf-8");

  // Extract track title: # Front End Web Development
  const titleMatch = content.match(/^# (.+)$/m);
  if (!titleMatch) return;
  const trackTitle = titleMatch[1].trim();

  // Find matching track
  const track = tracks.find((t) => t.title === trackTitle);
  if (!track) return;

  // Parse course entries from the track page
  // Pattern: **Course**  **Course Title**
  // These appear as:
  // **Course**  **Introduction to HTML and CSS**\n\n...
  // Checkmark](https://teamtreehouse.com/library/course-slug)
  const trackCoursePattern =
    /\*\*(?:Course|Workshop)\*\*\s+\*\*([^*]+)\*\*[\s\S]*?Checkmark\]\((https:\/\/teamtreehouse\.com\/library\/[^\)]+)\)/g;

  let order = 0;
  let match;
  while ((match = trackCoursePattern.exec(content)) !== null) {
    const courseTitle = match[1].trim();
    const courseUrl = match[2];

    // Find matching course and link it to this track
    const course = courses.find(
      (c) => c.url === courseUrl || c.title === courseTitle
    );
    if (course && !course.trackTitle) {
      course.trackTitle = trackTitle;
      course.trackOrder = order++;
    }
  }
}

main();
