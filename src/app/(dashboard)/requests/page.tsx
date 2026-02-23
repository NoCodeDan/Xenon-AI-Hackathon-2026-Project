"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ThumbsUp,
  Plus,
  MessageSquarePlus,
  Inbox,
  Clock,
  Rocket,
  CheckCircle2,
  Link as LinkIcon,
  Merge,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

type RequestStatus = "open" | "planned" | "in_progress" | "completed" | "declined";

const STATUS_TABS: { value: RequestStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
];

const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function RequestsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      {/* Tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>
      {/* Table */}
      <div className="rounded-md border">
        <div className="border-b px-4 py-3">
          <div className="flex gap-8">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-8 border-b px-4 py-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Request Dialog
// ---------------------------------------------------------------------------

function CreateRequestDialog({
  currentUserId,
  topics,
}: {
  currentUserId: Id<"users">;
  topics: { _id: Id<"topics">; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTopicIds, setSelectedTopicIds] = useState<Id<"topics">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createRequest = useMutation(api.requests.create);

  const toggleTopic = useCallback((topicId: Id<"topics">) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      await createRequest({
        title: title.trim(),
        description: description.trim(),
        topicIds: selectedTopicIds,
        requestedBy: currentUserId,
      });
      toast.success("Request created successfully");
      setTitle("");
      setDescription("");
      setSelectedTopicIds([]);
      setOpen(false);
    } catch (error) {
      toast.error("Failed to create request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Content Request</DialogTitle>
          <DialogDescription>
            Submit a new content request for the team to review.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="req-title">Title</Label>
            <Input
              id="req-title"
              placeholder="e.g., Advanced TypeScript Patterns"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="req-desc">Description</Label>
            <Textarea
              id="req-desc"
              placeholder="Describe what content you'd like to see..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Topics</Label>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => {
                const selected = selectedTopicIds.includes(topic._id);
                return (
                  <Badge
                    key={topic._id}
                    variant={selected ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleTopic(topic._id)}
                  >
                    {topic.name}
                  </Badge>
                );
              })}
              {topics.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  No topics available
                </span>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim() || !description.trim()}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Request Detail Dialog
// ---------------------------------------------------------------------------

function RequestDetailDialog({
  request,
  currentUserId,
  allRequests,
  topics,
  open,
  onOpenChange,
}: {
  request: {
    _id: Id<"contentRequests">;
    title: string;
    description: string;
    status: RequestStatus;
    voteCount: number;
    topicIds: Id<"topics">[];
    linkedContentId?: Id<"contentItems">;
    mergedIntoId?: Id<"contentRequests">;
    createdAt: number;
    updatedAt: number;
  };
  currentUserId: Id<"users"> | null;
  allRequests: {
    _id: Id<"contentRequests">;
    title: string;
    status: RequestStatus;
  }[];
  topics: { _id: Id<"topics">; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [linkContentId, setLinkContentId] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  const upvote = useMutation(api.requests.upvote);
  const updateStatus = useMutation(api.requests.updateStatus);
  const linkToContent = useMutation(api.requests.linkToContent);
  const mergeInto = useMutation(api.requests.mergeInto);

  const topicNames = useMemo(() => {
    return request.topicIds
      .map((id) => topics.find((t) => t._id === id)?.name)
      .filter(Boolean);
  }, [request.topicIds, topics]);

  const otherRequests = useMemo(() => {
    return allRequests.filter(
      (r) => r._id !== request._id && !r.status.includes("declined")
    );
  }, [allRequests, request._id]);

  const handleUpvote = async () => {
    if (!currentUserId) return;
    setIsUpvoting(true);
    try {
      await upvote({ requestId: request._id, userId: currentUserId });
      toast.success("Vote recorded");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to upvote");
    } finally {
      setIsUpvoting(false);
    }
  };

  const handleStatusChange = async (status: RequestStatus) => {
    setIsUpdatingStatus(true);
    try {
      await updateStatus({ requestId: request._id, status });
      toast.success(`Status updated to ${status.replace("_", " ")}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleLinkContent = async () => {
    if (!linkContentId) return;
    setIsLinking(true);
    try {
      await linkToContent({
        requestId: request._id,
        linkedContentId: linkContentId as Id<"contentItems">,
      });
      toast.success("Linked to content item");
      setLinkContentId("");
    } catch {
      toast.error("Failed to link content. Check the content ID.");
    } finally {
      setIsLinking(false);
    }
  };

  const handleMerge = async () => {
    if (!mergeTargetId) return;
    setIsMerging(true);
    try {
      await mergeInto({
        requestId: request._id,
        targetRequestId: mergeTargetId as Id<"contentRequests">,
      });
      toast.success("Request merged");
      setMergeTargetId("");
      onOpenChange(false);
    } catch {
      toast.error("Failed to merge request");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{request.title}</DialogTitle>
          <DialogDescription className="sr-only">
            Request details and actions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status & Votes row */}
          <div className="flex flex-wrap items-center gap-4">
            <StatusBadge status={request.status} />
            <div className="flex items-center gap-2">
              <ThumbsUp className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{request.voteCount} votes</span>
              {currentUserId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpvote}
                  disabled={isUpvoting}
                >
                  {isUpvoting ? (
                    <Loader2 className="mr-1 size-3 animate-spin" />
                  ) : (
                    <ThumbsUp className="mr-1 size-3" />
                  )}
                  Upvote
                </Button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">
              Description
            </h4>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {request.description}
            </p>
          </div>

          {/* Topics */}
          {topicNames.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">
                Topics
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {topicNames.map((name) => (
                  <Badge key={name} variant="secondary" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex gap-6 text-xs text-muted-foreground">
            <span>Created {formatRelativeDate(request.createdAt)}</span>
            <span>Updated {formatRelativeDate(request.updatedAt)}</span>
          </div>

          {/* Merged info */}
          {request.mergedIntoId && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              This request has been merged into another request.
            </div>
          )}

          {/* Linked content */}
          {request.linkedContentId && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Linked to content item: {request.linkedContentId}
            </div>
          )}

          {/* Actions section */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-semibold">Actions</h4>

            {/* Change Status */}
            <div className="flex items-center gap-3">
              <Label className="w-28 shrink-0 text-sm">Change Status</Label>
              <Select
                value={request.status}
                onValueChange={(v) => handleStatusChange(v as RequestStatus)}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Link to Content */}
            <div className="flex items-center gap-3">
              <Label className="w-28 shrink-0 text-sm">Link to Content</Label>
              <Input
                placeholder="Content item ID..."
                value={linkContentId}
                onChange={(e) => setLinkContentId(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleLinkContent}
                disabled={isLinking || !linkContentId}
              >
                {isLinking ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <LinkIcon className="mr-1 size-3" />
                )}
                Link
              </Button>
            </div>

            {/* Merge Into */}
            <div className="flex items-center gap-3">
              <Label className="w-28 shrink-0 text-sm">Merge Into</Label>
              <Select
                value={mergeTargetId}
                onValueChange={setMergeTargetId}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a request..." />
                </SelectTrigger>
                <SelectContent>
                  {otherRequests.map((r) => (
                    <SelectItem key={r._id} value={r._id}>
                      {truncate(r.title, 50)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMerge}
                disabled={isMerging || !mergeTargetId}
              >
                {isMerging ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <Merge className="mr-1 size-3" />
                )}
                Merge
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Requests Page
// ---------------------------------------------------------------------------

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<RequestStatus | "all">("all");
  const [selectedRequest, setSelectedRequest] = useState<Id<"contentRequests"> | null>(null);

  // Queries
  const currentUser = useQuery(api.users.getCurrent);
  const topics = useQuery(api.topics.getAll) ?? [];
  const leaderboard = useQuery(api.requests.getLeaderboard, { limit: 200 });

  // Status-specific queries
  const openRequests = useQuery(api.requests.getByStatus, { status: "open" });
  const plannedRequests = useQuery(api.requests.getByStatus, { status: "planned" });
  const inProgressRequests = useQuery(api.requests.getByStatus, { status: "in_progress" });
  const completedRequests = useQuery(api.requests.getByStatus, { status: "completed" });
  const declinedRequests = useQuery(api.requests.getByStatus, { status: "declined" });

  // Combine all requests for the "all" tab and for stats
  const allRequests = useMemo(() => {
    if (
      openRequests === undefined ||
      plannedRequests === undefined ||
      inProgressRequests === undefined ||
      completedRequests === undefined ||
      declinedRequests === undefined
    ) {
      return undefined;
    }
    return [
      ...openRequests,
      ...plannedRequests,
      ...inProgressRequests,
      ...completedRequests,
      ...declinedRequests,
    ];
  }, [openRequests, plannedRequests, inProgressRequests, completedRequests, declinedRequests]);

  // Filtered requests based on active tab
  const filteredRequests = useMemo(() => {
    if (activeTab === "all") return allRequests;
    switch (activeTab) {
      case "open":
        return openRequests;
      case "planned":
        return plannedRequests;
      case "in_progress":
        return inProgressRequests;
      case "completed":
        return completedRequests;
      case "declined":
        return declinedRequests;
      default:
        return allRequests;
    }
  }, [activeTab, allRequests, openRequests, plannedRequests, inProgressRequests, completedRequests, declinedRequests]);

  // Sort filtered requests by vote count descending
  const sortedRequests = useMemo(() => {
    if (!filteredRequests) return undefined;
    return [...filteredRequests].sort((a, b) => b.voteCount - a.voteCount);
  }, [filteredRequests]);

  // Stats
  const stats = useMemo(() => {
    if (!allRequests) return null;
    return {
      total: allRequests.length,
      open: openRequests?.length ?? 0,
      planned: plannedRequests?.length ?? 0,
      inProgress: inProgressRequests?.length ?? 0,
      completed: completedRequests?.length ?? 0,
    };
  }, [allRequests, openRequests, plannedRequests, inProgressRequests, completedRequests]);

  // Selected request detail
  const selectedRequestData = useMemo(() => {
    if (!selectedRequest || !allRequests) return null;
    return allRequests.find((r) => r._id === selectedRequest) ?? null;
  }, [selectedRequest, allRequests]);

  // Loading state
  if (allRequests === undefined || currentUser === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Requests</h1>
            <p className="text-muted-foreground">
              Manage content requests from your team.
            </p>
          </div>
        </div>
        <RequestsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Requests</h1>
          <p className="text-muted-foreground">
            Manage content requests from your team.
          </p>
        </div>
        {currentUser && (
          <CreateRequestDialog
            currentUserId={currentUser._id}
            topics={topics}
          />
        )}
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <MessageSquarePlus className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open</CardTitle>
              <Inbox className="size-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.open}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planned</CardTitle>
              <Clock className="size-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.planned}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Rocket className="size-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
            {tab.value !== "all" && allRequests && (
              <span className="ml-1.5 text-xs opacity-70">
                {allRequests.filter(
                  (r) => r.status === tab.value
                ).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Requests table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="hidden lg:table-cell">Topic</TableHead>
              <TableHead>Votes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!sortedRequests || sortedRequests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <MessageSquarePlus className="size-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium">No requests found</p>
                    <p className="text-xs">
                      {activeTab === "all"
                        ? "Create the first content request to get started."
                        : `No requests with "${activeTab.replace("_", " ")}" status.`}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedRequests.map((request) => {
                const requestTopicNames = request.topicIds
                  .map((id: Id<"topics">) => topics.find((t: { _id: Id<"topics">; name: string }) => t._id === id)?.name)
                  .filter((name: string | undefined): name is string => Boolean(name));

                return (
                  <TableRow
                    key={request._id}
                    className="group cursor-pointer"
                    onClick={() => setSelectedRequest(request._id)}
                  >
                    <TableCell className="max-w-[200px] truncate font-medium">
                      {request.title}
                    </TableCell>
                    <TableCell className="hidden max-w-[250px] truncate text-muted-foreground md:table-cell">
                      {truncate(request.description, 80)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {requestTopicNames.slice(0, 2).map((name) => (
                          <Badge
                            key={name}
                            variant="secondary"
                            className="text-xs"
                          >
                            {name}
                          </Badge>
                        ))}
                        {requestTopicNames.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{requestTopicNames.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <UpvoteButton
                        requestId={request._id}
                        voteCount={request.voteCount}
                        currentUserId={currentUser?._id ?? null}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {formatRelativeDate(request.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequest(request._id);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Request detail dialog */}
      {selectedRequestData && (
        <RequestDetailDialog
          request={selectedRequestData}
          currentUserId={currentUser?._id ?? null}
          allRequests={(allRequests ?? []).map((r) => ({
            _id: r._id,
            title: r.title,
            status: r.status as RequestStatus,
          }))}
          topics={topics}
          open={!!selectedRequest}
          onOpenChange={(open) => {
            if (!open) setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upvote Button (inline in table)
// ---------------------------------------------------------------------------

function UpvoteButton({
  requestId,
  voteCount,
  currentUserId,
}: {
  requestId: Id<"contentRequests">;
  voteCount: number;
  currentUserId: Id<"users"> | null;
}) {
  const [isUpvoting, setIsUpvoting] = useState(false);
  const upvote = useMutation(api.requests.upvote);

  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    setIsUpvoting(true);
    try {
      await upvote({ requestId, userId: currentUserId });
    } catch {
      // Silently handle duplicate vote errors
    } finally {
      setIsUpvoting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 tabular-nums"
      onClick={handleUpvote}
      disabled={isUpvoting || !currentUserId}
    >
      {isUpvoting ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <ThumbsUp className="size-3.5" />
      )}
      {voteCount}
    </Button>
  );
}
