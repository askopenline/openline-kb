// Openline KB — tiny production server for kb.openline.com (Node 20+, no dependencies).
//
// - Serves the static app (index.html, app.js, search.mjs, …) with brotli/gzip and ETags.
// - Server-renders real URLs for SEO and link previews:
//     /                      home (WebSite + Organization JSON-LD)
//     /<slug>                article (Article + BreadcrumbList JSON-LD, full body in HTML)
//     /category/<slug>       category listing (CollectionPage + BreadcrumbList)
// - Generates /sitemap.xml and /robots.txt from articles.json.
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
  escapeHtml, renderMarkdown, categoryStyle, plainSummary, crumbsHTML,
  relatedArticles, articlePath, categoryPath, slugifyCategory, TROUBLE_CATS,
} from "./render.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const SITE = (process.env.SITE_URL || "https://kb.openline.com").replace(/\/+$/, "");
const CANONICAL_HOST = new URL(SITE).host;
const LASTMOD = (process.env.KB_COMMIT_DATE || new Date().toISOString()).slice(0, 10);

// ---------------------------------------------------------------- data
const articles = JSON.parse(fs.readFileSync(path.join(ROOT, "articles.json"), "utf8"));
const categories = JSON.parse(fs.readFileSync(path.join(ROOT, "categories.json"), "utf8"));
const bySlug = new Map(articles.map((a) => [a.slug, a]));
const catBySlug = new Map(Object.keys(categories).map((c) => [slugifyCategory(c), c]));
const countByCat = new Map();
for (const a of articles) countByCat.set(a.category, (countByCat.get(a.category) || 0) + 1);
const TEMPLATE = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

const HOME_TITLE = "Openline Help Center · eSIM Knowledge Base";
const HOME_DESC = "Answers to every Openline eSIM question: installing and activating, device compatibility, country-by-country coverage, plans, purchase codes, billing and troubleshooting.";
const LOGO = `${SITE}/icon-512.png`;
const SOCIALS = [
  "https://x.com/askopenline", "https://instagram.com/askopenline", "https://facebook.com/askopenline",
  "https://youtube.com/@askopenline", "https://tiktok.com/@askopenline",
];
const ORG = {
  "@type": "Organization", "@id": "https://openline.com/#organization", name: "Openline, Inc.",
  alternateName: "Openline", url: "https://openline.com", logo: LOGO, email: "ask@openline.com", sameAs: SOCIALS,
  contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: "ask@openline.com",
    url: "https://openline.com/contact", availableLanguage: ["en"] }],
};
const WEBSITE = {
  "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: "Openline Help Center",
  inLanguage: "en", publisher: { "@id": ORG["@id"] },
  potentialAction: { "@type": "SearchAction", target: `${SITE}/?q={search_term_string}`, "query-input": "required name=search_term_string" },
};

// ---------------------------------------------------------------- template helpers
function mustReplace(html, find, repl) {
  if (!html.includes(find)) throw new Error("Template marker missing: " + find.slice(0, 60));
  return html.replace(find, () => repl);
}
const attr = (s) => escapeHtml(String(s));
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", ...obj }).replace(/</g, "\\u003c")}</script>`;

