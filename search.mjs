// Openline KB search core — MiniSearch (BM25) + domain synonyms.
//
// Two-layer search:
//   1. MiniSearch: proper inverted index with BM25 ranking, prefix matching,
//      typo-tolerant fuzzy, and field weighting (title 5x, tags 3x, body 1x).
//   2. Synonym expansion: 100+ domain-specific term mappings (typos, foreign
//      languages, phrase intent) applied to the query BEFORE MiniSearch runs.
//
// Pure JS, no DOM dependencies. Same module powers the browser app and the
// Node-side audit script for identical scoring.

import MiniSearch from "./minisearch.mjs";

// ---------------------------------------------------------------------------
// Domain synonym expansion — untouched from v1 because it maps very
// eSIM-specific typos and foreign phrases that no general-purpose stemmer
// would catch. MiniSearch's built-in fuzzy handles the rest.
// ---------------------------------------------------------------------------
export const SYNONYMS = {
  // Payments
  "money back": ["refund", "refunded"],
  "get my money": ["refund"],
  "my money": ["refund"],
  "cancel": ["refund", "cancellation"],
  "chargeback": ["refund", "dispute"],
  "reembolso": ["refund"],
  "remboursement": ["refund"],
  "erstattung": ["refund"],
  // Coverage / connectivity
  "no service": ["signal", "data"],
  "no data": ["signal", "data"],
  "no signal": ["signal", "data"],
  "no internet": ["data", "signal"],
  "wont work": ["troubleshoot"],
  "doesnt work": ["troubleshoot"],
  "cant connect": ["signal", "troubleshoot"],
  "cobertura": ["coverage"],
  "couverture": ["coverage"],
  "funciona": ["work"],
  "marche pas": ["troubleshoot"],
  // Install / redemption
  "install": ["installation", "installing", "activate"],
  "setup": ["install", "activate"],
  "set up": ["install", "activate"],
  "instalar": ["install"],
  "installer": ["install"],
  "activation": ["activate", "install"],
  "qrcode": ["qr", "code"],
  "qr-code": ["qr", "code"],
  // Purchase-code specific
  "redeem": ["redeem", "activate", "install", "code"],
  "voucher": ["code", "purchase"],
  "gift card": ["gift", "code", "purchase"],
  "code": ["purchase-code", "code"],
  // Phone number / SIM
  "phone number": ["number", "primary line"],
  "keep number": ["primary line", "home line"],
  "unlock": ["unlocked", "carrier-locked"],
  // Apps
  "whatsapp": ["whatsapp", "messaging"],
  "imessage": ["imessage", "messages"],
  "netflix": ["netflix", "streaming"],
  "maps": ["navigation", "google maps"],
  // Data
  "data usage": ["data", "consumption"],
  "top up": ["topup", "add data"],
  "topup": ["top up", "add data"],
  // Common typos
  "workign": ["working"],
  "instal": ["install"],
  "iphon": ["iphone"],
  "gogle": ["google"],
  "activaiton": ["activation"],
  "hwo": ["how"],
  "portugual": ["portugal"],
  "japn": ["japan"],
  "caling": ["calling"],
  "contry": ["country"],
  "esm": ["esim"],
  "eism": ["esim"],
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
  "für": [],
  "pour": [],
  "para": [],
  "no brasil": ["brazil"],
  "em portugal": ["portugal"],
  "en france": ["france"],
  // App-name helpers
  "wont scan": ["scan", "qr", "code"],
  "scan qr": ["qr", "code", "install"],
  // Intent helpers
  "help": ["support", "contact", "refund"],
  "problem": ["issue", "troubleshoot"],
  "issue": ["problem", "troubleshoot"],
  "broken": ["troubleshoot"],
  // Verb morphology
  "traveling": ["travel", "trip"],
  "travelling": ["travel", "trip"],
  "installed": ["install"],
  "activated": ["activate", "activation"],
  "refunded": ["refund"],
  "stolen": ["steal", "stole", "theft"],
  "steal": ["stolen", "theft"],
  "lost": ["lose", "missing"],
  "lose": ["lost", "missing"],
  "coverage": ["coverage", "cobertura", "couverture"],
  // -------------------------------------------------------------------
  // Activation + network failure natural-language patterns (v3 batch).
  // Users type these phrases exactly when panicked at an airport, so we
  // map them aggressively to the activation-troubleshooting corpus.
  // -------------------------------------------------------------------
  "cant activate": ["activate", "activation", "stuck", "troubleshoot"],
  "can't activate": ["activate", "activation", "stuck", "troubleshoot"],
  "cannot activate": ["activate", "activation", "stuck", "troubleshoot"],
  "wont activate": ["activate", "activation", "stuck", "troubleshoot"],
  "won't activate": ["activate", "activation", "stuck", "troubleshoot"],
  "not activating": ["activate", "activation", "stuck", "troubleshoot"],
  "failed to activate": ["activation", "failed", "troubleshoot"],
  "activation failed": ["activation", "failed", "troubleshoot"],
  "cant install": ["install", "installation", "troubleshoot"],
  "can't install": ["install", "installation", "troubleshoot"],
  "wont install": ["install", "installation", "troubleshoot"],
  "won't install": ["install", "installation", "troubleshoot"],
  "install failed": ["install", "failed", "troubleshoot"],
  "install fail": ["install", "failed", "troubleshoot"],
  "stuck activating": ["stuck", "activating", "troubleshoot"],
  "stuck on activation": ["stuck", "activating", "troubleshoot"],
  "waiting for activation": ["stuck", "activating", "troubleshoot"],
  "trying to activate": ["stuck", "activating", "troubleshoot"],
  // Wi-Fi environment blockers
  "hotel wifi": ["hotel", "wifi", "captive", "blocked"],
  "airport wifi": ["airport", "wifi", "captive", "blocked"],
  "office wifi": ["corporate", "office", "wifi", "firewall"],
  "corporate wifi": ["corporate", "office", "wifi", "firewall"],
  "work wifi": ["corporate", "office", "wifi", "firewall"],
  "public wifi": ["public", "wifi", "captive"],
  "cafe wifi": ["public", "wifi"],
  "coffee shop wifi": ["public", "wifi"],
  "library wifi": ["public", "wifi"],
  "mall wifi": ["public", "wifi"],
  "free wifi": ["public", "wifi", "captive"],
  "captive portal": ["captive", "portal", "wifi", "blocked"],
  "airbnb wifi": ["airbnb", "wifi"],
  "home wifi": ["home", "wifi"],
  "personal hotspot": ["tether", "hotspot", "install"],
  "tethering": ["tether", "hotspot"],
  "vpn": ["vpn", "proxy", "blocked"],
  "firewall": ["firewall", "corporate", "blocked"],
  "blocks esim": ["blocked", "blocking", "wifi", "install"],
  "blocks activation": ["blocked", "blocking", "activation"],
  "blocking activation": ["blocked", "blocking", "activation"],
  "blocked by network": ["blocked", "network", "activation"],
  "blocked by carrier": ["blocked", "carrier", "activation"],
  "blocked by wifi": ["blocked", "wifi", "install"],
  "blocked by vpn": ["blocked", "vpn", "install"],
  // No signal / no service / no data variants
  "no service": ["signal", "data", "registration", "troubleshoot"],
  "not registered": ["registration", "network", "troubleshoot"],
  "invalid sim": ["error", "invalid", "troubleshoot"],
  "no sim": ["error", "invalid", "troubleshoot"],
  "sim not provisioned": ["error", "provisioned", "troubleshoot"],
  "searching for network": ["searching", "network", "troubleshoot"],
  "searching for signal": ["searching", "signal", "troubleshoot"],
  "weak signal": ["signal", "coverage", "troubleshoot"],
  "slow speeds": ["slow", "speed", "throttle", "troubleshoot"],
  "slow internet": ["slow", "speed", "troubleshoot"],
  "slow data": ["slow", "speed", "troubleshoot"],
  "data roaming": ["roaming", "data", "setting"],
  "apn": ["apn", "setting", "network"],
  "apn settings": ["apn", "setting", "network"],
  "network selection": ["network", "selection", "manual"],
  "manual network": ["network", "selection", "manual"],
  // Error message keywords
  "could not add": ["error", "install", "failed"],
  "cannot add": ["error", "install", "failed"],
  "couldnt add": ["error", "install", "failed"],
  "error message": ["error", "troubleshoot"],
  "error code": ["error", "troubleshoot"],
  "mm2": ["mm2", "error"],
  "mm6": ["mm6", "error"],
  "plmn": ["plmn", "error", "network"],
  // Reinstall / recovery
  "reinstall": ["reinstall", "recovery", "install"],
  "disappeared": ["disappeared", "missing", "reinstall"],
  "went away": ["disappeared", "missing", "reinstall"],
  "gone": ["missing", "reinstall"],
  "new phone": ["transfer", "new-device", "reinstall"],
  "factory reset": ["reset", "reinstall", "recovery"],
  "reset phone": ["reset", "reinstall", "recovery"],
  "deleted by mistake": ["deleted", "reinstall", "recovery"],
  "already redeemed": ["redeemed", "purchase-code", "reinstall"],
  // Dual-SIM
  "dual sim": ["dual-sim", "two-sims", "home-carrier"],
  "two sims": ["dual-sim", "two-sims"],
  "my other sim": ["dual-sim", "home-carrier"],
  "my home sim": ["dual-sim", "home-carrier", "primary"],
  "primary sim": ["dual-sim", "home-carrier", "primary"],
  "main sim": ["dual-sim", "home-carrier", "primary"],
  "switched back": ["switching", "dual-sim", "home-carrier"],
  "auto switch": ["switching", "dual-sim", "cellular-data-switching"],
  "data switching": ["switching", "cellular-data-switching"],
  // Carrier / phone lock
  "carrier lock": ["unlock", "carrier-locked", "lock"],
  "locked phone": ["unlock", "carrier-locked", "lock"],
  "phone locked": ["unlock", "carrier-locked", "lock"],
  "is my phone unlocked": ["unlock", "check"],
  // Pre-travel prep
  "before travel": ["pre-travel", "install", "preparation"],
  "before trip": ["pre-travel", "install", "preparation"],
  "before i leave": ["pre-travel", "install", "preparation"],
  "before flying": ["pre-travel", "install", "preparation"],
  "install at home": ["pre-travel", "install", "home"],
  // Diagnostic
  "my iccid": ["iccid", "diagnostic"],
  "my imei": ["imei", "diagnostic"],
  "my eid": ["eid", "diagnostic"],
  "what network": ["network", "partner", "carrier"],
  "which carrier": ["network", "partner", "carrier"],
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

const NORM_SYNONYMS = (() => {
  const out = new Map();
  for (const [key, values] of Object.entries(SYNONYMS)) {
    out.set(normalize(key), values);
  }
  return out;
})();

/**
 * Expand a query with synonyms. Returns a new query string that MiniSearch
 * will tokenize/score. Multi-word phrase matches drop the component tokens
 * from the base query (so "how do i get my money back" → "refund refunded"
 * not "how do i get my money back refund refunded").
 */
export function expandQuery(q) {
  const nq = normalize(q);
  const extra = new Set();
  const consumed = new Set();
  for (const [key, values] of NORM_SYNONYMS) {
    if (nq.includes(key)) {
      for (const v of values) extra.add(v);
      if (key.includes(" ")) {
        for (const part of key.split(/\s+/)) consumed.add(part);
      }
    }
  }
  const base = tokenize(q).filter((t) => !consumed.has(t));
  for (const t of base) {
    const vals = NORM_SYNONYMS.get(t);
    if (vals) for (const v of vals) extra.add(v);
  }
  // Combine into one string; MiniSearch tokenizes internally.
  return [...base, ...extra].join(" ");
}

// ---------------------------------------------------------------------------
// MiniSearch index build
// ---------------------------------------------------------------------------
const STOP_WORDS = new Set([
  "a","an","the","is","are","was","were","be","been","being",
  "do","does","did","doing","done","can","could","will","would",
  "should","may","might","must","shall","have","has","had","having",
  "get","got","getting",
  "i","me","my","we","our","you","your","he","she","it","its",
  "they","them","their",
  "in","on","at","to","of","for","with","from","by","as","but",
  "or","and","if","then","than","so","not","no","yes",
  "how","what","when","where","which","why","who",
  "this","that","these","those","there","here",
  "openline",  // in every title, useless for ranking
]);

const MINI_OPTIONS = {
  fields: ["title", "tags", "category", "subcategory", "body"],
  storeFields: ["id"],  // we look up the full article from the source list
  idField: "id",
  processTerm: (term) => {
    const t = normalize(term);
    if (!t || t.length < 2) return null;
    if (STOP_WORDS.has(t)) return null;
    return t;
  },
  tokenize: (text) => text.match(/[a-zA-Z0-9+]+/g) || [],
};

// Runtime search options — kept separate from MINI_OPTIONS so we can
// override per call (autosuggest boosts titles harder, etc.).
const DEFAULT_SEARCH_OPTS = {
  boost: { title: 5, tags: 3, category: 2, subcategory: 2, body: 1 },
  prefix: (term) => term.length >= 3,
  fuzzy: (term) => (term.length >= 4 ? 0.2 : 0),
  // OR combineWith + BM25 IDF weighting handles rare-term relevance
  // naturally. Multi-word queries like "esim not workign" don't need every
  // term to match — the rarest terms drive the score.
  combineWith: "OR",
};

export function buildIndex(articles) {
  const mini = new MiniSearch(MINI_OPTIONS);
  const docs = articles.map((a) => ({
    id: a.id,
    title: a.title,
    tags: (a.tags || []).join(" "),
    category: a.category || "",
    subcategory: a.subcategory || "",
    body: a.body || "",
  }));
  mini.addAll(docs);
  return mini;
}

// ---------------------------------------------------------------------------
// Public search API
// ---------------------------------------------------------------------------

/**
 * Full-text search.
 *
 * @param {string} query
 * @param {Array} articles - full corpus (for id → article lookup + no-query fallback)
 * @param {Set<string>} cats - active category filter (empty = all)
 * @param {MiniSearch} index - prebuilt MiniSearch index
 * @returns {Array} sorted article list
 */
export function runSearch(query, articles, cats, index) {
  const idIndex = new Map(articles.map((a) => [a.id, a]));
  const catFilter = cats && cats.size
    ? (a) => cats.has(a.category)
    : null;

  const q = (query || "").trim();
  if (!q) {
    // No query → return everything (optionally category-filtered)
    return catFilter ? articles.filter(catFilter) : articles.slice();
  }

  const expanded = expandQuery(q);
  const finalQuery = expanded || q;

  // MiniSearch with OR + BM25 lets rare terms carry the ranking naturally.
  // Every meaningful token contributes; stopwords + common domain nouns are
  // filtered out by our processTerm.
  const hits = index.search(finalQuery, DEFAULT_SEARCH_OPTS);

  const seen = new Set();
  const out = [];
  for (const hit of hits) {
    if (seen.has(hit.id)) continue;
    const a = idIndex.get(hit.id);
    if (!a) continue;
    if (catFilter && !catFilter(a)) continue;
    seen.add(hit.id);
    out.push(a);
  }
  return out;
}

/**
 * Autosuggest — return up to N article titles whose title contains the
 * (prefix) query. Used by the search-as-you-type dropdown.
 *
 * MiniSearch's `autoSuggest` returns SUGGESTED TERMS (single tokens); we want
 * matching ARTICLES with their titles for the dropdown, so this is a
 * dedicated title-only search.
 *
 * @param {string} query
 * @param {Array} articles
 * @param {MiniSearch} index
 * @param {number} limit
 * @returns {Array<{article, matchedField}>}
 */
export function suggest(query, articles, index, limit = 6) {
  const q = (query || "").trim();
  if (q.length < 2) return [];
  const idIndex = new Map(articles.map((a) => [a.id, a]));
  const expanded = expandQuery(q);
  const finalQuery = expanded || q;
  const hits = index.search(finalQuery, {
    ...DEFAULT_SEARCH_OPTS,
    // Autosuggest weights title much more heavily so the dropdown surfaces
    // articles by title match, not by body proximity.
    boost: { title: 12, tags: 4, category: 1, subcategory: 1, body: 0.2 },
    prefix: true,
    fuzzy: (term) => (term.length >= 4 ? 0.2 : 0),
  });
  const seen = new Set();
  const out = [];
  for (const hit of hits) {
    if (out.length >= limit) break;
    if (seen.has(hit.id)) continue;
    const a = idIndex.get(hit.id);
    if (!a) continue;
    seen.add(hit.id);
    out.push(a);
  }
  return out;
}
