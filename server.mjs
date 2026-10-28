// Openline KB — production server for kb.openline.com (Node 20+, no dependencies).
//
// - Serves the static app (app.js, search.mjs, …) with brotli/gzip and ETags.
// - Server-renders every URL in every language for SEO and link previews:
//     /                         English home        /fr/                French home
//     /<slug>                   English article     /fr/<slug>          French article
//     /category/<slug>          English category    /fr/category/<slug> French category
//   Languages and URL prefixes mirror openline.com (see i18n/languages.json).
// - hreflang alternates on every page, per-language sitemaps, robots.txt.
// - Redirects legacy links (/?a=slug, /index.html, trailing slashes) and the
//   fly.dev hostname to the canonical https://kb.openline.com.
//
// Run locally:  node server.mjs   (PORT=8080 by default)

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  escapeHtml, renderMarkdown, categoryStyle, plainSummary, crumbsHTML, relatedArticles,
  articlePath, categoryPath, homePath, slugifyCategory, TROUBLE_CATS, fmt, pluralArticles, fmtNum,
} from "./render.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const SITE = (process.env.SITE_URL || "https://kb.openline.com").replace(/\/+$/, "");
const LASTMOD = (process.env.KB_COMMIT_DATE || new Date().toISOString()).slice(0, 10);
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const exists = (f) => fs.existsSync(path.join(ROOT, f));
const APP_VER = (read("index.html").match(/app\.js\?v=(\d+)/) || [])[1] || "1";

// ---------------------------------------------------------------- languages
const ALL_LANGS = JSON.parse(read("i18n/languages.json"));
// A language is live once both its UI strings and its articles exist.
const LANGS = ALL_LANGS.filter((l) => !l.prefix || (exists(`i18n/${l.code}.json`) && exists(`i18n/${l.code}.articles.json`)));
const LANG_BY_PREFIX = new Map(LANGS.filter((l) => l.prefix).map((l) => [l.prefix, l]));
const EN = LANGS[0];
const EN_UI = JSON.parse(read("i18n/en.ui.json"));
const CATEGORIES = JSON.parse(read("categories.json"));
const CAT_KEYS = Object.keys(CATEGORIES);
const catBySlug = new Map(CAT_KEYS.map((c) => [slugifyCategory(c), c]));
const pfx = (l) => (l.prefix ? "/" + l.prefix : "");

// Per-language data, loaded lazily and kept in a small LRU to bound memory.
const LANG_CACHE_MAX = Number(process.env.LANG_CACHE_MAX || 40);
const langCache = new Map();
function langData(l) {
  let d = langCache.get(l.code);
  if (d) { langCache.delete(l.code); langCache.set(l.code, d); return d; }
  let articles, ui, plural, cats;
  if (!l.prefix) {
    articles = JSON.parse(read("articles.json"));
    ui = EN_UI.ui; plural = EN_UI.plural_articles;
    cats = Object.fromEntries(CAT_KEYS.map((k) => [k, { label: k, ...CATEGORIES[k] }]));
  } else {
    const rt = JSON.parse(read(`i18n/${l.code}.json`));
    articles = JSON.parse(read(`i18n/${l.code}.articles.json`));
    ui = { ...EN_UI.ui, ...rt.ui }; plural = rt.plural_articles || EN_UI.plural_articles;
    cats = Object.fromEntries(CAT_KEYS.map((k) => [k, { label: k, ...CATEGORIES[k], ...(rt.categories?.[k] || {}) }]));
  }
  const bySlug = new Map(articles.map((a) => [a.slug, a]));
  const countByCat = new Map();
  for (const a of articles) countByCat.set(a.category, (countByCat.get(a.category) || 0) + 1);
  d = { l, articles, bySlug, ui, plural, cats, countByCat, label: (c) => cats[c]?.label || c, template: null, tail: sharedTail(articles) };
  d.template = buildTemplate(d);
  langCache.set(l.code, d);
  if (langCache.size > LANG_CACHE_MAX) langCache.delete(langCache.keys().next().value);
  return d;
}

// The support footer ("Still stuck?" + channels) is identical at the end of
// every article of a language. The client payload sends it once.
function sharedTail(articles) {
  const b0 = articles[0]?.body || "";
  let tail = "";
  for (let j = b0.lastIndexOf("\n## "); j > 0; j = b0.lastIndexOf("\n## ", j - 1)) {
    const cand = b0.slice(j);
    if (articles.filter((a) => a.body.endsWith(cand)).length < articles.length * 0.98) break;
    tail = cand;
  }
  return tail;
}

