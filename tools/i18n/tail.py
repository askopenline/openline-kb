import json, asyncio, os, sys
from orc import client, chat_json
import tcore
from langs import LANGS
art = json.load(open(tcore.KB + "/articles.json"))
TAIL = tcore.split_tail(art[0]["body"])[1]
S = {"type":"object","additionalProperties":False,"required":["tail"],"properties":{"tail":{"type":"string"}}}
async def one(c, p):
    out = f"work/tail/{p}.md"
    if os.path.exists(out): return p, "cached"
    g = tcore.gloss(p)
    sysm = tcore.sys_prompt(p, g).replace('Return JSON {"items":[{"id","title","tags","body"}]} with every input id exactly once.', 'Return JSON {"tail": "..."}.')
    for att in range(3):
        d = await chat_json(c, "anthropic/claude-sonnet-5.5", sysm, "Translate this support block that ends every Help Center article. Keep the leading blank line and the '## ' heading.\n\n" + json.dumps({"tail": TAIL}, ensure_ascii=False), schema=S, max_tokens=3000, tag=f"tail:{p}")
        e = tcore.validate({"title": "x", "tags": [], "body": TAIL}, {"title": "x", "tags": [], "body": d["tail"]}, p)
        if not e: break
        print(p, e)
    os.makedirs("work/tail", exist_ok=True)
    t = d["tail"]
    if not t.startswith("\n"): t = "\n" + t.lstrip("\n")
    open(out, "w").write(t)
    return p, "ok" if not e else f"WARN {e}"
async def main():
    async with client(12) as c:
        for r in await asyncio.gather(*[one(c, l[0]) for l in LANGS]): print(r)
asyncio.run(main())
