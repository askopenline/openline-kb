// Openline KB — in-app view switching (list ↔ article), chip filters,
// compact in-article search with inline results.

// Dynamic import so search.mjs cache-busts with the same version as app.js.
// The browser resolves this URL fresh on every app.js load; if app.js is a
// new version (via ?v= bust), search.mjs URL uses that same version too.
const APP_VER = new URL(import.meta.url).searchParams.get("v") || "0";
const _searchMod = await import(`./search.mjs?v=${APP_VER}`);
const _runSearch = _searchMod.runSearch;
const tokenize = _searchMod.tokenize;
const buildIndex = _searchMod.buildIndex;
const _suggest = _searchMod.suggest;

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

// Shared rendering helpers (also used by server.mjs for server-side rendering).
const _render = await import(`./render.mjs?v=${APP_VER}`);
const { CATEGORY_COLORS, colorFor, categoryStyle, escapeHtml, renderMarkdown, inlineMd, articlePath: _articlePath, categoryPath: _categoryPath, homePath, slugifyCategory, plainSummary, TROUBLE_CATS, crumbsHTML, relatedArticles, fmt, pluralArticles } = _render;

// --- Language ---
// The server embeds the active language, its UI strings and category labels
// in <script id="kb-i18n">. English strings in the HTML are the fallback.
const BOOT = (() => { try { return JSON.parse(document.getElementById("kb-i18n").textContent); } catch (_) { return null; } })() || {};
const PREFIX = BOOT.prefix || "";
const LOCALE = BOOT.hreflang || "en";
const UI = BOOT.ui || {};
const t = (key, vars) => fmt(UI[key] ?? key, vars);
const nArticles = (n) => pluralArticles(n, BOOT.plural, LOCALE);
const num = (n) => Number(n).toLocaleString(LOCALE + "-u-nu-latn");
const catLabel = (c) => (BOOT.cats && BOOT.cats[c]) || c;
const articlePath = (slug) => _articlePath(slug, PREFIX);
const categoryPath = (cat) => _categoryPath(cat, PREFIX);

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

function rowHTML(a, tokens, idx) {
  const isTrouble = TROUBLE_CATS.has(a.category);
  return `<li>
    <a class="row kb ${isTrouble ? "err" : "ok"}" href="${articlePath(a.slug)}" data-idx="${idx}" data-slug="${escapeHtml(a.slug)}" style="${categoryStyle(a.category)}">
      <span class="indicator" aria-hidden="true"></span>
      <div class="meta">
        <div class="name">${escapeHtml(a.title)}</div>
        <div class="snippet">${highlightSnippet(a, tokens)}</div>
      </div>
      <span class="badge">${escapeHtml(catLabel(a.category))}</span>
    </a>
  </li>`;
}

