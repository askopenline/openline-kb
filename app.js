// Openline KB — in-app view switching (list ↔ article), chip filters,
// compact in-article search with inline results.

import { runSearch as _runSearch, tokenize, buildIndex, suggest as _suggest } from "./search.mjs";

const state = {
  articles: [],
  view: [],           // filtered/searched list used to power the list AND prev/next
  query: "",
  cats: new Set(),
  mode: "list",       // "list" | "article"
  currentSlug: null,
  currentIndex: -1,
  index: null,        // MiniSearch index over the corpus
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// --- Per-category color palette ---
const CATEGORY_COLORS = {
  "Getting started":         { fg: "#FF6A00", bg: "#FFF3E9" },
  "Installation":            { fg: "#2563EB", bg: "#EEF3FE" },
  "Devices & compatibility": { fg: "#7C3AED", bg: "#F3EEFE" },
  "Plans & coverage":        { fg: "#0891B2", bg: "#E6F6FA" },
  "Coverage by country":     { fg: "#0EA5A4", bg: "#E4F6F5" },
  "Payment & billing":       { fg: "#128A3D", bg: "#E3F4E8" },
  "Data usage":              { fg: "#9333EA", bg: "#F5ECFB" },
  "Troubleshooting":         { fg: "#B3261E", bg: "#FBE6E4" },
  "Account":                 { fg: "#E85E00", bg: "#FFEADC" },
  "App & website":           { fg: "#4F46E5", bg: "#ECECFB" },
  "Security & privacy":      { fg: "#334155", bg: "#EEF0F3" },
  "Legal & policy":          { fg: "#475569", bg: "#EFF1F4" },
  "Business & IoT":          { fg: "#0F766E", bg: "#E4F1EF" },
  "Referrals":               { fg: "#DB2777", bg: "#FCE9F2" },
  "Special use cases":       { fg: "#CA8A04", bg: "#FBF3D9" },
  "Technical":               { fg: "#1F2937", bg: "#EDEEF1" },
  "Support":                 { fg: "#E11D48", bg: "#FCE7EC" },
  "Company & brand":         { fg: "#B45309", bg: "#FBEEDA" },
};
const FALLBACK_COLOR = { fg: "#6B7280", bg: "#F1F2F5" };
function colorFor(cat) { return CATEGORY_COLORS[cat] || FALLBACK_COLOR; }
function categoryStyle(cat) {
  const c = colorFor(cat);
  return `--cat:${c.fg};--cat-bg:${c.bg}`;
}

// --- Markdown → HTML (minimal, safe) ---
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function renderMarkdown(md) {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let inUL = false, inOL = false, inTable = false, para = [];
  const closePara = () => { if (para.length) { out.push(`<p>${inlineMd(para.join(" "))}</p>`); para = []; } };
  const closeLists = () => {
    if (inUL) { out.push("</ul>"); inUL = false; }
    if (inOL) { out.push("</ol>"); inOL = false; }
  };
  const closeTable = () => { if (inTable) { out.push("</tbody></table>"); inTable = false; } };
  const closeAll = () => { closePara(); closeLists(); closeTable(); };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    let m = line.match(/^(#{1,4})\s+(.+)$/);
    if (m) { closeAll(); const level = m[1].length + 1; out.push(`<h${level}>${inlineMd(m[2])}</h${level}>`); continue; }
    if (/^\s*---\s*$/.test(line)) { closeAll(); out.push("<hr />"); continue; }
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line.slice(1, -1).split("|").map((c) => c.trim());
      if (/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(line)) continue;
      if (!inTable) {
        closePara(); closeLists();
        out.push('<table><thead><tr>' + cells.map((c) => `<th>${inlineMd(c)}</th>`).join("") + '</tr></thead><tbody>');
        inTable = true; continue;
      }
      out.push("<tr>" + cells.map((c) => `<td>${inlineMd(c)}</td>`).join("") + "</tr>");
      continue;
    } else if (inTable && line.trim() === "") { closeTable(); continue; }
    m = line.match(/^\s*-\s+(.+)$/);
    if (m) {
      closePara();
      if (inOL) { out.push("</ol>"); inOL = false; }
      if (!inUL) { out.push("<ul>"); inUL = true; }
      out.push(`<li>${inlineMd(m[1])}</li>`); continue;
    }
    m = line.match(/^\s*\d+\.\s+(.+)$/);
    if (m) {
      closePara();
      if (inUL) { out.push("</ul>"); inUL = false; }
      if (!inOL) { out.push("<ol>"); inOL = true; }
      out.push(`<li>${inlineMd(m[1])}</li>`); continue;
    }
    if (line.trim() === "") { closePara(); closeLists(); continue; }
    if (inUL || inOL) closeLists();
    para.push(line);
  }
  closeAll();
  return out.join("\n");
}
function inlineMd(s) {
  s = escapeHtml(s);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => {
    const safe = u.startsWith("http") || u.startsWith("mailto:") || u.startsWith("/") || u.startsWith("#") ? u : "#";
    const ext = safe.startsWith("http") ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${safe}"${ext}>${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}

// --- Search scoring ---
// The scoring/expansion/BM25 logic lives in `search.mjs` so it can be
// unit-audited from Node (`audit_search.mjs`) with identical behavior.
function runSearch(query, cats) {
  if (!state.index) state.index = buildIndex(state.articles);
  return _runSearch(query, state.articles, cats, state.index);
}
function suggest(query, limit = 6) {
  if (!state.index) state.index = buildIndex(state.articles);
  return _suggest(query, state.articles, state.index, limit);
}

function highlightSnippet(a, tokens) {
  if (!tokens.length) {
    const idx = a.body.indexOf("\n\n");
    const first = idx > 0 ? a.body.slice(0, idx) : a.body;
    return escapeHtml(stripMd(first).slice(0, 180)) + (first.length > 180 ? "…" : "");
  }
  const body = a.body;
  const lower = body.toLowerCase();
  let bestIdx = -1;
  for (const t of tokens) {
    const idx = lower.indexOf(t);
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) bestIdx = idx;
  }
  const start = Math.max(0, bestIdx - 60);
  const raw = body.slice(start, start + 220);
  const clean = stripMd(raw);
  const esc = escapeHtml(clean);
  const re = new RegExp("(" + tokens.map(reEsc).join("|") + ")", "ig");
  return (start > 0 ? "…" : "") + esc.replace(re, "<mark>$1</mark>") + "…";
}
function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function stripMd(s) {
  return s.replace(/^#+\s*/gm, "").replace(/[*_`>|]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
}

// --- List rendering ---
const TROUBLE_CATS = new Set(["Troubleshooting", "Support"]);

function rowHTML(a, tokens, idx) {
  const isTrouble = TROUBLE_CATS.has(a.category);
  return `<li>
    <button class="row kb ${isTrouble ? "err" : "ok"}" type="button" data-idx="${idx}" data-slug="${escapeHtml(a.slug)}" style="${categoryStyle(a.category)}">
      <span class="indicator" aria-hidden="true"></span>
      <div class="meta">
        <div class="name">${escapeHtml(a.title)}</div>
        <div class="snippet">${highlightSnippet(a, tokens)}</div>
      </div>
      <span class="badge">${escapeHtml(a.category)}</span>
    </button>
  </li>`;
}

function renderCategoryChips() {
  const counts = new Map();
  for (const a of state.articles) counts.set(a.category, (counts.get(a.category) || 0) + 1);
  const cats = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const el = $("#cats");
  el.innerHTML = cats.map(([name, n]) => {
    const active = state.cats.has(name);
    return `<button type="button" class="cat-btn${active ? " active" : ""}" data-cat="${escapeHtml(name)}" aria-pressed="${active}" style="${categoryStyle(name)}">
      <span class="cat-name">${escapeHtml(name)}</span>
      <span class="cat-count">${n} articles</span>
    </button>`;
  }).join("");
  el.querySelectorAll(".cat-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat;
      if (state.cats.has(cat)) state.cats.delete(cat);
      else state.cats.add(cat);
      renderCategoryChips();
      updateFilterSummary();
      updateResults();
    });
  });
  $("#filters-clear").disabled = state.cats.size === 0;
}

