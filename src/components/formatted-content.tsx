"use client";

import React, { Fragment } from "react";

// ---------------------------------------------------------------------------
// Preprocess: normalize markdown links that may span lines
// ---------------------------------------------------------------------------

function preprocess(text: string): string {
  // Collapse [text]\n(url) → [text](url)
  let out = text.replace(/\]\s*\n\s*\(/g, "](");
  // Collapse [text](url\n  continued) → [text](urlcontinued)
  out = out.replace(
    /(\[[^\]]+\]\(https?:\/\/[^\s)]*)\n\s*([^\s)]+\))/g,
    "$1$2"
  );
  return out;
}

// ---------------------------------------------------------------------------
// Pass 1: Split text on markdown links [text](url)
// Returns an array of segments: plain strings and link objects
// ---------------------------------------------------------------------------

type Segment =
  | { kind: "text"; value: string }
  | { kind: "link"; text: string; href: string; bold?: boolean; italic?: boolean };

function splitOnLinks(input: string): Segment[] {
  const segments: Segment[] = [];
  // Match: **[text](url)** | *[text](url)* | [text](url)
  const linkRe =
    /\*\*\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\*\*|\*\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = linkRe.exec(input)) !== null) {
    if (m.index > last) {
      segments.push({ kind: "text", value: input.slice(last, m.index) });
    }
    if (m[1] != null) {
      // **[text](url)** — bold link
      segments.push({ kind: "link", text: m[1], href: m[2], bold: true });
    } else if (m[3] != null) {
      // *[text](url)* — italic link
      segments.push({ kind: "link", text: m[3], href: m[4], italic: true });
    } else {
      // [text](url) — plain link
      segments.push({ kind: "link", text: m[5], href: m[6] });
    }
    last = m.index + m[0].length;
  }
  if (last < input.length) {
    segments.push({ kind: "text", value: input.slice(last) });
  }
  return segments;
}

// ---------------------------------------------------------------------------
// Pass 2: Within a plain-text segment, render **bold**, *italic*, `code`,
// and bare https:// URLs
// ---------------------------------------------------------------------------

