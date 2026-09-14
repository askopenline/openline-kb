// Openline KB Search — v4 (Sep 14 2026 rebuild)
//
// Design goals, in priority order:
//   1. NO non-gibberish query ever returns zero results. Ever.
//   2. Typos, partial words, natural language, and pure keywords all work.
//   3. Exact-title matches always win.
//   4. Fast enough to run per-keystroke on 2700+ articles in a browser.
//
// Architecture: multi-strategy scoring where every strategy contributes to
// a single score, then we sort and return. No "fallback if empty" fragility.
//
//   Strategy         When it fires              Weight
//   ─────────────────────────────────────────────────────
//   Exact title      title == query             10000
//   Title contains   title has full query       500
//   Title token      any token in title         100 per token
//   Tag exact        any tag == token           80 per hit
//   Tag contains     any tag has token          40 per hit
//   Subcategory      subcategory has token      30
//   Category         category has token         20
//   Body contains    body has token             5 per hit (capped)
//   Prefix           any indexed term prefix    30
//   Fuzzy            edit distance ≤ 2          40 per fuzzy hit
//   Synonym boost    synonym-expanded token     same as base
//
// If, after all strategies, we still have zero results, we return a
// curated "popular articles" list so the UI is never empty.

import MiniSearch from "./minisearch.mjs";

// ---------------------------------------------------------------------------
// Synonyms — condensed from v3. Only phrase-intent mappings that BM25 can't
// derive naturally. Every token gets expanded but the original tokens stay.
// ---------------------------------------------------------------------------
export const SYNONYMS = {
  // Payments intent
  "money back": ["refund"],
  "get my money": ["refund"],
  "chargeback": ["refund", "dispute"],
  "reembolso": ["refund"],
  "remboursement": ["refund"],
  "erstattung": ["refund"],
  // Coverage / connectivity intent
  "no service": ["signal", "data", "coverage"],
  "no data": ["signal", "data"],
  "no signal": ["signal", "coverage"],
  "no internet": ["data", "signal"],
  "wont work": ["troubleshoot", "broken"],
  "doesnt work": ["troubleshoot", "broken"],
  "cant connect": ["signal", "troubleshoot"],
  "cobertura": ["coverage"],
  "couverture": ["coverage"],
  // Install / redemption
  "install": ["installation", "activate", "setup"],
  "setup": ["install", "activate"],
  "set up": ["install", "activate"],
  "instalar": ["install"],
  "installer": ["install"],
  "activation": ["activate", "install"],
  "qrcode": ["qr", "code"],
  "qr-code": ["qr", "code"],
  // Activation trouble
  "cant activate": ["activate", "activation", "troubleshoot"],
  "wont activate": ["activate", "activation", "troubleshoot"],
  "failed to activate": ["activation", "failed"],
  "activation failed": ["activation", "failed"],
  "stuck activating": ["stuck", "activating", "troubleshoot"],
  "waiting for activation": ["stuck", "activating"],
  // Wi-Fi environment blockers
  "hotel wifi": ["hotel", "captive", "blocked"],
  "airport wifi": ["airport", "captive", "blocked"],
  "office wifi": ["corporate", "firewall"],
  "corporate wifi": ["corporate", "firewall"],
  "captive portal": ["captive", "portal", "blocked"],
  "vpn blocking": ["vpn", "blocked"],
  // Purchase-code specific
  "redeem": ["activate", "install", "code"],
  "voucher": ["code", "purchase"],
  "gift card": ["gift", "code", "purchase"],
  "purchase code": ["purchase", "code"],
  "activation code": ["activation", "code", "sm-dp"],
  // Phone number / SIM
  "phone number": ["number", "primary line"],
  "keep number": ["primary line", "home line"],
  "unlock": ["unlocked", "carrier-lock"],
  // Apps
  "whatsapp": ["messaging"],
  "imessage": ["messages"],
  "netflix": ["streaming"],
  "maps": ["navigation"],
  // Data
  "data usage": ["consumption"],
  "top up": ["topup", "add data"],
  "topup": ["top up", "add data"],
  // Country language variants
  "japon": ["japan"],
  "japão": ["japan"],
  "españa": ["spain"],
  "espagne": ["spain"],
  "deutschland": ["germany"],
  "allemagne": ["germany"],
  "brasil": ["brazil"],
  "italie": ["italy"],
  "italia": ["italy"],
  "eeuu": ["united states", "usa"],
  "etats unis": ["united states", "usa"],
  // Intent
  "help": ["support", "contact"],
  "problem": ["issue", "troubleshoot"],
  "issue": ["problem", "troubleshoot"],
  "broken": ["troubleshoot"],
  // Verb morphology
  "traveling": ["travel", "trip"],
  "travelling": ["travel", "trip"],
  "installed": ["install"],
  "activated": ["activate", "activation"],
  "refunded": ["refund"],
  "stolen": ["theft"],
  "lost": ["missing"],
  // Common typos we care about
  "iphon": ["iphone"],
  "iphne": ["iphone"],
  "ihpone": ["iphone"],
  "esm": ["esim"],
  "esiim": ["esim"],
  "eism": ["esim"],
  "openlien": ["openline"],
  "opneline": ["openline"],
  "oepnline": ["openline"],
  "portugual": ["portugal"],
  "japn": ["japan"],
  "japn": ["japan"],
  "refnd": ["refund"],
  "activaiton": ["activation"],
  "hwo": ["how"],
  "gogle": ["google"],
  "workign": ["working"],
  "caling": ["calling"],
  "instal": ["install"],
  "contry": ["country"],
  // Query language patterns → clarify intent
  "como funciona": ["how", "works"],
  "comment ca marche": ["how", "works"],
  "wtf": ["help", "support"],
  "wat": ["what"],
};

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------
export function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function tokenize(q) {
  return normalize(q).match(/[a-z0-9+]+/g) || [];
}