function renderCategoryChips() {
  const counts = new Map();
  for (const a of state.articles) counts.set(a.category, (counts.get(a.category) || 0) + 1);
  const cats = [...counts.entries()].sort((a, b) => catLabel(a[0]).localeCompare(catLabel(b[0]), LOCALE));
  const el = $("#cats");
  el.innerHTML = cats.map(([name, n]) => {
    const active = state.cats.has(name);
    return `<button type="button" class="cat-btn${active ? " active" : ""}" data-cat="${escapeHtml(name)}" aria-pressed="${active}" style="${categoryStyle(name)}">
      <span class="cat-name">${escapeHtml(catLabel(name))}</span>
      <span class="cat-count">${escapeHtml(nArticles(n))}</span>
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
    s.textContent = t("all_categories");
    badge.hidden = true;
  } else if (state.cats.size === 1) {
    s.textContent = catLabel([...state.cats][0]);
    badge.hidden = true;
  } else {
    s.textContent = t("categories");
    badge.textContent = state.cats.size;
    badge.hidden = false;
  }
}

function updateResults() {
  state.view = runSearch(state.query, state.cats);
  const list = $("#list");
  const tokens = tokenize(state.query);
  const empty = $("#empty");

  // isFallback = true means the query didn't match anything and we're
  // showing popular articles instead. UI should tell the user.
  const isFallback = !!state.view.isFallback;

  if (state.query && isFallback) {
    $("#results-title").textContent = t("no_exact_match_for", { q: state.query });
  } else if (state.query) {
    $("#results-title").textContent = t("results_for", { q: state.query });
  } else if (state.cats.size === 1) {
    $("#results-title").textContent = catLabel([...state.cats][0]);
  } else if (state.cats.size > 1) {
    $("#results-title").textContent = t("n_categories", { n: state.cats.size });
  } else {
    $("#results-title").textContent = t("all_articles");
  }

  $("#results-count").innerHTML = state.view.length && !isFallback
    ? escapeHtml(nArticles(state.view.length)).replace(escapeHtml(num(state.view.length)), `<strong>${num(state.view.length)}</strong>`)
    : (isFallback ? escapeHtml(t("popular")) : "—");

  // With the new search, view should always be non-empty. Keep this as a
  // paranoid safety net for edge cases (all articles filtered out by cat).
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
        ${escapeHtml(t("showing_first", { limit: num(LIMIT), total: num(state.view.length) }))}
      </li>`);
  }
  list.querySelectorAll(".row").forEach((el) => {
    el.addEventListener("click", (e) => { if (isModClick(e)) return; e.preventDefault(); openArticleBySlug(el.dataset.slug, parseInt(el.dataset.idx, 10), true); });
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
  const set = (id, v) => { const el = $("#" + id); if (el) el.textContent = num(v); };
  set("stat-total", total);
  set("stat-guides", guides);
  set("stat-fixes", fixes);
  set("stat-cats", cats);
  const ft = $("#footer-total"); if (ft) ft.textContent = num(total);
}

// --- Article view (in-app) ---
function showView(mode) {
  state.mode = mode;
  const isList = mode === "list";
  $("#view-list").hidden = !isList;
  $("#view-article").hidden = isList;
  scrollToTop();
}

// Scroll every plausible scroll container to top so opening a new article
// always starts at its title. Handles: standalone page (window), modal embed
// (.modal-card is the scrolling ancestor), and any iframe-parent that
// scrolled the host page down before we opened.
function scrollToTop() {
  const behavior = "instant" in window ? "instant" : "auto";
  try { window.scrollTo({ top: 0, left: 0, behavior }); } catch (_) { window.scrollTo(0, 0); }
  // Modal-preview embed and any other CSS overflow-auto ancestor.
  const scrollables = document.querySelectorAll(
    ".modal-card, .kb-inner, main, #view-article, #view-list, body, html"
  );
  for (const el of scrollables) {
    if (el && typeof el.scrollTo === "function") {
      try { el.scrollTo({ top: 0, left: 0, behavior }); } catch (_) { el.scrollTop = 0; }
    } else if (el) {
      el.scrollTop = 0;
    }
  }
  // Ask the parent page (if we're iframed on openline.com) to reset its scroll too.
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "openline-kb:scroll-top" }, "*");
    }
  } catch (_) { /* cross-origin — ignore */ }
  // Second pass after paint: article body may not be laid out yet on the
  // first scroll, so retry after the next frame. Cheap and idempotent.
  requestAnimationFrame(() => {
    for (const el of document.querySelectorAll(".modal-card, .kb-inner, main")) {
      if (el) el.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  });
}

// --- Routing ---
// Standalone site: real URLs (/slug, /category/x) so every article is
// indexable and shareable. Modal preview page keeps hash routing (#slug).
const PATH_ROUTING = !/modal-preview/.test(location.pathname);
const SITE = "https://kb.openline.com";
const HOME_TITLE = t("home_title");
const HOME_DESC = document.querySelector('meta[name="description"]')?.content || "";
function isModClick(e) { return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1; }
function setUrl(url, push) {
  if (location.pathname + location.search + location.hash === url) return;
  history[push ? "pushState" : "replaceState"](null, "", url);
  syncLangLinks();
}

