// Openline KB search core. Pure JS, no DOM dependencies, importable from
// both app.js (browser) and audit_search.mjs (Node).

import Fuse from "./fuse.min.mjs";

// Domain-specific synonym / phrase-expansion map.
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
  "no service": ["no signal", "no data", "not working"],
  "no data": ["no data", "no signal"],
  "no signal": ["no signal", "no data"],
  "no internet": ["no data", "no signal", "not working"],
  "but no data": ["but no data", "signal but no data"],
  "wont work": ["not working", "broken", "issue"],
  "doesnt work": ["not working", "broken", "issue"],
  "cant connect": ["no signal", "not working"],
  "cobertura": ["coverage"],
  "couverture": ["coverage"],
  "funciona": ["work", "working"],
  "marche pas": ["not working"],
  // Install
  "install": ["installation", "installing", "activate"],
  "setup": ["install", "activate", "installation"],
  "set up": ["install", "activate"],
  "instalar": ["install"],
  "installer": ["install"],
  "activation": ["activate", "install"],
  "qrcode": ["qr", "code"],
  "qr-code": ["qr", "code"],
  // Phone number / SIM
  "phone number": ["number", "primary line", "home line"],
  "keep number": ["primary line", "home line"],
  "unlock": ["unlocked", "carrier-locked"],
  // Apps
  "whatsapp": ["messaging"],
  "imessage": ["messages", "apple"],
  "netflix": ["streaming"],
  "maps": ["navigation", "google maps"],
  // Data
  "data usage": ["data", "consumption"],
  "top up": ["topup", "add data"],
  "topup": ["top up", "add data"],
  // Common typos / colloquial
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
  // German / French coverage helpers
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
  "problem": ["issue", "not working", "troubleshoot"],
  "issue": ["problem", "troubleshoot"],
  "broken": ["not working", "issue"],
  // Verb morphology
  "traveling": ["travel", "trip"],
  "travelling": ["travel", "trip"],
  "installed": ["install"],
  "activated": ["activate", "activation"],
  "refunded": ["refund"],
  // Language variants
  "coverage": ["cobertura", "couverture"],
};

export const STOPWORDS = new Set([
  "a","an","the","is","are","was","were","be","been","being",
  "do","does","did","doing","done","can","could","will","would",
  "should","may","might","must","shall",
  "i","me","my","we","our","you","your","he","she","it","its",
  "they","them","their",
  "in","on","at","to","of","for","with","from","by","as","but",
  "or","and","if","then","than","so","not","no","yes",
  "how","what","when","where","which","why","who",
  "this","that","these","those","there","here",
  "have","has","had","having","get","got","getting",
  // Very common domain nouns — present in most titles. Rarity weighting
  // already down-weights these to ~0.5x, but keeping them out of pure
  // per-token accumulation prevents them from dominating queries.
  "openline","about","need",
]);

export const COUNTRY_KEYWORDS = new Set([
  "japan","china","korea","vietnam","thailand","india","indonesia","philippines","malaysia","singapore","taiwan","nepal",
  "france","germany","spain","portugal","italy","greece","turkey","poland","netherlands","belgium","sweden","norway","denmark","finland","iceland","ireland","austria","switzerland","czechia","hungary","romania","croatia","slovenia","slovakia","bulgaria","estonia","latvia","lithuania","ukraine","russia",
  "usa","canada","mexico","brazil","argentina","chile","peru","colombia","uruguay","ecuador","bolivia","paraguay","venezuela","panama","costa","guatemala","honduras","nicaragua","salvador","cuba","jamaica","haiti",
  "australia","zealand","fiji","samoa",
  "egypt","morocco","tunisia","algeria","kenya","tanzania","uganda","rwanda","nigeria","ghana","senegal","ethiopia","africa",
  "uae","saudi","qatar","kuwait","bahrain","oman","jordan","israel","lebanon","iran","iraq",
  "uk","england","scotland","wales",
]);

