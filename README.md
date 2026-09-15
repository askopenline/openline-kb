# Openline KB

The public knowledge base for [Openline](https://openline.com) — a global travel eSIM. **2,737 articles** covering installation, activation, coverage in 190+ countries, purchase codes, gifting, troubleshooting, billing, business, and technical topics.

- **Live site:** [learn.openline.com](https://learn.openline.com) (coming soon) · currently at [kb.openline.com](https://kb.openline.com)
- **Modal view** (for embedding on openline.com): [/modal-preview.html](https://kb.openline.com/modal-preview.html)

## What's in the box

100% static site — one HTML page, one CSS file, one app entrypoint, one search module, one JSON corpus. No build step. No framework. No backend.

```
articles.json      2,737 articles, ~5 MB, schema below
app.js             UI: list ↔ article view, filters, autosuggest, keyboard nav
search.mjs         Multi-strategy search: BM25 + prefix + fuzzy + substring + synonyms
minisearch.mjs     Vendored MiniSearch 7.1.2 (MIT), used for BM25
index.html         Standalone KB page
modal-preview.html Full-screen modal for embedding inside openline.com
style.css          Design tokens + components
audit_search.mjs   Node-based search test suite (100+ queries)
```

## Article schema

Every article is a small JSON object with a stable shape:

```json
{
  "id": 42,
  "slug": "how-do-i-activate-my-openline-esim-once-i-land",
  "category": "Getting started",
  "subcategory": "Activation",
  "title": "How do I activate my Openline eSIM once I land?",
  "tags": ["activation", "iphone", "android"],
  "body": "1. Turn airplane mode off.\n\n..."
}
```

**Body is Markdown** — a subset the built-in renderer supports: headings, bulleted and ordered lists, tables, links, inline code, bold, horizontal rules. No fenced code blocks (use single-backtick inline code instead).

## Categories

18 categories cover the full customer journey:

| Category | Articles |
|---|---|
| Coverage by country | 1,116 |
| Plans & coverage | 443 |
| Troubleshooting | 348 |
| Devices & compatibility | 239 |
| Special use cases | 92 |
| Data usage | 87 |
| Getting started | 80 |
| Payment & billing | 79 |
| Technical | 67 |
| Business & IoT | 61 |
| Security & privacy | 31 |
| Legal & policy | 25 |
| Referrals | 19 |
| Installation | 16 |
| Company & brand | 13 |
| Account | 10 |
| Support | 7 |
| App & website | 4 |

## Search

`search.mjs` is a purpose-built search module for a corpus this size. It runs entirely in the browser — no server round-trip per keystroke.

**Guarantees:**

- No non-gibberish query ever returns zero results
- Exact title matches always win (`what is openline` → **"What is Openline?"**)
- Typos rescued with bounded Levenshtein (`oepnline`, `iphne`, `refnd`)
- Popular-articles fallback for pure gibberish so the UI is never empty

**Strategies (all run simultaneously; scores merge):**

| Strategy | Points |
|---|---|
| Exact title match | 10,000 |
| Title contains full query | 500 |
| Title contains token | 100 per token |
| Tag exact match | 80 per hit |
| Tag contains | 40 per hit |
| Subcategory hit | 30 |
| Category hit | 20 |
| Body contains token | 5 per hit (capped) |
| BM25 (via MiniSearch, with prefix + fuzzy + synonyms) | ×10 |

Plus ~100 domain-specific synonyms mapping typos, foreign-language phrases, and phrase-level intent (`money back` → `refund`, `hotel wifi` → `hotel captive blocked`, `oepnline` → `openline`, etc.).

## Running locally

```bash
git clone https://github.com/<OWNER>/openline-kb.git
cd openline-kb
python3 -m http.server 8000
# open http://localhost:8000
```

No build step. No install. Refresh to see edits.

## Running the search audit

```bash
node audit_search.mjs
```

Runs ~75 queries covering typos, natural language, single-token, gibberish, and multi-language edge cases. Every case should pass; regressions caused by future edits will show up here first.

## Contact points used across the KB

Every article ends with the canonical contact block:

- **Live chat** — inside the Openline app or at [openline.com](https://openline.com)
- **Email** — [ask@openline.com](mailto:ask@openline.com)
- **WhatsApp** — [wa.me/15554842461](https://wa.me/15554842461)
- **Messenger** — [m.me/askopenline](https://m.me/askopenline)
- **Contact form** — [openline.com/contact](https://openline.com/contact)
- **Social DMs** — `@askopenline` on X, Instagram, Facebook, YouTube, TikTok

## License

Content: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — reuse with attribution to Openline, Inc.

Code (`app.js`, `search.mjs`, `style.css`, `index.html`, `modal-preview.html`, `audit_search.mjs`): MIT — see [`LICENSE`](./LICENSE).

Vendored `minisearch.mjs`: MIT, © Luca Ongaro, unmodified.

---

© Openline, Inc.
