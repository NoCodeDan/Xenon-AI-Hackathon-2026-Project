"use client";

import { useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe } from "lucide-react";

// ---------------------------------------------------------------------------
// Extract URLs from message text
// ---------------------------------------------------------------------------

const URL_REGEX = /https?:\/\/[^\s)<>\]"']+/g;
const MARKDOWN_LINK_URL = /\[(?:[^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;

export function extractUrls(text: string): string[] {
  const urls = new Set<string>();

  // Extract URLs from markdown links [text](url)
  let mdMatch;
  while ((mdMatch = MARKDOWN_LINK_URL.exec(text)) !== null) {
    urls.add(mdMatch[1].replace(/[.,;:!?)]+$/, ""));
  }

  // Extract bare URLs
  const bareMatches = text.match(URL_REGEX);
  if (bareMatches) {
    for (const u of bareMatches) {
      urls.add(u.replace(/[.,;:!?)]+$/, ""));
    }
  }

  return [...urls];
}

// ---------------------------------------------------------------------------
// Single link preview card
// ---------------------------------------------------------------------------

function LinkPreviewCard({ url }: { url: string }) {
  const cached = useQuery(api.og.get, { url });
  const fetchOg = useAction(api.ogFetch.fetchOg);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // cached === undefined → still loading from DB
    // cached === null → not in cache, need to fetch
    if (cached === null && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchOg({ url }).catch(() => {});
    }
  }, [cached, url, fetchOg]);

  // Still loading from DB
  if (cached === undefined) {
    return <LinkPreviewSkeleton />;
  }

  // Not cached yet, fetch in progress
  if (cached === null) {
    return <LinkPreviewSkeleton />;
  }

  // Fetch failed, no useful data, or no image — only show cards with images
  if (cached.failed || !cached.image) {
    return null;
  }

  const domain = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-xl border border-emerald-200/60 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* OG Image */}
      {cached.image && (
        <div className="relative h-32 w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cached.image}
            alt={cached.title ?? ""}
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            loading="lazy"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              // Hide the entire image container (the parent div), not just the img
              if (img.parentElement) img.parentElement.style.display = "none";
            }}
          />
        </div>
      )}

      {/* Text content */}
      <div className="p-3 space-y-1">
        {cached.title && (
          <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors">
            {cached.title}
          </p>
        )}
        {cached.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {cached.description}
          </p>
        )}
        <div className="flex items-center gap-1.5 pt-0.5">
          <Globe className="size-3 text-muted-foreground/60" />
          <span className="text-[11px] text-muted-foreground/70">
            {cached.siteName ?? domain}
          </span>
        </div>
      </div>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function LinkPreviewSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-emerald-200/60 bg-white">
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LinkPreviews — renders OG cards for all URLs in a message
// ---------------------------------------------------------------------------

export function LinkPreviews({ text }: { text: string }) {
  const urls = extractUrls(text);
  if (urls.length === 0) return null;

  return (
    <div className="space-y-2 pl-1">
      {urls.slice(0, 3).map((url) => (
        <LinkPreviewCard key={url} url={url} />
      ))}
    </div>
  );
}