// --- Language switcher ---
// Every option links to the same page in that language; links are refreshed
// whenever the in-app URL changes.
function syncLangLinks() {
  const box = document.querySelector("[data-lang-switch]");
  if (!box) return;
  const rest = PATH_ROUTING ? restOf(location.pathname) : "";
  box.querySelectorAll("a[data-lang]").forEach((a) => {
    const code = a.dataset.lang, p = code === "en" ? "" : "/" + code;
    if (PATH_ROUTING) a.href = (p + (rest === "/" ? "/" : rest)) || "/";
    else a.href = "/modal-preview.html" + (p ? "?lang=" + code : "") + (location.hash || "");
  });
}
function setupLangSwitch() {
  const box = document.querySelector("[data-lang-switch]");
  if (!box) return;
  const btn = box.querySelector(".lang-btn"), menu = box.querySelector(".lang-menu");
  const items = () => [...menu.querySelectorAll("a")];
  const open = (focusCurrent) => {
    menu.hidden = false; btn.setAttribute("aria-expanded", "true");
    if (focusCurrent) (menu.querySelector('[aria-current="true"]') || items()[0]).focus();
  };
  const close = (refocus) => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); if (refocus) btn.focus(); };
  btn.addEventListener("click", () => (menu.hidden ? open(false) : close(false)));
  btn.addEventListener("keydown", (e) => { if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); open(true); } });
  menu.addEventListener("keydown", (e) => {
    const list = items(), i = list.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); list[(i + 1) % list.length].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    else if (e.key === "Escape") { e.preventDefault(); close(true); }
    else if (e.key === "Tab") close(false);
  });
  document.addEventListener("click", (e) => { if (!box.contains(e.target)) close(false); });
  menu.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-lang]");
    if (a) try { localStorage.setItem("kb-lang", a.dataset.lang); } catch (_) {}
  });
  syncLangLinks();
}
function setMeta(title, desc, path) {
  document.title = title;
  const set = (sel, attr, v) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, v); };
  set('meta[name="description"]', "content", desc);
  set('link[rel="canonical"]', "href", SITE + path);
  set('meta[property="og:title"]', "content", title);
  set('meta[property="og:description"]', "content", desc);
  set('meta[property="og:url"]', "content", SITE + path);
}
// Path without the language prefix: "/fr/category/x" → "/category/x".
function restOf(pathname) {
  if (PREFIX && (pathname === PREFIX || pathname.startsWith(PREFIX + "/"))) return pathname.slice(PREFIX.length) || "/";
  return pathname;
}
function articleUrl(slug) { return PATH_ROUTING ? articlePath(slug) : "#" + encodeURIComponent(slug); }
function listUrl() { return PATH_ROUTING ? homePath(PREFIX) : location.pathname + location.search; }

function openArticleBySlug(slug, indexHint, push) {
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
  setUrl(articleUrl(slug), push);
  setMeta(`${article.title} · ${t("help_suffix")}`, plainSummary(article.body), articlePath(slug));
  showView("article");
}

