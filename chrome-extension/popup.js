// ── Configuration ─────────────────────────────────────────────────────────────
// Replace with your actual Convex site URL (the HTTP Actions URL)
const CONVEX_SITE_URL = "https://quirky-grouse-112.convex.site";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function gradeLabel(grade) {
  const labels = { A: "Fresh", B: "Good", C: "Aging", D: "Stale", F: "Outdated" };
  return labels[grade] || "Unknown";
}

function gradeColor(grade) {
  const colors = {
    A: "#10b981",
    B: "#34d399",
    C: "#eab308",
    D: "#f97316",
    F: "#ef4444",
  };
  return colors[grade] || "#6b7280";
}

function showState(stateId) {
  document.querySelectorAll(".state").forEach((el) => el.classList.add("hidden"));
  document.getElementById(stateId).classList.remove("hidden");
}

// ── Gauge Rendering ───────────────────────────────────────────────────────────

function renderGauge(score, grade) {
  const maxArc = 236; // 270-degree arc on radius 50
  const fillArc = (score / 100) * maxArc;
  const color = gradeColor(grade);

  const gaugeFill = document.getElementById("gauge-fill");
  // Set initial state, then animate
  requestAnimationFrame(() => {
    gaugeFill.style.strokeDasharray = `${fillArc} 314`;
    gaugeFill.style.stroke = color;
  });

  document.getElementById("gauge-score").textContent = Math.round(score);
  const labelEl = document.getElementById("gauge-label");
  labelEl.textContent = gradeLabel(grade);
  labelEl.style.color = color;
}

// ── Score Bars ────────────────────────────────────────────────────────────────

function renderScoreBar(id, valueId, score) {
  const bar = document.getElementById(id);
  const val = document.getElementById(valueId);
  val.textContent = Math.round(score);
  requestAnimationFrame(() => {
    bar.style.width = `${score}%`;
  });
}

// ── Topics ────────────────────────────────────────────────────────────────────

function renderTopics(topics) {
  const container = document.getElementById("topics-list");
  container.innerHTML = "";
  if (!topics || topics.length === 0) {
    document.getElementById("topics-section").classList.add("hidden");
    return;
  }
  topics.forEach((t) => {
    const tag = document.createElement("span");
    tag.className = `topic-tag topic-${t.slug}`;
    tag.textContent = t.name;
    container.appendChild(tag);
  });
}

// ── Warnings ──────────────────────────────────────────────────────────────────

function renderWarnings(outdated, missing) {
  const section = document.getElementById("warnings-section");
  const outdatedEl = document.getElementById("outdated-warning");
  const missingEl = document.getElementById("missing-warning");

  let hasWarning = false;

  if (outdated && outdated.length > 0) {
    outdatedEl.classList.remove("hidden");
    document.getElementById("outdated-list").textContent = outdated.join(", ");
    hasWarning = true;
  }

  if (missing && missing.length > 0) {
    missingEl.classList.remove("hidden");
    document.getElementById("missing-list").textContent = missing.join(", ");
    hasWarning = true;
  }

  if (hasWarning) {
    section.classList.remove("hidden");
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function init() {
  // 1. Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url) {
    showState("state-not-treehouse");
    return;
  }

  // 2. Check if on Treehouse
  const url = new URL(tab.url);
  if (!url.hostname.includes("teamtreehouse.com")) {
    showState("state-not-treehouse");
    return;
  }

  // 3. Try to get page info from content script
  let pageUrl = tab.url;
  let pageTitle = tab.title || "";

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "GET_PAGE_INFO",
    });
    if (response) {
      pageUrl = response.url || pageUrl;
      pageTitle = response.title || pageTitle;
    }
  } catch {
    // Content script might not be loaded; use tab info
  }

  // 4. Fetch from Convex HTTP API
  const params = new URLSearchParams();
  if (pageUrl) params.set("url", pageUrl);
  if (pageTitle) params.set("title", pageTitle);

  try {
    const res = await fetch(`${CONVEX_SITE_URL}/api/content-intel?${params}`);
    if (!res.ok) {
      showState("state-not-found");
      return;
    }

    const data = await res.json();

    if (!data.found) {
      showState("state-not-found");
      return;
    }

    // Content found but no grade
    if (!data.grade && !data.freshness) {
      showState("state-no-grade");
      document.getElementById("ng-content-title").textContent =
        data.content.title;
      const ngType = document.getElementById("ng-content-type");
      ngType.textContent = data.content.type;
      ngType.className = `type-badge type-${data.content.type}`;
      return;
    }

    // 5. Render content card
    showState("state-content");

    // Content header
    document.getElementById("content-title").textContent = data.content.title;
    const typeEl = document.getElementById("content-type");
    typeEl.textContent = data.content.type;
    typeEl.className = `type-badge type-${data.content.type}`;

    // Gauge
    const score = data.freshness
      ? data.freshness.overallScore
      : data.grade.overallScore;
    const grade = data.freshness ? data.freshness.grade : data.grade.grade;
    renderGauge(score, grade);

    // Meta row
    const gradeBadge = document.getElementById("meta-grade");
    gradeBadge.textContent = grade;
    gradeBadge.className = `grade-badge grade-${grade}`;

    document.getElementById("meta-confidence").textContent = data.freshness
      ? `${Math.round(data.freshness.confidence * 100)}%`
      : "--";

    document.getElementById("meta-benchmark").textContent =
      data.freshness?.industryBenchmark || "--";

    document.getElementById("meta-reviewed").textContent = data.freshness
      ? timeAgo(data.freshness.createdAt)
      : data.grade
        ? timeAgo(data.grade.updatedAt)
        : "--";

    // Score bars
    if (data.freshness) {
      renderScoreBar("bar-recency", "val-recency", data.freshness.recencyScore);
      renderScoreBar(
        "bar-alignment",
        "val-alignment",
        data.freshness.alignmentScore
      );
      renderScoreBar("bar-demand", "val-demand", data.freshness.demandScore);
    }

    // Topics
    renderTopics(data.topics);

    // Recommended action
    if (data.freshness?.recommendedAction) {
      document.getElementById("action-section").classList.remove("hidden");
      document.getElementById("action-card").textContent =
        data.freshness.recommendedAction;
    }

    // Warnings
    renderWarnings(
      data.freshness?.outdatedTopics,
      data.freshness?.missingTopics
    );

    // Dashboard link
    if (data.content._id) {
      document.getElementById("dashboard-link").href = `#`;
    }
  } catch (err) {
    console.error("Treehouse Intel fetch error:", err);
    showState("state-not-found");
  }
}

document.addEventListener("DOMContentLoaded", init);
