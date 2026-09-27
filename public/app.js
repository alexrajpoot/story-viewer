// Frontend ↔ backend glue.
// On Netlify, the API lives on the same domain, so relative paths just work.
// If you ever host the backend elsewhere, set API_BASE to its URL (e.g. "https://my-api.onrender.com").
const API_BASE = "";

const $ = (id) => document.getElementById(id);
const form = $("searchForm");
const input = $("searchInput");
const button = $("searchBtn");
const statusEl = $("status");
const results = $("results");
const grid = $("grid");

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}

// Decide whether the user typed a story link or a username.
function buildQuery(value) {
  const v = value.trim();
  if (/instagram\.com\/stories\//i.test(v)) {
    const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    return `url=${encodeURIComponent(url)}`;
  }
  return `username=${encodeURIComponent(v)}`;
}

async function fetchStories(value) {
  const res = await fetch(`${API_BASE}/api/story?${buildQuery(value)}`, { headers: { accept: "application/json" } });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned HTTP ${res.status}.`);
  }
  if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
  return data;
}

function downloadUrl(mediaUrl) {
  return `${API_BASE}/api/download?mediaUrl=${encodeURIComponent(mediaUrl)}`;
}

function timeAgo(iso) {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

function mediaElement(story, forViewer = false) {
  if (story.type === "video") {
    const v = document.createElement("video");
    v.src = story.mediaUrl;
    v.playsInline = true;
    v.muted = !forViewer;
    v.controls = forViewer;
    v.autoplay = forViewer;
    if (story.thumbnailUrl) v.poster = story.thumbnailUrl;
    return v;
  }
  const img = document.createElement("img");
  img.src = forViewer ? story.mediaUrl : story.thumbnailUrl || story.mediaUrl;
  img.alt = "Story";
  img.loading = "lazy";
  return img;
}

function render(data) {
  $("resultName").textContent = `@${data.username}`;
  $("avatar").textContent = data.username.charAt(0).toUpperCase();
  $("resultCount").textContent = `${data.stories.length} ${data.stories.length === 1 ? "story" : "stories"}`;
  $("modeBadge").hidden = !data.demo;

  grid.replaceChildren();
  if (!data.stories.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "No public stories right now.";
    grid.append(p);
  }

  for (const story of data.stories) {
    const card = document.createElement("article");
    card.className = "story";

    const thumb = document.createElement("button");
    thumb.className = "story__thumb";
    thumb.type = "button";
    thumb.setAttribute("aria-label", "Open story");
    thumb.append(mediaElement(story));
    thumb.addEventListener("click", () => openViewer(story));

    const meta = document.createElement("div");
    meta.className = "story__meta";
    const when = document.createElement("span");
    when.textContent = timeAgo(story.timestamp) || (story.type === "video" ? "Video" : "Photo");
    const dl = document.createElement("a");
    dl.className = "story__dl";
    dl.href = downloadUrl(story.mediaUrl);
    dl.textContent = "Download";
    meta.append(when, dl);

    card.append(thumb, meta);
    grid.append(card);
  }
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openViewer(story) {
  $("viewerMedia").replaceChildren(mediaElement(story, true));
  $("viewer").hidden = false;
}
function closeViewer() {
  $("viewer").hidden = true;
  $("viewerMedia").replaceChildren();
}
$("viewerClose").addEventListener("click", closeViewer);
$("viewer").addEventListener("click", (e) => { if (e.target.id === "viewer") closeViewer(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeViewer(); });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const value = input.value;
  if (!value.trim()) return;

  button.disabled = true;
  setStatus("Loading…");
  try {
    const data = await fetchStories(value);
    setStatus("");
    render(data);
    history.replaceState(null, "", `?u=${encodeURIComponent(data.username)}`);
  } catch (err) {
    results.hidden = true;
    setStatus(err.message, true);
  } finally {
    button.disabled = false;
  }
});

// Show whether the backend is in demo mode, and support links like /?u=name
fetch(`${API_BASE}/api/health`)
  .then((r) => r.json())
  .then((h) => { $("modeBadge").hidden = h.mode !== "demo"; })
  .catch(() => setStatus("Backend not reachable — are the Netlify Functions deployed?", true));

const initial = new URLSearchParams(location.search).get("u");
if (initial) {
  input.value = initial;
  form.requestSubmit();
}
