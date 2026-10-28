"""Native review of UI strings + category copy per language (edits applied to the glossary file)."""
import json, asyncio, os, sys, shutil
from orc import client, chat_json
import tcore
from langs import LANGS, BY
KB = tcore.KB
EN = json.load(open(f"{KB}/i18n/en.ui.json"))
CATS = json.load(open(f"{KB}/categories.json"))
S = {"type":"object","additionalProperties":False,"required":["ui","categories","plural_articles","notes"],"properties":{
  "ui":{"type":"array","items":{"type":"object","additionalProperties":False,"required":["key","t"],"properties":{"key":{"type":"string"},"t":{"type":"string"}}}},
  "categories":{"type":"array","items":{"type":"object","additionalProperties":False,"required":["en","label","headline","blurb","description"],"properties":{k:{"type":"string"} for k in ["en","label","headline","blurb","description"]}}},
  "plural_articles":{"type":"object","additionalProperties":False,"required":["zero","one","two","few","many","other"],"properties":{k:{"type":"string"} for k in ["zero","one","two","few","many","other"]}},
  "notes":{"type":"string"}}}
async def one(c, p):
    f = f"{KB}/i18n/{p}.gloss.json"
    if os.path.exists(f + ".reviewed"): return p, "cached"
    g = json.load(open(f)); name = BY[p][3]
    payload = {"ui": [{"key": x["key"], "en": EN["ui"].get(x["key"], ""), "current": x["t"]} for x in g["ui"]],
               "categories": [{"en": x["en"], "en_copy": CATS.get(x["en"], {}), "current": {k: x[k] for k in ("label","headline","blurb","description")}} for x in g["categories"]],
               "plural_articles_current": g["plural_articles"]}
    sysm = f"""You are the senior native {name} UX writer reviewing the interface copy of the Openline Help Center (kb.openline.com/{p}) before launch. Tone/register: {g['register']}
Return the final version of every string: keep the current text when it is already perfect; otherwise fix anything that is not natural, idiomatic and polished for native {name} speakers — awkward phrasing, literal translation, redundancy (e.g. "more than 2,700+"), wrong punctuation/typography, inconsistent terminology, overly long button labels. Keep meaning, placeholders ({{q}} {{n}} {{total}} {{limit}} {{title}} {{category}} {{network}}), HTML tags/attributes, brand names and numbers (190+, 2700+/2,700+ may be formatted per locale). Category labels must be short (chips). Plural forms must follow CLDR for {name}. In "notes" list the main changes briefly in English."""
    d = await chat_json(c, "anthropic/claude-sonnet-5.5", sysm, json.dumps(payload, ensure_ascii=False), schema=S, max_tokens=16000, temperature=0.2, tag=f"uirev:{p}")
    ui = {x["key"]: x["t"] for x in d["ui"]}
    miss = [x["key"] for x in g["ui"] if x["key"] not in ui]
    import re
    bad = [k for k, v in ui.items() if sorted(re.findall(r"\{\w+\}", v)) != sorted(re.findall(r"\{\w+\}", EN["ui"].get(k, "")))]
    if miss or bad: raise RuntimeError(f"{p}: missing {miss[:5]} placeholder mismatch {bad[:5]}")
    shutil.copy(f, f + ".orig")
    g["ui"] = [{"key": x["key"], "t": ui[x["key"]]} for x in g["ui"]]
    cm = {x["en"]: x for x in d["categories"]}
    g["categories"] = [cm.get(x["en"], x) for x in g["categories"]]
    g["plural_articles"] = d["plural_articles"]
    json.dump(g, open(f, "w"), ensure_ascii=False, indent=1)
    open(f + ".reviewed", "w").write(d["notes"])
    return p, d["notes"][:300]
async def main(ps):
    async with client(12) as c:
        for r in await asyncio.gather(*[one(c, p) for p in ps], return_exceptions=True): print(r)
asyncio.run(main(sys.argv[1:] or [l[0] for l in LANGS]))
