# Openline Knowledge Base: Company Changelog

This changelog records the Openline-maintained company edition. Original Git history, upstream notices, and earlier source release tags are preserved rather than rewritten.

## Performance: 28 October 2026

- Every language pre-loaded and pre-compressed at startup; pages answer from memory.
- Article data served once per language at a content-hashed URL, cached for a year, footer sent once, preloaded with the page.
- Versioned app files cached for a year; self-hosted Inter subsets (no Google Fonts requests).
- Article list shown immediately; search index built in the background (Japanese list 3.3 s → 0.6 s), faster CJK/Thai tokenizer.
- Service worker: instant repeat visits and offline reading and search.
- Three regions (Paris, Virginia, Singapore) with rolling, zero-downtime releases.
- Lighter startup (no CPU throttling after a release); logo self-hosted (53 KB → 2 KB).

## Languages edition: 28 October 2026

- Available in the same 33 languages as openline.com, at `kb.openline.com/<prefix>/…` with the same slugs as English.
- Flag language switcher in the top bar (remembers the choice) and in the embeddable modal (`?lang=`).
- Server-rendered translated pages with `hreflang`, `og:locale` alternates, a sitemap per language and localized preview cards.
- Search in native scripts and English, with Unicode normalization, accent folding and CJK/Thai segmentation.
- Language suggestion: a small dialog offers the visitor's saved or browser language, or staying on the current page; no automatic redirects.
- Bengali uses Bengali digits in prose, as on openline.com; search matches Bengali and Latin digits.
- Translations through OpenRouter with per-language glossaries, a native proofreading pass and automatic structure, link and number checks (`tools/i18n/`).

## Hosting edition: 24 October 2026

- Live at [kb.openline.com](https://kb.openline.com) on Fly.io (app `openline-kb`, Paris), with a Let's Encrypt certificate and Cloudflare DNS.
- New dependency-free Node server (`server.mjs`): server-rendered article and category pages, brotli/gzip, ETags, sitemap, robots.txt and canonical redirects.
- SEO: real URLs (`/<slug>`, `/category/<slug>`), unique titles and descriptions, canonical links, Open Graph and X cards, and JSON-LD (`WebSite`, `Organization`, `TechArticle`, `BreadcrumbList`, `CollectionPage`).
- Branded 1200×630 preview cards for the home page and all 18 categories, plus favicons and a web manifest (`tools/build_og.py`).
- Article rows, breadcrumbs and in-article links are now real links; legacy `/#slug` and `/?a=slug` links keep working.
- Fixed 22 in-article links that used the unsupported `/?a=` format.
- README, release notes and repository homepage point to kb.openline.com and official Openline addresses; the temporary preview host is gone.
- Brand images load from [askopenline/openline-brand-assets](https://github.com/askopenline/openline-brand-assets).

## Company edition: 17 October 2026

Tag: `company-2026.10.17`. This edition establishes the official company presentation and repository documentation without claiming a new upstream product version.

- Added an Openline visual identity for the README, supporting guides, and social preview.
- Expanded the project overview, capabilities, workflow, setup, repository map, and operating guidance.
- Added project-specific contribution and sensitive-reporting guidance.
- Refreshed company repository descriptions, homepages, topics, and release presentation.
- Updated current README links and asset examples to the official company namespace.
- Preserved existing visibility, original history, licenses, and upstream attribution.

This edition was strictly repository-focused; live hosting arrived in the Hosting edition above. A documentation edition alone does not certify every application feature or external service.

## Earlier release history

No earlier GitHub release records were present in the source inventory. Earlier development history remains available through the preserved Git commits and tags.

## Release principles

Keep release notes specific about what changed, what was checked, and what remains outside scope. Preserve original technical and legal attribution, and do not turn an illustrative state, forecast, or prototype into a verified production claim.