const NORM_SYNONYMS = new Map(
  Object.entries(SYNONYMS).map(([k, v]) => [normalize(k), v])
);

/**
 * Expand a query with synonyms. KEEPS the original tokens too — synonyms are
 * additive, not replacements. That way "money back" still matches its literal
 * body occurrences AND matches "refund" articles.
 */
export function expandQuery(q) {
  const nq = normalize(q);
  const extra = new Set();
  for (const [key, values] of NORM_SYNONYMS) {
    if (nq.includes(key)) {
      for (const v of values) extra.add(v);
    }
  }
  const base = tokenize(q);
  return [...base, ...extra].join(" ");
}

// Small stopword set — kept lean. "openline" is NOT here because dropping it
// destroys otherwise-useful queries like "what is openline".
const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been",
  "do", "does", "did", "can", "will", "would", "should",
  "i", "me", "my", "we", "our", "you", "your", "it", "its",
  "in", "on", "at", "to", "of", "for", "with", "from", "by",
  "or", "and", "if", "not", "no",
  "how", "what", "when", "where", "why", "who",
  "this", "that", "these", "those",
]);

// ---------------------------------------------------------------------------
// MiniSearch index build
// ---------------------------------------------------------------------------
const MINI_OPTIONS = {
  fields: ["title", "tags", "category", "subcategory", "body"],
  storeFields: ["id"],
  idField: "id",
  processTerm: (term) => {
    const t = normalize(term);
    if (!t || t.length < 2) return null;
    return t;  // KEEP stopwords in the index — they help exact phrase matches
  },
  tokenize: (text) => text.match(/[a-zA-Z0-9+]+/g) || [],
};

export function buildIndex(articles) {
  const mini = new MiniSearch(MINI_OPTIONS);
  mini.addAll(articles.map((a) => ({
    id: a.id,
    title: a.title,
    tags: (a.tags || []).join(" "),
    category: a.category || "",
    subcategory: a.subcategory || "",
    body: a.body || "",
  })));
  return mini;
}

// ---------------------------------------------------------------------------
// Multi-strategy scoring — the heart of the new search
// ---------------------------------------------------------------------------

