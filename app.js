// Openline KB — minimal client-side search and modal viewer.
// Loads articles.json once; everything else runs in memory.

const state = {
  articles: [],
  filtered: [],
  view: [],
  query: "",
  category: null,
  modalIndex: -1,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---------- Markdown → HTML (minimal, safe) ----------
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderMarkdown(md) {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let inUL = false, inOL = false, inTable = false, tableHead = false, para = [];

  const closePara = () => {
    if (para.length) {
      out.push(`<p>${inlineMd(para.join(" "))}</p>`);
      para = [];
    }
  };
  const closeLists = () => {
    if (inUL) { out.push("</ul>"); inUL = false; }
    if (inOL) { out.push("</ol>"); inOL = false; }
  };
  const closeTable = () => {
    if (inTable) { out.push("</tbody></table>"); inTable = false; tableHead = false; }
  };
  const closeAll = () => { closePara(); closeLists(); closeTable(); };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();
    // headings
    let m = line.match(/^(#{1,4})\s+(.+)$/);
    if (m) {
      closeAll();
      const level = m[1].length + 1;  // start at h2 so article title stays h1
      out.push(`<h${level}>${inlineMd(m[2])}</h${level}>`);
      continue;
    }
    // hr
    if (/^\s*---\s*$/.test(line)) {
      closeAll();
      out.push("<hr />");
      continue;
    }
    // tables
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line.slice(1, -1).split("|").map((c) => c.trim());
      // separator row
      if (/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(line)) { continue; }
      if (!inTable) {
        closePara(); closeLists();
        out.push('<table><thead><tr>' + cells.map((c) => `<th>${inlineMd(c)}</th>`).join("") + '</tr></thead><tbody>');
        inTable = true; tableHead = true;
        continue;
      }
      out.push("<tr>" + cells.map((c) => `<td>${inlineMd(c)}</td>`).join("") + "</tr>");
      continue;
    } else if (inTable && line.trim() === "") {
      closeTable();
      continue;
    }
    // unordered list
    m = line.match(/^\s*-\s+(.+)$/);
    if (m) {
      closePara();
      if (inOL) { out.push("</ol>"); inOL = false; }
      if (!inUL) { out.push("<ul>"); inUL = true; }
      out.push(`<li>${inlineMd(m[1])}</li>`);
      continue;
    }
    // ordered list
    m = line.match(/^\s*\d+\.\s+(.+)$/);
    if (m) {
      closePara();
      if (inUL) { out.push("</ul>"); inUL = false; }
      if (!inOL) { out.push("<ol>"); inOL = true; }
      out.push(`<li>${inlineMd(m[1])}</li>`);
      continue;
    }
    // blank line: close para/lists
    if (line.trim() === "") {
      closePara();
      closeLists();
      continue;
    }
    // paragraph
    if (inUL || inOL) { closeLists(); }
    para.push(line);
  }
  closeAll();
  return out.join("\n");
}

function inlineMd(s) {
  s = escapeHtml(s);
  // Links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => {
    const safe = u.startsWith("http") || u.startsWith("mailto:") || u.startsWith("/") || u.startsWith("#") ? u : "#";
    const ext = safe.startsWith("http") ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${safe}"${ext}>${t}</a>`;
  });
  // Bold **x**
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Code `x`
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}

// ---------- Search ----------
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
    // count body matches (cap at 5)
    let idx = 0, hits = 0;
    while ((idx = body.indexOf(t, idx)) !== -1 && hits < 5) { hits++; idx += t.length; }
    score += hits * 2;
  }
  return score;
}

function search() {
  const tokens = tokenize(state.query);
  let list = state.articles;
  if (state.category) list = list.filter((a) => a.category === state.category);
  if (!tokens.length) {
    state.view = list.slice();
    return;
  }
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
    return escapeHtml(stripMd(first).slice(0, 160)) + (first.length > 160 ? "…" : "");
  }
  // Find the first token occurrence in body
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