function updateFilterSummary() {
  const s = $("#filters-summary");
  const badge = $("#filters-count-badge");
  if (state.cats.size === 0) {
    s.textContent = "All categories";
    badge.hidden = true;
  } else if (state.cats.size === 1) {
    s.textContent = [...state.cats][0];
    badge.hidden = true;
  } else {
    s.textContent = "Categories";
    badge.textContent = state.cats.size;
    badge.hidden = false;
  }
}

function updateResults() {
  state.view = runSearch(state.query, state.cats);
  const list = $("#list");
  const tokens = tokenize(state.query);
  const empty = $("#empty");

  if (state.query) $("#results-title").textContent = `Results for “${state.query}”`;
  else if (state.cats.size === 1) $("#results-title").textContent = [...state.cats][0];
  else if (state.cats.size > 1) $("#results-title").textContent = `${state.cats.size} categories`;
  else $("#results-title").textContent = "All articles";

  $("#results-count").innerHTML = state.view.length
    ? `<strong>${state.view.length.toLocaleString()}</strong> ${state.view.length === 1 ? "article" : "articles"}`
    : "—";

  if (!state.view.length) {
    list.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  const LIMIT = 150;
  const slice = state.view.slice(0, LIMIT);
  list.innerHTML = slice.map((a, i) => rowHTML(a, tokens, state.view.indexOf(a))).join("");
  if (state.view.length > LIMIT) {
    list.insertAdjacentHTML("beforeend",
      `<li style="padding: 14px 20px; text-align:center; color: var(--ink-3); font-size: 13.5px; border-top: 1px solid var(--line-2);">
        Showing first ${LIMIT} of ${state.view.length.toLocaleString()} — refine your search or pick a filter to see the rest.
      </li>`);
  }
  list.querySelectorAll(".row").forEach((el) => {
    el.addEventListener("click", () => openArticleBySlug(el.dataset.slug, parseInt(el.dataset.idx, 10)));
  });
}

// --- Filter panel toggle ---
function setupFilterPanel() {
  const btn = $("#filters-toggle");
  const panel = $("#filters-panel");
  btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!open));
    panel.hidden = open;
  });
  $("#filters-clear").addEventListener("click", () => {
    state.cats.clear();
    renderCategoryChips();
    updateFilterSummary();
    updateResults();
  });
}

