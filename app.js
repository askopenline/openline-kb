// Openline KB — client-side search, filters, and full-screen article modal.
// Structure and class names mirror check.openline.com so both apps share
// the exact same look and behaviour.

const state = {
  articles: [],
  view: [],
  query: "",
  cats: new Set(),
  modalIndex: -1,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// --- Per-category color palette (colored row dot, badge, modal accent) ---
const CATEGORY_COLORS = {
  "Getting started":         { fg: "#FF6A00", bg: "#FFF3E9" }, // Openline orange
  "Installation":            { fg: "#2563EB", bg: "#EEF3FE" },
  "Devices & compatibility": { fg: "#7C3AED", bg: "#F3EEFE" },
  "Plans & coverage":        { fg: "#0891B2", bg: "#E6F6FA" },
  "Coverage by country":     { fg: "#0EA5A4", bg: "#E4F6F5" },
  "Payment & billing":       { fg: "#128A3D", bg: "#E3F4E8" }, // Openline green
  "Data usage":              { fg: "#9333EA", bg: "#F5ECFB" },
  "Troubleshooting":         { fg: "#B3261E", bg: "#FBE6E4" }, // Openline red
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

// --- Search ---
function tokenize(q) {
  return q.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]+/g) || [];
}
function scoreArticle(a, tokens) {
  if (!tokens.length) return 0;
  const title = a.title.toLowerCase();
  const cat = (a.category + " " + (a.subcategory || "")).toLowerCase();
  const tags = (a.tags || []).join(" ").toLowerCase();
  const body = a.body.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (title === t) score += 100;
    if (title.startsWith(t)) score += 40;
    if (title.includes(t)) score += 20;
    if (cat.includes(t)) score += 8;
    if (tags.includes(t)) score += 10;
    let idx = 0, hits = 0;
    while ((idx = body.indexOf(t, idx)) !== -1 && hits < 5) { hits++; idx += t.length; }
    score += hits * 2;
  }
  return score;
}
function search() {
  const tokens = tokenize(state.query);
  let list = state.articles;
  if (state.cats.size) list = list.filter((a) => state.cats.has(a.category));
  if (!tokens.length) { state.view = list.slice(); return; }
  const scored = [];
  for (const a of list) {
    const s = scoreArticle(a, tokens);
    if (s > 0) scored.push({ a, s });
  }
  scored.sort((x, y) => y.s - x.s);
  state.view = scored.map((x) => x.a);
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

// --- Rendering ---
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

const TROUBLE_CATS = new Set(["Troubleshooting", "Support"]);

function updateResults() {
  search();
  const list = $("#list");
  const tokens = tokenize(state.query);
  const empty = $("#empty");

  // Header
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
  list.innerHTML = slice.map((a) => {
    const isTrouble = TROUBLE_CATS.has(a.category);
    return `<li>
      <button class="row kb ${isTrouble ? "err" : "ok"}" type="button" data-idx="${state.view.indexOf(a)}" style="${categoryStyle(a.category)}">
        <span class="indicator" aria-hidden="true"></span>
        <div class="meta">
          <div class="name">${escapeHtml(a.title)}</div>
          <div class="snippet">${highlightSnippet(a, tokens)}</div>
        </div>
        <span class="badge">${escapeHtml(a.category)}</span>
      </button>
    </li>`;
  }).join("");
  if (state.view.length > LIMIT) {
    list.insertAdjacentHTML("beforeend",
      `<li style="padding: 14px 20px; text-align:center; color: var(--ink-3); font-size: 13.5px; border-top: 1px solid var(--line-2);">
        Showing first ${LIMIT} of ${state.view.length.toLocaleString()} — refine your search or pick a filter to see the rest.
      </li>`);
  }
  list.querySelectorAll(".row").forEach((el) => {
    el.addEventListener("click", () => openModal(parseInt(el.dataset.idx, 10)));
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
  $("#footer-total").textContent = total.toLocaleString();
}

// --- Modal ---
function openModal(viewIndex) {
  if (viewIndex < 0 || viewIndex >= state.view.length) return;
  state.modalIndex = viewIndex;
  const a = state.view[viewIndex];
  document.body.classList.add("modal-open");
  $("#modal").hidden = false;

  // Apply category color as CSS var to the article container
  const view = document.querySelector(".article-view");
  view.setAttribute("style", categoryStyle(a.category));

  const crumbs = a.subcategory
    ? `${escapeHtml(a.category)}<span class="sep">›</span>${escapeHtml(a.subcategory)}`
    : escapeHtml(a.category);
  $("#article-crumbs").innerHTML = crumbs;
  $("#article-eyebrow").textContent = a.category;
  $("#article-title").textContent = a.title;
  $("#article-tags").innerHTML = (a.tags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("");
  $("#article-body").innerHTML = renderMarkdown(a.body);
  document.querySelector(".modal-card").scrollTop = 0;
  updateModalNav();
  history.replaceState(null, "", "#" + encodeURIComponent(a.slug));
}
function closeModal() {
  state.modalIndex = -1;
  $("#modal").hidden = true;
  document.body.classList.remove("modal-open");
  history.replaceState(null, "", location.pathname + location.search);
}
function updateModalNav() {
  $("#article-prev").disabled = state.modalIndex <= 0;
  $("#article-next").disabled = state.modalIndex >= state.view.length - 1;
}
function nav(delta) {
  const target = state.modalIndex + delta;
  if (target < 0 || target >= state.view.length) return;
  openModal(target);
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
  updateResults();

  if (location.hash) {
    const slug = decodeURIComponent(location.hash.slice(1));
    const idx = state.view.findIndex((a) => a.slug === slug);
    if (idx >= 0) openModal(idx);
  }

  const debounced = debounce(() => {
    state.query = $("#q").value.trim();
    $("#clear").hidden = !state.query;
    updateResults();
  }, 90);
  $("#q").addEventListener("input", debounced);
  $("#clear").addEventListener("click", () => {
    $("#q").value = ""; state.query = ""; $("#clear").hidden = true; updateResults(); $("#q").focus();
  });

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

  document.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeModal));
  $("#article-prev").addEventListener("click", () => nav(-1));
  $("#article-next").addEventListener("click", () => nav(1));

  document.addEventListener("keydown", (e) => {
    if ($("#modal").hidden) {
      if (e.key === "/" && document.activeElement !== $("#q")) {
        e.preventDefault(); $("#q").focus();
      }
      return;
    }
    if (e.key === "Escape") closeModal();
    else if (e.key === "ArrowLeft") nav(-1);
    else if (e.key === "ArrowRight") nav(1);
  });
}

boot();
