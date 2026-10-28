"""Assemble runtime i18n files for the site from glossary + translated (and proofread) articles."""
import json, os, sys
import tcore
from digits import native_digits as ND
from langs import LANGS
KB = tcore.KB
art = json.load(open(f"{KB}/articles.json"))
SRC = {a["id"]: a for a in art}
def h(i):
    a = SRC[i]; b = tcore.split_tail(a["body"])[0]
    import hashlib
    return hashlib.sha1(json.dumps({"id": i, "title": a["title"], "tags": a["tags"], "body": b}, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:12]
def compile_lang(p, min_ratio=0.995):
    g = tcore.gloss(p)
    ui = {x["key"]: x["t"] for x in g["ui"]}
    cats = {x["en"]: {"label": x["label"], "headline": x["headline"], "blurb": x["blurb"], "description": x["description"]} for x in g["categories"]}
    subs = {x["en"]: x["t"] for x in g["subcategories"]}
    tail = open(f"work/tail/{p}.md").read()
    out, missing = [], []
    for a in art:
        i = a["id"]; rec = None
        for d in (f"work/pr/{p}/{i}.json", f"work/tr/{p}/{i}.json"):
            if os.path.exists(d):
                r = json.load(open(d))
                if r.get("src") == h(i): rec = r; break
        if not rec: missing.append(i); continue
        out.append({"id": i, "slug": a["slug"], "category": a["category"], "subcategory": subs.get(a["subcategory"], a["subcategory"]),
                    "title": rec["title"], "tags": rec["tags"], "body": rec["body"].rstrip() + "\n" + tail,
                    "title_en": a["title"], "tags_en": a["tags"]})
    ratio = len(out) / len(art)
    if ratio < min_ratio: return p, f"NOT LIVE ({len(out)}/{len(art)})"
    # fill any gap with English so every slug exists in every language
    have = {x["id"] for x in out}
    for a in art:
        if a["id"] not in have:
            out.append({**{k: a[k] for k in ("id", "slug", "category", "subcategory", "title", "tags", "body")}, "title_en": a["title"], "tags_en": a["tags"], "untranslated": True})
    out.sort(key=lambda x: x["id"])
    nd = lambda v: ND(v, p) if isinstance(v, str) else ({k: nd(x) for k, x in v.items()} if isinstance(v, dict) else ([nd(x) for x in v] if isinstance(v, list) else v))
    ui, cats, plural = nd(ui), nd(cats), nd(g["plural_articles"])
    for x in out:
        if not x.get("untranslated"):
            x["title"], x["body"], x["tags"], x["subcategory"] = nd(x["title"]), nd(x["body"]), nd(x["tags"]), nd(x["subcategory"])
    json.dump({"ui": ui, "plural_articles": plural, "categories": cats}, open(f"{KB}/i18n/{p}.json", "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump(out, open(f"{KB}/i18n/{p}.articles.json", "w"), ensure_ascii=False, separators=(",", ":"))
    return p, f"live {len(have)}/{len(art)} ({os.path.getsize(f'{KB}/i18n/{p}.articles.json')//1024} KB)"
if __name__ == "__main__":
    for p in (sys.argv[1:] or [l[0] for l in LANGS]):
        print(compile_lang(p))