// Curated fallback articles — surfaced when a query returns nothing. Ordered
// by likely user intent. Slugs are looked up at query time; missing slugs are
// silently skipped so the list stays valid as the KB evolves.
const POPULAR_FALLBACK_SLUGS = [
  "what-is-openline",
  "how-do-i-activate-my-openline-esim-once-i-land",
  "what-is-an-openline-purchase-code",
  "how-do-i-contact-openline-support",
  "what-is-openline-s-refund-policy",
  "how-to-buy-your-first-openline-esim",
  "i-cant-activate-my-openline-plan-what-should-i-do",
  "whats-the-difference-between-a-purchase-code-and-an-activation-code",
];

function getPopularFallback(articles, limit) {
  const bySlug = new Map(articles.map(a => [a.slug, a]));
  const out = [];
  for (const slug of POPULAR_FALLBACK_SLUGS) {
    const a = bySlug.get(slug);
    if (a) out.push(a);
    if (out.length >= limit) break;
  }
  // If we STILL don't have enough (very old KB), pad with the first
  // few Getting Started articles.
  if (out.length < limit) {
    for (const a of articles) {
      if (a.category === "Getting started" && !out.includes(a)) {
        out.push(a);
        if (out.length >= limit) break;
      }
    }
  }
  return out;
}

/**
 * Score every article against the query. Returns [{article, score}, ...]
 * sorted by score descending, filtering out articles with score 0.
 */
function scoreAll(query, articles, index, opts = {}) {
  const { titleBoost = 1 } = opts;
  const nq = normalize(query).replace(/[?!.]+$/, "").trim();
  if (!nq) return [];

  const nqCollapsed = nq.replace(/\s+/g, " ");
  const queryTokens = tokenize(query).filter(t => t.length >= 2);
  if (!queryTokens.length) return [];

  // Expand for synonym-aware BM25
  const expanded = expandQuery(query);

  // Base scores from MiniSearch (BM25 + prefix + fuzzy). Merged into total.
  const bm25Scores = new Map();
  try {
    const hits = index.search(expanded, {
      boost: { title: 8 * titleBoost, tags: 3, category: 2, subcategory: 2, body: 1 },
      prefix: (term) => term.length >= 2,
      fuzzy: (term) => (term.length >= 3 ? 0.3 : 0),
      combineWith: "OR",
    });
    for (const h of hits) bm25Scores.set(h.id, h.score);
  } catch (_) { /* ignore */ }

  // Substring scan across every article — this is the guarantee that any
  // string appearing anywhere in the corpus surfaces the article. Cheap for
  // 2700 articles.
  const scored = [];
  for (const a of articles) {
    const title = normalize(a.title);
    const titleNoPunct = title.replace(/[?!.,;:]+/g, "");
    const tags = (a.tags || []).map(t => normalize(t));
    const cat = normalize(a.category || "");
    const sub = normalize(a.subcategory || "");
    const body = normalize(a.body || "");

    let score = 0;

    // Exact title match — absolute winner.
    if (titleNoPunct === nqCollapsed) score += 10000;

    // Full query as a substring of title.
    if (title.includes(nqCollapsed)) score += 500 * titleBoost;
    // Full query as substring of tags/category/subcategory.
    if (tags.some(t => t.includes(nqCollapsed))) score += 200;
    if (sub.includes(nqCollapsed)) score += 150;
    if (cat.includes(nqCollapsed)) score += 100;

    // Per-token scoring.
    let bodyHits = 0;
    for (const t of queryTokens) {
      if (STOP_WORDS.has(t) && queryTokens.length > 1) continue;  // still keep single-token stopword queries

      // Title tokens
      if (title.split(/\s+/).includes(t)) score += 100 * titleBoost;
      else if (title.includes(t)) score += 50 * titleBoost;

      // Tags (exact and contains)
      for (const tag of tags) {
        if (tag === t) score += 80;
        else if (tag.includes(t)) score += 40;
      }

      // Subcategory / category
      if (sub.includes(t)) score += 30;
      if (cat.includes(t)) score += 20;

      // Body (capped so long articles don't dominate)
      if (body.includes(t)) bodyHits++;
    }
    score += Math.min(bodyHits, 5) * 5;

    // Add BM25 contribution (already handles synonyms + fuzzy + prefix)
    const bm = bm25Scores.get(a.id);
    if (bm) score += bm * 10;

    if (score > 0) scored.push({ a, score });
  }

  scored.sort((x, y) => y.score - x.score);
  return scored;
}

