"""Short 'continue in your language?' prompt strings, one set per language, written natively in that language."""
import asyncio, json, tcore, orc
from orc import chat_json
from langs import LANGS
KB = tcore.KB
L = {l["code"]: l for l in json.load(open(f"{KB}/i18n/languages.json"))}
EN = {"title": "Read this page in English?", "body": "You can change the language at any time from the flag menu at the top of the page.",
      "continue": "Continue in English", "close": "Close"}
S = {"type": "object", "properties": {k: {"type": "string"} for k in EN}, "required": list(EN)}
def sysp(p):
    g = tcore.gloss(p); l = L[p]
    return (f"You are a native {l['name']} UX writer for Openline's Help Center (kb.openline.com). Register: {g['register']}\n"
            f"Write the four UI strings below natively in {l['name']} ({l['hreflang']}), replacing 'English' with the natural name of {l['name']} "
            f"as a native speaker would say 'in <my language>' (e.g. French: 'en français', German: 'auf Deutsch'). Short, warm, natural; "
            "match the typography conventions of the language (spacing before ? in French, etc.). Return JSON with the same keys.")
async def one(c, p):
    d = await chat_json(c, "anthropic/claude-sonnet-5.5", sysp(p), json.dumps(EN, ensure_ascii=False), schema=S, max_tokens=800, temperature=0.2, tag=f"offer:{p}")
    r = await chat_json(c, "google/gemini-3.8-flash", f"You are a native {L[p]['name']} proofreader. Fix anything that does not sound perfectly natural to a native speaker in this short website prompt (meaning: '{EN['title']}' / '{EN['body']}' / '{EN['continue']}' / '{EN['close']}', where English means {L[p]['name']}). Keep it equally short. Return the same JSON keys.",
                        json.dumps(d, ensure_ascii=False), schema=S, max_tokens=800, temperature=0.1, tag=f"offer-pr:{p}")
    return p, r
async def main():
    async with orc.client(16) as c:
        res = dict(await asyncio.gather(*[one(c, l[0]) for l in LANGS]))
    out = {"en": EN, **res}
    json.dump(out, open(f"{KB}/i18n/offer.json", "w"), ensure_ascii=False, indent=1)
    for k, v in out.items(): print(k, v["title"], "|", v["continue"])
asyncio.run(main())
