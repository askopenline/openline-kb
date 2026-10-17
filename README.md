# Openline Knowledge Base

The official repository for Openline's customer-help library and browser-based search interface. Maintained by [Openline](https://openline.com) in [askopenline/openline-kb](https://github.com/askopenline/openline-kb).

## What is included

The committed corpus contains 2,737 articles covering eSIM setup, activation, devices, troubleshooting, plans, billing, and related topics. The site is static: articles are loaded from JSON and searched in the browser without a per-query server request.

| File | Purpose |
| --- | --- |
| [`articles.json`](articles.json) | Article content and taxonomy |
| [`app.js`](app.js) | Browsing, article display, filters, and keyboard interactions |
| [`search.mjs`](search.mjs) | Search ranking, prefix/fuzzy matching, and domain-specific aliases |
| [`minisearch.mjs`](minisearch.mjs) | Vendored MiniSearch implementation |
| [`index.html`](index.html) | Standalone knowledge-base page |
| [`modal-preview.html`](modal-preview.html) | Full-screen embedding reference |
| [`style.css`](style.css) | Application-specific styles |
| [`audit_search.mjs`](audit_search.mjs) | Search regression checks |

The recorded preview is [kb.openline.com](https://kb.openline.com). Repository ownership, domain routing, and production publication are managed separately; this copy does not change an existing deployment.

## Run locally

```sh
git clone https://github.com/askopenline/openline-kb.git
cd openline-kb
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [the local knowledge base](http://127.0.0.1:8000) or [the modal preview](http://127.0.0.1:8000/modal-preview.html). There is no application build step.

Run the committed search regression suite from the repository root:

```sh
node audit_search.mjs
```

## Article format

Each article has a stable identifier, slug, taxonomy, search tags, title, and Markdown body. Keep existing identifiers and slugs stable when revising content.

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

The renderer supports a subset of Markdown rather than every CommonMark feature. Check the actual article view when adding tables, links, emphasis, lists, or code examples.

## Editorial and engineering workflow

1. Verify the underlying product behavior, current policy, or device-specific instruction before revising an article.
2. Preserve qualifications, source dates, and exact technical values. Do not turn a general explanation into a universal compatibility, coverage, price, or refund promise.
3. Keep contact details and related articles consistent.
4. Validate the JSON, run the search audit, and inspect the changed articles on desktop and mobile.
5. Check exact-title search, spelling variants, empty queries, filters, and fallback behavior.
6. Publish through the approved hosting workflow after review.

Fallback suggestions help avoid a dead-end interface, but they are not a guarantee that every query has a relevant answer. Search tests do not independently verify the accuracy of the article corpus.

## Support and contribution

Customer enquiries should use [Openline's contact page](https://openline.com/contact) or [ask@openline.com](mailto:ask@openline.com). Report repository defects through [company repository issues](https://github.com/askopenline/openline-kb/issues), without publishing account details, activation codes, or other customer information.

## Ownership and licenses

Openline maintains the knowledge base and its company-authored content. The existing licenses and attribution are preserved:

- **Application code:** MIT, as set out in [`LICENSE`](LICENSE).
- **Article content:** Creative Commons Attribution 4.0 International, with attribution to Openline, Inc., as specified in the existing license.
- **MiniSearch:** Its own MIT notice and Luca Ongaro attribution remain applicable.

These terms are not replaced by the repository's move to the official company account. Third-party brands retain their respective rights.
