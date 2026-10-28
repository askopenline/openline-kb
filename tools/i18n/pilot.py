import json, asyncio, time, sys
from orc import client, chat_json
import tcore
art = json.load(open(tcore.KB + "/articles.json"))
by = {a["slug"]: a for a in art}
SL = ["what-is-openline", "whats-the-difference-between-a-purchase-code-and-an-activation-code", "i-cant-activate-my-openline-plan-what-should-i-do",
      "everything-about-gifting-your-openline-purchase-code"]
extra = [a for a in art if a["category"] == "Coverage by country"][:1] + [a for a in art if a["category"] == "Devices & compatibility" and "iPhone" in a["title"]][:1]
items = [by[s] for s in SL] + extra
src = [{"id": a["id"], "title": a["title"], "tags": a["tags"], "body": tcore.split_tail(a["body"])[0]} for a in items]
MODELS = sys.argv[1].split(","); LANGS = sys.argv[2].split(",")
async def run(c, m, p):
    g = tcore.gloss(p); t = time.time()
    try:
        d = await chat_json(c, m, tcore.sys_prompt(p, g), json.dumps({"items": src}, ensure_ascii=False), schema=tcore.ITEM_SCHEMA, max_tokens=20000, temperature=0.3, tag=f"pilot:{m}:{p}")
    except Exception as e: return m, p, str(e)[:200]
    out = {x["id"]: x for x in d["items"]}
    errs = {s["id"]: tcore.validate(s, out.get(s["id"], {}), p) for s in src}
    json.dump(d, open(f"pilot_{m.replace('/','_')}_{p}.json", "w"), ensure_ascii=False, indent=1)
    return m, p, round(time.time() - t), {k: v for k, v in errs.items() if v}
async def main():
    async with client(30) as c:
        for r in await asyncio.gather(*[run(c, m, p) for m in MODELS for p in LANGS]): print(r)
asyncio.run(main())
