import json, asyncio, sys, os
from orc import client, chat_json
from langs import LANGS, BY
KB = os.environ.get("KB_DIR") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MODEL = os.environ.get("GLOSS_MODEL", "anthropic/claude-sonnet-5.5")
TERMS = ["purchase code","activation code","eSIM profile","plan","data plan","Global plan","regional plan","unlimited plan","coverage",
 "live chat","support","account","redeem","gift (verb)","gift (noun)","refund","roaming","home carrier","hotspot / tethering","data roaming (iPhone setting)",
 "Settings (iPhone app)","Cellular / Mobile data (iPhone)","Mobile network (Android)","QR code","manual installation","SM-DP+ address","network switching","Tier-1 carrier",
 "validity","expire","receipt","referral","refer a friend","promo code","checkout","top up / add data","device compatibility","troubleshooting","Help Center","knowledge base","line (cellular line on phone)","primary line","secondary line"]
art = json.load(open(f"{KB}/articles.json"))
cats = json.load(open(f"{KB}/categories.json"))
subs = sorted({a["subcategory"] for a in art if a.get("subcategory")})
ui = json.load(open(f"{KB}/i18n/en.ui.json"))
EN_REF = open("ref/en.txt").read()[:6000]

SCHEMA = {"type":"object","additionalProperties":False,"required":["register","terms","categories","subcategories","ui","plural_articles"],"properties":{
 "register":{"type":"string"},
 "terms":{"type":"array","items":{"type":"object","additionalProperties":False,"required":["en","t"],"properties":{"en":{"type":"string"},"t":{"type":"string"}}}},
 "categories":{"type":"array","items":{"type":"object","additionalProperties":False,"required":["en","label","headline","blurb","description"],"properties":{k:{"type":"string"} for k in ["en","label","headline","blurb","description"]}}},
 "subcategories":{"type":"array","items":{"type":"object","additionalProperties":False,"required":["en","t"],"properties":{"en":{"type":"string"},"t":{"type":"string"}}}},
 "ui":{"type":"array","items":{"type":"object","additionalProperties":False,"required":["key","t"],"properties":{"key":{"type":"string"},"t":{"type":"string"}}}},
 "plural_articles":{"type":"object","additionalProperties":False,"required":["zero","one","two","few","many","other"],"properties":{k:{"type":"string"} for k in ["zero","one","two","few","many","other"]}},
}}

SYS = """You are the lead native-speaker localizer for Openline, Inc. (global travel eSIM, openline.com). You are setting up the {name} edition of the Openline Help Center (kb.openline.com/{p}). Your output defines terminology and UI copy that thousands of articles will reuse, so it must sound perfectly natural to a native {name} speaker, match the tone and form of address openline.com already uses in {name}, and stay concise enough for buttons and chips.
Rules: keep placeholders like {{q}} {{n}} {{total}} {{limit}} {{title}} {{category}} {{network}} exactly; keep HTML tags/attributes exactly (translate only text); keep brand names (Openline, eSIM, iPhone, WhatsApp, Messenger, @askopenline, OL-…, ICCID) unchanged; keep the number 190+ and 2700+/2,700+ (you may localize digit grouping/format like 2.700+ where natural). For plural_articles give the CLDR plural forms of "{{n}} articles" for {name} (fill every key; for categories not used in {name} repeat the 'other' form). For terms, give the single preferred rendering to use consistently (for phone settings use the exact label Apple/Google show in {name}). The 'register' field: 1–3 sentences describing the form of address and tone to use (derived from the openline.com excerpt), written in English for other translators."""

def sub_schema(keys):
    return {"type":"object","additionalProperties":False,"required":keys,"properties":{k:SCHEMA["properties"][k] for k in keys}}

async def one(c, p):
    out = f"{KB}/i18n/{p}.gloss.json"
    if os.path.exists(out): return p, "cached"
    l = BY[p]; name = l[3]
    ref = open(f"ref/{p}.txt").read()[:7000]
    sysm = SYS.format(name=name, p=p)
    ua = json.dumps({
      "openline_com_english_excerpt": EN_REF, f"openline_com_{p}_excerpt": ref,
      "terms": TERMS,
      "categories": [{"en":k, "headline":v["headline"], "blurb":v["blurb"], "description":v["description"]} for k,v in cats.items()],
      "ui": [{"key":k, "en":v} for k,v in ui["ui"].items()],
      "plural_articles_en": ui["plural_articles"],
    }, ensure_ascii=False)
    A = sub_schema(["register","terms","categories","ui","plural_articles"])
    B = sub_schema(["subcategories"])
    ub = json.dumps({f"openline_com_{p}_excerpt": ref[:2500], "subcategories": subs}, ensure_ascii=False)
    da, db = await asyncio.gather(
        chat_json(c, MODEL, sysm, "Localize everything below into " + name + ". Return every item (same 'en'/'key' values, same order).\n\n" + ua, schema=A, max_tokens=16000, temperature=0.3, tag=f"glossA:{p}"),
        chat_json(c, MODEL, sysm, "Localize these Help Center subcategory names (short labels: countries, regions, cities, topics) into " + name + ". Use standard exonyms. Return every item (same 'en' values, same order).\n\n" + ub, schema=B, max_tokens=12000, temperature=0.2, tag=f"glossB:{p}"))
    d = {**da, **db}
    miss = [k for k in ui["ui"] if k not in {x["key"] for x in d["ui"]}]
    msub = [s for s in subs if s not in {x["en"] for x in d["subcategories"]}]
    mcat = [k for k in cats if k not in {x["en"] for x in d["categories"]}]
    if miss or msub or mcat: raise RuntimeError(f"{p} missing ui={miss[:5]} subs={msub[:5]} cats={mcat}")
    json.dump(d, open(out, "w"), ensure_ascii=False, indent=1)
    return p, "ok"

async def main(ps):
    async with client(70) as c:
        res = await asyncio.gather(*[one(c, p) for p in ps], return_exceptions=True)
        for r in res: print(r)
if __name__ == "__main__":
    ps = sys.argv[1:] or [l[0] for l in LANGS]
    asyncio.run(main(ps))