// --- Hero stats ---
function renderStats() {
  const total = state.articles.length;
  const cats = new Set(state.articles.map((a) => a.category)).size;
  const fixes = state.articles.filter((a) => TROUBLE_CATS.has(a.category)).length;
  const guides = total - fixes;
  const set = (id, v) => { const el = $("#" + id); if (el) el.textContent = v.toLocaleString(); };
  set("stat-total", total);
  set("stat-guides", guides);
  set("stat-fixes", fixes);
  set("stat-cats", cats);
  const ft = $("#footer-total"); if (ft) ft.textContent = total.toLocaleString();
}

// --- Article view (in-app) ---
function showView(mode) {
  state.mode = mode;
  const isList = mode === "list";
  $("#view-list").hidden = !isList;
  $("#view-article").hidden = isList;
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function openArticleBySlug(slug, indexHint) {
  let idx = state.view.findIndex((a) => a.slug === slug);
  let article;
  if (idx >= 0) {
    article = state.view[idx];
  } else {
    // slug not in current view (deep-link or from inline search across all)
    article = state.articles.find((a) => a.slug === slug);
    if (!article) return;
  }
  renderArticle(article);
  state.currentSlug = slug;
  state.currentIndex = idx;
  history.replaceState(null, "", "#" + encodeURIComponent(slug));
  showView("article");
}

function renderArticle(a) {
  const view = $("#article-view");
  view.setAttribute("style", categoryStyle(a.category));

  const crumbs = a.subcategory
    ? `${escapeHtml(a.category)}<span class="sep"> › </span>${escapeHtml(a.subcategory)}`
    : escapeHtml(a.category);
  $("#article-crumbs").innerHTML = crumbs;
  $("#article-eyebrow").textContent = a.category;
  $("#article-title").textContent = a.title;
  $("#article-tags").innerHTML = (a.tags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("");
  $("#article-body").innerHTML = renderMarkdown(a.body);

  // Related — rank other articles by shared tags first, then shared
  // subcategory, then shared category. This surfaces topic-relevant articles
  // (e.g. all "gift" articles next to a gifting one) instead of just any
  // sibling in the same broad category.
  const aTags = new Set((a.tags || []).map((t) => t.toLowerCase()));
  const aSub = (a.subcategory || "").toLowerCase();
  const scoreRelated = (x) => {
    if (x.slug === a.slug) return -1;
    let s = 0;
    const xTags = (x.tags || []).map((t) => t.toLowerCase());
    for (const t of xTags) if (aTags.has(t)) s += 10;
    if ((x.subcategory || "").toLowerCase() === aSub && aSub) s += 6;
    if (x.category === a.category) s += 3;
    return s;
  };
  const related = state.articles
    .map((x) => ({ x, s: scoreRelated(x) }))
    .filter((r) => r.s > 0)
    .sort((r1, r2) => r2.s - r1.s)
    .slice(0, 5)
    .map((r) => r.x);
  const rel = $("#article-related");
  const relList = $("#article-related-list");
  if (related.length) {
    relList.innerHTML = related.map((x, i) => rowHTML(x, [], -1)).join("");
    relList.querySelectorAll(".row").forEach((el) => {
      el.addEventListener("click", () => openArticleBySlug(el.dataset.slug));
    });
    rel.hidden = false;
  } else {
    rel.hidden = true;
  }

  updateArticleNav();
}

function updateArticleNav() {
  const prev = $("#article-prev");
  const next = $("#article-next");
  if (state.currentIndex < 0) {
    // Article opened outside the current view (deep link) — nav disabled
    prev.disabled = true; next.disabled = true;
    return;
  }
  prev.disabled = state.currentIndex <= 0;
  next.disabled = state.currentIndex >= state.view.length - 1;
}

function nav(delta) {
  if (state.currentIndex < 0) return;
  const target = state.currentIndex + delta;
  if (target < 0 || target >= state.view.length) return;
  const a = state.view[target];
  state.currentIndex = target;
  state.currentSlug = a.slug;
  history.replaceState(null, "", "#" + encodeURIComponent(a.slug));
  renderArticle(a);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backToList() {
  state.currentSlug = null;
  state.currentIndex = -1;
  history.replaceState(null, "", location.pathname + location.search);
  showView("list");
  // Re-focus the main search
  const q = $("#q");
  if (q) q.focus({ preventScroll: true });
}

// --- Compact in-article search dropdown ---
function setupCompactSearch() {
  const q2 = $("#q2");
  const dropdown = $("#search-inline-results");

  const runInline = debounce(() => {
    const query = q2.value.trim();
    if (!query) { dropdown.hidden = true; return; }
    const results = runSearch(query, null).slice(0, 10);
    const tokens = tokenize(query);
    if (!results.length) {
      dropdown.innerHTML = `<div class="empty-inline">No article matches “${escapeHtml(query)}”.</div>`;
    } else {
      // Also make these rows keep the article-view context by clicking to open
      dropdown.innerHTML = results.map((a) => rowHTML(a, tokens, -1)).join("");
      dropdown.querySelectorAll(".row").forEach((el) => {
        el.addEventListener("mousedown", (ev) => {
          ev.preventDefault(); // avoid input losing focus first
          openArticleBySlug(el.dataset.slug);
          q2.value = "";
          dropdown.hidden = true;
        });
      });
    }
    dropdown.hidden = false;
  }, 90);

  q2.addEventListener("input", runInline);
  q2.addEventListener("focus", () => { if (q2.value.trim()) runInline(); });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap--compact")) dropdown.hidden = true;
  });
  // "Enter" → jump to standalone list with the same query
  q2.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const query = q2.value.trim();
      if (!query) return;
      state.query = query;
      $("#q").value = query;
      $("#clear").hidden = false;
      updateResults();
      backToList();
    } else if (e.key === "Escape") {
      dropdown.hidden = true;
    }
  });
}

