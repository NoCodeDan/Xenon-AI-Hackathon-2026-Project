"use client";

import React, { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Upload,
  Settings2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileJson,
  Info,
  User,
  Mail,
  Shield,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserRole = "admin" | "editor" | "viewer";

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Full access to all features" },
  { value: "editor", label: "Editor", description: "Can edit content and manage requests" },
  { value: "viewer", label: "Viewer", description: "Read-only access" },
];

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-800 border-red-200",
  editor: "bg-emerald-100 text-emerald-800 border-emerald-200",
  viewer: "bg-gray-100 text-gray-800 border-gray-200",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Tab 1: User Management
// ---------------------------------------------------------------------------

function UserManagementTab() {
  const users = useQuery(api.users.getAll);
  const updateRole = useMutation(api.users.updateRole);
  const [updatingUserId, setUpdatingUserId] = useState<Id<"users"> | null>(null);

  const handleRoleChange = useCallback(
    async (userId: Id<"users">, role: UserRole) => {
      setUpdatingUserId(userId);
      try {
        await updateRole({ userId, role });
        toast.success("User role updated");
      } catch {
        toast.error("Failed to update user role");
      } finally {
        setUpdatingUserId(null);
      }
    },
    [updateRole]
  );

  if (users === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage team members and their roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-28" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage team members and their roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Users className="size-10 opacity-40" />
            <p className="text-sm font-medium">No users found</p>
            <p className="text-xs">Users will appear here once they sign in.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          Manage team members and their roles. {users.length} user
          {users.length !== 1 ? "s" : ""} total.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        {user.avatarUrl && (
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                        )}
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={ROLE_COLORS[user.role as UserRole] ?? ""}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(v) =>
                        handleRoleChange(user._id, v as UserRole)
                      }
                      disabled={updatingUserId === user._id}
                    >
                      <SelectTrigger className="w-32">
                        {updatingUserId === user._id ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="size-3 animate-spin" />
                            <span>Saving...</span>
                          </div>
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div>
                              <div className="font-medium">{opt.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {opt.description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Import Tool
// ---------------------------------------------------------------------------

interface ImportPreview {
  items: {
    title: string;
    type: string;
    description?: string;
    topicIds: string[];
    url?: string;
    duration?: number;
    publishedAt?: number;
  }[];
  counts: Record<string, number>;
  total: number;
}

function ImportToolTab() {
  const bulkImport = useMutation(api.content.bulkImport);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) {
        setFile(null);
        setPreview(null);
        setParseError(null);
        return;
      }

      setFile(selectedFile);
      setParseError(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const raw = event.target?.result as string;
          const parsed = JSON.parse(raw);

          // Expect an array of items, or an object with an "items" key
          const items: any[] = Array.isArray(parsed)
            ? parsed
            : parsed.items ?? parsed.data ?? [];

          if (!Array.isArray(items) || items.length === 0) {
            setParseError(
              "JSON must contain an array of content items, or an object with an 'items' or 'data' key."
            );
            setPreview(null);
            return;
          }

          // Validate required fields
          const validTypes = ["track", "course", "stage", "video", "practice"];
          const validItems = items.filter(
            (item) =>
              typeof item.title === "string" &&
              validTypes.includes(item.type)
          );

          if (validItems.length === 0) {
            setParseError(
              "No valid items found. Each item must have a 'title' (string) and 'type' (track/course/stage/video/practice)."
            );
            setPreview(null);
            return;
          }

          // Count by type
          const counts: Record<string, number> = {};
          for (const item of validItems) {
            counts[item.type] = (counts[item.type] ?? 0) + 1;
          }

          setPreview({
            items: validItems,
            counts,
            total: validItems.length,
          });
        } catch {
          setParseError("Invalid JSON file. Please check the file format.");
          setPreview(null);
        }
      };
      reader.readAsText(selectedFile);
    },
    []
  );

  const handleImport = useCallback(async () => {
    if (!preview) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Chunk into batches of 50 to avoid hitting Convex limits
      const BATCH_SIZE = 50;
      const totalBatches = Math.ceil(preview.items.length / BATCH_SIZE);
      let importedCount = 0;

      for (let i = 0; i < totalBatches; i++) {
        const batch = preview.items.slice(
          i * BATCH_SIZE,
          (i + 1) * BATCH_SIZE
        );

        await bulkImport({
          items: batch.map((item) => ({
            title: item.title,
            type: item.type as "track" | "course" | "stage" | "video" | "practice" | "workshop" | "bonus",
            description: item.description,
            topicIds: (item.topicIds ?? []) as Id<"topics">[],
            url: item.url,
            duration: item.duration,
            publishedAt: item.publishedAt,
          })),
        });

        importedCount += batch.length;
        setImportProgress(Math.round((importedCount / preview.total) * 100));
      }

      toast.success(`Successfully imported ${preview.total} content items`);
      setFile(null);
      setPreview(null);
      setImportProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      toast.error(error?.message ?? "Import failed. Please check your data.");
    } finally {
      setIsImporting(false);
    }
  }, [preview, bulkImport]);

  const handleReset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setParseError(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div className="space-y-6">
    <AutoTagSection />
    <Card>
      <CardHeader>
        <CardTitle>Import Content</CardTitle>
        <CardDescription>
          Upload a JSON file to bulk import content items into the library.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File upload */}
        <div className="space-y-2">
          <Label htmlFor="import-file">JSON File</Label>
          <div className="flex items-center gap-3">
            <Input
              id="import-file"
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="flex-1"
            />
            {file && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Clear
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Expected format: an array of objects with title, type, description,
            topicIds, url, duration, and publishedAt fields.
          </p>
        </div>

        {/* Parse error */}
        {parseError && (
          <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{parseError}</p>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <FileJson className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-emerald-800">
                  Ready to import {preview.total} item
                  {preview.total !== 1 ? "s" : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(preview.counts).map(([type, count]) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {count} {type}
                      {count !== 1 ? "s" : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Sample rows */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.items.slice(0, 5).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="max-w-[200px] truncate font-medium">
                        {item.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground">
                        {item.description ?? "--"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {preview.items.length > 5 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-sm text-muted-foreground"
                      >
                        ...and {preview.items.length - 5} more item
                        {preview.items.length - 5 !== 1 ? "s" : ""}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Progress bar */}
            {isImporting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Importing...</span>
                  <span className="font-medium">{importProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Import button */}
            <div className="flex justify-end">
              <Button
                onClick={handleImport}
                disabled={isImporting}
              >
                {isImporting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 size-4" />
                )}
                {isImporting
                  ? `Importing... ${importProgress}%`
                  : `Import ${preview.total} Items`}
              </Button>
            </div>
          </div>
        )}

        {/* Empty state when no file selected */}
        {!file && !parseError && (
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed py-12 text-muted-foreground">
            <Upload className="size-10 opacity-40" />
            <p className="text-sm font-medium">No file selected</p>
            <p className="text-xs">
              Choose a JSON file to preview and import content.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auto-Tag Content Section
// ---------------------------------------------------------------------------

function AutoTagSection() {
  const autoTag = useMutation(api.autoTagContent.autoTagAll);
  const stats = useQuery(api.content.getContentStats);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    tagged: number;
    skipped: number;
    alreadyTagged: number;
    total: number;
    slugCounts: Record<string, number>;
  } | null>(null);

  const untaggedCount = stats
    ? (stats.categoryCounts["other"] ?? 0)
    : undefined;

  const handleAutoTag = useCallback(async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const res = await autoTag({ overwriteExisting: false });
      setResult(res);
      toast.success(`Auto-tagged ${res.tagged} content items`);
    } catch (error: any) {
      toast.error(error?.message ?? "Auto-tagging failed");
    } finally {
      setIsRunning(false);
    }
  }, [autoTag]);

  const handleRetagAll = useCallback(async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const res = await autoTag({ overwriteExisting: true });
      setResult(res);
      toast.success(`Re-tagged ${res.tagged} content items`);
    } catch (error: any) {
      toast.error(error?.message ?? "Auto-tagging failed");
    } finally {
      setIsRunning(false);
    }
  }, [autoTag]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto-Tag Content by Topic</CardTitle>
        <CardDescription>
          Automatically assign topics to content items using keyword matching on titles, descriptions, and URLs.
          Items without a topic are categorized as &quot;other&quot; and won&apos;t appear in topic filters.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {untaggedCount !== undefined && untaggedCount > 0 && (
          <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p className="text-sm text-amber-800">
              <strong>{untaggedCount.toLocaleString()}</strong> content item{untaggedCount !== 1 && "s"} currently have no topic assigned.
            </p>
          </div>
        )}

        {untaggedCount === 0 && (
          <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <p className="text-sm text-emerald-800">
              All content items have a topic assigned.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleAutoTag}
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Settings2 className="mr-2 size-4" />
            )}
            {isRunning ? "Tagging..." : "Auto-Tag Untagged Items"}
          </Button>
          <Button
            variant="outline"
            onClick={handleRetagAll}
            disabled={isRunning}
          >
            Re-Tag All Items
          </Button>
        </div>

        {result && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              <div className="text-sm text-emerald-800">
                <p>
                  <strong>{result.tagged.toLocaleString()}</strong> items tagged,{" "}
                  <strong>{result.alreadyTagged.toLocaleString()}</strong> already had topics,{" "}
                  <strong>{result.skipped.toLocaleString()}</strong> could not be matched.
                </p>
              </div>
            </div>

            {Object.keys(result.slugCounts).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.slugCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([slug, count]) => (
                    <Badge key={slug} variant="secondary" className="text-xs">
                      {slug}: {count}
                    </Badge>
                  ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: Grading Config
// ---------------------------------------------------------------------------

function GradingConfigTab() {
  return (
    <div className="space-y-6">
      {/* Weights */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Weights</CardTitle>
          <CardDescription>
            How each factor contributes to the overall freshness score.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <WeightRow label="Recency" weight={50} color="bg-emerald-600" />
            <WeightRow label="Alignment" weight={35} color="bg-emerald-400" />
            <WeightRow label="Demand" weight={15} color="bg-emerald-300" />
          </div>
        </CardContent>
      </Card>

      {/* Grade Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Grade Thresholds</CardTitle>
          <CardDescription>
            Score ranges that map to letter grades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>Score Range</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <GradeThresholdRow
                  grade="A"
                  range="85 - 100"
                  description="Excellent - Content is fresh and well-aligned"
                  color="bg-emerald-100 text-emerald-800"
                />
                <GradeThresholdRow
                  grade="B"
                  range="70 - 84"
                  description="Good - Minor updates may be needed"
                  color="bg-emerald-100/60 text-emerald-700"
                />
                <GradeThresholdRow
                  grade="C"
                  range="55 - 69"
                  description="Fair - Content is becoming outdated"
                  color="bg-yellow-100 text-yellow-800"
                />
                <GradeThresholdRow
                  grade="D"
                  range="40 - 54"
                  description="Poor - Significant updates required"
                  color="bg-orange-100 text-orange-800"
                />
                <GradeThresholdRow
                  grade="F"
                  range="0 - 39"
                  description="Failing - Content is severely outdated"
                  color="bg-red-100 text-red-800"
                />
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Batch settings */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Grading</CardTitle>
          <CardDescription>
            Configuration for automated grading runs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Batch Size
              </p>
              <p className="mt-1 text-2xl font-bold">10</p>
              <p className="text-xs text-muted-foreground">
                items processed per run
              </p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Schedule
              </p>
              <p className="mt-1 text-2xl font-bold">Manual</p>
              <p className="text-xs text-muted-foreground">
                triggered from the Grading page
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coming soon notice */}
      <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-emerald-500" />
        <div>
          <p className="text-sm font-medium text-emerald-800">
            Configuration editing coming soon
          </p>
          <p className="text-xs text-emerald-600">
            These settings are currently read-only. Editable configuration will
            be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}

function WeightRow({
  label,
  weight,
  color,
}: {
  label: string;
  weight: number;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">{weight}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${weight}%` }}
        />
      </div>
    </div>
  );
}

function GradeThresholdRow({
  grade,
  range,
  description,
  color,
}: {
  grade: string;
  range: string;
  description: string;
  color: string;
}) {
  return (
    <TableRow>
      <TableCell>
        <Badge variant="outline" className={`font-bold ${color}`}>
          {grade}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-sm tabular-nums">{range}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {description}
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Tab 4: Account Profile
// ---------------------------------------------------------------------------

function AccountProfileTab() {
  const { user, isLoaded } = useUser();
  const currentUser = useQuery(api.users.getCurrent);

  if (!isLoaded || currentUser === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>Your account details and preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load profile. Please sign in again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const role = (currentUser?.role as UserRole) ?? "viewer";
  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Profile overview card */}
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>Your account details and preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <Avatar className="size-20">
              {user.imageUrl && (
                <AvatarImage src={user.imageUrl} alt={user.fullName ?? "Profile"} />
              )}
              <AvatarFallback className="text-lg">
                {getInitials(user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "U")}
              </AvatarFallback>
            </Avatar>

            {/* Details */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {user.fullName ?? "Unnamed User"}
                </h3>
                {user.username && (
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="size-4 text-muted-foreground" />
                  <span>{user.primaryEmailAddress?.emailAddress ?? "No email"}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Shield className="size-4 text-muted-foreground" />
                  <span>Role:</span>
                  <Badge
                    variant="outline"
                    className={ROLE_COLORS[role] ?? ""}
                  >
                    {role}
                  </Badge>
                </div>

                {joinedDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="size-4 text-muted-foreground" />
                    <span>Joined {joinedDate}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manage account hint */}
      <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-emerald-500" />
        <div>
          <p className="text-sm font-medium text-emerald-800">
            Manage your account
          </p>
          <p className="text-xs text-emerald-600">
            To update your name, email, password, or profile picture, click your
            avatar in the top-right corner and select &quot;Manage account&quot;.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Settings Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage users, import content, and configure grading parameters.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="size-4" />
            Account Profile
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="size-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="size-4" />
            Import Tool
          </TabsTrigger>
          <TabsTrigger value="grading" className="gap-2">
            <Settings2 className="size-4" />
            Grading Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <AccountProfileTab />
        </TabsContent>

        <TabsContent value="users">
          <UserManagementTab />
        </TabsContent>

        <TabsContent value="import">
          <ImportToolTab />
        </TabsContent>

        <TabsContent value="grading">
          <GradingConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
