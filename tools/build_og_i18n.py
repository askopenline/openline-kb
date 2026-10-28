#!/usr/bin/env python3
"""Render localized 1200x630 Open Graph cards for every language with headless Chromium.

Usage: python3 tools/build_og_i18n.py --mark openline-mark-2250.png [codes...]
Reads i18n/languages.json, i18n/en.ui.json, categories.json and i18n/<code>.json.
Writes og/<slug>.png for English and og/<code>/<slug>.png for other languages.
Fonts: Inter + Noto Sans (JP/SC/TC/KR/Thai/Devanagari/Bengali) from Google Fonts.
"""
import argparse, base64, json, os, re
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda *p: json.load(open(os.path.join(ROOT, *p), encoding="utf-8"))
FONTS = "https://fonts.googleapis.com/css2?family=Inter:wght@500;600;800&family=Noto+Sans+JP:wght@500;600;800&family=Noto+Sans+SC:wght@500;600;800&family=Noto+Sans+TC:wght@500;600;800&family=Noto+Sans+KR:wght@500;600;800&family=Noto+Sans+Thai:wght@500;600;800&family=Noto+Sans+Devanagari:wght@500;600;800&family=Noto+Sans+Bengali:wght@500;600;800&display=block"
STACK = {"ja": "Noto Sans JP", "zh": "Noto Sans SC", "tw": "Noto Sans TC", "ko": "Noto Sans KR", "th": "Noto Sans Thai", "hi": "Noto Sans Devanagari", "bn": "Noto Sans Bengali"}
def slugify(s): return re.sub(r"[^a-z0-9]+", "-", s.lower().replace("&", "and")).strip("-")

HTML = """<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><link rel="stylesheet" href="{fonts}">
<style>
*{{box-sizing:border-box;margin:0}} html,body{{width:1200px;height:630px;overflow:hidden;background:#fff}}
body{{font-family:'Inter',{extra}'Noto Sans JP',sans-serif;color:#0F1114;position:relative}}
.stripe{{position:absolute;left:0;top:0;bottom:0;width:14px;background:{fg}}}
.panel{{position:absolute;left:760px;top:-80px;width:540px;height:790px;border-radius:80px;background:{bg}}}
.big{{position:absolute;left:800px;top:125px;width:380px;height:380px}}
.head{{position:absolute;left:80px;top:70px;display:flex;align-items:center;gap:14px}}
.head img{{width:56px;height:56px}} .word{{font-weight:800;font-size:40px;letter-spacing:-.01em;font-family:'Inter',sans-serif}}
.sub{{font-weight:500;font-size:28px;color:#6B7280;margin-left:4px}}
.pill{{position:absolute;left:80px;top:172px;display:inline-flex;align-items:center;gap:12px;height:50px;padding:0 26px 0 20px;border-radius:25px;background:{bg};color:{fg};font-weight:600;font-size:26px;max-width:640px;white-space:nowrap;overflow:hidden}}
.pill i{{width:14px;height:14px;border-radius:50%;background:{fg};flex:none}}
.body{{position:absolute;left:80px;top:250px;width:640px;height:270px;display:flex;flex-direction:column;justify-content:flex-start}}
h1{{flex:none;font-weight:800;font-size:76px;line-height:1.08;letter-spacing:-.02em;overflow-wrap:break-word;word-break:{wb}}}
p{{flex:none;margin-top:18px;font-weight:500;font-size:28px;line-height:1.36;color:#6B7280;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}}
.foot{{position:absolute;left:80px;top:548px;font-weight:600;font-size:28px;color:#FF6A00;font-family:'Inter',sans-serif}}
</style></head><body>
<div class="stripe"></div><div class="panel"></div><img class="big" src="{mark}">
<div class="head"><img src="{mark}"><span class="word">Openline</span><span class="sub">{brand_sub}</span></div>
<div class="pill"><i></i>{eyebrow}</div>
<div class="body"><h1 id="t">{title}</h1><p>{subtitle}</p></div>
<div class="foot">kb.openline.com</div>
<script>
// shrink the title until title + subtitle fit the box (max 3 title lines)
document.fonts.ready.then(()=>{{const box=document.querySelector('.body'), t=document.getElementById('t');
const sub=box.querySelector('p'); let s=76; const fits=()=> t.offsetHeight + 18 + sub.offsetHeight <= 272 && t.offsetHeight <= s*1.08*3+2;
while(!fits() && s>40){{ s-=2; t.style.fontSize=s+'px'; }}
document.body.dataset.ready='1';}});
</script></body></html>"""

