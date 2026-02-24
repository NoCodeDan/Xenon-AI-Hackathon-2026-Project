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
  document.querySelectorAll("#view-intel .state").forEach((el) => el.classList.add("hidden"));
  document.getElementById(stateId).classList.remove("hidden");
}

// ── Escape HTML ──────────────────────────────────────────────────────────────

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
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

// ═══════════════════════════════════════════════════════════════════════════════
// Tab Switching
// ═══════════════════════════════════════════════════════════════════════════════

function switchTab(tab) {
  const intelView = document.getElementById("view-intel");
  const chatView = document.getElementById("view-chat");
  const tabIntel = document.getElementById("tab-intel");
  const tabChat = document.getElementById("tab-chat");

  if (tab === "chat") {
    intelView.classList.add("hidden");
    chatView.classList.remove("hidden");
    tabIntel.classList.remove("tab-active");
    tabChat.classList.add("tab-active");
    // Focus input when switching to chat
    document.getElementById("chat-input").focus();
  } else {
    chatView.classList.add("hidden");
    intelView.classList.remove("hidden");
    tabChat.classList.remove("tab-active");
    tabIntel.classList.add("tab-active");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chat Logic
// ═══════════════════════════════════════════════════════════════════════════════

let chatSessionId = null;
let chatUserId = null;
let chatSending = false;
let chatMessages = []; // { role, content, contentCards }

// ── Persistence ──────────────────────────────────────────────────────────────

function saveChatState() {
  chrome.storage.local.set({
    chatSessionId,
    chatUserId,
    chatMessages,
  });
}

async function loadChatState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["chatSessionId", "chatUserId", "chatMessages"], (data) => {
      if (data.chatSessionId) chatSessionId = data.chatSessionId;
      if (data.chatUserId) chatUserId = data.chatUserId;
      if (data.chatMessages && data.chatMessages.length > 0) {
        chatMessages = data.chatMessages;
      }
      resolve();
    });
  });
}

function clearChatState() {
  chatSessionId = null;
  // Keep chatUserId so the same guest user is reused
  chatMessages = [];
  chrome.storage.local.remove(["chatSessionId", "chatMessages"]);
}

// ── Markdown Renderer ────────────────────────────────────────────────────────