function renderTextSegment(
  text: string,
  keyRef: { k: number }
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Bold, italic, inline code, bare URL — no link syntax here
  const re =
    /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|(https?:\/\/[^\s)<>\]"']+)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }

    if (m[1] != null) {
      parts.push(
        <strong key={keyRef.k++} className="font-semibold">
          {m[1]}
        </strong>
      );
    } else if (m[2] != null) {
      parts.push(
        <em key={keyRef.k++} className="italic">
          {m[2]}
        </em>
      );
    } else if (m[3] != null) {
      parts.push(
        <code
          key={keyRef.k++}
          className="rounded bg-emerald-100/50 px-1 py-0.5 text-xs font-mono text-emerald-800"
        >
          {m[3]}
        </code>
      );
    } else if (m[4] != null) {
      const url = m[4].replace(/[.,;:!?)]+$/, "");
      parts.push(
        <a
          key={keyRef.k++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800 hover:decoration-emerald-500 break-all"
        >
          {url}
        </a>
      );
      // Put back any trimmed trailing punctuation
      const diff = m[4].length - url.length;
      if (diff > 0) {
        last = m.index + m[0].length - diff;
        continue;
      }
    }

    last = m.index + m[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Combined inline renderer: links first, then formatting inside non-link parts
// ---------------------------------------------------------------------------

function renderInline(text: string): React.ReactNode[] {
  const segments = splitOnLinks(text);
  const parts: React.ReactNode[] = [];
  const keyRef = { k: 0 };

  for (const seg of segments) {
    if (seg.kind === "link") {
      parts.push(
        <a
          key={`ln-${keyRef.k++}`}
          href={seg.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800 hover:decoration-emerald-500 ${
            seg.bold ? "font-semibold" : "font-medium"
          } ${seg.italic ? "italic" : ""}`}
        >
          {seg.text}
        </a>
      );
    } else {
      parts.push(...renderTextSegment(seg.value, keyRef));
    }
  }

  return parts;
}

// ---------------------------------------------------------------------------
// Render a single line (headers, bullets, numbered items, plain text)
// ---------------------------------------------------------------------------

function renderLine(line: string, key: number): React.ReactNode {
  const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
  if (headerMatch) {
    const level = headerMatch[1].length;
    const content = headerMatch[2];
    if (level === 1) {
      return (
        <h3 key={key} className="text-sm font-bold mt-3 mb-1 first:mt-0">
          {renderInline(content)}
        </h3>
      );
    }
    if (level === 2) {
      return (
        <h4 key={key} className="text-sm font-bold mt-2.5 mb-0.5 first:mt-0">
          {renderInline(content)}
        </h4>
      );
    }
    return (
      <h5
        key={key}
        className="text-xs font-bold mt-2 mb-0.5 first:mt-0 uppercase tracking-wide text-emerald-700/70"
      >
        {renderInline(content)}
      </h5>
    );
  }

  const bulletMatch = line.match(/^[-*]\s+(.+)$/);
  if (bulletMatch) {
    return (
      <li
        key={key}
        className="ml-5 list-disc text-sm leading-relaxed marker:text-emerald-400"
      >
        {renderInline(bulletMatch[1])}
      </li>
    );
  }

  const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
  if (numberedMatch) {
    return (
      <li
        key={key}
        className="ml-5 list-decimal text-sm leading-relaxed marker:text-emerald-500 marker:font-semibold"
      >
        {renderInline(numberedMatch[2])}
      </li>
    );
  }

  return <Fragment key={key}>{renderInline(line)}</Fragment>;
}

// ---------------------------------------------------------------------------
// Full markdown-like content renderer for chat messages
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Structured section: a numbered heading with nested bullet children
// ---------------------------------------------------------------------------

type Section = {
  kind: "numbered";
  heading: string; // e.g. "**JavaScript Accordion**"
  number: number;
  bullets: string[]; // e.g. ["- Grade: C", "- Description: ..."]
};

/**
 * Detect if the lines contain a repeating pattern of:
 *   N. Heading
 *   - bullet
 *   - bullet
 *   (blank line)
 *   N+1. Heading
 *   ...
 * If so, return grouped sections. Otherwise return null so we fall back
 * to the original flat rendering.
 */
function tryGroupNumberedSections(lines: string[]): Section[] | null {
  const sections: Section[] = [];
  let i = 0;

  // Skip leading non-numbered lines (intro paragraph, etc.)
  while (i < lines.length && !/^\d+\.\s+/.test(lines[i].trim())) {
    i++;
  }

  // If we never found a numbered line, bail
  if (i >= lines.length) return null;

  let foundBullets = false;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Skip blank lines between sections
    if (!trimmed) {
      i++;
      continue;
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      const section: Section = {
        kind: "numbered",
        heading: numberedMatch[2],
        number: parseInt(numberedMatch[1], 10),
        bullets: [],
      };

      i++;
      // Collect trailing bullets
      while (i < lines.length) {
        const bt = lines[i].trim();
        if (!bt) {
          i++;
          break; // blank line ends this section's bullets
        }
        if (/^[-*]\s+/.test(bt)) {
          section.bullets.push(bt);
          foundBullets = true;
          i++;
        } else if (/^\d+\.\s+/.test(bt)) {
          break; // next numbered item (no blank line separator)
        } else {
          // Non-bullet, non-numbered line inside section — not our pattern
          break;
        }
      }

      sections.push(section);
    } else {
      // Non-numbered line after we started collecting sections — stop grouping
      break;
    }
  }

  // Only use grouped layout if we found at least 2 sections with bullets
  if (sections.length >= 2 && foundBullets) return sections;
  return null;
}

export function FormattedContent({ text }: { text: string }) {
  const preprocessed = preprocess(text);
  const lines = preprocessed.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  // Check if message has grouped numbered-section pattern
  const sections = tryGroupNumberedSections(lines);

  if (sections) {
    // Render intro lines (everything before first numbered item)
    let i = 0;
    while (i < lines.length && !/^\d+\.\s+/.test(lines[i].trim())) {
      const trimmed = lines[i].trim();
      if (trimmed) {
        const rendered = renderLine(trimmed, key++);
        if (/^#{1,3}\s+/.test(trimmed)) {
          elements.push(rendered);
        } else {
          elements.push(
            <p key={`p-${key++}`} className="text-sm leading-relaxed">
              {rendered}
            </p>
          );
        }
      }
      i++;
    }

    // Render grouped sections with visual hierarchy
    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];
      elements.push(
        <div key={`section-${key++}`} className="mt-3 first:mt-1">
          {/* Numbered heading */}
          <div className="flex items-baseline gap-1.5 text-sm font-semibold">
            <span className="shrink-0 text-emerald-600">{si + 1}.</span>
            <span>{renderInline(section.heading)}</span>
          </div>
          {/* Indented bullets */}
          {section.bullets.length > 0 && (
            <ul className="ml-6 mt-0.5 space-y-0.5">
              {section.bullets.map((bullet) => {
                const content = bullet.replace(/^[-*]\s+/, "");
                return (
                  <li
                    key={key++}
                    className="list-disc text-sm leading-relaxed marker:text-emerald-400"
                  >
                    {renderInline(content)}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      );
    }

    // Render trailing lines (after the last section)
    // Find where sections end in the original lines
    let afterIdx = 0;
    let sectionsFound = 0;
    while (afterIdx < lines.length && sectionsFound < sections.length) {
      const trimmed = lines[afterIdx].trim();
      if (/^\d+\.\s+/.test(trimmed)) sectionsFound++;
      afterIdx++;
      // Skip the bullets after each numbered item
      if (sectionsFound <= sections.length) {
        while (afterIdx < lines.length) {
          const bt = lines[afterIdx].trim();
          if (!bt || /^[-*]\s+/.test(bt)) {
            afterIdx++;
          } else {
            break;
          }
        }
      }
    }

    for (let j = afterIdx; j < lines.length; j++) {
      const trimmed = lines[j].trim();
      if (!trimmed) continue;
      const rendered = renderLine(trimmed, key++);
      if (/^#{1,3}\s+/.test(trimmed)) {
        elements.push(rendered);
      } else {
        elements.push(
          <p key={`p-${key++}`} className="text-sm leading-relaxed mt-2">
            {rendered}
          </p>
        );
      }
    }

    return <div className="space-y-1">{elements}</div>;
  }

  // --- Fallback: original flat rendering for messages without the pattern ---
  let currentList: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag key={`list-${key++}`} className="my-1 space-y-0.5">
          {currentList}
        </Tag>
      );
      currentList = [];
      listType = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    const isBullet = /^-\s+/.test(trimmed) || /^\*\s+/.test(trimmed);
    const isNumbered = /^\d+\.\s+/.test(trimmed);

    if (isBullet) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      currentList.push(renderLine(trimmed, key++));
    } else if (isNumbered) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      currentList.push(renderLine(trimmed, key++));
    } else {
      flushList();
      const rendered = renderLine(trimmed, key++);
      if (/^#{1,3}\s+/.test(trimmed)) {
        elements.push(rendered);
      } else {
        elements.push(
          <p key={`p-${key++}`} className="text-sm leading-relaxed">
            {rendered}
          </p>
        );
      }
    }
  }

  flushList();

  return <div className="space-y-1">{elements}</div>;
}