function seoBlock({ title, desc, pathname, image, imageAlt, type = "website", robots = "index, follow, max-image-preview:large, max-snippet:-1", extra = "", ld = [] }) {
  const url = SITE + pathname;
  return `<!-- SEO:START -->
<title>${attr(title)}</title>
<meta name="description" content="${attr(desc)}" />
<link rel="canonical" href="${attr(url)}" />
<meta name="robots" content="${robots}" />
<meta property="og:type" content="${type}" />
<meta property="og:site_name" content="Openline Help Center" />
<meta property="og:locale" content="en_US" />
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

function withSeo(html, seo) {
  const a = html.indexOf("<!-- SEO:START -->"), b = html.indexOf("<!-- SEO:END -->");
  if (a < 0 || b < 0) throw new Error("SEO markers missing in index.html");
  return html.slice(0, a) + seoBlock(seo) + html.slice(b + "<!-- SEO:END -->".length);
}

const catsNav = `<nav class="footer-cats" aria-label="Browse by category">
    <h2>Browse by category</h2>
    <ul>${Object.keys(categories).map((c) => `<li><a href="${categoryPath(c)}">${escapeHtml(c)}</a><span class="n">${countByCat.get(c) || 0}</span></li>`).join("")}</ul>
  </nav>`;

function rowHTML(a) {
  const ok = TROUBLE_CATS.has(a.category) ? "err" : "ok";
  return `<li>
    <a class="row kb ${ok}" href="${articlePath(a.slug)}" data-idx="-1" data-slug="${attr(a.slug)}" style="${categoryStyle(a.category)}">
      <span class="indicator" aria-hidden="true"></span>
      <div class="meta">
        <div class="name">${escapeHtml(a.title)}</div>
        <div class="snippet">${escapeHtml(plainSummary(a.body, 140))}</div>
      </div>
      <span class="badge">${escapeHtml(a.category)}</span>
    </a>
  </li>`;
}

function baseHtml() { return mustReplace(TEMPLATE, "<!-- CATS -->", catsNav); }
const ogFor = (cat) => `${SITE}/og/${cat ? slugifyCategory(cat) : "home"}.png`;

function renderHome({ notFound = false } = {}) {
  let html = baseHtml();
  html = withSeo(html, notFound
    ? { title: "Page not found · Openline Help", desc: HOME_DESC, pathname: "/", image: ogFor(null), imageAlt: "Openline Knowledge base", robots: "noindex, follow" }
    : { title: HOME_TITLE, desc: HOME_DESC, pathname: "/", image: ogFor(null),
        imageAlt: "Openline Knowledge base — Everything you need to know about Openline",
        ld: [{ "@graph": [WEBSITE, ORG] }] });
  return html;
}

function renderCategory(cat) {
  const meta = categories[cat];
  const list = articles.filter((a) => a.category === cat);
  const p = categoryPath(cat);
  let html = baseHtml();
  html = withSeo(html, {
    title: `${meta.headline} · Openline Help`, desc: meta.description, pathname: p, image: ogFor(cat),
    imageAlt: `Openline Knowledge base — ${cat}`,
    ld: [
      { "@type": "CollectionPage", name: meta.headline, description: meta.description, url: SITE + p,
        isPartOf: { "@id": WEBSITE["@id"] }, inLanguage: "en", numberOfItems: list.length },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Help Center", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: cat, item: SITE + p } ] },
    ],
  });
  html = mustReplace(html, '<h2 id="results-title">All articles</h2>', `<h2 id="results-title">${escapeHtml(cat)}</h2>`);
  html = mustReplace(html, '<span id="results-count" class="count">—</span>', `<span id="results-count" class="count">${list.length} articles</span>`);
  html = mustReplace(html, '<ul id="list" class="row-list" role="list"></ul>', `<ul id="list" class="row-list" role="list">${list.map(rowHTML).join("")}</ul>`);
  return html;
}

function renderArticlePage(a) {
  const p = articlePath(a.slug);
  const desc = plainSummary(a.body);
  const title = `${a.title} · Openline Help`;
  const related = relatedArticles(a, articles);
  let html = baseHtml();
  html = withSeo(html, {
    title, desc, pathname: p, image: ogFor(a.category), imageAlt: `${a.title} — Openline Knowledge base`, type: "article",
    extra: `<meta property="article:section" content="${attr(a.category)}" />\n${(a.tags || []).slice(0, 6).map((t) => `<meta property="article:tag" content="${attr(t)}" />`).join("\n")}\n`,
    ld: [
      { "@type": "TechArticle", headline: a.title.slice(0, 110), description: desc, url: SITE + p,
        mainEntityOfPage: SITE + p, image: ogFor(a.category), inLanguage: "en", dateModified: LASTMOD,
        articleSection: a.category, keywords: (a.tags || []).join(", "),
        author: { "@id": ORG["@id"] }, publisher: ORG, isPartOf: { "@id": WEBSITE["@id"] } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Help Center", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: a.category, item: SITE + categoryPath(a.category) },
        { "@type": "ListItem", position: 3, name: a.title, item: SITE + p } ] },
    ],
  });
  html = mustReplace(html, '<section class="view view-list" id="view-list">', '<section class="view view-list" id="view-list" hidden>');
  html = mustReplace(html, '<section class="view view-article" id="view-article" hidden>', '<section class="view view-article" id="view-article">');
  html = mustReplace(html, '<article class="article-view" id="article-view">', `<article class="article-view" id="article-view" style="${categoryStyle(a.category)}">`);
  html = mustReplace(html, '<p class="article-crumbs" id="article-crumbs"></p>', `<p class="article-crumbs" id="article-crumbs">${crumbsHTML(a)}</p>`);
  html = mustReplace(html, '<span class="article-eyebrow-text" id="article-eyebrow">Article</span>', `<span class="article-eyebrow-text" id="article-eyebrow">${escapeHtml(a.category)}</span>`);
  html = mustReplace(html, '<h1 class="article-title" id="article-title"></h1>', `<h1 class="article-title" id="article-title">${escapeHtml(a.title)}</h1>`);
  html = mustReplace(html, '<div class="article-tags" id="article-tags"></div>', `<div class="article-tags" id="article-tags">${(a.tags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>`);
  html = mustReplace(html, '<div class="article-body" id="article-body"></div>', `<div class="article-body" id="article-body">${renderMarkdown(a.body)}</div>`);
  if (related.length) {
    html = mustReplace(html, '<div class="article-related" id="article-related" hidden>', '<div class="article-related" id="article-related">');
    html = mustReplace(html, '<ul class="row-list" id="article-related-list"></ul>', `<ul class="row-list" id="article-related-list">${related.map(rowHTML).join("")}</ul>`);
  }
  // Home hero h1 is hidden on article pages; demote it so each page has a single h1.
  html = mustReplace(html, '<h1 class="hero-title">', '<p class="hero-title">').replace('</span></h1>', '</span></p>');
  return html;
}

function sitemapXml() {
  const u = (loc, pri, freq) => `  <url><loc>${loc}</loc><lastmod>${LASTMOD}</lastmod><changefreq>${freq}</changefreq><priority>${pri}</priority></url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[u(`${SITE}/`, "1.0", "weekly"),
  ...Object.keys(categories).map((c) => u(SITE + categoryPath(c), "0.8", "weekly")),
  ...articles.map((a) => u(SITE + articlePath(a.slug), "0.6", "monthly"))].join("\n")}
</urlset>
`;
}
const ROBOTS = `User-agent: *\nAllow: /\nDisallow: /healthz\n\nSitemap: ${SITE}/sitemap.xml\n`;

// ---------------------------------------------------------------- responses (compressed + cached)
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png",
  ".ico": "image/x-icon", ".webmanifest": "application/manifest+json; charset=utf-8", ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml",
};
const COMPRESSIBLE = /^(text\/|application\/(json|javascript|manifest\+json|xml)|image\/svg)/;

function makeEntry(body, type, cacheControl, brQuality) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const e = { body: buf, type, cacheControl, etag: `"${crypto.createHash("sha1").update(buf).digest("base64url").slice(0, 20)}"` };
  if (COMPRESSIBLE.test(type) && buf.length > 1024) {
    e.br = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: brQuality ?? (buf.length > 1e6 ? 9 : 11) } });
    e.gz = zlib.gzipSync(buf, { level: 9 });
  }
  return e;
}

const STATIC_FILES = [
  "modal-preview.html", "app.js", "search.mjs", "minisearch.mjs", "render.mjs", "style.css", "articles.json",
  "site.webmanifest", "favicon.ico", "favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png",
];
const statics = new Map();
const cacheFor = (f) =>
  /\.(html|json|webmanifest)$/.test(f) ? "no-cache"
  : /^og\/|\.(png|ico)$/.test(f) ? "public, max-age=604800"
  : "public, max-age=86400";
for (const f of STATIC_FILES) statics.set("/" + f, makeEntry(fs.readFileSync(path.join(ROOT, f)), TYPES[path.extname(f)], cacheFor(f)));
for (const f of fs.readdirSync(path.join(ROOT, "og"))) if (f.endsWith(".png")) statics.set("/og/" + f, makeEntry(fs.readFileSync(path.join(ROOT, "og", f)), "image/png", cacheFor("og/" + f)));
statics.set("/sitemap.xml", makeEntry(sitemapXml(), TYPES[".xml"], "public, max-age=3600"));
statics.set("/robots.txt", makeEntry(ROBOTS, TYPES[".txt"], "public, max-age=3600"));

// Rendered pages: small LRU so memory stays flat on a 256 MB machine.
const PAGE_CACHE_MAX = 800;
const pages = new Map();
const routes = new Map([["/", () => renderHome()], ["404", () => renderHome({ notFound: true })]]);
for (const c of Object.keys(categories)) routes.set(categoryPath(c), () => renderCategory(c));
for (const a of articles) routes.set(articlePath(a.slug), () => renderArticlePage(a));
function page(key) {
  let e = pages.get(key);
  if (e) { pages.delete(key); pages.set(key, e); return e; }
  e = makeEntry(routes.get(key)(), TYPES[".html"], "no-cache", 6);
  pages.set(key, e);
  if (pages.size > PAGE_CACHE_MAX) pages.delete(pages.keys().next().value);
  return e;
}
// Render every route once at boot so template errors fail fast (results are discarded).
{ const t = Date.now(); for (const fn of routes.values()) fn(); console.log(`validated ${routes.size} routes in ${Date.now() - t} ms`); }
for (const k of ["/", "404", ...Object.keys(categories).map(categoryPath)]) page(k);

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function send(req, res, entry, status = 200) {
  const headers = { ...SECURITY_HEADERS, "Content-Type": entry.type, "Cache-Control": entry.cacheControl, ETag: entry.etag, Vary: "Accept-Encoding" };
  if (status === 200 && req.headers["if-none-match"] === entry.etag) { res.writeHead(304, headers); return res.end(); }
  const ae = String(req.headers["accept-encoding"] || "");
  let body = entry.body;
  if (entry.br && /\bbr\b/.test(ae)) { body = entry.br; headers["Content-Encoding"] = "br"; }
  else if (entry.gz && /\bgzip\b/.test(ae)) { body = entry.gz; headers["Content-Encoding"] = "gzip"; }
  headers["Content-Length"] = body.length;
  res.writeHead(status, headers);
  res.end(req.method === "HEAD" ? undefined : body);
}
function redirect(res, location, code = 301) {
  res.writeHead(code, { ...SECURITY_HEADERS, Location: location, "Cache-Control": "public, max-age=3600" });
  res.end();
}

// ---------------------------------------------------------------- server
const server = http.createServer((req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); return res.end(); }
    const url = new URL(req.url, "http://x");
    let p;
    try { p = decodeURIComponent(url.pathname); } catch { p = url.pathname; }

    if (p === "/healthz") { res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" }); return res.end("ok\n"); }

    // Canonical host: *.fly.dev → kb.openline.com
    const host = String(req.headers.host || "").toLowerCase();
    if (host.endsWith(".fly.dev")) return redirect(res, SITE + req.url);

    // Legacy and duplicate URLs
    const legacy = url.searchParams.get("a");
    if (legacy && bySlug.has(legacy)) return redirect(res, SITE + articlePath(legacy));
    if (p === "/index.html") return redirect(res, SITE + "/" + url.search);
    if (p.length > 1 && p.endsWith("/")) return redirect(res, SITE + p.replace(/\/+$/, "") + url.search);
    const lower = p.toLowerCase();
    if (lower !== p && routes.has(lower)) return redirect(res, SITE + lower);

    if (statics.has(p)) return send(req, res, statics.get(p));
    if (routes.has(p) && p !== "404") return send(req, res, page(p));
    return send(req, res, page("404"), 404);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`openline-kb listening on :${PORT} — ${articles.length} articles, ${routes.size} routes, canonical ${SITE}`);
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.close(() => process.exit(0)));