// --- Hero autosuggest ---
let _suggestActive = -1;
let _suggestItems = [];

function escapeReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

// Wrap query tokens in <mark> tags in a title (case-insensitive, accent-fold).
function highlightTitle(title, query) {
  const tokens = tokenize(query).filter((t) => t.length >= 2);
  if (!tokens.length) return escapeHtml(title);
  // Build a fold map from normalized index → original char
  const normed = title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  // Merge overlapping ranges
  const ranges = [];
  for (const t of tokens) {
    let i = 0;
    while ((i = normed.indexOf(t, i)) !== -1) {
      ranges.push([i, i + t.length]);
      i += t.length;
    }
  }
  if (!ranges.length) return escapeHtml(title);
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const [s, e] = ranges[i];
    const last = merged[merged.length - 1];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  let out = "";
  let cursor = 0;
  for (const [s, e] of merged) {
    out += escapeHtml(title.slice(cursor, s));
    out += "<mark>" + escapeHtml(title.slice(s, e)) + "</mark>";
    cursor = e;
  }
  out += escapeHtml(title.slice(cursor));
  return out;
}

function renderHeroSuggest(query) {
  const dropdown = $("#hero-suggest");
  const input = $("#q");
  if (!dropdown) return;
  const q = (query || "").trim();
  if (q.length < 2) {
    hideHeroSuggest();
    return;
  }
  _suggestItems = suggest(q, 6);
  if (!_suggestItems.length) {
    dropdown.innerHTML = `<div class="suggest-empty">No article matches “${escapeHtml(q)}”. Try a broader term.</div>`;
    dropdown.hidden = false;
    input.setAttribute("aria-expanded", "true");
    return;
  }
  const rows = _suggestItems.map((a, i) => {
    const c = colorFor(a.category);
    return `<div class="suggest-item" role="option" data-slug="${escapeHtml(a.slug)}" data-idx="${i}" aria-selected="false" style="--cat:${c.fg}">
      <span class="suggest-dot" aria-hidden="true"></span>
      <span class="suggest-title">${highlightTitle(a.title, q)}</span>
      <span class="suggest-cat">${escapeHtml(a.category)}</span>
    </div>`;
  }).join("");
  dropdown.innerHTML = rows + `<div class="suggest-footer"><span>${_suggestItems.length} of ${state.articles.length.toLocaleString()} articles</span><span><kbd>↑↓</kbd> navigate   <kbd>Enter</kbd> open</span></div>`;
  dropdown.hidden = false;
  input.setAttribute("aria-expanded", "true");
  _suggestActive = -1;

  // Click handlers
  dropdown.querySelectorAll(".suggest-item").forEach((el) => {
    el.addEventListener("mousedown", (ev) => {
      ev.preventDefault();
      openArticleBySlug(el.dataset.slug);
      hideHeroSuggest();
    });
    el.addEventListener("mousemove", () => setSuggestActive(parseInt(el.dataset.idx, 10)));
  });
}