// Content-hashed version of each language's data, so the payload URL can be
// cached forever (it changes whenever the content or the app changes).
const fileHash = (...files) => {
  const h = crypto.createHash("sha1").update(APP_VER);
  for (const f of files) h.update(fs.readFileSync(path.join(ROOT, f)));
  return h.digest("base64url").slice(0, 12);
};
const DATA_VER = new Map(LANGS.map((l) => [l.code, l.prefix ? fileHash(`i18n/${l.code}.json`, `i18n/${l.code}.articles.json`) : fileHash("articles.json")]));
const dataUrl = (l) => `/data/${l.code}.json?v=${DATA_VER.get(l.code)}`;

// Client payload: every article without the shared footer, plus the footer once.
function payloadJSON(l) {
  const d = langData(l), n = d.tail.length;
  const articles = d.articles.map((a) => (n && a.body.endsWith(d.tail) ? { ...a, body: a.body.slice(0, -n) } : { ...a, nt: 1 }));
  return JSON.stringify({ v: DATA_VER.get(l.code), tail: d.tail, articles });
}
const payloads = new Map();
function payloadEntry(l) {
  let e = payloads.get(l.code);
  if (!e) { e = makeEntry(payloadJSON(l), TYPES[".json"], IMMUTABLE, { brQuality: 5, keepRaw: false }); e.rawFn = () => payloadJSON(l); payloads.set(l.code, e); }
  return e;
}
// Background: recompress the payload at a higher brotli quality.
async function upgradePayload(l, quality = 9) {
  const e = payloadEntry(l);
  if ((e.q || 5) >= quality) return;
  const buf = Buffer.from(payloadJSON(l));
  const br = await new Promise((ok, ko) => zlib.brotliCompress(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: quality, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }, (err, r) => (err ? ko(err) : ok(r))));
  if (!e.gzHq) e.gz = await new Promise((ok, ko) => zlib.gzip(buf, { level: 9 }, (err, r) => (err ? ko(err) : ok(r))));
  e.br = br; e.gzHq = true; e.q = quality;
}

// ---------------------------------------------------------------- structured data
const LOGO = `${SITE}/icon-512.png`;
const SOCIALS = ["https://x.com/askopenline", "https://instagram.com/askopenline", "https://facebook.com/askopenline",
  "https://youtube.com/@askopenline", "https://tiktok.com/@askopenline"];
const ORG = {
  "@type": "Organization", "@id": "https://openline.com/#organization", name: "Openline, Inc.",
  alternateName: "Openline", url: "https://openline.com", logo: LOGO, email: "ask@openline.com", sameAs: SOCIALS,
  contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: "ask@openline.com",
    url: "https://openline.com/contact", availableLanguage: LANGS.map((l) => l.hreflang) }],
};
const websiteLd = (d) => ({
  "@type": "WebSite", "@id": `${SITE}${homePath(pfx(d.l))}#website`, url: SITE + homePath(pfx(d.l)), name: d.ui.site_name,
  inLanguage: d.l.hreflang, publisher: { "@id": ORG["@id"] },
  potentialAction: { "@type": "SearchAction", target: `${SITE}${homePath(pfx(d.l))}?q={search_term_string}`, "query-input": "required name=search_term_string" },
});

// ---------------------------------------------------------------- template helpers
const attr = (s) => escapeHtml(String(s));
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", ...obj }).replace(/</g, "\\u003c")}</script>`;
function mustReplace(html, find, repl) {
  if (!html.includes(find)) throw new Error("Template marker missing: " + find.slice(0, 60));
  return html.replace(find, () => repl);
}

// Apply UI translations to elements marked data-i18n / data-i18n-attr.
export function localize(html, ui) {
  html = html.replace(/(<(\w+)\b[^>]*?\sdata-i18n="(\w+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (m, open, _tag, key, _inner, close) =>
    ui[key] == null ? m : open + (key.endsWith("_html") ? ui[key] : escapeHtml(ui[key])) + close);
  html = html.replace(/<[^>]*\sdata-i18n-attr="([^"]+)"[^>]*>/g, (tag, spec) => {
    for (const pair of spec.split(",")) {
      const [a, key] = pair.split(":");
      let val = ui[key];
      if (val == null) continue;
      const net = tag.match(/data-net="([^"]+)"/);
      val = fmt(val, { network: net ? net[1] : "" });
      tag = tag.replace(new RegExp(`(\\s${a}=)(["'])[\\s\\S]*?\\2`), (_m, p1) => `${p1}"${attr(val)}"`);
    }
    return tag;
  });
  return html;
}

