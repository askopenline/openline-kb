"""Translate all KB articles into all languages. Resumable; runs for at most MAX_SECONDS per invocation."""
import json, asyncio, os, sys, time, hashlib, random
from orc import client, chat_json
import tcore
from langs import LANGS
KB = tcore.KB
ASIAN = {"ja", "zh", "tw", "ko", "hi", "bn", "th"}
MODEL = lambda p: "openai/gpt-5.6-luna" if p in ASIAN else "anthropic/claude-haiku-5.5"
FALLBACK = "google/gemini-3.8-flash"
MAX_SECONDS = int(os.environ.get("MAX_SECONDS", "720"))
CONC = int(os.environ.get("CONC", "160"))
BATCH_CHARS = 7000
T0 = time.time()
art = json.load(open(f"{KB}/articles.json"))
SRC = {}
for a in art:
    body, _ = tcore.split_tail(a["body"])
    SRC[a["id"]] = {"id": a["id"], "title": a["title"], "tags": a["tags"], "body": body}
def h(s): return hashlib.sha1(json.dumps(s, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:12]
def path(p, i): return f"work/tr/{p}/{i}.json"
def done(p, i):
    f = path(p, i)
    if not os.path.exists(f): return False
    try: return json.load(open(f)).get("src") == h(SRC[i])
    except Exception: return False

def batches(p):
    todo = [i for i in SRC if not done(p, i)]
    out, cur, n = [], [], 0
    for i in todo:
        L = len(SRC[i]["body"])
        if cur and n + L > BATCH_CHARS: out.append(cur); cur, n = [], 0
        cur.append(i); n += L
    if cur: out.append(cur)
    return out

GL = {}
stats = {"ok": 0, "fail": 0, "retry": 0}
async def run_batch(c, sem, p, ids, depth=0):
    if time.time() - T0 > MAX_SECONDS: return
    g = GL.get(p) or GL.setdefault(p, tcore.gloss(p))
    model = MODEL(p) if depth < 2 else FALLBACK
    async with sem:
        if time.time() - T0 > MAX_SECONDS: return
        try:
            d = await chat_json(c, model, tcore.sys_prompt(p, g), json.dumps({"items": [SRC[i] for i in ids]}, ensure_ascii=False),
                                schema=tcore.ITEM_SCHEMA, max_tokens=24000, temperature=0.3, tag=f"tr:{p}:{model}", retries=3)
            got = {x["id"]: x for x in d.get("items", [])}
        except Exception as e:
            got = {}; print("ERR", p, ids[:3], str(e)[:160], flush=True)
    bad = []
    for i in ids:
        x = got.get(i)
        errs = tcore.validate(SRC[i], x, p) if x else ["missing"]
        if errs: bad.append((i, errs)); continue
        os.makedirs(f"work/tr/{p}", exist_ok=True)
        json.dump({"src": h(SRC[i]), "model": model, "title": x["title"], "tags": x["tags"], "body": x["body"]}, open(path(p, i), "w"), ensure_ascii=False)
        stats["ok"] += 1
    if bad:
        if depth >= 3:
            stats["fail"] += len(bad)
            with open("work/failed.jsonl", "a") as f:
                for i, e in bad: f.write(json.dumps({"p": p, "id": i, "errs": e}, ensure_ascii=False) + "\n")
            return
        stats["retry"] += len(bad)
        # retry failures one by one
        await asyncio.gather(*[run_batch(c, sem, p, [i], depth + 1) for i, _ in bad])

async def main(ps):
    sem = asyncio.Semaphore(CONC)
    jobs = []
    for p in ps:
        for b in batches(p): jobs.append((p, b))
    random.seed(7); random.shuffle(jobs)
    print(f"{len(jobs)} batches pending across {len(ps)} languages", flush=True)
    async def reporter():
        while True:
            await asyncio.sleep(60); print(time.strftime("%H:%M:%S"), stats, flush=True)
    rep = asyncio.create_task(reporter())
    q = asyncio.Queue()
    for j in jobs: q.put_nowait(j)
    async with client(CONC + 10) as c:
        async def worker():
            while not q.empty() and time.time() - T0 < MAX_SECONDS:
                p, b = q.get_nowait()
                await run_batch(c, asyncio.Semaphore(1), p, b)
        await asyncio.gather(*[worker() for _ in range(CONC)])
    rep.cancel()
    print("END", stats, flush=True)

if __name__ == "__main__":
    ps = sys.argv[1:] or [l[0] for l in LANGS]
    asyncio.run(main(ps))