function renderArticle(a) {
  const view = $("#article-view");
  view.setAttribute("style", categoryStyle(a.category));

  $("#article-crumbs").innerHTML = crumbsHTML(a, PREFIX, catLabel);
  $("#article-eyebrow").textContent = catLabel(a.category);
  $("#article-title").textContent = a.title;
  $("#article-tags").innerHTML = (a.tags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("");
  $("#article-body").innerHTML = renderMarkdown(a.body, PREFIX);

  const related = relatedArticles(a, state.articles);
  const rel = $("#article-related");
  const relList = $("#article-related-list");
  if (related.length) {
    relList.innerHTML = related.map((x, i) => rowHTML(x, [], -1)).join("");
    relList.querySelectorAll(".row").forEach((el) => {
      el.addEventListener("click", (e) => { if (isModClick(e)) return; e.preventDefault(); openArticleBySlug(el.dataset.slug, undefined, true); });
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
  setUrl(articleUrl(a.slug), false);
  setMeta(`${a.title} · ${t("help_suffix")}`, plainSummary(a.body), articlePath(a.slug));
  renderArticle(a);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backToList() {
  state.currentSlug = null;
  state.currentIndex = -1;
  setUrl(listUrl(), true);
  setMeta(HOME_TITLE, HOME_DESC, homePath(PREFIX));
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
      dropdown.innerHTML = `<div class="empty-inline">${escapeHtml(t("no_article_matches", { q: query }))}</div>`;
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
    dropdown.innerHTML = `<div class="suggest-empty">${escapeHtml(t("type_to_search"))}</div>`;
    dropdown.hidden = false;
    input.setAttribute("aria-expanded", "true");
    return;
  }
  const rows = _suggestItems.map((a, i) => {
    const c = colorFor(a.category);
    return `<div class="suggest-item" role="option" data-slug="${escapeHtml(a.slug)}" data-idx="${i}" aria-selected="false" style="--cat:${c.fg}">
      <span class="suggest-dot" aria-hidden="true"></span>
      <span class="suggest-title">${(_suggestItems.isFallback ? escapeHtml(a.title) : highlightTitle(a.title, q))}</span>
      <span class="suggest-cat">${escapeHtml(catLabel(a.category))}</span>
    </div>`;
  }).join("");
  const isFallback = !!_suggestItems.isFallback;
  const footerLeft = isFallback ? t("no_exact_popular") : t("n_of_total", { n: num(_suggestItems.length), total: num(state.articles.length) });
  dropdown.innerHTML = rows + `<div class="suggest-footer"><span>${escapeHtml(footerLeft)}</span><span><kbd>↑↓</kbd> ${escapeHtml(t("kbd_navigate"))} <kbd>Enter</kbd> ${escapeHtml(t("kbd_open"))}</span></div>`;
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
    // Version-tag the JSON fetch so cache-busts on app.js also invalidate
    // the article payload. Users get fresh content on every deploy without
    // paying the download cost on repeat visits (long max-age still applies).
    const res = await fetch(BOOT.articles || `/articles.json?v=${APP_VER}`);
    state.articles = await res.json();
    for (const a of state.articles) a.catLabel = catLabel(a.category);
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

  // Deep-link handling: /slug, /category/x, legacy #slug and ?a=slug.
  const bySlug = new Map(state.articles.map((a) => [a.slug, a]));
  const catBySlug = new Map(state.articles.map((a) => [slugifyCategory(a.category), a.category]));
  const route = () => {
    const legacy = location.hash ? decodeURIComponent(location.hash.slice(1)) : new URLSearchParams(location.search).get("a");
    if (legacy && bySlug.has(legacy)) { openArticleBySlug(legacy, undefined, false); return; }
    if (!PATH_ROUTING) { if (state.mode !== "list") { state.currentSlug = null; state.currentIndex = -1; showView("list"); } return; }
    const path = restOf(decodeURIComponent(location.pathname)).replace(/\/+$/, "");
    const cm = path.match(/^\/category\/([a-z0-9-]+)$/);
    if (cm && catBySlug.has(cm[1])) {
      state.cats = new Set([catBySlug.get(cm[1])]);
      renderCategoryChips(); updateFilterSummary(); updateResults();
      if (state.mode !== "list") showView("list");
      return;
    }
    const slug = path.slice(1);
    if (slug && bySlug.has(slug)) { openArticleBySlug(slug, undefined, false); return; }
    if (state.mode !== "list") { state.currentSlug = null; state.currentIndex = -1; showView("list"); }
  };
  route();
  setupLangSwitch();
  // Sitelinks search box / shared searches: /?q=term pre-fills the search.
  const q0 = new URLSearchParams(location.search).get("q");
  if (q0 && state.mode === "list") { $("#q").value = q0; state.query = q0.trim(); $("#clear").hidden = !state.query; updateResults(); }
  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);

  // In-article links to other articles (/slug) open in-app instead of reloading.
  document.addEventListener("click", (e) => {
    const link = e.target.closest && e.target.closest("#article-body a[href^='/'], #article-crumbs a, .footer-cats a[href^='/']");
    if (!link || isModClick(e)) return;
    const u = new URL(link.href, location.href);
    if (u.origin !== location.origin) return;
    const rest = restOf(decodeURIComponent(u.pathname));
    const slug = rest.slice(1);
    const legacy = u.searchParams.get("a");
    const target = bySlug.has(slug) ? slug : (legacy && bySlug.has(legacy) ? legacy : null);
    if (target) { e.preventDefault(); openArticleBySlug(target, undefined, true); return; }
    const cm = rest.match(/^\/category\/([a-z0-9-]+)$/);
    if (cm && catBySlug.has(cm[1])) {
      e.preventDefault();
      if (PATH_ROUTING) { setUrl(u.pathname, true); route(); }
      else { state.cats = new Set([catBySlug.get(cm[1])]); renderCategoryChips(); updateFilterSummary(); updateResults(); backToList(); }
    }
  });

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