function hideHeroSuggest() {
  const dropdown = $("#hero-suggest");
  const input = $("#q");
  if (dropdown) dropdown.hidden = true;
  if (input) input.setAttribute("aria-expanded", "false");
  _suggestActive = -1;
  _suggestItems = [];
}

function setSuggestActive(idx) {
  const dropdown = $("#hero-suggest");
  if (!dropdown) return;
  const items = dropdown.querySelectorAll(".suggest-item");
  if (!items.length) return;
  _suggestActive = ((idx % items.length) + items.length) % items.length;
  items.forEach((el, i) => el.setAttribute("aria-selected", i === _suggestActive ? "true" : "false"));
  items[_suggestActive].scrollIntoView({ block: "nearest" });
}

function wireHeroSuggest() {
  const input = $("#q");
  const dropdown = $("#hero-suggest");
  if (!input || !dropdown) return;

  const runSuggest = debounce(() => renderHeroSuggest(input.value), 60);
  input.addEventListener("input", runSuggest);
  input.addEventListener("focus", () => { if (input.value.trim().length >= 2) renderHeroSuggest(input.value); });

  input.addEventListener("keydown", (e) => {
    if (dropdown.hidden || !_suggestItems.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSuggestActive(_suggestActive + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSuggestActive(_suggestActive - 1); }
    else if (e.key === "Enter" && _suggestActive >= 0) {
      e.preventDefault();
      const a = _suggestItems[_suggestActive];
      if (a) { openArticleBySlug(a.slug); hideHeroSuggest(); }
    } else if (e.key === "Escape") {
      hideHeroSuggest();
    }
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) hideHeroSuggest();
  });
}

