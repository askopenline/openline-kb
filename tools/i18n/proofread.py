"""Native-speaker proofreading of translated articles. Edits-only output, validated, resumable."""
import json, asyncio, os, sys, time, random
from orc import client, chat_json
import tcore, translate
from langs import LANGS, BY
MODEL = os.environ.get("PR_MODEL", "google/gemini-3.8-flash")
REASONING = json.loads(os.environ.get("PR_REASONING", "null"))
MAX_SECONDS = int(os.environ.get("MAX_SECONDS", "720"))
CONC = int(os.environ.get("CONC", "40"))
T0 = time.time()
SRC = translate.SRC; h = translate.h
ES = {"type":"object","additionalProperties":False,"required":["edits"],"properties":{"edits":{"type":"array","items":{"type":"object","additionalProperties":False,
      "required":["id","field","find","replace"],"properties":{"id":{"type":"integer"},"field":{"type":"string","enum":["title","body","tag"]},"find":{"type":"string"},"replace":{"type":"string"}}}}}}
def sysp(p, g):
    name = BY[p][3]
    return f"""You are a meticulous native {name} editor and proofreader for the Openline Help Center (global travel eSIM brand). For each article you get the English source and the {name} translation. Your job: make the {name} text read as if a skilled native {name} support writer wrote it, while staying 100% faithful to the source.

Fix, with minimal targeted edits:
- anything unnatural, literal, stiff or "translated-sounding"; awkward word order; wrong collocations; calques; inconsistent register (required: {g['register']})
- grammar, spelling, agreement, punctuation and typography conventions of {name}
- mistranslations, omissions or additions versus the English source (meaning must match exactly; numbers, URLs, codes and facts unchanged)
- leftover English words that should be {name} (keep brand/tech names: Openline, eSIM, iPhone, Android, WhatsApp, SM-DP+, ICCID, EID, LPA, QR, Wi-Fi, VPN, APN, iOS…)
- wrong phone menu labels (must match what Apple/Google/Samsung show in {name}) and terminology inconsistent with: {tcore.glossary_text(g)}

Do NOT rewrite text that is already natural and correct. Do not touch Markdown syntax, link targets, URLs, inline `code` or numbers. Each edit: "find" = an exact substring copied verbatim from the current {name} field (long enough to be unique, ideally a full phrase or sentence), "replace" = corrected text. For tags use field "tag" with the full tag as "find". Return {{"edits": []}} when nothing needs fixing."""
def path(p, i): return f"work/pr/{p}/{i}.json"
def done(p, i):
    f = path(p, i)
    if not os.path.exists(f): return False
    try: return json.load(open(f)).get("src") == h(SRC[i])
    except Exception: return False
def tr(p, i):
    f = f"work/tr/{p}/{i}.json"
    if not os.path.exists(f): return None
    d = json.load(open(f))
    return d if d.get("src") == h(SRC[i]) else None
def batches(p, chars=9000):
    todo = [i for i in SRC if tr(p, i) and not done(p, i)]
    out, cur, n = [], [], 0
    for i in todo:
        L = len(SRC[i]["body"]) * 2
        if cur and n + L > chars: out.append(cur); cur, n = [], 0
        cur.append(i); n += L
    if cur: out.append(cur)
    return out
def apply(t, edits):
    t = {"title": t["title"], "tags": list(t["tags"]), "body": t["body"]}; applied = 0
    for e in edits:
        f, a, b = e["field"], e["find"], e["replace"]
        if not a or a == b: continue
        if f == "tag":
            if a in t["tags"]: t["tags"][t["tags"].index(a)] = b; applied += 1
        elif a in t[f]:
            t[f] = t[f].replace(a, b, 1); applied += 1
    return t, applied
GL = {}
stats = {"ok": 0, "edits": 0, "reverted": 0, "fail": 0}
async def run(c, p, ids):
    g = GL.get(p) or GL.setdefault(p, tcore.gloss(p))
    T = {i: tr(p, i) for i in ids}
    payload = [{"id": i, "en": {"title": SRC[i]["title"], "tags": SRC[i]["tags"], "body": SRC[i]["body"]},
                "translation": {"title": T[i]["title"], "tags": T[i]["tags"], "body": T[i]["body"]}} for i in ids]
    try:
        d = await chat_json(c, MODEL, sysp(p, g), json.dumps({"articles": payload}, ensure_ascii=False), schema=ES, max_tokens=12000, temperature=0.2, tag=f"pr:{p}", retries=3, reasoning=REASONING)
    except Exception as e:
        stats["fail"] += len(ids); print("ERR", p, ids[:2], str(e)[:150], flush=True); return
    by = {}
    for e in d.get("edits", []): by.setdefault(e.get("id"), []).append(e)
    os.makedirs(f"work/pr/{p}", exist_ok=True)
    for i in ids:
        new, n = apply(T[i], by.get(i, []))
        errs = tcore.validate(SRC[i], new, p) if n else []
        if errs: new, n = {"title": T[i]["title"], "tags": T[i]["tags"], "body": T[i]["body"]}, 0; stats["reverted"] += 1
        json.dump({"src": h(SRC[i]), "model": MODEL, "edits": n, **new}, open(path(p, i), "w"), ensure_ascii=False)
        stats["ok"] += 1; stats["edits"] += n
async def main(ps):
    jobs = [(p, b) for p in ps for b in batches(p)]
    random.seed(3); random.shuffle(jobs)
    if os.environ.get("PR_REV"): jobs.reverse()
    print(f"{len(jobs)} proofreading batches pending", flush=True)
    q = asyncio.Queue()
    for j in jobs: q.put_nowait(j)
    async def rep():
        while True: await asyncio.sleep(60); print(time.strftime("%H:%M:%S"), stats, flush=True)
    r = asyncio.create_task(rep())
    async with client(CONC + 5) as c:
        async def worker():
            while not q.empty() and time.time() - T0 < MAX_SECONDS:
                p, b = q.get_nowait(); await run(c, p, b)
        await asyncio.gather(*[worker() for _ in range(CONC)])
    r.cancel(); print("END", stats, flush=True)
if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:] or [l[0] for l in LANGS]))
