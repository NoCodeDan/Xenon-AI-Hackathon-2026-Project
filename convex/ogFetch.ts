"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// ---------------------------------------------------------------------------
// Extract an attribute value from a single <meta ...> tag string
// ---------------------------------------------------------------------------

function getAttr(tag: string, name: string): string | null {
  // Match name="value" or name='value'
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i");
  const m = tag.match(re);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Parse OG tags from HTML by finding all <meta> tags
// ---------------------------------------------------------------------------

function parseOgTags(html: string): {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
} {
  const og: Record<string, string> = {};

  // Find every <meta ...> tag (handles multi-line, self-closing, etc.)
  const metaRegex = /<meta\s[^>]+>/gi;
  let m;
  while ((m = metaRegex.exec(html)) !== null) {
    const tag = m[0];
    const prop = getAttr(tag, "property") ?? getAttr(tag, "name");
    const content = getAttr(tag, "content");
    if (prop && content) {
      const key = prop.toLowerCase();
      // Collect og:* and twitter:* (twitter cards are a good fallback)
      if (key.startsWith("og:") || key.startsWith("twitter:")) {
        // Prefer og: over twitter: — only set twitter: if og: not already set
        if (key.startsWith("og:")) {
          og[key] = content;
        } else if (!og[`og:${key.slice(8)}`]) {
          og[`og:${key.slice(8)}`] = content;
        }
      }
      // Also grab plain description
      if (key === "description" && !og["meta:description"]) {
        og["meta:description"] = content;
      }
    }
  }

  // Fallback: <title> tag
  let title = og["og:title"];
  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) title = titleMatch[1].trim();
  }

  // Decode common HTML entities
  const decode = (s?: string) =>
    s
      ?.replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'");

  return {
    title: decode(title) || undefined,
    description:
      decode(og["og:description"]) ||
      decode(og["meta:description"]) ||
      undefined,
    image: og["og:image"] || undefined,
    siteName: decode(og["og:site_name"]) || undefined,
  };
}

// ---------------------------------------------------------------------------
// Action: fetch URL, parse OG tags, store in cache
// ---------------------------------------------------------------------------

export const fetchOg = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    try {
      // Use AbortController for broad compatibility
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(args.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        await ctx.runMutation(internal.og.store, {
          url: args.url,
          failed: true,
        });
        return;
      }

      // Read full body as text (OG tags are in <head>, always early)
      const html = await response.text();

      const og = parseOgTags(html);

      // Nothing useful extracted → mark as failed
      if (!og.title && !og.description && !og.image) {
        await ctx.runMutation(internal.og.store, {
          url: args.url,
          failed: true,
        });
        return;
      }

      // Resolve relative image URLs to absolute
      let imageUrl = og.image;
      if (imageUrl && !imageUrl.startsWith("http")) {
        try {
          imageUrl = new URL(imageUrl, args.url).href;
        } catch {
          imageUrl = undefined;
        }
      }

      await ctx.runMutation(internal.og.store, {
        url: args.url,
        title: og.title,
        description: og.description,
        image: imageUrl,
        siteName: og.siteName,
        failed: false,
      });
    } catch (err) {
      console.error("OG fetch failed for", args.url, err);
      await ctx.runMutation(internal.og.store, {
        url: args.url,
        failed: true,
      });
    }
  },
});
