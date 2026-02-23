#!/usr/bin/env node
/**
 * Parse treehouse-master-list.md into JSON and import into Convex.
 *
 * Usage:
 *   node scripts/parseMasterList.mjs              # parse only, print JSON
 *   node scripts/parseMasterList.mjs --import     # parse + import via Convex
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MD_PATH = resolve(__dirname, "..", "treehouse-master-list.md");

// ─── Topic slug mapping ─────────────────────────────────────────────────────
// The master list uses display names like "Go Language", "No-Code", etc.
// We need to map these to the database slugs.
const TOPIC_NAME_TO_SLUG = {
  "AI": "ai",
  "APIs": "apis",
  "CSS": "css",
  "Coding for Kids": "coding-for-kids",
  "College Credit": "college-credit",
  "Computer Science": "computer-science",
  "Data Analysis": "data-analysis",
  "Databases": "databases",
  "Design": "design",
  "Development Tools": "development-tools",
  "Digital Literacy": "digital-literacy",
  "Game Development": "game-development",
  "Go Language": "go",
  "HTML": "html",
  "Java": "java",
  "JavaScript": "javascript",
  "Learning Resources": "learning-resources",
  "Machine Learning": "machine-learning",
  "No-Code": "nocode",
  "PHP": "php",
  "Professional Growth": "professional-growth",
  "Python": "python",
  "Quality Assurance": "quality-assurance",
  "React": "react",
  "Ruby": "ruby",
  "Security": "security",
  "Swift": "swift",
  "Vibe Coding": "vibe-coding",
};

function resolveTopicSlug(topicName) {
  const slug = TOPIC_NAME_TO_SLUG[topicName.trim()];
  if (!slug) {
    console.warn(`  ⚠ Unknown topic: "${topicName}"`);
    return topicName.toLowerCase().replace(/\s+/g, "-");
  }
  return slug;
}

// ─── Duration parsing ────────────────────────────────────────────────────────

function parseDuration(durStr) {
  if (!durStr || durStr.trim() === "—" || durStr.trim() === "-") return null;
  const s = durStr.trim();

  // "X hours" or "X hour"
  const hMatch = s.match(/^(\d+)\s*hours?$/i);
  if (hMatch) return parseInt(hMatch[1], 10) * 60;

  // "X min"
  const mMatch = s.match(/^(\d+)\s*min$/i);
  if (mMatch) return parseInt(mMatch[1], 10);

  // "X minutes"
  const mMatch2 = s.match(/^(\d+)\s*minutes?$/i);
  if (mMatch2) return parseInt(mMatch2[1], 10);

  console.warn(`  ⚠ Unparseable duration: "${s}"`);
  return null;
}

// ─── Skill level parsing ─────────────────────────────────────────────────────

function parseSkillLevel(level) {
  if (!level || level.trim() === "—" || level.trim() === "-") return null;
  const l = level.trim();
  if (l === "Beginner" || l === "Intermediate" || l === "Advanced") return l;
  console.warn(`  ⚠ Unknown skill level: "${l}"`);
  return null;
}

// ─── Parse tracks (heading-based format) ─────────────────────────────────────

function parseTracks(section) {
  const items = [];
  // Match: ### N. [Title](url)\n**Topic | Duration | Level**\nDescription
  const trackRegex = /###\s*\d+\.\s*\[([^\]]+)\]\(([^)]+)\)\s*\n\*\*([^|]+)\|([^|]+)\|([^*]+)\*\*\s*\n(.+?)(?=\n###|\n---|\n$)/gs;
  let match;
  while ((match = trackRegex.exec(section)) !== null) {
    const [, title, url, topic, duration, level, description] = match;
    items.push({
      title: title.trim(),
      url: url.trim(),
      type: "track",
      topicSlug: resolveTopicSlug(topic.trim()),
      estimatedMinutes: parseDuration(duration.trim()) ?? undefined,
      skillLevel: parseSkillLevel(level.trim()) ?? undefined,
      description: description.trim() || undefined,
    });
  }
  return items;
}

// ─── Parse table-based sections ──────────────────────────────────────────────

function parseTable(section, type, hasLevel = true) {
  const items = [];
  // Match table rows: | N | [Title](url) | Topic | Level | Duration |
  // or for bonus: | N | [Title](url) | Topic | Duration |
  const lines = section.split("\n");
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    // Skip header and separator rows
    if (line.includes("---") || line.includes("# |")) continue;

    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 3) continue;

    // First cell is the row number
    const numCell = cells[0];
    if (!/^\d+$/.test(numCell)) continue;

    // Extract title and URL from markdown link
    const linkMatch = cells[1].match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (!linkMatch) continue;

    const title = linkMatch[1].trim();
    const url = linkMatch[2].trim();
    const topicName = cells[2].trim();

    if (hasLevel) {
      // | # | Title | Topic | Level | Duration |
      const level = cells[3] ?? "";
      const duration = cells[4] ?? "";
      items.push({
        title,
        url,
        type,
        topicSlug: resolveTopicSlug(topicName),
        skillLevel: parseSkillLevel(level) ?? undefined,
        estimatedMinutes: parseDuration(duration) ?? undefined,
      });
    } else {
      // Bonus: | # | Title | Topic | Duration |
      const duration = cells[3] ?? "";
      items.push({
        title,
        url,
        type,
        topicSlug: resolveTopicSlug(topicName),
        estimatedMinutes: parseDuration(duration) ?? undefined,
      });
    }
  }
  return items;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const md = readFileSync(MD_PATH, "utf-8");

  // Split into sections by "## " headings
  // We only want the first occurrence of each section (file has duplicates after line 898)
  const firstTrackIdx = md.indexOf("## Tracks (49)");
  const firstCourseIdx = md.indexOf("## Courses (305)");
  const firstWorkshopIdx = md.indexOf("## Workshops (205)");
  const firstPracticeIdx = md.indexOf("## Practice Sessions (98)");
  const firstBonusIdx = md.indexOf("## Bonus / Live Series (22)");

  // Use next "## " heading (or end of file) to delimit each section
  function sectionUntilNext(start) {
    const after = md.substring(start);
    // Find next "## " heading after the first line
    const nextHeading = after.indexOf("\n## ", 5);
    return nextHeading > 0 ? after.substring(0, nextHeading) : after;
  }

  const trackSection = md.substring(firstTrackIdx, firstCourseIdx);
  const courseSection = md.substring(firstCourseIdx, firstWorkshopIdx);
  const workshopSection = md.substring(firstWorkshopIdx, firstPracticeIdx);
  const practiceSection = md.substring(firstPracticeIdx, firstBonusIdx);
  const bonusSection = sectionUntilNext(firstBonusIdx);

  const tracks = parseTracks(trackSection);
  const courses = parseTable(courseSection, "course");
  const workshops = parseTable(workshopSection, "workshop");
  const practices = parseTable(practiceSection, "practice");
  const bonus = parseTable(bonusSection, "bonus", false);

  const allItems = [...tracks, ...courses, ...workshops, ...practices, ...bonus];

  // Clean up undefined values for JSON serialization
  const cleaned = allItems.map((item) => {
    const obj = { ...item };
    if (obj.skillLevel === undefined) delete obj.skillLevel;
    if (obj.estimatedMinutes === undefined) delete obj.estimatedMinutes;
    if (obj.description === undefined) delete obj.description;
    return obj;
  });

  console.log(`Parsed: ${tracks.length} tracks, ${courses.length} courses, ${workshops.length} workshops, ${practices.length} practices, ${bonus.length} bonus`);
  console.log(`Total: ${cleaned.length} items`);

  // Count by topic
  const topicCounts = {};
  for (const item of cleaned) {
    topicCounts[item.topicSlug] = (topicCounts[item.topicSlug] || 0) + 1;
  }
  console.log("\nBy topic:");
  for (const [slug, count] of Object.entries(topicCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${slug}: ${count}`);
  }

  // Write to file for inspection / import
  const outPath = resolve(__dirname, "..", "scripts", "master-list-parsed.json");
  writeFileSync(outPath, JSON.stringify(cleaned, null, 2));
  console.log(`\nWritten to ${outPath}`);

  return cleaned;
}

main();