const CHEVRON = '<svg class="lang-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
// Language switcher: links point to the same page in every language.
function switcherHTML(d, rest, modal = false) {
  const href = (l) => modal ? `/modal-preview.html${l.prefix ? "?lang=" + l.prefix : ""}` : (pfx(l) + rest || "/");
  const items = LANGS.map((l) => `<li><a href="${attr(href(l))}" hreflang="${l.hreflang}" lang="${l.hreflang}" data-lang="${l.code}"${l.code === d.l.code ? ' aria-current="true"' : ""}><img class="flag" src="/flags/${l.flag}.png" alt="" width="20" height="15" loading="lazy" /><span>${escapeHtml(l.native)}</span></a></li>`).join("");
  return `<div class="lang" data-lang-switch>
      <button class="lang-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="${attr(d.ui.language_aria)}" title="${attr(d.ui.language)}">
        <img class="flag" src="/flags/${d.l.flag}.png" alt="" width="20" height="15" /><span class="lang-name">${escapeHtml(d.l.native)}</span>${CHEVRON}
      </button>
      <ul class="lang-menu" hidden>${items}</ul>
    </div>`;
}

function catsNav(d) {
  const p = pfx(d.l);
  return `<nav class="footer-cats" aria-label="${attr(d.ui.browse_by_category)}">
    <h2>${escapeHtml(d.ui.browse_by_category)}</h2>
    <ul>${CAT_KEYS.map((c) => `<li><a href="${categoryPath(c, p)}">${escapeHtml(d.label(c))}</a><span class="n">${fmtNum(d.countByCat.get(c) || 0, d.l.hreflang)}</span></li>`).join("")}</ul>
  </nav>`;
}

// Client bootstrap: UI strings + where to fetch this language's articles.
function bootJSON(d, modal = false) {
  return JSON.stringify({
    code: d.l.code, prefix: pfx(d.l), hreflang: d.l.hreflang, modal, v: APP_VER,
    articles: dataUrl(d.l),
    ui: d.ui, plural: d.plural, cats: Object.fromEntries(CAT_KEYS.map((k) => [k, d.label(k)])),
  }).replace(/</g, "\\u003c");
}

function buildTemplate(d) {
  let html = read("index.html");
  html = html.replace('<html lang="en">', `<html lang="${d.l.hreflang}">`);
  html = localize(html, d.ui);
  html = html.replace('href="/" aria-label=', `href="${homePath(pfx(d.l))}" aria-label=`);
  html = mustReplace(html, "<!-- CATS -->", catsNav(d));
  html = mustReplace(html, '<script type="module"', `<script id="kb-i18n" type="application/json">${bootJSON(d)}</script>\n  <script type="module"`);
  return mustReplace(html, "</head>", preloadHints(d.l) + "</head>");
}