def esc(s): return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--mark", required=True); ap.add_argument("codes", nargs="*")
    a = ap.parse_args()
    mark = "data:image/png;base64," + base64.b64encode(open(a.mark, "rb").read()).decode()
    langs = J("i18n", "languages.json"); en_ui = J("i18n", "en.ui.json"); cats = J("categories.json"); arts = J("articles.json")
    counts = {}
    for x in arts: counts[x["category"]] = counts.get(x["category"], 0) + 1
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1200, "height": 630}); pg.on("pageerror", lambda e: print("PAGEERR", e))
        for l in langs:
            code = l["code"]
            if a.codes and code not in a.codes: continue
            if l["prefix"]:
                f = os.path.join(ROOT, "i18n", f"{code}.json")
                if not os.path.exists(f): print("skip", code); continue
                rt = J("i18n", f"{code}.json"); ui = {**en_ui["ui"], **rt["ui"]}; plural = rt.get("plural_articles") or en_ui["plural_articles"]
                cm = {k: {**cats[k], "label": k, **rt["categories"].get(k, {})} for k in cats}
                out = os.path.join(ROOT, "og", code)
            else:
                ui = en_ui["ui"]; plural = en_ui["plural_articles"]; cm = {k: {**cats[k], "label": k} for k in cats}; out = os.path.join(ROOT, "og")
            os.makedirs(out, exist_ok=True)
            loc = l["hreflang"]
            def n_articles(n):
                pg2 = pg.evaluate("([n,l])=>{try{return new Intl.PluralRules(l).select(n)}catch(e){return 'other'}}", [n, loc])
                return (plural.get(pg2) or plural["other"]).replace("{n}", pg.evaluate("([n,l])=>Number(n).toLocaleString(l+'-u-nu-'+(l.startsWith('bn')?'beng':'latn'))", [n, loc]))
            extra = f"'{STACK[code]}'," if code in STACK else ""
            wb = "keep-all" if code in ("ko",) else ("normal")
            cards = [("home", ui["og_eyebrow_home"], ui["og_home_title"], ui["og_home_sub"].replace("{n}", pg.evaluate("([n,l])=>Number(n).toLocaleString(l+'-u-nu-'+(l.startsWith('bn')?'beng':'latn'))", [len(arts), loc])), "#FF6A00", "#FFF3E9")]
            for k, c in cm.items():
                cards.append((slugify(k), c["label"], c["headline"], f"{n_articles(counts.get(k, 0))} · {c['blurb']}", c["fg"], c["bg"]))
            for slug, eyebrow, title, sub, fg, bg in cards:
                html = HTML.format(lang=loc, fonts=FONTS, extra=extra, fg=fg, bg=bg, mark=mark, brand_sub=esc(ui["brand_sub"]), eyebrow=esc(eyebrow), title=esc(title), subtitle=esc(sub), wb=wb)
                pg.set_content(html, wait_until="networkidle"); pg.evaluate("document.fonts.ready")
                pg.wait_for_function("document.body.dataset.ready === '1'", timeout=15000)
                path = os.path.join(out, slug + ".png")
                pg.screenshot(path=path)
                im = Image.open(path).convert("RGB")
                im.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)
            print("og", code, len(cards))
        b.close()

if __name__ == "__main__":
    main()
