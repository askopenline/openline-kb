import json, re, os
from langs import BY
KB = os.environ.get("KB_DIR") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TAIL_MARK = "\n## Still stuck?"

def split_tail(body):
    i = body.find(TAIL_MARK)
    return (body[:i], body[i:]) if i >= 0 else (body, "")

def gloss(p):
    return json.load(open(f"{KB}/i18n/{p}.gloss.json"))

def glossary_text(g):
    return "; ".join(f"{x['en']} → {x['t']}" for x in g["terms"])

ITEM_SCHEMA = {"type":"object","additionalProperties":False,"required":["items"],"properties":{"items":{"type":"array","items":{
  "type":"object","additionalProperties":False,"required":["id","title","tags","body"],"properties":{
   "id":{"type":"integer"},"title":{"type":"string"},"tags":{"type":"array","items":{"type":"string"}},"body":{"type":"string"}}}}}}

def sys_prompt(p, g):
    name = BY[p][3]
    return f"""You are a senior native {name} localizer and UX writer for Openline, Inc., a global travel eSIM company. Translate Help Center articles from English into {name} so they read as if originally written by a native {name} support writer: natural, warm, clear and concise; never literal, never machine-sounding. Restructure sentences freely for natural flow, but keep every fact.

Tone and form of address: {g['register']}

Hard rules:
- Keep the Markdown structure identical: same headings (#/##/###) in the same order, same list items and numbering, tables with the same rows/columns and pipes, bold/italic, blockquotes, blank lines between blocks.
- Never change URLs, link targets in (...), email addresses, phone numbers, @handles, inline `code`, codes like OL-4F7X-9K2Q-A3M8 or LPA:1$..., ICCID/EID digits, prices, numbers, units, percentages, model numbers, version numbers. Translate link text inside [...] naturally.
- Keep in Latin script exactly: Openline, Openline, Inc., eSIM, iPhone, iPad, Apple Watch, Android, Samsung, Galaxy, Pixel, WhatsApp, Messenger, PayPal, Apple Pay, Google Pay, SM-DP+, ICCID, EID, LPA, QR, Wi-Fi, VPN, APN, 4G, 5G, LTE, iOS, MDM, API, IoT, SIM and real carrier/company names.
- Phone menu paths (Settings → Cellular → …): use the exact labels Apple/Google/Samsung show on devices set to {name}; keep the arrows.
- Openline's own website/app labels (My Codes, Reinstall, Share, Gift, Redeem code, Show QR, Unlock, Activating, No Service, etc.) must also be translated naturally into {name} — never leave English UI words in the text. Technical strings such as "LPA string" become natural {name} wording (keep "LPA").
- Country, region and city names: standard {name} exonyms.
- Terminology (use consistently): {glossary_text(g)}
- Output plain Unicode text only: never control characters or escape sequences. Where the language puts a space before punctuation (French : ; ! ? « »), use a normal space or U+00A0.
- Coverage is 190+ countries; keep every number exactly. Do not add, remove, soften or invent facts, promises, conditions or numbers.
- Title: natural {name} question/heading, same meaning. Tags: short {name} search keywords (same count), lowercase where the language uses case.
- Return JSON {{"items":[{{"id","title","tags","body"}}]}} with every input id exactly once."""

ESC_RE = re.compile(r"\\u[0-9a-fA-F]{4}")
SLASHP_RE = re.compile(r"(?<=\w)/(?=\s?[?!:;])")
CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
URL_RE = re.compile(r"\]\(([^)\s]+)\)|https?://[^\s)>\]]+|[\w.+-]+@[\w-]+\.[\w.]+")
CODE_RE = re.compile(r"`[^`]+`")
NUM_RE = re.compile(r"\d(?:\d|[,.](?=\d)|[\u00a0\u202f ](?=\d{3}(?!\d)))*")
import unicodedata
def _ascii_digits(s):
    return "".join(str(unicodedata.digit(ch)) if ch.isdigit() and not ch.isascii() and unicodedata.digit(ch, None) is not None else ch for ch in s)
def nums(s):
    s = _ascii_digits(s)
    out = []
    for m in NUM_RE.findall(s):
        d = re.sub(r"[^\d]", "", m)
        if len(d) >= 2: out.append(d)
    return out

def struct(md):
    lines = md.split("\n")
    return {
      "h": [l.split(" ")[0] for l in lines if re.match(r"^#{1,6} ", l)],
      "li": sum(1 for l in lines if re.match(r"^\s*([-*]|\d+[.)])\s", l)),
      "tr": sum(1 for l in lines if l.strip().startswith("|")),
    }

def validate(src, tgt, p):
    errs = []
    if not tgt.get("body") or not tgt.get("title"): return ["empty"]
    if CTRL_RE.search(tgt["title"] + tgt["body"] + " ".join(tgt.get("tags", []))): return ["control characters"]
    if ESC_RE.search(tgt["title"] + tgt["body"]) and not ESC_RE.search(src["title"] + src["body"]): return ["literal escape sequence"]
    if "\n" in tgt["title"].strip(): return ["newline in title"]
    if p == "fr" and SLASHP_RE.search(tgt["title"] + tgt["body"]) and not SLASHP_RE.search(src["title"] + src["body"]): return ["slash before punctuation"]
    s, t = struct(src["body"]), struct(tgt["body"])
    if s["h"] != t["h"]: errs.append(f"headings {s['h']} vs {t['h']}")
    if abs(s["li"] - t["li"]) > 0: errs.append(f"list items {s['li']} vs {t['li']}")
    if s["tr"] != t["tr"]: errs.append(f"table rows {s['tr']} vs {t['tr']}")
    su = sorted(set(m if isinstance(m, str) else m for m in [x for tup in URL_RE.findall(src["body"]) for x in ([tup] if isinstance(tup,str) else tup) if x]))
    tu = sorted(set(m if isinstance(m, str) else m for m in [x for tup in URL_RE.findall(tgt["body"]) for x in ([tup] if isinstance(tup,str) else tup) if x]))
    if set(su) - set(tu): errs.append(f"urls missing {sorted(set(su)-set(tu))[:3]}")
    sc, tc = sorted(CODE_RE.findall(src["body"])), sorted(CODE_RE.findall(tgt["body"]))
    if set(sc) - set(tc): errs.append(f"code missing {sorted(set(sc)-set(tc))[:3]}")
    sn, tn = nums(src["body"] + " " + src["title"]), nums(tgt["body"] + " " + tgt["title"])
    from collections import Counter
    miss = Counter(sn) - Counter(tn)
    k = len(re.findall(r"24\s*/\s*7", src["body"] + " " + src["title"]))  # "24/7" may become "dygnet runt", "цілодобово"
    if k: miss = miss - Counter({"24": k, "7": k})
    if miss: errs.append(f"numbers missing {list(miss.elements())[:5]}")
    if "OL-" in src["body"] and src["body"].count("OL-") > tgt["body"].count("OL-"): errs.append("OL- code lost")
    if len(tgt.get("tags", [])) != len(src.get("tags", [])): errs.append("tag count")
    # untranslated check: long English sentence copied verbatim
    if p not in ("en",) and len(src["body"]) > 200 and tgt["body"].strip() == src["body"].strip(): errs.append("identical to source")
    return errs