function seoBlock(d, { title, desc, rest, image, imageAlt, type = "website", robots = "index, follow, max-image-preview:large, max-snippet:-1", extra = "", ld = [] }) {
  const url = SITE + (pfx(d.l) + rest || "/");
  const alternates = rest === null ? "" : [
    ...LANGS.map((l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${attr(SITE + (pfx(l) + rest || "/"))}" />`),
    `<link rel="alternate" hreflang="x-default" href="${attr(SITE + (rest || "/"))}" />`,
  ].join("\n");
  return `<!-- SEO:START -->
<title>${attr(title)}</title>
<meta name="description" content="${attr(desc)}" />
<link rel="canonical" href="${attr(url)}" />
${alternates}
<meta name="robots" content="${robots}" />
<meta property="og:type" content="${type}" />
<meta property="og:site_name" content="${attr(d.ui.site_name)}" />
<meta property="og:locale" content="${d.l.og}" />
${LANGS.filter((l) => l !== d.l).map((l) => `<meta property="og:locale:alternate" content="${l.og}" />`).join("\n")}
<meta property="og:title" content="${attr(title)}" />
<meta property="og:description" content="${attr(desc)}" />
<meta property="og:url" content="${attr(url)}" />
<meta property="og:image" content="${attr(image)}" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${attr(imageAlt)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@askopenline" />
<meta name="twitter:title" content="${attr(title)}" />
<meta name="twitter:description" content="${attr(desc)}" />
<meta name="twitter:image" content="${attr(image)}" />
<meta name="twitter:image:alt" content="${attr(imageAlt)}" />
${extra}${ld.map(jsonLd).join("\n")}
<!-- SEO:END -->`;
}

function page(d, seo, rest) {
  let html = d.template;
  const a = html.indexOf("<!-- SEO:START -->"), b = html.indexOf("<!-- SEO:END -->");
  html = html.slice(0, a) + seoBlock(d, { ...seo, rest }) + html.slice(b + "<!-- SEO:END -->".length);
  return mustReplace(html, "<!-- LANG -->", switcherHTML(d, rest ?? "/"));
}

const OG_DIR_HAS = new Set();
for (const l of ALL_LANGS) if (l.prefix && exists(`og/${l.code}`)) OG_DIR_HAS.add(l.code);
const ogFor = (d, cat) => {
  const name = `${cat ? slugifyCategory(cat) : "home"}.png`;
  return OG_DIR_HAS.has(d.l.code) && exists(`og/${d.l.code}/${name}`) ? `${SITE}/og/${d.l.code}/${name}` : `${SITE}/og/${name}`;
};

function rowHTML(d, a) {
  const ok = TROUBLE_CATS.has(a.category) ? "err" : "ok";
  return `<li>
    <a class="row kb ${ok}" href="${articlePath(a.slug, pfx(d.l))}" data-idx="-1" data-slug="${attr(a.slug)}" style="${categoryStyle(a.category)}">
      <span class="indicator" aria-hidden="true"></span>
      <div class="meta">
        <div class="name">${escapeHtml(a.title)}</div>
        <div class="snippet">${escapeHtml(plainSummary(a.body, 140))}</div>
      </div>
      <span class="badge">${escapeHtml(d.label(a.category))}</span>
    </a>
  </li>`;
}

function renderHome(d, { notFound = false } = {}) {
  const ui = d.ui;
  return page(d, notFound
    ? { title: `${ui.not_found_title} · ${ui.help_suffix}`, desc: ui.home_desc, image: ogFor(d, null), imageAlt: ui.og_alt_home, robots: "noindex, follow" }
    : { title: ui.home_title, desc: ui.home_desc, image: ogFor(d, null), imageAlt: ui.og_alt_home, ld: [{ "@graph": [websiteLd(d), ORG] }] },
    notFound ? null : "/");
}

function renderCategory(d, cat) {
  const meta = d.cats[cat], ui = d.ui, p = pfx(d.l);
  const list = d.articles.filter((a) => a.category === cat);
  const rest = categoryPath(cat);
  let html = page(d, {
    title: `${meta.headline} · ${ui.help_suffix}`, desc: meta.description, image: ogFor(d, cat),
    imageAlt: fmt(ui.og_alt_category, { category: meta.label }),
    ld: [
      { "@type": "CollectionPage", name: meta.headline, description: meta.description, url: SITE + p + rest,
        isPartOf: { "@id": websiteLd(d)["@id"] }, inLanguage: d.l.hreflang, numberOfItems: list.length },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: ui.help_center, item: SITE + homePath(p) },
        { "@type": "ListItem", position: 2, name: meta.label, item: SITE + p + rest }] },
    ],
  }, rest);
  html = html.replace(/<h2 id="results-title"([^>]*)>[\s\S]*?<\/h2>/, `<h2 id="results-title"$1>${escapeHtml(meta.label)}</h2>`);
  html = mustReplace(html, '<span id="results-count" class="count">—</span>', `<span id="results-count" class="count">${escapeHtml(pluralArticles(list.length, d.plural, d.l.hreflang))}</span>`);
  html = mustReplace(html, '<ul id="list" class="row-list" role="list"></ul>', `<ul id="list" class="row-list" role="list">${list.map((a) => rowHTML(d, a)).join("")}</ul>`);
  return html;
}

