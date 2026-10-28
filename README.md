# Openline Knowledge Base

<!-- CUP-OF-NEWS-STYLE -->
<div align="center">

[![Openline company repository](.github/assets/badge-company.svg)](https://openline.com)
[![Public company repository](.github/assets/badge-access.svg)](https://github.com/askopenline/openline-kb)
[![Company edition](.github/assets/badge-edition.svg)](https://github.com/askopenline/openline-kb/releases)
[![Static application and MiniSearch](.github/assets/badge-stack.svg)](#architecture)
[![Code and content licensing](.github/assets/badge-license.svg)](LICENSE)

![MiniSearch: Local search](.github/assets/badge-technology-1.svg)
![Articles: 2,737](.github/assets/badge-technology-2.svg)
![Delivery: Static](.github/assets/badge-technology-3.svg)

<img src=".github/assets/readme-hero.png" alt="Openline Knowledge Base: official Openline repository" width="100%">

**Openline's searchable help library, from first activation to the details that matter.**

[Company website](https://openline.com) · [Knowledge base](https://kb.openline.com) · [Modal view](https://kb.openline.com/modal-preview.html) · [Release history](https://github.com/askopenline/openline-kb/releases) · [Contribution guide](.github/OPENLINE-CONTRIBUTING.md)

</div>

---

Openline's customer-help library, built to make a large body of eSIM knowledge easy to browse and search. The committed corpus contains **2,737 articles**, with a standalone help interface and an embeddable reference for use inside a broader support experience.

<p align="center">
  <a href="https://kb.openline.com"><strong>Open the knowledge base</strong></a> ·
  <a href="#experience">Explore the interface</a> ·
  <a href="#quick-start">Run locally</a> ·
  <a href="#editorial-workflow">Editorial workflow</a> ·
  <a href="https://github.com/askopenline/openline-kb/releases">Releases</a>
</p>

![Openline knowledge base at a glance](.github/assets/at-a-glance.png)

---

## Experience

The interface supports both open-ended questions and structured browsing. Articles, categories, subcategories, and search aliases are maintained separately from the visual shell so the library can evolve without rebuilding an application backend.

| Capability | What it provides |
| --- | --- |
| Broad help corpus | Setup, activation, devices, troubleshooting, plans, billing, and related guidance |
| Client-side search | Local indexing and ranking without a server request for each query |
| Typo and prefix matching | More forgiving discovery of product terms and device names |
| Category navigation | A structured path when a customer is not sure what to search for |
| Article presentation | A focused reader for the supported Markdown content |
| Modal reference | A full-screen embedding pattern for another Openline surface |
| Regression tooling | A committed search audit for repeatable checks |

![Openline knowledge-base application](.github/assets/screenshot-library.png)

---

## From a question to an explanation

![Openline knowledge discovery workflow](.github/assets/workflow.png)

Search is designed to help customers reach a useful explanation, not to turn an unrelated fallback result into a guaranteed answer. The corpus and ranking behavior both need review when product terminology or policy changes.

---

## Architecture

Search runs entirely in the browser: the index is built client-side from `articles.json`, so there is no build step and no search service to operate. A small dependency-free Node server (`server.mjs`) delivers the files and server-renders every URL with its own title, description, Open Graph card and structured data, so articles are indexable and share well.

```mermaid
flowchart LR
  A[articles.json] --> I[Browser search index]
  Q[Customer query] --> S[Aliases and search ranking]
  I --> S
  S --> R[Results and category filters]
  R --> V[Article reader]
  V --> H[Related guidance and support]
```

| File | Responsibility |
| --- | --- |
| [`articles.json`](articles.json) | Article content, taxonomy, and tags |
| [`categories.json`](categories.json) | Category colours, headlines, and SEO descriptions |
| [`server.mjs`](server.mjs) | Production server: SSR for `/<slug>` and `/category/<slug>`, sitemap, robots, redirects, compression |
| [`render.mjs`](render.mjs) | Markdown renderer and URL helpers shared by the browser and the server |
| [`app.js`](app.js) | Browsing, article display, filters, and keyboard interactions |
| [`search.mjs`](search.mjs) | Ranking, prefix/fuzzy matching, and domain-specific aliases |
| [`minisearch.mjs`](minisearch.mjs) | Vendored MiniSearch implementation |
| [`index.html`](index.html) | Standalone knowledge-base entry point |
| [`modal-preview.html`](modal-preview.html) | Embedding reference |
| [`style.css`](style.css) | Application-specific presentation |
| [`audit_search.mjs`](audit_search.mjs) | Search regression checks |
| [`tools/build_og.py`](tools/build_og.py) | Generates the Open Graph cards in [`og/`](og) and the favicons |

---

## Quick start

Run the production server locally (Node 20+, no packages to install):

```sh
git clone https://github.com/askopenline/openline-kb.git
cd openline-kb
PORT=8000 node server.mjs
```

Open [the local knowledge base](http://127.0.0.1:8000), an article such as [/what-is-openline](http://127.0.0.1:8000/what-is-openline), or [the modal reference](http://127.0.0.1:8000/modal-preview.html). Run the search audit from the repository root:

```sh
node audit_search.mjs
```

---

## Article format

Every article has a stable identity, a route-friendly slug, taxonomy, search tags, and a Markdown body. Preserve existing IDs and slugs when revising an article so that links and references remain useful.

```json
{
  "id": 42,
  "slug": "example-help-article",
  "category": "Getting started",
  "subcategory": "Activation",
  "title": "Example help article",
  "tags": ["activation", "setup"],
  "body": "Article content using the supported Markdown subset."
}
```

The article renderer supports a defined subset of Markdown rather than every possible extension. Check the actual reader when adding tables, links, lists, emphasis, or code examples.

---

## Editorial workflow

1. Confirm the current product behavior, policy, or device-specific instruction behind a proposed change.
2. Update the article while preserving exact technical values, qualifications, source dates, and stable identifiers.
3. Keep related articles, terminology, and support details consistent.
4. Validate the JSON and run the search regression suite.
5. Inspect the changed article and its likely queries on desktop and mobile.
6. Commit, push to `main`, and redeploy to Fly.io (see [Hosting](#hosting)).

### Review checklist

| Check | What to verify |
| --- | --- |
| Meaning | Instructions match the actual product and do not turn a qualified statement into a universal promise |
| Structure | IDs, slugs, categories, subcategories, and tags remain valid |
| Discovery | Exact titles, common spelling variants, and relevant product terms find the intended article |
| Reader | Links, tables, lists, code, and long text remain readable |
| Integration | Modal behavior, keyboard focus, scrolling, and fallback states remain usable |
| Privacy | No customer account details, purchase codes, or private activation information enter the public corpus |

---

## Languages

The knowledge base is available in the same 33 languages as [openline.com](https://openline.com). A flag menu in the top bar switches language and remembers the choice; every page links to its equivalents with `hreflang` alternates, and each language has its own sitemap.

| Language | Code | URL prefix |
| --- | --- | --- |
| English | `en` | `//` |
| Español | `es` | `/es/` |
| Français | `fr` | `/fr/` |
| Deutsch | `de` | `/de/` |
| Italiano | `it` | `/it/` |
| Português | `pt` | `/pt/` |
| 日本語 | `ja` | `/ja/` |
| 中文（简体） | `zh` | `/zh/` |
| Türkçe | `tr` | `/tr/` |
| Русский | `ru` | `/ru/` |
| 中文（繁體） | `zh-TW` | `/tw/` |
| Español (Latinoamérica) | `es-419` | `/latam/` |
| Português (Brasil) | `pt-BR` | `/br/` |
| 한국어 | `ko` | `/ko/` |
| हिन्दी | `hi` | `/hi/` |
| বাংলা | `bn` | `/bn/` |
| Bahasa Indonesia | `id` | `/id/` |
| Bahasa Melayu | `ms` | `/ms/` |
| Tiếng Việt | `vi` | `/vi/` |
| ไทย | `th` | `/th/` |
| Filipino | `tl` | `/tl/` |
| Polski | `pl` | `/pl/` |
| Nederlands | `nl` | `/nl/` |
| Svenska | `sv` | `/sv/` |
| Norsk | `no` | `/no/` |
| Dansk | `da` | `/da/` |
| Suomi | `fi` | `/fi/` |
| Čeština | `cs` | `/cs/` |
| Română | `ro` | `/ro/` |
| Magyar | `hu` | `/hu/` |
| Ελληνικά | `el` | `/el/` |
| Українська | `uk` | `/uk/` |
| Български | `bg` | `/bg/` |

When the visitor's saved language, or otherwise their browser language, differs from the page, a small dialog offers the same page in that language or staying on the current one; it never redirects on its own. Numbers follow openline.com: Bengali digits in Bengali prose (technical values such as 5G, data sizes, versions and codes stay in Latin digits), Latin digits elsewhere, and search matches both.

Article slugs stay identical in every language (`kb.openline.com/fr/<slug>`), so links can be swapped by changing the prefix. Search works in the reader's script and in English, with typo tolerance, accent folding and CJK/Thai segmentation.

### Translation pipeline

Translations live in [`i18n/`](i18n): `{code}.json` (interface strings, categories, glossary) and `{code}.articles.json` (articles). They were produced through [OpenRouter](https://openrouter.ai) with [`tools/i18n/`](tools/i18n):

1. Glossary per language (product terms, register, formal vous/Sie as on openline.com) and interface strings, reviewed by Claude Sonnet.
2. Article translation with Claude Haiku (European and Southeast Asian languages) and GPT Luna (Japanese, Chinese, Korean, Hindi, Bengali, Thai), Gemini Flash as fallback.
3. Native-speaker proofreading pass with Gemini Flash, applied as targeted edits.
4. Automatic checks on every article: headings, lists, tables, links, code, numbers and URLs must match the English source, otherwise the article is retried or kept in English.

A language goes live only when at least 99.5% of its articles pass. The English source in `articles.json` stays the reference; untranslated articles fall back to English.

Flags come from [lipis/flag-icons](https://github.com/lipis/flag-icons) (MIT). Localized preview cards are rendered with `tools/build_og_i18n.py` into `og/<code>/`.

---

## Performance and caching

| Layer | What happens |
| --- | --- |
| Startup | Every language is loaded into memory; home and category pages are pre-rendered and every payload and static file is pre-compressed (brotli and gzip) in the background, so no visitor hits a cold path. |
| Article data | `/data/<code>.json?v=<content hash>`: one payload per language, with the shared support footer sent once instead of in every article. The URL changes whenever content changes, so it is cached for a year (`immutable`). Pages preload it in parallel with the scripts. |
| App files | `app.js`, `search.mjs`, `render.mjs` and `style.css` are versioned (`?v=`) and `immutable`; module preloads remove the import waterfall. |
| Fonts | Inter is self-hosted (`fonts/`, SIL Open Font License) in per-script subsets: no third-party requests, and each language downloads only the subsets it needs. |
| Pages | Browsers revalidate with ETags (`304`); shared caches and CDNs may keep pages 10 minutes and serve them stale while revalidating. |
| Search index | Built in the background after the first screen, in small chunks between frames; queries typed meanwhile still find everything through the full-text scan. The tokenizer uses native regular expressions only (CJK/Thai bigrams about 5× faster). |
| Service worker | `sw.js` caches app files, fonts and data on first visit, serves pages instantly from cache while refreshing them in the background, and keeps the knowledge base readable and searchable offline. Not active inside the embeddable modal. |

---

## Hosting

The knowledge base is live at **[kb.openline.com](https://kb.openline.com)**, with the embeddable reference at [kb.openline.com/modal-preview.html](https://kb.openline.com/modal-preview.html).

| Item | Value |
| --- | --- |
| Platform | Fly.io app `openline-kb`, region `cdg` (Paris), one always-on `shared-cpu-1x` machine with 1 GB of memory |
| Server | Node 22 running [`server.mjs`](server.mjs) — see [`Dockerfile`](Dockerfile) and [`fly.toml`](fly.toml) |
| DNS & TLS | Cloudflare `kb` CNAME to the app's Fly hostname (DNS only); Let's Encrypt certificate managed by Fly |
| Compression | Brotli and gzip — `articles.json` ships at roughly 0.5 MB instead of 5 MB |
| Caching | HTML and JSON revalidate on every load (ETag); JS/CSS are versioned with `?v=N` |
| Health check | `GET /healthz` |

Deploy from the repository root with `fly deploy`. Bump the `?v=N` cache buster in `index.html` and `modal-preview.html` whenever code or styles change.

## SEO and link previews

| Feature | Details |
| --- | --- |
| Real URLs | Every article at `kb.openline.com/<slug>` and every category at `kb.openline.com/category/<slug>`, rendered server-side with the full article body |
| Metadata | Unique `<title>`, meta description, canonical URL and robots directives per page |
| Open Graph / X cards | `summary_large_image` cards with 1200×630 branded images in [`og/`](og) — home page and every category, in every language (`og/<code>/`) |
| Languages | `hreflang` alternates (incl. `x-default`), `og:locale` alternates and a sitemap index pointing to one sitemap per language |
| Structured data | `WebSite` + `SearchAction` and `Organization` on the home page; `TechArticle` + `BreadcrumbList` on articles; `CollectionPage` + `BreadcrumbList` on categories |
| Discovery | [`/sitemap.xml`](https://kb.openline.com/sitemap.xml) with every URL, [`/robots.txt`](https://kb.openline.com/robots.txt), crawlable links in rows, breadcrumbs, related articles and the category directory |
| Redirects | `/?a=<slug>`, `/index.html`, trailing slashes, uppercase paths and the `fly.dev` hostname all 301 to the canonical `kb.openline.com` URL; legacy `/#<slug>` links still open in the app |
| Icons | `favicon.ico`, PNG favicons, Apple touch icon and web manifest |

Regenerate the cards (all languages) after changing categories or branding:

```sh
python3 tools/build_og_i18n.py --mark openline-mark-512.png
```

The mark comes from [askopenline/openline-brand-assets](https://github.com/askopenline/openline-brand-assets) (`logo/png/openline-mark-2250.png`); the font is [Inter](https://github.com/rsms/inter).

Related Openline services: [openline.com](https://openline.com) · [openline.com/start](https://openline.com/start) (redeem a purchase code) · [check.openline.com](https://check.openline.com) (device compatibility) · [openline.com/status](https://openline.com/status) · [openline.com/contact](https://openline.com/contact).

---

## Releases and support

The [company changelog](OPENLINE-CHANGELOG.md) and [GitHub releases](https://github.com/askopenline/openline-kb/releases) describe maintained snapshots. Follow the [contribution guide](.github/OPENLINE-CONTRIBUTING.md) for source changes and the [security guide](.github/OPENLINE-SECURITY.md) for sensitive reports.

Customer enquiries should use [Openline's contact page](https://openline.com/contact), [ask@openline.com](mailto:ask@openline.com), [WhatsApp](https://wa.me/15554842461), [Messenger](https://m.me/askopenline), or @askopenline on [X](https://x.com/askopenline), [Instagram](https://instagram.com/askopenline), [Facebook](https://facebook.com/askopenline), [YouTube](https://youtube.com/@askopenline) and [TikTok](https://tiktok.com/@askopenline). Repository defects can be reported through [company repository issues](https://github.com/askopenline/openline-kb/issues), without personal customer information.

---

## Design and technology choices

### Content as structured data

Stable article IDs, slugs, taxonomy, and tags let editorial changes remain reviewable without mixing them into view code.

### Search in the browser

The static corpus can be indexed locally, avoiding a separate search service and per-query round trips. Initial payload and index cost still matter as the library grows.

### Audit the discovery path

Correct prose is not enough if a customer cannot find it. Search regressions and actual reader checks complement editorial review.

---

## Ownership and licenses

Openline maintains the company-authored help content and application work. The existing licensing remains unchanged:

- **Application code:** MIT, as specified in [`LICENSE`](LICENSE).
- **Article content:** Creative Commons Attribution 4.0 International, with attribution to Openline, Inc., as specified in the existing license.
- **MiniSearch:** Its MIT notice and Luca Ongaro attribution remain applicable.

The official company account is [askopenline](https://github.com/askopenline). Third-party brands and other incorporated materials retain their respective rights.
