import json, asyncio, random, glob
from orc import client, chat_json
import tcore, pilot_src
art = {a["id"]: a for a in json.load(open(tcore.KB + "/articles.json"))}
JS = {"type":"object","additionalProperties":False,"required":["scores"],"properties":{"scores":{"type":"array","items":{"type":"object","additionalProperties":False,"required":["candidate","fluency","accuracy","terminology","notes"],"properties":{"candidate":{"type":"string"},"fluency":{"type":"integer"},"accuracy":{"type":"integer"},"terminology":{"type":"integer"},"notes":{"type":"string"}}}}}}
async def gen(c):
    out = []
    for p in ["fr", "ja", "hi"]:
        out.append(chat_json(c, "deepseek/deepseek-v4.1-flash", tcore.sys_prompt(p, tcore.gloss(p)), json.dumps({"items": pilot_src.src}, ensure_ascii=False), schema=tcore.ITEM_SCHEMA, max_tokens=20000, temperature=0.3, tag=f"pilot:deepseek-noreason:{p}", reasoning={"enabled": False}))
    res = await asyncio.gather(*out)
    for p, d in zip(["fr", "ja", "hi"], res): json.dump(d, open(f"pilot_deepseek-noreason_{p}.json", "w"), ensure_ascii=False, indent=1)
async def judge(c, p):
    files = sorted(glob.glob(f"pilot_*_{p}.json")); random.seed(1); random.shuffle(files)
    cands = {chr(65+i): json.load(open(f)) for i, f in enumerate(files)}
    key = {chr(65+i): f for i, f in enumerate(files)}
    ids = [2734, 2041]  # two articles
    ids = [x["id"] for x in pilot_src.src[1:4]]
    payload = {"source_en": [{"id": i, "title": art[i]["title"], "body": tcore.split_tail(art[i]["body"])[0]} for i in ids],
               "candidates": {k: [x for x in v["items"] if x["id"] in ids] for k, v in cands.items()}}
    name = tcore.BY[p][3]
    d = await chat_json(c, "anthropic/claude-sonnet-5.5", f"You are a demanding native {name} editor reviewing help-center translations for a consumer eSIM brand. Score each candidate 1-10 on fluency (sounds natively written, idiomatic, natural UX tone), accuracy (meaning preserved, nothing added/lost) and terminology (correct localized phone menu names, consistent product terms). Be strict and discriminating. Notes: one short sentence with the main weakness.",
        json.dumps(payload, ensure_ascii=False), schema=JS, max_tokens=4000, tag=f"judge:{p}")
    for s in d["scores"]: s["model"] = key[s["candidate"]].replace("pilot_", "").replace(f"_{p}.json", "")
    return p, sorted(d["scores"], key=lambda s: -(s["fluency"] + s["accuracy"] + s["terminology"]))
async def main():
    async with client(20) as c:
        pass
        for p, sc in await asyncio.gather(*[judge(c, p) for p in ["fr", "ja", "hi"]]):
            print("==", p)
            for s in sc: print(f"  {s['model']:40s} F{s['fluency']} A{s['accuracy']} T{s['terminology']}  {s['notes']}")
asyncio.run(main())