function renderArticlePage(d, a) {
  const ui = d.ui, p = pfx(d.l), rest = articlePath(a.slug);
  const desc = plainSummary(a.body);
  const related = relatedArticles(a, d.articles);
  let html = page(d, {
    title: `${a.title} · ${ui.help_suffix}`, desc, image: ogFor(d, a.category), imageAlt: fmt(ui.og_alt_article, { title: a.title }), type: "article",
    extra: `<meta property="article:section" content="${attr(d.label(a.category))}" />\n${(a.tags || []).slice(0, 6).map((t) => `<meta property="article:tag" content="${attr(t)}" />`).join("\n")}\n`,
    ld: [
      { "@type": "TechArticle", headline: a.title.slice(0, 110), description: desc, url: SITE + p + rest,
        mainEntityOfPage: SITE + p + rest, image: ogFor(d, a.category), inLanguage: d.l.hreflang, dateModified: LASTMOD,
        articleSection: d.label(a.category), keywords: (a.tags || []).join(", "),
        ...(d.l.prefix ? { translationOfWork: { "@id": SITE + rest } } : {}),
        author: { "@id": ORG["@id"] }, publisher: ORG, isPartOf: { "@id": websiteLd(d)["@id"] } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: ui.help_center, item: SITE + homePath(p) },
        { "@type": "ListItem", position: 2, name: d.label(a.category), item: SITE + categoryPath(a.category, p) },
        { "@type": "ListItem", position: 3, name: a.title, item: SITE + p + rest }] },
    ],
  }, rest);
  html = mustReplace(html, '<section class="view view-list" id="view-list">', '<section class="view view-list" id="view-list" hidden>');
  html = mustReplace(html, '<section class="view view-article" id="view-article" hidden>', '<section class="view view-article" id="view-article">');
  html = mustReplace(html, '<article class="article-view" id="article-view">', `<article class="article-view" id="article-view" style="${categoryStyle(a.category)}">`);
  html = mustReplace(html, '<p class="article-crumbs" id="article-crumbs"></p>', `<p class="article-crumbs" id="article-crumbs">${crumbsHTML(a, p, d.label)}</p>`);
  html = html.replace(/(<span class="article-eyebrow-text" id="article-eyebrow"[^>]*>)[\s\S]*?(<\/span>)/, `$1${escapeHtml(d.label(a.category))}$2`);
  html = mustReplace(html, '<h1 class="article-title" id="article-title"></h1>', `<h1 class="article-title" id="article-title">${escapeHtml(a.title)}</h1>`);
  html = mustReplace(html, '<div class="article-tags" id="article-tags"></div>', `<div class="article-tags" id="article-tags">${(a.tags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>`);
  html = mustReplace(html, '<div class="article-body" id="article-body"></div>', `<div class="article-body" id="article-body">${renderMarkdown(a.body, p)}</div>`);
  if (related.length) {
    html = mustReplace(html, '<div class="article-related" id="article-related" hidden>', '<div class="article-related" id="article-related">');
    html = mustReplace(html, '<ul class="row-list" id="article-related-list"></ul>', `<ul class="row-list" id="article-related-list">${related.map((r) => rowHTML(d, r)).join("")}</ul>`);
  }
  // The home hero is hidden on article pages; demote its h1 so each page has a single h1.
  html = html.replace(/<h1 class="hero-title"([^>]*)>([\s\S]*?)<\/h1>/, '<p class="hero-title"$1>$2</p>');
  return html;
}

// Start the article download and module fetches in parallel with app.js.
const preloadHints = (l) => [
  `<link rel="preload" href="${dataUrl(l)}" as="fetch" crossorigin="anonymous" />`,
  ...["search.mjs", "render.mjs"].map((f) => `<link rel="modulepreload" href="/${f}?v=${APP_VER}" />`),
  `<link rel="modulepreload" href="/minisearch.mjs" />`,
].join("\n") + "\n";

// Modal reference page: openline.com-style shell with the KB inlined.
const MODAL_SHELL = read("modal-preview.html");
function renderModal(d) {
  const t = d.template;
  const kb = t.slice(t.indexOf('<header class="topbar">'), t.indexOf("</footer>") + "</footer>".length)
    .replace("<!-- LANG -->", switcherHTML(d, "/", true)).replace(/<nav class="footer-cats"[\s\S]*?<\/nav>/, "");
  return MODAL_SHELL.replace('<html lang="en"', `<html lang="${d.l.hreflang}"`)
    .replace("<!-- KB -->", kb)
    .replace("<!-- KB-I18N -->", `<script id="kb-i18n" type="application/json">${bootJSON(d, true)}</script>`)
    .replace("</head>", preloadHints(d.l) + "</head>");
}