// --- Boot ---
function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

async function boot() {
  try {
    const res = await fetch("./articles.json", { cache: "force-cache" });
    state.articles = await res.json();
  } catch (e) {
    console.error("Failed to load articles.json", e);
    $("#empty").hidden = false;
    return;
  }
  state.view = state.articles.slice();
  renderStats();
  renderCategoryChips();
  updateFilterSummary();
  setupFilterPanel();
  setupCompactSearch();
  updateResults();

  // Deep-link handling
  const openFromHash = () => {
    if (location.hash) {
      const slug = decodeURIComponent(location.hash.slice(1));
      const idx = state.view.findIndex((a) => a.slug === slug);
      openArticleBySlug(slug, idx);
    }
  };
  openFromHash();
  window.addEventListener("hashchange", openFromHash);

  const debounced = debounce(() => {
    state.query = $("#q").value.trim();
    $("#clear").hidden = !state.query;
    updateResults();
  }, 90);
  $("#q").addEventListener("input", debounced);
  $("#clear").addEventListener("click", () => {
    $("#q").value = ""; state.query = ""; $("#clear").hidden = true; updateResults(); $("#q").focus();
    hideHeroSuggest();
  });

  // Hero autosuggest wiring
  wireHeroSuggest();

  // Empty-state actions
  document.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", () => {
      if (el.dataset.action === "reset-filters") {
        state.cats.clear();
        renderCategoryChips();
        updateFilterSummary();
      } else if (el.dataset.action === "clear-search") {
        $("#q").value = ""; state.query = ""; $("#clear").hidden = true;
      }
      updateResults();
    });
  });

  // Article view controls
  $("#btn-back").addEventListener("click", backToList);
  $("#article-prev").addEventListener("click", () => nav(-1));
  $("#article-next").addEventListener("click", () => nav(1));

  document.addEventListener("keydown", (e) => {
    if (state.mode === "article") {
      if (e.key === "Escape") { backToList(); return; }
      if (document.activeElement && document.activeElement.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") nav(-1);
      else if (e.key === "ArrowRight") nav(1);
    } else {
      if (e.key === "/" && document.activeElement !== $("#q")) {
        e.preventDefault(); $("#q").focus();
      }
    }
  });
}

boot();
