"""Native digits for prose, as on openline.com/bn: Bengali digits in running text, Latin digits kept for
technical values (data sizes, 5G, device models and versions, codes, phone numbers, percentages, URLs)."""
import re
NATIVE = {"bn": "০১২৩৪৫৬৭৮৯"}
UNIT = r"\s?(?:GB|MB|KB|TB|G\b|Gbps|Mbps|kbps|GHz|MHz|mAh|%|px|ms\b)"
NUM = re.compile(r"\d+(?:[.,:/]\d+)*")
PROTECT = re.compile(r"(?m)^[ \t]*\d+[.)][ \t]|```[\s\S]*?```|`[^`\n]*`|\]\([^)]*\)|https?://\S+|\b[\w.+-]+@[\w-]+\.[\w.]+|\{[a-z_]+\}|<[^>]+>|&[a-z]+;")
def _conv(seg, tab):
    out, last = [], 0
    for m in NUM.finditer(seg):
        a, b = m.span(); tok = m.group()
        prev, nxt = seg[a-1:a], seg[b:b+1]
        before = seg[max(0, a-24):a]; after = seg[b:b+6]
        keep = (re.match(r"[A-Za-z_*#+/\\-]", prev) and not re.match(r"[-]", prev) or re.match(r"[A-Za-z_#*]", nxt)
                or re.match(UNIT, after) or len(re.sub(r"\D", "", tok)) >= 6
                or re.search(r"[A-Za-z][A-Za-z0-9.]*\s$", before)          # iOS 17, Pixel 8, Android 14, Galaxy S24
                or re.match(r"\s?(?:[x×]\s?\d|\.\d)", after))
        if re.search(r"[A-Za-z0-9]\s?/\s?$", before): keep = True   # 1GB / 7 days
        if prev == "-" and re.search(r"[A-Za-z0-9]-$", before): keep = True   # OL-1234, Wi-Fi 6, x-1
        if prev == "-" and re.search(r"[\u0980-\u09FF]-$", before): keep = False  # টায়ার-১
        out.append(seg[last:a]); out.append(tok if keep else tok.translate(tab)); last = b
    out.append(seg[last:]); return "".join(out)
def native_digits(s, p):
    if p not in NATIVE or not s: return s
    tab = str.maketrans("0123456789", NATIVE[p])
    out, last = [], 0
    for m in PROTECT.finditer(s):
        out.append(_conv(s[last:m.start()], tab)); out.append(m.group()); last = m.end()
    out.append(_conv(s[last:], tab)); return "".join(out)
if __name__ == "__main__":
    for t in ["৩০ সেকেন্ডে অ্যাক্টিভেট করুন, 190+ দেশে", "iOS 17.4 বা তার পরে", "1GB / 7 দিন", "5G নেটওয়ার্ক", "10% ক্যাশব্যাক", "টায়ার-1 নেটওয়ার্ক",
              "`*#06#` ডায়াল করুন", "[wa.me/15554842461](https://wa.me/15554842461)", "OL-4821 কোড", "Pixel 8 এবং Galaxy S24", "২৪/৭ সাপোর্ট 24/7", "$4.99 থেকে", "3–5 টি নেটওয়ার্ক", "{n} টি নিবন্ধ", "ধাপ 3-এ", "Wi-Fi 6"]:
        print(t, "→", native_digits(t, "bn"))