// ---------------------------------------------------------------- service worker
const FONT_FILES = fs.readdirSync(path.join(ROOT, "fonts")).filter((f) => f.endsWith(".woff2")).map((f) => "/fonts/" + f);
const swJS = () => read("sw.js")
  .replace("__VERSION__", APP_VER)
  .replace("__SHELL__", JSON.stringify([...["style.css", "app.js", "search.mjs", "render.mjs"].map((f) => `/${f}?v=${APP_VER}`), "/minisearch.mjs", ...FONT_FILES.filter((f) => /inter-latin-[0-9a-f]/.test(f))]));

// ---------------------------------------------------------------- sitemaps & robots
function sitemapIndex() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${LANGS.map((l) => `  <sitemap><loc>${SITE}/sitemaps/${l.code}.xml</loc><lastmod>${LASTMOD}</lastmod></sitemap>`).join("\n")}
</sitemapindex>
`;
}
function sitemapFor(l) {
  const d = langData(l), p = pfx(l);
  const u = (loc, pri, freq) => `  <url><loc>${loc}</loc><lastmod>${LASTMOD}</lastmod><changefreq>${freq}</changefreq><priority>${pri}</priority></url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[u(SITE + homePath(p), "1.0", "weekly"),
  ...CAT_KEYS.map((c) => u(SITE + categoryPath(c, p), "0.8", "weekly")),
  ...d.articles.map((a) => u(SITE + articlePath(a.slug, p), "0.6", "monthly"))].join("\n")}