/**
 * Fuzzy fallback — used when scoreAll returns nothing. Rescues heavy typos
 * by scanning every title with an edit-distance threshold.
 */
function fuzzyFallback(query, articles, limit) {
  const nq = normalize(query).replace(/[^a-z0-9\s]/g, "").trim();
  if (nq.length < 3) return [];

  // Simple Levenshtein up to threshold — for each article, find the minimum
  // edit distance between the query and any title word. If ≤ 3, count as hit.
  const scored = [];
  for (const a of articles) {
    const words = normalize(a.title).match(/[a-z0-9]+/g) || [];
    let bestDist = Infinity;
    for (const w of words) {
      if (Math.abs(w.length - nq.length) > 3) continue;
      const d = levenshtein(nq, w, 3);
      if (d < bestDist) bestDist = d;
      if (bestDist === 0) break;
    }
    if (bestDist <= 3) scored.push({ a, score: 100 - bestDist });
  }
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, limit).map(x => x.a);
}

// Bounded Levenshtein: bails out if distance exceeds `max`, returning max+1
function levenshtein(a, b, max = 3) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[n];
}

// ---------------------------------------------------------------------------
// Public search API
// ---------------------------------------------------------------------------

/**
 * Full-text search. Returns an array of articles sorted by relevance.
 * Guarantees non-empty results for any non-empty query (falls back to
 * popular articles). The returned array has a boolean `.isFallback`
 * property set to true when the popular-articles fallback fired — the UI
 * can use that to show a "did you mean" message.
 */
export function runSearch(query, articles, cats, index) {
  const catFilter = cats && cats.size
    ? (a) => cats.has(a.category)
    : null;

  const q = (query || "").trim();
  if (!q) {
    const all = catFilter ? articles.filter(catFilter) : articles.slice();
    all.isFallback = false;
    return all;
  }

  // Primary: multi-strategy scoring
  let scored = scoreAll(q, articles, index);
  let results = scored.map(x => x.a);
  let isFallback = false;

  // Fallback 1: heavy-typo fuzzy on titles
  if (!results.length) {
    results = fuzzyFallback(q, articles, 20);
  }

  // Fallback 2: popular articles for pure-gibberish queries
  if (!results.length) {
    results = getPopularFallback(articles, 8);
    isFallback = true;
  }

  if (catFilter) results = results.filter(catFilter);
  results.isFallback = isFallback;
  return results;
}

/**
 * Autosuggest for the hero search-as-you-type dropdown. Returns top N
 * articles ranked with title-heavy scoring. Sets `.isFallback` when the
 * results are popular articles instead of query matches, so the UI can
 * label them appropriately.
 */
export function suggest(query, articles, index, limit = 6) {
  const q = (query || "").trim();
  const empty = [];
  empty.isFallback = false;
  if (q.length < 2) return empty;

  // Title-heavy scoring for the dropdown
  let scored = scoreAll(q, articles, index, { titleBoost: 2 });
  let out = scored.slice(0, limit).map(x => x.a);
  let isFallback = false;

  // Fallback 1: heavy-typo fuzzy on titles
  if (!out.length) {
    out = fuzzyFallback(q, articles, limit);
  }

  // Fallback 2: popular articles — dropdown is NEVER empty for a 2+ char query
  if (!out.length) {
    out = getPopularFallback(articles, limit);
    isFallback = true;
  }

  out.isFallback = isFallback;
  return out;
}
