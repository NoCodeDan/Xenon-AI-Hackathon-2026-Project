"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const gradeColors: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800 border-emerald-200",
  B: "bg-emerald-100/60 text-emerald-700 border-emerald-200",
  C: "bg-yellow-100 text-yellow-800 border-yellow-200",
  D: "bg-orange-100 text-orange-800 border-orange-200",
  F: "bg-red-100 text-red-800 border-red-200",
};

const sizeClasses = {
  sm: "text-xs px-1.5 py-0",
  default: "text-sm px-2.5 py-0.5",
  lg: "text-base px-3 py-1",
};

export function GradeBadge({
  grade,
  score,
  size = "default",
}: {
  grade: string;
  score?: number;
  size?: "sm" | "default" | "lg";
}) {
  const colorClass = gradeColors[grade] ?? "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold tabular-nums",
        colorClass,
        sizeClasses[size]
      )}
    >
      {grade}
      {score !== undefined && (
        <span className="ml-1 font-normal opacity-75">{score}</span>
      )}
    </Badge>
  );
}
