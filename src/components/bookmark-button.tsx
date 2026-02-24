"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Priority = "low" | "medium" | "high";

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string; activeClass: string }[] = [
  { value: "high", label: "High", color: "text-red-500", activeClass: "border-red-500 bg-red-50" },
  { value: "medium", label: "Medium", color: "text-amber-500", activeClass: "border-amber-500 bg-amber-50" },
  { value: "low", label: "Low", color: "text-blue-500", activeClass: "border-blue-500 bg-blue-50" },
];

const PRIORITY_ICON_COLOR: Record<Priority, string> = {
  high: "text-red-500",
  medium: "text-amber-500",
  low: "text-blue-500",
};

export function BookmarkButton({
  contentId,
  size = "default",
}: {
  contentId: Id<"contentItems">;
  size?: "sm" | "default";
}) {
  const bookmark = useQuery(api.bookmarks.getBookmarkForContent, { contentId });
  const toggleBookmark = useMutation(api.bookmarks.toggleBookmark);
  const updatePriority = useMutation(api.bookmarks.updatePriority);

  const [selectedPriority, setSelectedPriority] = useState<Priority>("medium");
  const [open, setOpen] = useState(false);

  const isBookmarked = bookmark !== null && bookmark !== undefined;

  const handleToggle = async () => {
    if (isBookmarked) {
      // Remove bookmark
      await toggleBookmark({ contentId, priority: bookmark.priority });
      setOpen(false);
    } else {
      // Add bookmark with selected priority
      await toggleBookmark({ contentId, priority: selectedPriority });
      setOpen(false);
    }
  };

  const handlePriorityChange = async (priority: Priority) => {
    if (isBookmarked) {
      await updatePriority({ contentId, priority });
    }
    setSelectedPriority(priority);
  };

  const iconSize = size === "sm" ? "size-3.5" : "size-4";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "shrink-0",
            size === "sm" ? "size-7" : "size-8"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {isBookmarked ? (
            <BookmarkCheck className={cn(iconSize, PRIORITY_ICON_COLOR[bookmark.priority])} />
          ) : (
            <Bookmark className={cn(iconSize, "text-muted-foreground")} />
          )}
          <span className="sr-only">
            {isBookmarked ? "Manage bookmark" : "Bookmark"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-3"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <p className="text-sm font-medium">
            {isBookmarked ? "Bookmark Priority" : "Set Priority"}
          </p>

          <div className="flex flex-col gap-1.5">
            {PRIORITY_OPTIONS.map((opt) => {
              const isActive = isBookmarked
                ? bookmark.priority === opt.value
                : selectedPriority === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handlePriorityChange(opt.value)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? opt.activeClass
                      : "border-transparent hover:bg-accent"
                  )}
                >
                  <span className={cn("size-2 rounded-full", {
                    "bg-red-500": opt.value === "high",
                    "bg-amber-500": opt.value === "medium",
                    "bg-blue-500": opt.value === "low",
                  })} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {isBookmarked ? (
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleToggle}
            >
              Remove Bookmark
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full"
              onClick={handleToggle}
            >
              Bookmark
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
