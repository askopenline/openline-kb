#!/usr/bin/env python3
"""Generate Open Graph cards (1200x630) and favicons for kb.openline.com.

Usage: python3 tools/build_og.py --mark <openline-mark.png> --fonts <dir with Inter-*.ttf>
Outputs: og/*.png, favicon.ico, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png
"""
import argparse, json, os, re
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1200, 630
INK, INK3, BRAND = (15, 17, 20), (107, 114, 128), (255, 106, 0)

def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower().replace("&", "and")).strip("-")

def hexrgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def wrap(draw, text, font, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=font) <= width: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def card(path, mark, fonts, eyebrow, title, subtitle, fg, bg):
    im = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(im)
    # soft category-tinted panel on the right + accent stripe
    d.rounded_rectangle((760, -80, 1300, 710), radius=80, fill=bg)
    d.rectangle((0, 0, 14, H), fill=fg)
    big = mark.resize((380, 380), Image.LANCZOS)
    im.paste(big, (800, 125), big)
    # header: mark + wordmark
    m = mark.resize((56, 56), Image.LANCZOS); im.paste(m, (80, 70), m)
    d.text((150, 74), "Openline", font=fonts["xb"](40), fill=INK)
    wl = d.textlength("Openline", font=fonts["xb"](40))
    d.text((150 + wl + 16, 86), "Knowledge base", font=fonts["md"](28), fill=INK3)
    # eyebrow pill
    ef = fonts["sb"](26); ew = d.textlength(eyebrow, font=ef)
    d.rounded_rectangle((80, 172, 80 + ew + 56, 222), radius=25, fill=bg)
    d.ellipse((100, 190, 114, 204), fill=fg)
    d.text((126, 181), eyebrow, font=ef, fill=fg)
    # title + subtitle, shrink until they fit between the pill and the footer
    sf = fonts["md"](28); sub = wrap(d, subtitle, sf, 640)[:2]
    size = 76
    while True:
        tf = fonts["xb"](size); lines = wrap(d, title, tf, 640)
        h = len(lines) * int(size * 1.12) + 18 + len(sub) * 38
        if (h <= 270 and len(lines) <= 3) or size <= 44: break
        size -= 2
    y = 250
    for ln in lines[:3]:
        d.text((80, y), ln, font=tf, fill=INK); y += int(size * 1.12)
    y += 18
    for ln in sub:
        d.text((80, y), ln, font=sf, fill=INK3); y += 38
    # footer
    d.text((80, 548), "kb.openline.com", font=fonts["sb"](28), fill=BRAND)
    im.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--mark", required=True); ap.add_argument("--fonts", required=True)
    a = ap.parse_args()
    f = lambda name: (lambda s: ImageFont.truetype(os.path.join(a.fonts, f"Inter-{name}.ttf"), s))
    fonts = {"xb": f("ExtraBold"), "sb": f("SemiBold"), "md": f("Medium")}
    mark = Image.open(a.mark).convert("RGBA"); mark = mark.crop(mark.getbbox())
    arts = json.load(open(os.path.join(ROOT, "articles.json")))
    colors = json.load(open(os.path.join(ROOT, "categories.json")))
    os.makedirs(os.path.join(ROOT, "og"), exist_ok=True)
    total = len(arts)
    card(os.path.join(ROOT, "og", "home.png"), mark, fonts, "Help center",
         "Everything you need to know about Openline",
         f"{total:,} answers on installing, activating, coverage, plans and billing.", BRAND, (255, 243, 233))
    for cat, c in colors.items():
        n = sum(1 for x in arts if x["category"] == cat)
        card(os.path.join(ROOT, "og", slugify(cat) + ".png"), mark, fonts, cat, c["headline"],
             f"{n:,} articles · {c['blurb']}", hexrgb(c["fg"]), hexrgb(c["bg"]))
    # favicons
    def icon(size, pad=0.12, bgc=None):
        canvas = Image.new("RGBA", (size, size), bgc or (0, 0, 0, 0))
        inner = int(size * (1 - 2 * pad)); mm = mark.resize((inner, inner), Image.LANCZOS)
        canvas.paste(mm, ((size - inner) // 2, (size - inner) // 2), mm); return canvas
    icon(32, 0.04).save(os.path.join(ROOT, "favicon-32.png"))
    icon(180, 0.18, (255, 255, 255, 255)).convert("RGB").save(os.path.join(ROOT, "apple-touch-icon.png"))
    icon(192, 0.16, (255, 255, 255, 255)).save(os.path.join(ROOT, "icon-192.png"))
    icon(512, 0.16, (255, 255, 255, 255)).save(os.path.join(ROOT, "icon-512.png"))
    for f in ("icon-192.png", "icon-512.png", "apple-touch-icon.png"):
        shrink(os.path.join(ROOT, f))
    icon(64, 0.04).save(os.path.join(ROOT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])

def shrink(path):
    im = Image.open(path).convert("RGBA")
    im.quantize(colors=128, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)

if __name__ == "__main__":
    main()
