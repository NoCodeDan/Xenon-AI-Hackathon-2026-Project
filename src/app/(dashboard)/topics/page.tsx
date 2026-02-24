"use client";

import React, { useState, useCallback, useMemo, useEffect, memo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { topicLabel } from "@/lib/topics";
import { toast } from "sonner";
import {
  Tag,
  Plus,
  X,
  Activity,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Loader2,
  PanelLeftOpen,
  PanelLeftClose,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Topic = {
  _id: Id<"topics">;
  name: string;
  slug: string;
  domain: string;
  description?: string;
  activeSnapshotId?: Id<"topicSnapshots">;
};

type TopicSnapshot = {
  _id: Id<"topicSnapshots">;
  topicId: Id<"topics">;
  keyPractices: string[];
  deprecatedPractices: string[];
  emergingTrends?: string[];
  changeVelocity: number;
  confidence: number;
  notes?: string;
  supersededById?: Id<"topicSnapshots">;
  createdAt: number;
};

// ---------------------------------------------------------------------------
// Helper: Tag Input Component
// ---------------------------------------------------------------------------

function TagInput({
  label,
  tags,
  onChange,
  placeholder,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = inputValue.trim().replace(/,+$/, "");
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed]);
      }
      setInputValue("");
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent p-2 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
        {tags.map((tag, index) => (
          <Badge
            key={`${tag}-${index}`}
            variant="secondary"
            className="gap-1 pr-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Press Enter or comma to add
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: velocity / confidence to human label
// ---------------------------------------------------------------------------

function velocityLabel(v: number): string {
  if (v >= 0.8) return "Rapid";
  if (v >= 0.6) return "Fast";
  if (v >= 0.4) return "Moderate";
  if (v >= 0.2) return "Slow";
  return "Stable";
}

function confidenceLabel(c: number): string {
  if (c >= 0.8) return "High";
  if (c >= 0.6) return "Good";
  if (c >= 0.4) return "Moderate";
  if (c >= 0.2) return "Low";
  return "Very Low";
}

function velocityColor(v: number): string {
  if (v >= 0.7) return "text-red-600";
  if (v >= 0.4) return "text-amber-600";
  return "text-emerald-600";
}

function confidenceColor(c: number): string {
  if (c >= 0.7) return "text-emerald-600";
  if (c >= 0.4) return "text-amber-600";
  return "text-red-600";
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function TopicsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Snapshot Detail Dialog
// ---------------------------------------------------------------------------

function SnapshotDetailDialog({
  open,
  onOpenChange,
  topic,
  snapshot,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: Topic;
  snapshot: TopicSnapshot | null;
}) {
  if (!snapshot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{topic.name} - Active Snapshot</DialogTitle>
          <DialogDescription>
            Created{" "}
            {new Date(snapshot.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Metrics row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Change Velocity</p>
              <p className={cn("text-lg font-bold", velocityColor(snapshot.changeVelocity))}>
                {snapshot.changeVelocity.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {velocityLabel(snapshot.changeVelocity)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Confidence</p>
              <p className={cn("text-lg font-bold", confidenceColor(snapshot.confidence))}>
                {snapshot.confidence.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {confidenceLabel(snapshot.confidence)}
              </p>
            </div>
          </div>

          {/* Key Practices */}
          <div>
            <h4 className="mb-2 text-sm font-medium">Key Practices</h4>
            <div className="flex flex-wrap gap-1.5">
              {snapshot.keyPractices.length > 0 ? (
                snapshot.keyPractices.map((p, i) => (
                  <Badge key={i} variant="secondary">
                    {p}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">None defined</p>
              )}
            </div>
          </div>

          {/* Deprecated Practices */}
          <div>
            <h4 className="mb-2 text-sm font-medium">Deprecated Practices</h4>
            <div className="flex flex-wrap gap-1.5">
              {snapshot.deprecatedPractices.length > 0 ? (
                snapshot.deprecatedPractices.map((p, i) => (
                  <Badge key={i} variant="outline" className="border-red-200 bg-red-50 text-red-700">
                    {p}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">None defined</p>
              )}
            </div>
          </div>

          {/* Emerging Trends */}
          {snapshot.emergingTrends && snapshot.emergingTrends.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Emerging Trends</h4>
              <div className="flex flex-wrap gap-1.5">
                {snapshot.emergingTrends.map((t, i) => (
                  <Badge key={i} variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {snapshot.notes && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Notes</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {snapshot.notes}
              </p>
            </div>
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// New Snapshot Form Dialog
// ---------------------------------------------------------------------------

function NewSnapshotDialog({
  open,
  onOpenChange,
  topic,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: Topic;
}) {
  const createSnapshot = useMutation(api.topicSnapshots.create);

  const [keyPractices, setKeyPractices] = useState<string[]>([]);
  const [deprecatedPractices, setDeprecatedPractices] = useState<string[]>([]);
  const [emergingTrends, setEmergingTrends] = useState<string[]>([]);
  const [changeVelocity, setChangeVelocity] = useState(0.5);
  const [confidence, setConfidence] = useState(0.7);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (keyPractices.length === 0) {
      toast.error("Please add at least one key practice.");
      return;
    }

    setSaving(true);
    try {
      await createSnapshot({
        topicId: topic._id,
        keyPractices,
        deprecatedPractices,
        emergingTrends: emergingTrends.length > 0 ? emergingTrends : undefined,
        changeVelocity,
        confidence,
        notes: notes.trim() || undefined,
      });

      toast.success(`Snapshot created for "${topic.name}"`);
      onOpenChange(false);
      // Reset form
      setKeyPractices([]);
      setDeprecatedPractices([]);
      setEmergingTrends([]);
      setChangeVelocity(0.5);
      setConfidence(0.7);
      setNotes("");
    } catch (err) {
      toast.error("Failed to create snapshot. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Snapshot for {topic.name}</DialogTitle>
          <DialogDescription>
            Create a new topic snapshot to capture the current state of
            practices and trends.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <TagInput
            label="Key Practices"
            tags={keyPractices}
            onChange={setKeyPractices}
            placeholder="e.g. React Server Components, TypeScript strict mode..."
          />

          <TagInput
            label="Deprecated Practices"
            tags={deprecatedPractices}
            onChange={setDeprecatedPractices}
            placeholder="e.g. Class components, jQuery..."
          />

          <TagInput
            label="Emerging Trends"
            tags={emergingTrends}
            onChange={setEmergingTrends}
            placeholder="e.g. AI-assisted coding, Edge computing..."
          />

          {/* Change Velocity slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Change Velocity</Label>
              <span className={cn("text-sm font-medium tabular-nums", velocityColor(changeVelocity))}>
                {changeVelocity.toFixed(2)} - {velocityLabel(changeVelocity)}
              </span>
            </div>
            <Slider
              value={[changeVelocity]}
              onValueChange={([v]) => setChangeVelocity(v)}
              min={0}
              max={1}
              step={0.01}
            />
            <p className="text-xs text-muted-foreground">
              How quickly is this topic evolving? (0 = stable, 1 = rapid change)
            </p>
          </div>

          {/* Confidence slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Confidence</Label>
              <span className={cn("text-sm font-medium tabular-nums", confidenceColor(confidence))}>
                {confidence.toFixed(2)} - {confidenceLabel(confidence)}
              </span>
            </div>
            <Slider
              value={[confidence]}
              onValueChange={([v]) => setConfidence(v)}
              min={0}
              max={1}
              step={0.01}
            />
            <p className="text-xs text-muted-foreground">
              How confident are you in this assessment? (0 = uncertain, 1 = very confident)
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this snapshot..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            {saving ? "Saving..." : "Create Snapshot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Topic Card Component
// ---------------------------------------------------------------------------

const TopicCard = memo(function TopicCard({
  topic,
  snapshot,
}: {
  topic: Topic;
  snapshot: TopicSnapshot | null | undefined;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [snapshotFormOpen, setSnapshotFormOpen] = useState(false);
  const [healthChecking, setHealthChecking] = useState(false);

  const handleHealthCheck = useCallback(() => {
    setHealthChecking(true);
    // Placeholder: topicHealth.checkTopicCurrency is an internal action
    // and cannot be called directly from the client.
    setTimeout(() => {
      setHealthChecking(false);
      toast.info(
        `AI health check for "${topic.name}" would be triggered server-side. This is a placeholder.`
      );
    }, 1500);
  }, [topic.name]);

  const isLoading = snapshot === undefined;
  const hasSnapshot = snapshot !== null && snapshot !== undefined;

  return (
    <>
      <Card className="group transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="size-4 shrink-0 text-emerald-600" />
                <span className="truncate">{topic.name}</span>
              </CardTitle>
              <CardDescription className="mt-1">
                <Badge variant="outline" className="text-xs">
                  {topic.domain}
                </Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Snapshot summary metrics */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
            </div>
          ) : hasSnapshot ? (
            <button
              type="button"
              onClick={() => setDetailOpen(true)}
              className="w-full text-left"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-2.5 transition-colors group-hover:border-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    <span className="text-xs text-muted-foreground">Key Practices</span>
                  </div>
                  <p className="mt-0.5 text-lg font-bold">
                    {snapshot.keyPractices.length}
                  </p>
                </div>
                <div className="rounded-lg border p-2.5 transition-colors group-hover:border-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5 text-red-500" />
                    <span className="text-xs text-muted-foreground">Deprecated</span>
                  </div>
                  <p className="mt-0.5 text-lg font-bold">
                    {snapshot.deprecatedPractices.length}
                  </p>
                </div>
                <div className="rounded-lg border p-2.5 transition-colors group-hover:border-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="size-3.5 text-amber-600" />
                    <span className="text-xs text-muted-foreground">Velocity</span>
                  </div>
                  <p className={cn("mt-0.5 text-lg font-bold tabular-nums", velocityColor(snapshot.changeVelocity))}>
                    {snapshot.changeVelocity.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg border p-2.5 transition-colors group-hover:border-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <Activity className="size-3.5 text-emerald-600" />
                    <span className="text-xs text-muted-foreground">Confidence</span>
                  </div>
                  <p className={cn("mt-0.5 text-lg font-bold tabular-nums", confidenceColor(snapshot.confidence))}>
                    {snapshot.confidence.toFixed(2)}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Click to view full snapshot details
              </p>
            </button>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No active snapshot yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create one to start tracking this topic
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSnapshotFormOpen(true)}
            >
              <Plus className="size-3.5" />
              New Snapshot
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHealthCheck}
              disabled={healthChecking}
            >
              {healthChecking ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {healthChecking ? "Checking..." : "AI Health Check"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      {hasSnapshot && (
        <SnapshotDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          topic={topic}
          snapshot={snapshot}
        />
      )}

      {/* New snapshot form */}
      <NewSnapshotDialog
        open={snapshotFormOpen}
        onOpenChange={setSnapshotFormOpen}
        topic={topic}
      />
    </>
  );
});

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Domain Sidebar
// ---------------------------------------------------------------------------

function DomainSidebar({
  domains,
  activeDomain,
  onSelectDomain,
  isOpen,
  onToggle,
}: {
  domains: [string, Topic[]][];
  activeDomain: string;
  onSelectDomain: (domain: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-background transition-all duration-200 shrink-0",
        isOpen ? "w-56" : "w-0 overflow-hidden border-r-0"
      )}
    >
      <div className="flex items-center justify-between border-b px-3 py-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Layers className="size-4" />
          Domains
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onToggle}
        >
          <PanelLeftClose className="size-4" />
          <span className="sr-only">Close sidebar</span>
        </Button>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="py-2 px-2">
          <button
            onClick={() => onSelectDomain("all")}
            className={cn(
              "w-full text-left rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeDomain === "all"
                ? "bg-emerald-50 text-emerald-600"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            All Domains
          </button>
          {domains.map(([domain, domainTopics]) => (
            <button
              key={domain}
              onClick={() => onSelectDomain(domain)}
              className={cn(
                "w-full text-left rounded-md px-3 py-1.5 text-sm transition-colors flex items-center justify-between",
                activeDomain === domain
                  ? "bg-emerald-50 text-emerald-600 font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <span>{topicLabel[domain] ?? domain}</span>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {domainTopics.length}
              </Badge>
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TopicsPage() {
  const topics = useQuery(api.topics.getAll);
  const topicIds = useMemo(
    () => (topics ?? []).map((t) => t._id),
    [topics]
  );
  const snapshotBatch = useQuery(
    api.topicSnapshots.getActiveBatch,
    topicIds.length > 0 ? { topicIds } : "skip"
  );

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeDomain, setActiveDomain] = useState("all");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Disable parent main scroll/padding so sidebar fills height
  const containerRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const main = containerRef.current?.closest("main");
    if (!main) return;
    const prevOverflow = main.style.overflow;
    const prevPadding = main.style.padding;
    main.style.overflow = "hidden";
    main.style.padding = "0";
    return () => {
      main.style.overflow = prevOverflow;
      main.style.padding = prevPadding;
    };
  }, []);

  // Group topics by domain
  const sortedDomains = useMemo(() => {
    if (!topics) return [];
    const domains = new Map<string, Topic[]>();
    for (const topic of topics) {
      const list = domains.get(topic.domain) ?? [];
      list.push(topic as Topic);
      domains.set(topic.domain, list);
    }
    return Array.from(domains.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [topics]);

  const filteredDomains = useMemo(() => {
    if (activeDomain === "all") return sortedDomains;
    return sortedDomains.filter(([domain]) => domain === activeDomain);
  }, [sortedDomains, activeDomain]);

  const handleSelectDomain = useCallback((domain: string) => {
    setActiveDomain(domain);
    setMobileSheetOpen(false);
  }, []);

  if (topics === undefined) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Topics</h1>
          <p className="text-muted-foreground">
            Manage technology topics and their practice snapshots.
          </p>
        </div>
        <TopicsSkeleton />
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Topics</h1>
          <p className="text-muted-foreground">
            Manage technology topics and their practice snapshots.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="size-12 text-muted-foreground/40" />
            <p className="mt-4 text-lg font-medium">No topics yet</p>
            <p className="text-sm text-muted-foreground">
              Topics will appear here once they are created.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex h-[calc(100dvh-3.5rem)] overflow-hidden">
      {/* Desktop sidebar */}
      <DomainSidebar
        domains={sortedDomains}
        activeDomain={activeDomain}
        onSelectDomain={handleSelectDomain}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Sidebar toggle (when collapsed) + mobile toggle */}
        <div className="flex items-center gap-2 mb-4">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex size-8"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeftOpen className="size-4" />
              <span className="sr-only">Open sidebar</span>
            </Button>
          )}
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="md:hidden gap-2">
                <Layers className="size-4" />
                Domains
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Domains</SheetTitle>
              </SheetHeader>
              <div className="flex items-center gap-2 px-4 py-4">
                <Layers className="size-5 text-emerald-600" />
                <span className="font-semibold">Domains</span>
              </div>
              <div className="border-t" />
              <ScrollArea className="flex-1">
                <div className="py-2 px-2">
                  <button
                    onClick={() => handleSelectDomain("all")}
                    className={cn(
                      "w-full text-left rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      activeDomain === "all"
                        ? "bg-emerald-50 text-emerald-600"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    All Domains
                  </button>
                  {sortedDomains.map(([domain, domainTopics]) => (
                    <button
                      key={domain}
                      onClick={() => handleSelectDomain(domain)}
                      className={cn(
                        "w-full text-left rounded-md px-3 py-2 text-sm transition-colors flex items-center justify-between",
                        activeDomain === domain
                          ? "bg-emerald-50 text-emerald-600 font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <span>{topicLabel[domain] ?? domain}</span>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                        {domainTopics.length}
                      </Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Topics</h1>
              <p className="text-muted-foreground">
                Manage technology topics and their practice snapshots.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {topics.length} topic{topics.length !== 1 && "s"}
              </span>
            </div>
          </div>

          {filteredDomains.map(([domain, domainTopics]) => (
            <div key={domain} className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{topicLabel[domain] ?? domain}</h2>
                <Badge variant="secondary" className="text-xs">
                  {domainTopics.length}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {domainTopics.map((topic) => (
                  <TopicCard
                    key={topic._id}
                    topic={topic}
                    snapshot={
                      snapshotBatch
                        ? (snapshotBatch as Record<string, TopicSnapshot | null>)[topic._id] ?? null
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
