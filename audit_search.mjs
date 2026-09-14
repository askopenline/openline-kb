// Node-based audit of the search behavior. Imports the SAME search module
// used by the browser to guarantee behavior parity.
import fs from "node:fs";
import { runSearch, buildIndex } from "./search.mjs";

const data = JSON.parse(fs.readFileSync("./articles.json", "utf8"));
const index = buildIndex(data);

const search = (q) => runSearch(q, data, new Set(), index);

// (query, expectedSubstringInTop3)
const AUDIT = [
  ["esim not workign", ["eSIM", "stops working", "troubleshoot"]],
  ["cant instal esim", "Install"],
  ["no signal in Japn", "Japan"],
  ["hwo to activate", "activate"],
  ["wifi caling", "Wi-Fi calling"],
  ["iphon 15 esim", "iPhone 15"],
  ["gogle pixel setup", "Google Pixel"],
  ["esim wont scan qrcode", "QR"],
  ["activaiton failed", "activat"],
  ["portugual coverage", "Portugal"],
  ["esim au Japon", "Japan"],
  ["cobertura españa", "Spain"],
  ["eSIM funciona no Brasil?", "Brazil"],
  ["esim für deutschland", "Germany"],
  ["how do i get my money back", "refund"],
  ["will my whatsapp work abroad", "WhatsApp"],
  ["does netflix count against data", "Netflix"],
  ["can i keep my phone number", "number"],
  ["will my imessage work", "iMessage"],
  ["do i need to unlock my phone", "unlock"],
  ["installing openline", "Install"],
  ["installed but no data", ["no data", "installed but", "line is off", "redeemed", "install"]],
  ["refunded my plan", "refund"],
  ["traveling to italy", "Italy"],
  ["activated but doesnt work", "activat"],
  ["japan", "Japan"],
  ["5g", "5G"],
  ["volte", "VoLTE"],
  ["qr code", "QR"],
  ["usa esim", "USA"],
  ["china vpn", "China"],
  ["roaming eu", "roaming"],
  ["SM-DP+", "SM-DP"],
  ["eUICC", "eUICC"],
  ["iccid", "ICCID"],
  ["MCC MNC", "MCC"],
  ["APN settings", "APN"],
  ["S24 ultra", "S24 Ultra"],
  ["pixel 8", "Pixel 8"],
  ["iphone 15 pro max", "iPhone 15 Pro Max"],
  ["one plus 12", "OnePlus 12"],
  ["data", "data"],
  ["help", "support"],
  ["problem", ["issue", "no data", "stops working", "not working", "can't", "won't", "troubleshoot", "wrong"]],
  ["not working", ["not working", "stops working", "no data", "no signal", "troubleshoot"]],
  // --- New queries stressing MiniSearch's improvements ---
  // Prefix matching — partial words should hit the target
  ["port", "Portugal"],
  ["jap", "Japan"],
  ["refun", "refund"],
  ["whats", "WhatsApp"],
  ["pix", "Pixel"],
  // Purchase-code content
  ["purchase code", "purchase code"],
  ["redeem gift", ["gift", "redeem"]],
  ["bulk buy", ["bulk", "purchase"]],
  ["anonymous", ["anonymous", "openline.com/start", "anonymously"]],
  ["code stolen", ["steal", "stolen", "security"]],
  // Very natural questions
  ["how much data does netflix use", "Netflix"],
  ["can I use openline in europe", ["Europe", "EU", "European", "roaming"]],
  ["my esim wont install", ["install", "activat"]],
  // Rare-token dominance
  ["iccid", "ICCID"],
  ["eUICC", "eUICC"],
  ["volte", "VoLTE"],
];

console.log(`Auditing ${AUDIT.length} queries × ${data.length} articles\n`);
let pass = 0, fail = 0, warnings = [];
for (const [q, expect] of AUDIT) {
  const results = search(q);
  const top3 = results.slice(0, 3);
  const expects = Array.isArray(expect) ? expect : [expect];
  const hit = top3.some((a) => expects.some((e) => a.title.toLowerCase().includes(e.toLowerCase())));
  const mark = hit ? "✓" : "✗";
  if (hit) pass++; else { fail++; warnings.push([q, expect, top3]); }
  console.log(`${mark} "${q}"  (expect ${JSON.stringify(expect)})`);
  for (const a of top3) console.log(`     · ${a.title}`);
  if (!top3.length) console.log("     (NO RESULTS)");
}
console.log(`\n=== SUMMARY: ${pass}/${AUDIT.length} pass, ${fail} fail ===`);
if (warnings.length) {
  console.log("\nFailures:");
  for (const [q, e, t] of warnings) {
    console.log(` - "${q}" wanted "${e}", got: ${t[0]?.title || "(none)"}`);
  }
}

// v3 batch: activation + network-block queries
const V3_TESTS = [
  ['I cant activate','activate'],
  ['cant install esim','install'],
  ['hotel wifi blocks esim','hotel'],
  ['airport wifi blocking install','airport'],
  ['corporate firewall esim','corporate'],
  ['vpn blocking install','vpn'],
  ['stuck on activating','stuck'],
  ['no service after install','service'],
  ['is my phone unlocked','unlock'],
  ['install esim before travel','pre-travel'],
];
console.log('\n=== V3 activation tests ===');
for (const [q, expect] of V3_TESTS) {
  const r = search(q).slice(0, 3);
  const ok = r.length > 0 && r.some(a => a.title.toLowerCase().includes(expect) || a.tags?.some(t => t.includes(expect)));
  console.log(ok ? '✓' : '✗', `"${q}"  (expect "${expect}")`);
  for (const a of r) console.log('     ·', a.title);
}

// v4 batch (Sep 14 session): user-flagged failures.
// Rule: every non-gibberish query must return at least one result.
// Rule: exact-title matches win outright.
const V4_TESTS = [
  ['what is openline', 'What is Openline?'],
  ['what is openline?', 'What is Openline?'],
  ['openline', null],           // just must not be empty
  ['about openline', null],
  ['is openline', null],
  ['oepnline', null],           // typo of "openline"
  ['opneline', null],
  ['what', null],               // pure stopword — must still return something
  ['ol', null],
  ['help', null],
  ['contact', null],
  ['refund', 'refund'],
  ['gimme my money back please', 'refund'],
];
console.log('\n=== V4 non-empty & exact-title tests ===');
let v4pass = 0, v4fail = 0;
for (const [q, expect] of V4_TESTS) {
  const r = search(q).slice(0, 3);
  let ok = r.length > 0;
  if (ok && expect) {
    ok = r.some(a => a.title.toLowerCase().includes(expect.toLowerCase()));
  }
  if (ok) v4pass++; else v4fail++;
  console.log(ok ? '✓' : '✗', `"${q}" ${expect ? '(expect "'+expect+'")' : '(must not be empty)'}`);
  for (const a of r) console.log('     ·', a.title);
}
console.log(`\n=== V4 SUMMARY: ${v4pass}/${v4pass+v4fail} pass ===`);
