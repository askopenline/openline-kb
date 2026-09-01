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