function renderMarkdown(text) {
  if (!text) return "";

  const lines = text.split("\n");
  let html = "";
  let inUl = false;
  let inOl = false;
  let sectionCards = []; // collect numbered sections

  function closeLists() {
    if (inUl) { html += "</ul>"; inUl = false; }
    if (inOl) { html += "</ol>"; inOl = false; }
  }

  function flushSectionCards() {
    if (sectionCards.length === 0) return;
    for (const card of sectionCards) {
      html += `<div class="chat-section-card">`;
      html += `<span class="chat-section-num">${card.num}</span>`;
      html += `<div class="chat-section-body"><strong>${inlineMarkdown(escapeHtml(card.title))}</strong>`;
      if (card.bullets.length > 0) {
        html += "<ul>";
        for (const b of card.bullets) {
          html += `<li>${inlineMarkdown(escapeHtml(b))}</li>`;
        }
        html += "</ul>";
      }
      html += "</div></div>";
    }
    sectionCards = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Numbered heading: "1. **Title**" or "1. Title" (start of section card)
    const numHeadingMatch = line.match(/^(\d+)\.\s+\*{0,2}(.+?)\*{0,2}\s*$/);
    if (numHeadingMatch) {
      // Check if next lines are bullets — if so, treat as section card
      const peekBullets = [];
      let j = i + 1;
      while (j < lines.length && lines[j].match(/^\s*[-*]\s+/)) {
        peekBullets.push(lines[j].replace(/^\s*[-*]\s+/, ""));
        j++;
      }

      if (peekBullets.length > 0) {
        closeLists();
        sectionCards.push({
          num: numHeadingMatch[1],
          title: numHeadingMatch[2],
          bullets: peekBullets,
        });
        i = j - 1; // skip past the bullets
        continue;
      }
    }

    // If we had section cards building and hit a non-section line, flush
    if (sectionCards.length > 0 && !numHeadingMatch) {
      closeLists();
      flushSectionCards();
    }

    // Headings
    if (line.match(/^###?\s+/)) {
      closeLists();
      const level = line.startsWith("## ") ? "h4" : "h3";
      const content = line.replace(/^#{1,3}\s+/, "");
      html += `<${level}>${inlineMarkdown(escapeHtml(content))}</${level}>`;
      continue;
    }

    // Unordered list
    if (line.match(/^\s*[-*]\s+/)) {
      if (inOl) { html += "</ol>"; inOl = false; }
      if (!inUl) { html += "<ul>"; inUl = true; }
      const content = line.replace(/^\s*[-*]\s+/, "");
      html += `<li>${inlineMarkdown(escapeHtml(content))}</li>`;
      continue;
    }

    // Ordered list
    if (line.match(/^\s*\d+\.\s+/)) {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (!inOl) { html += "<ol>"; inOl = true; }
      const content = line.replace(/^\s*\d+\.\s+/, "");
      html += `<li>${inlineMarkdown(escapeHtml(content))}</li>`;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      closeLists();
      continue;
    }

    // Paragraph
    closeLists();
    html += `<p>${inlineMarkdown(escapeHtml(line))}</p>`;
  }

  closeLists();
  flushSectionCards();
  return html;
}

function inlineMarkdown(text) {
  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic: *text*
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Inline code: `text`
  text = text.replace(/`(.+?)`/g, "<code>$1</code>");
  // Links: [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Bare URLs
  text = text.replace(/(^|[^"=])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  return text;
}

// ── Content Card Renderer ────────────────────────────────────────────────────

function renderContentCards(cards) {
  if (!cards || cards.length === 0) return "";

  let html = '<div class="chat-content-cards">';
  for (const card of cards) {
    const typeClass = `type-${card.type}`;
    const gradeClass = card.grade ? `grade-${card.grade}` : "";
    if (card.url) {
      html += `<a href="${escapeHtml(card.url)}" class="chat-content-card chat-content-card-link">`;
    } else {
      html += `<div class="chat-content-card">`;
    }
    html += `<span class="type-badge ${typeClass}">${escapeHtml(card.type)}</span>`;
    html += `<span class="chat-content-card-title">${escapeHtml(card.title)}</span>`;
    if (card.grade) {
      html += `<span class="grade-badge ${gradeClass}">${escapeHtml(card.grade)}</span>`;
    }
    html += card.url ? `</a>` : `</div>`;
  }
  html += "</div>";
  return html;
}

// ── Chat Message Rendering ───────────────────────────────────────────────────

const WELCOME_HTML =
  '<div class="chat-welcome">' +
    '<div class="chat-welcome-icon">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M17 8c0-5-5-5-5-5s-5 0-5 5c0 3 2 5 5 8c3-3 5-5 5-8z"/>' +
        '<path d="M12 21V11"/>' +
        '<path d="M9 17c-2 0-4-1-4-3"/>' +
        '<path d="M15 17c2 0 4-1 4-3"/>' +
      '</svg>' +
    '</div>' +
    '<p class="chat-welcome-title">Treehouse Assistant</p>' +
    '<p class="chat-welcome-desc">Ask about content, grades, topics, or request new content.</p>' +
  '</div>';

function renderAllMessages() {
  const container = document.getElementById("chat-messages");
  container.innerHTML = "";

  if (chatMessages.length === 0) {
    container.innerHTML = WELCOME_HTML;
    return;
  }

  for (const msg of chatMessages) {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble chat-bubble-${msg.role}`;

    if (msg.role === "user") {
      bubble.textContent = msg.content;
    } else {
      bubble.innerHTML = renderMarkdown(msg.content);
      if (msg.contentCards && msg.contentCards.length > 0) {
        bubble.innerHTML += renderContentCards(msg.contentCards);
      }
    }

    container.appendChild(bubble);
  }

  scrollChatToBottom();
}

function addChatBubble(role, content, contentCards) {
  const container = document.getElementById("chat-messages");

  // Remove welcome message on first real message
  const welcome = container.querySelector(".chat-welcome");
  if (welcome) welcome.remove();

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble chat-bubble-${role}`;

  if (role === "user") {
    bubble.textContent = content;
  } else {
    bubble.innerHTML = renderMarkdown(content);
    if (contentCards && contentCards.length > 0) {
      bubble.innerHTML += renderContentCards(contentCards);
    }
  }

  container.appendChild(bubble);
  scrollChatToBottom();
}

function addThinkingIndicator() {
  const container = document.getElementById("chat-messages");
  const indicator = document.createElement("div");
  indicator.className = "chat-thinking";
  indicator.id = "chat-thinking";
  indicator.innerHTML =
    '<span class="chat-thinking-dot"></span>' +
    '<span class="chat-thinking-dot"></span>' +
    '<span class="chat-thinking-dot"></span>';
  container.appendChild(indicator);
  scrollChatToBottom();
}

function removeThinkingIndicator() {
  const el = document.getElementById("chat-thinking");
  if (el) el.remove();
}

function addChatError(message) {
  const container = document.getElementById("chat-messages");
  const errDiv = document.createElement("div");
  errDiv.className = "chat-error";
  errDiv.textContent = message;
  container.appendChild(errDiv);
  scrollChatToBottom();
}

function scrollChatToBottom() {
  const container = document.getElementById("chat-messages");
  container.scrollTop = container.scrollHeight;
}

// ── Send Message ─────────────────────────────────────────────────────────────

async function sendChatMessage() {
  const input = document.getElementById("chat-input");
  const message = input.value.trim();
  if (!message || chatSending) return;

  chatSending = true;
  input.value = "";
  input.style.height = "auto";
  updateSendButton();

  // Optimistic user bubble + save immediately
  chatMessages.push({ role: "user", content: message, contentCards: null });
  addChatBubble("user", message);
  saveChatState();
  addThinkingIndicator();

  try {
    const payload = { message };
    if (chatSessionId) payload.sessionId = chatSessionId;
    if (chatUserId) payload.userId = chatUserId;

    const res = await fetch(`${CONVEX_SITE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    removeThinkingIndicator();

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Request failed (${res.status})`);
    }

    const data = await res.json();

    // Persist session for follow-up messages
    chatSessionId = data.sessionId;
    chatUserId = data.userId;

    // Save assistant reply + render
    chatMessages.push({
      role: "assistant",
      content: data.reply,
      contentCards: data.contentCards || null,
    });
    saveChatState();
    addChatBubble("assistant", data.reply, data.contentCards);
  } catch (err) {
    removeThinkingIndicator();
    addChatError(err.message || "Something went wrong. Please try again.");
  } finally {
    chatSending = false;
    updateSendButton();
  }
}

// ── New Chat / Close Chat ────────────────────────────────────────────────────

function startNewChat() {
  clearChatState();
  renderAllMessages(); // shows welcome screen
  document.getElementById("chat-input").focus();
}

function closeChat() {
  switchTab("intel");
}

// ── Input Handling ───────────────────────────────────────────────────────────

function updateSendButton() {
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");
  sendBtn.disabled = !input.value.trim() || chatSending;
}

async function initChat() {
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");

  // Restore persisted chat state
  await loadChatState();
  renderAllMessages();

  input.addEventListener("input", () => {
    // Auto-resize textarea
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 80) + "px";
    updateSendButton();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  sendBtn.addEventListener("click", () => sendChatMessage());

  // Intercept all link clicks in chat — open in a new browser tab
  // (default link behaviour in extension popups navigates the popup itself)
  document.getElementById("view-chat").addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (!link) return;
    e.preventDefault();
    const url = link.getAttribute("href");
    if (url && url.startsWith("http")) {
      chrome.tabs.create({ url });
    }
  });

  // Toolbar buttons
  document.getElementById("chat-new").addEventListener("click", startNewChat);
  document.getElementById("chat-close").addEventListener("click", closeChat);

  // Tab switching
  document.getElementById("tab-intel").addEventListener("click", () => switchTab("intel"));
  document.getElementById("tab-chat").addEventListener("click", () => switchTab("chat"));
}

// ── Main Initialization ──────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initChat();
  init();
});