export function normalize(s) {
  return (s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function tokenize(q) {
  return normalize(q).match(/[a-z0-9+]+/g) || [];
}

// Pre-normalize SYNONYMS keys so accents in either the user query or the
// synonym key don't prevent a match (e.g. 'españa' vs 'espana').
const NORM_SYNONYMS = (() => {
  const out = new Map();
  for (const [key, values] of Object.entries(SYNONYMS)) {
    out.set(normalize(key), values);
  }
  return out;
})();

export function expandQuery(q) {
  const nq = normalize(q);
  const extra = new Set();
  const consumedTokens = new Set();  // tokens absorbed by multi-word phrase matches
  for (const [key, values] of NORM_SYNONYMS) {
    if (nq.includes(key) && key.includes(" ")) {
      // multi-word phrase match — mark component tokens as consumed so their
      // individual short substrings don't create false matches downstream
      for (const part of key.split(/\s+/)) consumedTokens.add(part);
      for (const v of values) extra.add(v);
    } else if (nq.includes(key)) {
      for (const v of values) extra.add(v);
    }
  }
  const base = tokenize(q).filter((t) => !consumedTokens.has(t));
  for (const t of base) {
    const vals = NORM_SYNONYMS.get(t);
    if (vals) for (const v of vals) extra.add(v);
  }
  return { tokens: base, expanded: Array.from(extra) };
}

export function scoreArticle(a, tokens, expanded) {
  if (!tokens.length && !expanded.length) return 0;
  const title = normalize(a.title);
  const cat = normalize(a.category + " " + (a.subcategory || ""));
  const tags = normalize((a.tags || []).join(" "));
  const body = normalize(a.body);
  let score = 0;
  const nq = tokens.join(" ");
  if (nq && title.includes(nq)) score += 80;
  for (const t of tokens) {
    const isStop = STOPWORDS.has(t) || t.length < 2;
    const isCountry = COUNTRY_KEYWORDS.has(t);
    if (isStop) continue;
    if (title === t) score += 100;
    if (title.startsWith(t)) score += 40;
    if (title.includes(t)) score += 25;
    if (cat.includes(t)) score += 8;
    if (tags.includes(t)) score += 12;
    if (isCountry) {
      if (title.includes(t)) score += 60;
      if (tags.includes(t)) score += 30;
      if (body.includes(t)) score += 4;
    }
    let idx = 0, hits = 0;
    while ((idx = body.indexOf(t, idx)) !== -1 && hits < 3) { hits++; idx += t.length; }
    score += Math.min(hits, 3);
  }
  for (const t of expanded) {
    if (STOPWORDS.has(t)) continue;
    if (title.includes(t)) score += 18;
    if (cat.includes(t)) score += 4;
    if (tags.includes(t)) score += 8;
    if (body.includes(t)) score += 1;
    if (COUNTRY_KEYWORDS.has(t) && title.includes(t)) score += 40;
  }
  return score;
}

const FUSE_OPTIONS = {
  keys: [
    { name: "title", weight: 0.7 },
    { name: "tags", weight: 0.15 },
    { name: "category", weight: 0.1 },
    { name: "subcategory", weight: 0.05 },
  ],
  includeScore: true,
  ignoreLocation: true,
  // With ignoreLocation, threshold acts as the maximum acceptable score.
  // 0.55 lets us pick up typos and small transpositions while rejecting
  // wildly unrelated matches. We further filter by hit.score at merge time.
  threshold: 0.55,
  minMatchCharLength: 4,
};

// Reject Fuse hits with score above this cutoff at merge time.
const FUSE_MAX_SCORE = 0.55;

export function buildFuse(articles) {
  const docs = articles.map((a) => ({
    id: a.id,
    title: normalize(a.title),
    tags: (a.tags || []).map(normalize),
    category: normalize(a.category),
    subcategory: normalize(a.subcategory || ""),
  }));
  return new Fuse(docs, FUSE_OPTIONS);
}

// Build a document-frequency map: how many article titles contain each token.
// Rare tokens carry much stronger intent; common ones (data, plan, esim, etc.)
// should not dominate. Called once per corpus.
export function buildDF(articles) {
  const df = new Map();
  for (const a of articles) {
    const seen = new Set(tokenize(a.title));
    for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
  }
  return df;
}

// IDF-ish weight: rare tokens are much more informative. A rare token in the
// TITLE means the article is clearly about that topic; a common one (like
// "data" or "install") is basically noise on its own.
function rarityWeight(df, token, totalDocs) {
  const n = df.get(token) || 0;
  if (n === 0) return 1.6; // token never appears in any title — fuzzy match likely
  const ratio = n / totalDocs;
  if (ratio < 0.002) return 2.4;  // extremely rare: netflix, iccid, whatsapp, imessage
  if (ratio < 0.005) return 2.0;
  if (ratio < 0.02) return 1.4;
  if (ratio < 0.10) return 1.0;
  if (ratio < 0.25) return 0.7;
  return 0.5;                     // extremely common, e.g. "data", "install", "activate"
}

// Word-boundary matcher: returns true when the token appears as a whole word
// (or at either edge of the string). Prevents "plan" from matching "plans"
// unless the query itself was "plans".
function hasWord(text, token) {
  const re = new RegExp(`(^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
  return re.test(text);
}

// Rarity-aware wrapper around scoreArticle.
function scoreArticleRarity(a, tokens, expanded, df, totalDocs) {
  if (!tokens.length && !expanded.length) return 0;
  const title = normalize(a.title);
  const cat = normalize(a.category + " " + (a.subcategory || ""));
  const tags = normalize((a.tags || []).join(" "));
  const body = normalize(a.body);
  let score = 0;
  // Phrase-match bonus — only when the phrase contains at least one
  // non-stopword, otherwise "how do i" matches every question title.
  const meaningful = tokens.filter((t) => !STOPWORDS.has(t) && t.length >= 2);
  if (meaningful.length) {
    const phraseNq = tokens.join(" ");
    if (phraseNq && title.includes(phraseNq)) score += 80;
    // Also give a smaller boost when the meaningful-only phrase appears
    // (e.g. "pixel 8" from "pixel 8 setup").
    const meaningfulPhrase = meaningful.join(" ");
    if (meaningfulPhrase !== phraseNq && title.includes(meaningfulPhrase)) score += 40;
  }
  for (const t of tokens) {
    if (STOPWORDS.has(t) || t.length < 2) continue;
    const w = rarityWeight(df, t, totalDocs);
    const isCountry = COUNTRY_KEYWORDS.has(t);
    // Prefer word-boundary matches so "plan" doesn't match "plans" and
    // "back" doesn't match "backup". Substring is still credited but at a
    // discount.
    const wordHit = hasWord(title, t);
    const subHit = !wordHit && title.includes(t);
    if (title === t) score += 100 * w;
    else if (title.startsWith(t + " ")) score += 40 * w;
    if (wordHit) score += 25 * w;
    else if (subHit) score += 10 * w;
    if (cat.includes(t)) score += 8 * w;
    if (hasWord(tags, t)) score += 12 * w;
    if (isCountry) {
      if (title.includes(t)) score += 60;
      if (tags.includes(t)) score += 30;
      if (body.includes(t)) score += 4;
    }
    let idx = 0, hits = 0;
    while ((idx = body.indexOf(t, idx)) !== -1 && hits < 3) { hits++; idx += t.length; }
    score += Math.min(hits, 3) * Math.min(w, 1.2);
  }
  for (const t of expanded) {
    if (STOPWORDS.has(t)) continue;
    const w = rarityWeight(df, t, totalDocs);
    if (hasWord(title, t)) score += 18 * w;
    else if (title.includes(t)) score += 8 * w;
    if (cat.includes(t)) score += 4;
    if (hasWord(tags, t)) score += 8;
    if (body.includes(t)) score += 1;
    if (COUNTRY_KEYWORDS.has(t) && title.includes(t)) score += 40;
  }
  return score;
}

/**
 * @param {string} query
 * @param {Array} articles - full corpus
 * @param {Set<string>} cats - active category filter (empty = all)
 * @param {Fuse} fuse - prebuilt Fuse instance over the FULL corpus
 * @param {Map} df - optional DF map (built on first use if omitted)
 * @returns {Array} sorted article list
 */
let _cachedDF = null;
let _cachedDFSize = 0;
export function runSearch(query, articles, cats, fuse, df) {
  const { tokens, expanded } = expandQuery(query);
  let list = articles;
  if (cats && cats.size) list = list.filter((a) => cats.has(a.category));
  if (!tokens.length) return list.slice();

  if (!df) {
    if (!_cachedDF || _cachedDFSize !== articles.length) {
      _cachedDF = buildDF(articles);
      _cachedDFSize = articles.length;
    }
    df = _cachedDF;
  }
  const totalDocs = articles.length;

  const idIndex = new Map(list.map((a) => [a.id, a]));
  const scores = new Map();

  for (const a of list) {
    const s = scoreArticleRarity(a, tokens, expanded, df, totalDocs);
    if (s > 0) scores.set(a.id, s);
  }

  // Fuse.js phrase matching over multi-word queries with `ignoreLocation`
  // often returns nothing (it requires all words to appear near each other),
  // so we search each meaningful term individually and merge results.
  // Stopwords AND very-common tokens are excluded from Fuse so that words
  // like "plan" don't fuzzy-match every "Openline plans" article.
  if (fuse) {
    const isRareEnough = (t) => {
      const n = df.get(t) || 0;
      return n / totalDocs < 0.25;  // token appears in <25% of titles
    };
    const fuseTerms = new Set();
    for (const t of tokens) {
      if (!STOPWORDS.has(t) && t.length >= 4 && isRareEnough(t)) fuseTerms.add(t);
    }
    for (const e of expanded) {
      if (!STOPWORDS.has(e) && e.length >= 4 && isRareEnough(e)) fuseTerms.add(e);
    }
    for (const term of fuseTerms) {
      const hits = fuse.search(term, { limit: 25 });
      for (const hit of hits) {
        if (hit.score > FUSE_MAX_SCORE) continue;
        const a = idIndex.get(hit.item.id);
        if (!a) continue;
        // Rarity of the QUERY term itself matters: rare terms should give a
        // bigger fuzzy-only bonus than common ones.
        const w = rarityWeight(df, term, totalDocs);
        const bonus = Math.round((1 - hit.score / FUSE_MAX_SCORE) * 30 * w);
        if (bonus <= 0) continue;
        const prev = scores.get(a.id) || 0;
        scores.set(a.id, prev + (prev > 0 ? Math.min(bonus, 10) : bonus));
      }
    }
  }

  return [...scores.entries()]
    .map(([id, s]) => ({ a: idIndex.get(id), s }))
    .filter((x) => x.a && x.s > 0)
    .sort((x, y) => y.s - x.s)
    .map((x) => x.a);
}