</urlset>
`;
}
const ROBOTS = `User-agent: *\nAllow: /\nDisallow: /healthz\n\nSitemap: ${SITE}/sitemap.xml\n`;

// ---------------------------------------------------------------- responses
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png",
  ".ico": "image/x-icon", ".webmanifest": "application/manifest+json; charset=utf-8", ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2",
};
const COMPRESSIBLE = /^(text\/|application\/(json|javascript|manifest\+json|xml)|image\/svg)/;
function makeEntry(body, type, cacheControl, { brQuality, keepRaw = true } = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const e = { type, cacheControl, etag: `"${crypto.createHash("sha1").update(buf).digest("base64url").slice(0, 20)}"`, raw: buf };
  if (COMPRESSIBLE.test(type) && buf.length > 1024) {
    e.br = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: brQuality ?? (buf.length > 1e6 ? 7 : 11) } });
    e.gz = zlib.gzipSync(buf, { level: buf.length > 1e6 ? 6 : 9 });
    if (!keepRaw) e.raw = null; // large files: re-read from disk for the rare client without compression
  }
  return e;
}

// Cache policy
//   versioned (?v=current) and hashed files: cached for a year, never revalidated
//   images: a week, then served stale while revalidating for a month
//   HTML: browsers revalidate (ETag → 304); shared caches/CDN keep it 10 minutes
const IMMUTABLE = "public, max-age=31536000, immutable";
const HTML_CC = "public, max-age=0, s-maxage=600, stale-while-revalidate=86400, stale-if-error=604800";
const IMG_CC = "public, max-age=604800, stale-while-revalidate=2592000";
const cacheFor = (f) =>
  /^fonts\//.test(f) ? IMMUTABLE
  : /\.(html|json|webmanifest)$/.test(f) ? "no-cache"
  : /^(og|flags)\/|\.(png|ico)$/.test(f) ? IMG_CC
  : "public, max-age=3600, stale-while-revalidate=86400";
const VERSIONED = new Set(["app.js", "search.mjs", "render.mjs", "style.css", "i18n/offer.json"]);

// Static files are compressed on first request and cached.
const STATIC_FILES = new Set([
  "app.js", "search.mjs", "minisearch.mjs", "render.mjs", "style.css", "articles.json",
  "site.webmanifest", "favicon.ico", "favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png",
]);
const statics = new Map();
function staticEntry(rel) {
  if (statics.has(rel)) return statics.get(rel);
  const ok = STATIC_FILES.has(rel)
    || /^og\/([a-z]+\/)?[a-z0-9-]+\.png$/.test(rel)
    || /^flags\/[a-z]{2}\.png$/.test(rel)
    || /^fonts\/inter-[a-z-]+-[0-9a-f]{8}\.woff2$/.test(rel)
    || rel === "i18n/offer.json"
    || (/^i18n\/[a-z]+\.(articles\.)?json$/.test(rel) && LANGS.some((l) => l.prefix && rel.startsWith(`i18n/${l.code}.`)));
  if (!ok || !exists(rel)) return null;
  const big = fs.statSync(path.join(ROOT, rel)).size > 1e6;
  const e = makeEntry(fs.readFileSync(path.join(ROOT, rel)), TYPES[path.extname(rel)] || "application/octet-stream", cacheFor(rel), { keepRaw: !big });
  e.file = rel;
  statics.set(rel, e);
  return e;
}

const PAGE_CACHE_MAX = Number(process.env.PAGE_CACHE_MAX || 1500);
const pages = new Map();
function cached(key, fn, cacheControl = HTML_CC, type = TYPES[".html"]) {
  let e = pages.get(key);
  if (e) { pages.delete(key); pages.set(key, e); return e; }
  e = makeEntry(fn(), type, cacheControl, { brQuality: 6 });
  pages.set(key, e);
  if (pages.size > PAGE_CACHE_MAX) pages.delete(pages.keys().next().value);
  return e;
}

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  ...(process.env.FLY_REGION ? { "X-Served-By": `openline-kb-${process.env.FLY_REGION}` } : {}),
};
function send(req, res, entry, status = 200, extraHeaders = {}) {
  const headers = { ...SECURITY_HEADERS, "Content-Type": entry.type, "Cache-Control": entry.cacheControl, ETag: entry.etag, Vary: "Accept-Encoding", ...extraHeaders };
  if (status === 200 && req.headers["if-none-match"] === entry.etag) { res.writeHead(304, headers); return res.end(); }
  const ae = String(req.headers["accept-encoding"] || "");
  let body;
  if (entry.br && /\bbr\b/.test(ae)) { body = entry.br; headers["Content-Encoding"] = "br"; }
  else if (entry.gz && /\bgzip\b/.test(ae)) { body = entry.gz; headers["Content-Encoding"] = "gzip"; }
  else body = entry.raw || (entry.rawFn ? Buffer.from(entry.rawFn()) : fs.readFileSync(path.join(ROOT, entry.file)));
  headers["Content-Length"] = body.length;
  res.writeHead(status, headers);
  res.end(req.method === "HEAD" ? undefined : body);
}
function redirect(res, location, code = 301) {
  res.writeHead(code, { ...SECURITY_HEADERS, Location: location, "Cache-Control": "public, max-age=3600" });
  res.end();
}

// Resolve "/fr/category/x" → { l, rest: "/category/x" }.
function splitLang(p) {
  const m = p.match(/^\/([a-z]+)(\/.*)?$/);
  if (m && LANG_BY_PREFIX.has(m[1])) return { l: LANG_BY_PREFIX.get(m[1]), rest: m[2] || "", bare: !m[2] };
  return { l: EN, rest: p, bare: false };
}

function route(req, res, url, p) {
  const { l, rest, bare } = splitLang(p);
  if (bare) return redirect(res, `${SITE}/${l.prefix}/${url.search}`);   // /fr → /fr/
  const d = langData(l);
  const r = rest || "/";
  const legacy = url.searchParams.get("a");
  if (legacy && d.bySlug.has(legacy)) return redirect(res, SITE + articlePath(legacy, pfx(l)));
  if (r === "/") return send(req, res, cached(`${l.code}|/`, () => renderHome(d)), 200, { "Content-Language": l.hreflang });
  const cm = r.match(/^\/category\/([a-z0-9-]+)$/);
  if (cm && catBySlug.has(cm[1])) return send(req, res, cached(`${l.code}|${r}`, () => renderCategory(d, catBySlug.get(cm[1]))), 200, { "Content-Language": l.hreflang });
  const slug = r.slice(1);
  if (d.bySlug.has(slug)) return send(req, res, cached(`${l.code}|${r}`, () => renderArticlePage(d, d.bySlug.get(slug))), 200, { "Content-Language": l.hreflang });
  const lower = r.toLowerCase();
  if (lower !== r && (d.bySlug.has(lower.slice(1)) || /^\/category\//.test(lower))) return redirect(res, SITE + pfx(l) + lower);
  return send(req, res, cached(`${l.code}|404`, () => renderHome(d, { notFound: true })), 404);
}

const server = http.createServer((req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); return res.end(); }
    const url = new URL(req.url, "http://x");
    let p;
    try { p = decodeURIComponent(url.pathname); } catch { p = url.pathname; }
    if (p === "/healthz") { res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" }); return res.end("ok\n"); }

    const host = String(req.headers.host || "").toLowerCase();
    if (host.endsWith(".fly.dev")) return redirect(res, SITE + req.url);
    if (p === "/index.html") return redirect(res, SITE + "/" + url.search);
    if (p.length > 1 && p.endsWith("/") && !/^\/[a-z]+\/$/.test(p)) return redirect(res, SITE + p.replace(/\/+$/, "") + url.search);
    if (/^\/[a-z]+\/$/.test(p) && !LANG_BY_PREFIX.has(p.slice(1, -1))) return redirect(res, SITE + p.slice(0, -1) + url.search);

    if (p === "/sitemap.xml") return send(req, res, cached("sitemap", sitemapIndex, "public, max-age=3600", TYPES[".xml"]));
    const sm = p.match(/^\/sitemaps\/([a-z]+)\.xml$/);
    if (sm) { const l = LANGS.find((x) => x.code === sm[1]); if (l) return send(req, res, cached(`sm|${l.code}`, () => sitemapFor(l), "public, max-age=3600", TYPES[".xml"])); }
    if (p === "/robots.txt") return send(req, res, cached("robots", () => ROBOTS, "public, max-age=3600", TYPES[".txt"]));
    if (p === "/modal-preview.html") {
      const l = LANG_BY_PREFIX.get(url.searchParams.get("lang") || "") || EN;
      return send(req, res, cached(`${l.code}|modal`, () => renderModal(langData(l))), 200, { "X-Robots-Tag": "noindex" });
    }
    const dm = p.match(/^\/data\/([a-z]+)\.json$/);
    if (dm) {
      const l = LANGS.find((x) => x.code === dm[1]);
      if (l) {
        const e = payloadEntry(l);
        return send(req, res, e, 200, url.searchParams.get("v") === DATA_VER.get(l.code) ? {} : { "Cache-Control": "no-cache" });
      }
    }
    if (p === "/sw.js") return send(req, res, cached("sw", swJS, "no-cache", TYPES[".js"]), 200, { "Service-Worker-Allowed": "/" });
    const st = staticEntry(p.slice(1));
    if (st) return send(req, res, st, 200, VERSIONED.has(st.file) && url.searchParams.get("v") === APP_VER ? { "Cache-Control": IMMUTABLE } : {});
    return route(req, res, url, p);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal error");
  }
});

// Boot: validate the English edition fully and every language's home page.
{
  const t = Date.now();
  const en = langData(EN);
  renderHome(en); for (const c of CAT_KEYS) renderCategory(en, c); for (const a of en.articles) renderArticlePage(en, a);
  for (const l of LANGS.slice(1)) { const d = langData(l); renderHome(d); renderArticlePage(d, d.articles[0]); renderCategory(d, CAT_KEYS[0]); }
  console.log(`validated in ${Date.now() - t} ms — ${LANGS.length} live languages: ${LANGS.map((l) => l.code).join(" ")}`);
}
server.listen(PORT, "0.0.0.0", () => { console.log(`openline-kb listening on :${PORT} — canonical ${SITE}`); warm(); });

// Warm-up after listening: load every language, pre-render home and category
// pages, precompress payloads and static files, so no visitor waits on a cold path.
async function warm() {
  const t = Date.now(), tick = () => new Promise((r) => setImmediate(r));
  try {
    for (const l of LANGS) {
      const d = langData(l); await tick();
      payloadEntry(l); await tick();
      cached(`${l.code}|/`, () => renderHome(d)); await tick();
      for (const c of CAT_KEYS) { cached(`${l.code}|/category/${slugifyCategory(c)}`, () => renderCategory(d, c)); await tick(); }
    }
    const files = [...STATIC_FILES, "i18n/offer.json",
      ...fs.readdirSync(path.join(ROOT, "fonts")).filter((f) => f.endsWith(".woff2")).map((f) => "fonts/" + f),
      ...fs.readdirSync(path.join(ROOT, "flags")).map((f) => "flags/" + f)];
    for (const f of files) { staticEntry(f); await tick(); }
    console.log(`warm in ${Date.now() - t} ms`);
    for (const l of LANGS) await upgradePayload(l);
    console.log(`payloads recompressed in ${Date.now() - t} ms, rss ${Math.round(process.memoryUsage().rss / 1e6)} MB`);
    // Low priority: maximum brotli (about 9% smaller, ~6 s of CPU per language).
    for (const l of LANGS) { await upgradePayload(l, 11); await new Promise((r) => setTimeout(r, 250)); }
    console.log(`payloads at max compression in ${Date.now() - t} ms`);
  } catch (e) { console.error("warm-up failed", e); }
}
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.close(() => process.exit(0)));