// ---------- Rendering ----------
function renderCategories() {
  const counts = new Map();
  for (const a of state.articles) counts.set(a.category, (counts.get(a.category) || 0) + 1);
  const cats = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const el = $("#cats");
  el.innerHTML = cats.map(([name, n]) =>
    `<button class="cat-btn${state.category === name ? " active" : ""}" data-cat="${escapeHtml(name)}">
       <span class="cat-name">${escapeHtml(name)}</span>
       <span class="cat-count">${n} articles</span>
     </button>`
  ).join("");
  el.querySelectorAll(".cat-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat;
      state.category = state.category === cat ? null : cat;
      renderCategories();
      updateResults();
    });
  });
}

function updateResults() {
  search();
  const grid = $("#grid");
  const tokens = tokenize(state.query);
  const empty = $("#empty");
  const title = $("#results-title");
  const count = $("#results-count");

  if (state.query) title.textContent = `Results for “${state.query}”`;
  else if (state.category) title.textContent = state.category;
  else title.textContent = "All articles";

  count.textContent = state.view.length ? `${state.view.length} article${state.view.length === 1 ? "" : "s"}` : "";

  if (!state.view.length) {
    grid.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  // Render at most 120 for perf, then a "show more"
  const LIMIT = 120;
  const slice = state.view.slice(0, LIMIT);
  grid.innerHTML = slice.map((a, i) =>
    `<li>
       <button class="card" data-idx="${state.view.indexOf(a)}" type="button">
         <span class="card-cat">${escapeHtml(a.category)}</span>
         <span class="card-title">${escapeHtml(a.title)}</span>
         <span class="card-snippet">${highlightSnippet(a, tokens)}</span>
       </button>
     </li>`
  ).join("");
  if (state.view.length > LIMIT) {
    grid.insertAdjacentHTML("beforeend",
      `<li style="grid-column: 1 / -1; text-align:center; padding: 14px; color: var(--ink-3); font-size: 14px;">
        Showing first ${LIMIT} of ${state.view.length} — refine your search to see more.
      </li>`);
  }
  grid.querySelectorAll(".card").forEach((el) => {
    el.addEventListener("click", () => openModal(parseInt(el.dataset.idx, 10)));
  });
}

// ---------- Modal ----------
function openModal(viewIndex) {
  if (viewIndex < 0 || viewIndex >= state.view.length) return;
  state.modalIndex = viewIndex;
  const a = state.view[viewIndex];
  document.body.classList.add("modal-open");
  $("#modal").hidden = false;
  const crumbs = a.subcategory
    ? `<span class="cat">${escapeHtml(a.category)}</span><span class="sep">›</span>${escapeHtml(a.subcategory)}`
    : `<span class="cat">${escapeHtml(a.category)}</span>`;
  $("#m-crumbs").innerHTML = crumbs;
  $("#m-title").textContent = a.title;
  $("#m-tags").innerHTML = (a.tags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("");
  $("#m-body").innerHTML = renderMarkdown(a.body);
  $(".modal-card").scrollTop = 0;
  $(".modal-card").focus();
  updateModalNav();
  // update hash
  history.replaceState(null, "", "#" + encodeURIComponent(a.slug));
}
function closeModal() {
  state.modalIndex = -1;
  $("#modal").hidden = true;
  document.body.classList.remove("modal-open");
  history.replaceState(null, "", location.pathname + location.search);
}
function updateModalNav() {
  $("#m-prev").disabled = state.modalIndex <= 0;
  $("#m-next").disabled = state.modalIndex >= state.view.length - 1;
}
function nav(delta) {
  const target = state.modalIndex + delta;
  if (target < 0 || target >= state.view.length) return;
  openModal(target);
}

// ---------- Event wiring ----------
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
  $("#footer-total").textContent = state.articles.length.toLocaleString();
  state.view = state.articles.slice();
  renderCategories();
  updateResults();

  // Hash deep-link
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

  $$(".quick button").forEach((b) => {
    b.addEventListener("click", () => {
      $("#q").value = b.dataset.q;
      state.query = b.dataset.q;
      $("#clear").hidden = false;
      updateResults();
      window.scrollTo({ top: $("#results").offsetTop - 80, behavior: "smooth" });
    });
  });

  document.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeModal));
  $("#m-prev").addEventListener("click", () => nav(-1));
  $("#m-next").addEventListener("click", () => nav(1));

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
