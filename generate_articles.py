#!/usr/bin/env python3
"""
Generate 500+ Openline knowledge-base articles.

Taxonomy is modelled on Airalo, Holafly, Saily, Nomad, Ubigi, GigSky, Truphone,
Jetpac, Roamify help centres, plus Openline-specific content (multi-Tier-1
switching, no ID required, 190+ countries, 30-second activation, crypto payments,
Zendesk support, mobile app, etc.).

Every article is a first-party voice, in English, and consistent with Openline's
brand: helpful, direct, no jargon, no unnecessary marketing spin.
"""
import json
import re
from pathlib import Path

ARTICLES = []
_slugs = set()

def slugify(text):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:80]

def add(category, subcategory, title, body, tags=None):
    tags = tags or []
    slug = slugify(title)
    base = slug
    n = 2
    while slug in _slugs:
        slug = f"{base}-{n}"
        n += 1
    _slugs.add(slug)
    ARTICLES.append({
        "id": len(ARTICLES) + 1,
        "slug": slug,
        "category": category,
        "subcategory": subcategory,
        "title": title,
        "tags": tags,
        "body": body.strip(),
    })

# ---------------------------------------------------------------------------
# Reusable Markdown snippets
# ---------------------------------------------------------------------------

INSTALL_IPHONE = """
## Install on iPhone (iOS 16 and later)

1. Make sure your iPhone is connected to Wi-Fi and unlocked (not carrier-locked).
2. On the confirmation email or the Openline app, tap **Install eSIM**. iOS will open the eSIM sheet automatically on iOS 17+.
3. Follow the on-screen prompts and label the line **Openline**.
4. In **Settings → Cellular**, tap the Openline line and turn on **Data Roaming**.
5. Set the Openline line as **Cellular Data** for the country you're travelling in.

That's it. Your data works the moment you land — no APN configuration needed.
"""

INSTALL_ANDROID = """
## Install on Android

The exact wording depends on your phone maker (Google, Samsung, OnePlus, Xiaomi, etc.), but the flow is the same:

1. Connect to Wi-Fi.
2. Open **Settings → Network & internet → SIMs** (Pixel) or **Settings → Connections → SIM manager** (Samsung).
3. Tap **Add eSIM** → **Download a SIM instead?**.
4. Scan the QR code from your Openline confirmation email or paste the activation code.
5. Turn on the Openline line, enable **Data roaming** and set it as your **Mobile data** SIM.
"""

TROUBLESHOOT_BASICS = """
## Quick checks

- Airplane mode off, mobile data on.
- **Data roaming** enabled on the Openline line (this must be on — it's how travel eSIMs work, and Openline is not charged as roaming to you).
- Openline is selected as the **Mobile Data** line.
- You have signal bars — if you're in a basement, subway, or airplane, step outside first.
- Toggle airplane mode on for 30 seconds, then off, to force a fresh network scan.
- Restart the phone.
"""

CONTACT_BLOCK = """
## Still stuck?

Reach us 24/7 via live chat inside the Openline app or at [openline.com](https://openline.com), or email **ask@openline.com**. Include your order ID and, if possible, the ICCID of your Openline eSIM — that lets us diagnose without back-and-forth.
"""

# ---------------------------------------------------------------------------
# Static seed articles — the "hero" content, 90+ hand-written
# ---------------------------------------------------------------------------

# Category: Getting started
add("Getting started", "About Openline", "What is Openline?",
"""
Openline is a global travel eSIM. You buy a data plan in seconds, install it on your phone, and use mobile internet in 190+ countries without swapping SIM cards, paying roaming fees, or dealing with a local carrier.

## What makes Openline different

- **Multi-Tier-1 network switching.** In every country we connect you to the strongest of 3–5 premium Tier-1 carriers automatically, so you always ride the best signal instead of being stuck on one network.
- **No ID, no contract, no SIM card.** Buy with an email address. Activate in 30 seconds. Cancel any time.
- **Truly unlimited plans** that do not throttle you at the Openline level — any limits you hit are the local network's own capacity, exactly like a local SIM.
- **190+ countries.** One account, one app, one bill — anywhere you go.
- **Crypto, cards, wallets and PayPal** all accepted.

Openline is built for travellers, remote workers, digital nomads, and international teams who want mobile data that just works.
""",
tags=["basics", "overview"])

add("Getting started", "About Openline", "How Openline works",
"""
Openline uses **eSIM** technology — a small chip already built into your phone that can hold multiple mobile line profiles. When you buy an Openline plan, we send you a QR code (or a one-tap install link). Your phone downloads the profile, and you get a second line called **Openline** next to your regular line.

While you travel:

1. Your regular home SIM stays inserted and handles calls/SMS on your home number.
2. The Openline eSIM handles mobile data at local speeds.
3. In each country you visit, Openline automatically picks the strongest signal out of 3–5 Tier-1 partners.

You keep receiving iMessages, WhatsApp, and 2FA codes on your home number, while data (maps, rideshare, browsing, video calls) runs over Openline at local prices.
""",
tags=["basics", "how-it-works"])

add("Getting started", "About Openline", "Openline vs local SIM cards",
"""
| | Local SIM | Openline eSIM |
|---|---|---|
| Store visit | Yes | No — 30-second online purchase |
| ID / passport | Usually required | Not required |
| Cash / local currency | Often required | Card, PayPal, Apple Pay, Google Pay, crypto |
| Physical SIM swap | Yes | No |
| Home number still active | No (you removed your SIM) | Yes |
| Multi-country trip | New SIM per country | One plan, many countries |
| Signal quality | One carrier | Best of 3–5 Tier-1 carriers |

Local SIMs can sometimes be cheaper for long stays in one country. Openline wins on convenience, multi-country trips, and keeping your home number reachable.
""",
tags=["comparison", "sim"])

add("Getting started", "About Openline", "Openline vs traditional roaming",
"""
Traditional roaming means your home carrier charges you (often heavily) to use its partners abroad. Bills can run $10 to $15 per day, per line, or hundreds per gigabyte.

Openline replaces that with a **local data plan you download online**:

- You choose the destination and the amount of data.
- You pay a fixed price up front — no bill shock.
- Data runs on local Tier-1 networks at local speeds.
- Your home number keeps working for calls, SMS, iMessage and 2FA on Wi-Fi or your primary line.

The result: same connectivity, fraction of the cost, no surprises on your next monthly bill.
""",
tags=["roaming", "comparison"])

add("Getting started", "Buying a plan", "How to buy your first Openline eSIM",
"""
1. Go to [openline.com](https://openline.com) or open the Openline app.
2. Type your destination in the search bar — a country, a region (e.g. Europe, Asia), or **Global**.
3. Pick a plan: choose the amount of data and the number of days.
4. Enter your email and pay (card, Apple Pay, Google Pay, PayPal, or crypto).
5. In seconds, we email the QR code and a one-tap install link.
6. Install the eSIM on your phone (see the install guides for iPhone and Android).

You can install the eSIM before your trip. It only starts counting data and days when you actually arrive and connect to a supported network.
""",
tags=["buying", "checkout"])

add("Getting started", "Buying a plan", "Do I need an account to buy an Openline eSIM?",
"""
No — you can check out as a guest. We only need an email address to deliver your QR code and receipt.

That said, creating an account gives you:

- One place to see all your eSIMs, top up, and download QR codes again.
- Faster checkout on the next trip.
- Refer-a-friend credit.
- Order history for expense claims.

Account creation is one click at checkout: we set it up automatically with the email you used, and you set a password later if you want.
""",
tags=["account", "checkout"])

add("Getting started", "Activation", "When does my Openline plan start?",
"""
Your plan **starts the moment your Openline eSIM first connects to a supported mobile network in a supported country**. Not when you buy it, not when you install it.

That means you can:

- Buy your plan weeks in advance.
- Install the eSIM at home while you have Wi-Fi.
- Land, turn off airplane mode, and the plan begins.

The clock stops when the plan expires or your data allowance is used up — whichever comes first.
""",
tags=["activation", "billing"])

add("Getting started", "Activation", "How do I activate my Openline eSIM once I land?",
"""
1. Turn airplane mode off.
2. Open **Settings → Cellular** (iPhone) or **Settings → Network & internet → SIMs** (Android).
3. Confirm the **Openline** line is turned on.
4. Enable **Data Roaming** on the Openline line.
5. Set **Cellular Data** to Openline for the country you're in.

Within 30–60 seconds your phone should register on a local carrier and you'll see signal bars next to the Openline label. Open a browser to confirm data works.

If nothing happens after 3 minutes, toggle airplane mode on for 30 seconds and back off.
""",
tags=["activation", "iphone", "android"])

# ---------- Compatibility ----------
add("Devices & compatibility", "Compatibility basics", "Is my phone compatible with Openline?",
"""
Your phone must:

1. Support **eSIM** (a digital SIM built into the device).
2. Be **carrier-unlocked** (not tied to a specific home carrier's network).

## Quick eSIM check

- **iPhone:** iPhone XR, XS or newer supports eSIM. In the US, iPhone 14 and later are eSIM-only.
- **Android:** Google Pixel 3 and later, Samsung Galaxy S20 and later (most regions), and many other flagship devices from 2020 onwards.
- **Dial `*#06#`** — if you see an **EID** number, your device is eSIM-ready.

## Unlock check

Ask your home carrier or open **Settings → General → About → Carrier Lock** (iPhone) — it should read **No SIM restrictions**.

If both boxes are ticked, Openline will work on your phone.
""",
tags=["compatibility", "esim"])

add("Devices & compatibility", "Compatibility basics", "How do I check if my phone is unlocked?",
"""
An **unlocked** phone can accept SIMs and eSIMs from any carrier. A **locked** phone only accepts the one who sold it to you.

## iPhone
Go to **Settings → General → About** and scroll to **Carrier Lock**. If it says **No SIM restrictions**, you're unlocked.

## Android
Go to **Settings → About phone → SIM status** or contact your carrier. Some phones don't display this clearly; the definitive answer comes from your carrier.

## If it's locked
Ask your home carrier to unlock it. In many countries (US, UK, EU, and others) they must unlock it once your contract is paid off. Once unlocked, you can install Openline.
""",
tags=["compatibility", "unlock"])

add("Devices & compatibility", "Compatibility basics", "Which iPhones support eSIM?",
"""
All iPhones from **iPhone XR / XS (2018)** and later support eSIM.

- **iPhone XR, XS, XS Max**
- **iPhone 11, 11 Pro, 11 Pro Max**
- **iPhone SE (2020 and 2022)**
- **iPhone 12, 12 mini, 12 Pro, 12 Pro Max**
- **iPhone 13 series**
- **iPhone 14 series** — in the US, these are eSIM-only.
- **iPhone 15 series** — in the US, eSIM-only.
- **iPhone 16 series** — in the US, eSIM-only.

Any iPhone in the list can run an Openline eSIM alongside your primary line.
""",
tags=["compatibility", "iphone"])

add("Devices & compatibility", "Compatibility basics", "Which Android phones support eSIM?",
"""
This list is not exhaustive but covers the mainstream models we see most often. If in doubt, dial `*#06#` — if an **EID** number appears, your device supports eSIM.

- **Google Pixel:** 3, 3 XL, 3a, 4, 4 XL, 5, 5a, 6, 6 Pro, 6a, 7, 7 Pro, 7a, 8, 8 Pro, 8a, 9, 9 Pro
- **Samsung Galaxy:** S20, S21, S22, S23, S24, S25 series; Note 20 series; Z Flip and Z Fold (all generations); A54, A55
- **OnePlus:** 11 and later (region-dependent)
- **Motorola:** Razr 2019 and later, Edge series
- **Xiaomi:** 12T Pro, 13, 13 Pro, 13T, 14 series
- **Huawei:** P40, P50 Pro, Mate 40 series
- **Sony Xperia:** 10 III and later, 1 IV and later
- **Nokia:** X30, G60

Some Samsung models sold in specific regions (notably some East Asian and Hong Kong variants) have eSIM disabled in firmware — check `*#06#` first.
""",
tags=["compatibility", "android"])

add("Devices & compatibility", "Compatibility basics", "Does Openline work on iPads and tablets?",
"""
Yes, on cellular iPads and tablets that support eSIM. This includes:

- **iPad Pro (11-inch and 12.9-inch, 3rd generation and later)**
- **iPad Air (3rd generation and later)**
- **iPad (7th generation and later)**
- **iPad mini (5th generation and later)**
- **Google Pixel Tablet** (data-only)
- **Samsung Galaxy Tab S** series with cellular

Note that iPads and most tablets do not support voice calls or SMS — they use Openline for **data only**, which is exactly what Openline provides.
""",
tags=["compatibility", "ipad", "tablet"])

add("Devices & compatibility", "Compatibility basics", "Does Openline work on smartwatches?",
"""
Openline does **not** currently support smartwatches (Apple Watch cellular, Galaxy Watch cellular, Pixel Watch cellular).

Smartwatch cellular plans are technically different — they need a paired provisioning profile from your home carrier that shares your primary phone number. Openline is a separate data line, which watches don't accept.

Your smartwatch will still work over Wi-Fi and Bluetooth to your phone.
""",
tags=["compatibility", "smartwatch"])

add("Devices & compatibility", "Compatibility basics", "Does Openline work on laptops with eSIM?",
"""
Yes. Modern Windows laptops with a WWAN modem (many ThinkPads, XPS, Surface Pro X and Surface Pro 9/10 5G, HP EliteBook 5G, etc.) support eSIM.

To install:

1. Open **Settings → Network & Internet → Cellular → Manage eSIM profiles**.
2. Add profile → scan the QR code from your Openline confirmation email.
3. Turn the profile on.

MacBooks do not have cellular modems and cannot use eSIM directly — tether from your iPhone or Android running Openline instead.
""",
tags=["compatibility", "laptop", "windows"])

add("Devices & compatibility", "Compatibility basics", "How do I find my device's EID?",
"""
The **EID** is a unique 32-digit number identifying your device's eSIM chip. Openline usually doesn't need it, but some enterprise integrations do.

- **iPhone:** Settings → General → About → **EID**.
- **Android (Pixel):** Settings → About phone → **EID**.
- **Android (Samsung):** Settings → About phone → Status information → **EID**.
- **Universal:** dial `*#06#` and swipe past IMEI numbers.
""",
tags=["eid", "device"])

# ---------- Installation ----------
add("Installation", "iPhone", "Install Openline on iPhone via QR code",
INSTALL_IPHONE + CONTACT_BLOCK,
tags=["install", "iphone", "qr"])

add("Installation", "iPhone", "Install Openline on iPhone via manual activation code",
"""
Use this method if the QR code doesn't scan (glare, no second screen, etc.).

1. Go to **Settings → Cellular → Add Cellular Plan → Enter Details Manually**.
2. Enter the **SM-DP+ Address** and **Activation Code** from your Openline confirmation email.
3. Tap **Next** and follow the on-screen prompts.
4. Label the new line **Openline**.
5. Turn on **Data Roaming** for the Openline line.

That's it — same result as the QR code, just typed instead of scanned.
""",
tags=["install", "iphone", "manual"])

add("Installation", "iPhone", "Install Openline via the one-tap iOS install link",
"""
On iOS 17.4 and later, Openline can install with a single tap.

1. Open the confirmation email **on the iPhone that will host the eSIM** (not on a second device).
2. Tap the **Install eSIM** button.
3. iOS opens the Cellular Setup sheet automatically. Confirm.
4. Label the line **Openline**, and set Data Roaming on.

No QR code, no typing. If the button doesn't appear, you're on an older iOS — use the QR code from the same email instead.
""",
tags=["install", "iphone", "one-tap"])

add("Installation", "Android", "Install Openline on Android via QR code", INSTALL_ANDROID + CONTACT_BLOCK,
tags=["install", "android", "qr"])

add("Installation", "Android", "Install Openline on Google Pixel",
"""
1. **Settings → Network & internet → SIMs**.
2. Tap **+ Add eSIM**.
3. Tap **Download a SIM instead?**.
4. Scan the QR code from your Openline email, or tap **Need help?** → **Enter it manually** and paste the activation code.
5. Confirm and name the SIM **Openline**.
6. Turn **Data roaming** on and choose Openline as **Mobile data**.
""",
tags=["install", "pixel", "android"])

add("Installation", "Android", "Install Openline on Samsung Galaxy",
"""
1. **Settings → Connections → SIM manager**.
2. Tap **Add eSIM**.
3. Choose **Scan QR code from service provider** and scan the code from your Openline email.
4. If asked to enter the code manually, use the **SM-DP+ Address** and **Activation Code** from the email.
5. Follow the prompts, label the new line **Openline**.
6. Enable **Data roaming** and set **Mobile data** to the Openline line.
""",
tags=["install", "samsung", "android"])

add("Installation", "Android", "Install Openline on Xiaomi phones",
"""
1. **Settings → SIM cards & mobile networks → Add eSIM**.
2. Scan the QR code from the confirmation email, or tap **Manually enter code**.
3. Confirm and label the plan **Openline**.
4. Turn on **Data roaming** and set the Openline line as **Default mobile data**.

On some MIUI/HyperOS builds the menu is under **Settings → Mobile network → Manage SIMs**.
""",
tags=["install", "xiaomi", "android"])

add("Installation", "Android", "Install Openline on OnePlus",
"""
1. **Settings → Wi-Fi & network → SIM & network → Add eSIM**.
2. Follow the wizard — scan the Openline QR code or paste the activation code.
3. Enable **Data roaming**.
4. Set **Mobile data** to the Openline line.

Depending on OxygenOS version, the top-level menu may be called **Connections & sharing** instead — the flow is identical.
""",
tags=["install", "oneplus", "android"])

add("Installation", "Android", "Install Openline on Huawei",
"""
On Huawei devices with eSIM support:

1. **Settings → Mobile network → SIM management**.
2. Tap **Add eSIM**.
3. Scan the QR code from your Openline email, or paste the activation code.
4. Confirm and turn on **Data roaming**.
5. Set the Openline plan as **Default mobile data**.
""",
tags=["install", "huawei", "android"])

add("Installation", "General", "Can I install my Openline eSIM before I travel?",
"""
Yes — and we recommend it. Install while you have solid Wi-Fi at home so that everything is ready before you leave.

The plan does not start when you install; it starts the first time your eSIM connects to a supported network at your destination. See "When does my Openline plan start?" for details.
""",
tags=["install", "activation"])

add("Installation", "General", "Can I install my Openline eSIM on multiple devices?",
"""
No — each Openline eSIM can be installed on **one device at a time**. This is a GSMA requirement, not an Openline one: an eSIM profile is bound to a specific device's EID.

If you need connectivity on multiple devices simultaneously, buy an eSIM per device, or use one device as a hotspot for the others.
""",
tags=["install", "multiple-devices"])

add("Installation", "General", "How do I reinstall my Openline eSIM?",
"""
If you deleted the profile or switched phones, sign in at [openline.com](https://openline.com) or in the app, find the plan, and tap **Reinstall eSIM**. We generate a fresh QR code you can scan on the new device.

Notes:

- Reinstalls are free.
- Reinstalling moves the plan to the new device — you cannot use it on two phones at once.
- Data already used against the plan does not come back.
""",
tags=["install", "reinstall"])

# ---------- Plans & coverage ----------
add("Plans & coverage", "Plan types", "What Openline plans are available?",
"""
Openline offers three main plan families:

- **Country plans.** One country, a set amount of data (or Unlimited), and a set duration (1 to 30 days). Cheapest way to cover a short trip.
- **Regional plans.** Groups of countries — Europe, Asia, Latin America, MENA, North America, Oceania, Africa, Balkans, Caribbean. One plan covers all of them, no switching needed.
- **Global plans.** Coverage across every Openline destination — ideal for round-the-world trips, digital nomads, business travellers.

Every family has **fixed-data** options (1 GB, 3 GB, 5 GB, 10 GB, 20 GB, 50 GB) and **Unlimited** options where local capacity is your only ceiling.
""",
tags=["plans", "overview"])

add("Plans & coverage", "Plan types", "What are Openline Unlimited plans?",
"""
Unlimited plans give you unmetered data for the duration of the plan. There is no Openline-side data cap and no throttle set by us.

Some things to be aware of:

- Local mobile networks have their own capacity; if a specific area is congested, you'll see the same speeds a local SIM would. This is not an Openline throttle — it's the local network.
- Streaming and hotspot use are fine and included.
- Very heavy sustained usage (multiple TB per month) may trigger our anti-abuse system if it looks non-human. Real users are never affected.

Unlimited is available in country, regional and global flavours.
""",
tags=["plans", "unlimited"])

add("Plans & coverage", "Plan types", "Can I use hotspot / tethering on Openline?",
"""
Yes. Openline data can be shared over hotspot/tethering to laptops, tablets, and other devices. There is no extra charge and no separate tethering allowance — hotspot traffic counts against your regular data.

If tethering does not work:

- Confirm the Openline line is selected as **Mobile data**.
- Confirm **Personal Hotspot** is on (iPhone) or **Hotspot & tethering** is on (Android).
- On some Android devices, you may need to change the APN type to include `dun`.
""",
tags=["plans", "hotspot"])

add("Plans & coverage", "Plan types", "Do Openline plans include voice calls or SMS?",
"""
Openline plans are **data-only**. You can:

- Make voice calls with **WhatsApp, iMessage, FaceTime, Zoom, Google Meet, Telegram, Signal, Teams, Discord**, and any other data-based app.
- Send messages with the same apps.
- Keep receiving iMessages, WhatsApp and 2FA codes on your **home number** because your primary SIM stays active.

If you need to receive traditional calls or SMS on a local number, that's a separate service (a "phone number plan") that we're rolling out gradually — it is not part of a standard travel plan.
""",
tags=["plans", "voice", "sms"])

add("Plans & coverage", "Plan types", "Do Openline plans auto-renew?",
"""
**Single-trip plans:** No. They expire at the end of their duration or when data runs out — no surprise charges.

**Monthly subscription plans** (where available): Yes, they renew every 30 days at the same price. You can cancel any time from the app or website; cancellations take effect at the end of the current cycle.

Auto-renewing plans are always marked clearly at checkout with a **Subscribe** badge — never a hidden default.
""",
tags=["plans", "billing"])

add("Plans & coverage", "Coverage", "Which countries does Openline cover?",
"""
Openline works in **190+ countries and territories** — most of the inhabited world. Coverage includes every EU country, the UK, all of North America, most of Latin America and the Caribbean, most of Asia, Australia, New Zealand, and the majority of Africa and the Middle East.

To check whether a specific destination is supported:

- Search for it on [openline.com](https://openline.com) — every country page shows the local Tier-1 partners, plans, and expected speeds.
- Or ask in chat: **ask@openline.com**.

We add new destinations regularly. If a country you need isn't listed, tell us — we prioritise coverage requests by demand.
""",
tags=["coverage", "countries"])

add("Plans & coverage", "Coverage", "Which countries are not supported by Openline?",
"""
A small number of countries are not currently in the Openline network:

- **North Korea** — no commercial mobile access.
- **Iran** — subject to international sanctions.
- **Syria** — subject to international sanctions.
- **Cuba** — limited to specific partnerships; check the country page.

Coverage may also be partial or unavailable in certain remote territories, contested regions, and small islands without a Tier-1 operator. The country page on [openline.com](https://openline.com) is always the source of truth.
""",
tags=["coverage", "limitations"])

add("Plans & coverage", "Coverage", "What speeds can I expect on Openline?",
"""
Openline runs on Tier-1 carriers — the same networks locals use. Real-world speeds depend on:

- The country and specific area (city centres are typically faster than rural areas).
- 5G, 4G/LTE, or 3G availability. Openline supports 5G where the partner does.
- Local congestion — same story as any local SIM.
- Your phone's supported bands.

In practice: **50–300 Mbps download** in most European and Asian cities on 5G; **20–100 Mbps** on 4G/LTE; slower in dense congestion or remote areas. If you're getting less, it's almost always local coverage, not Openline throttling.
""",
tags=["coverage", "speed"])

add("Plans & coverage", "Coverage", "Does Openline support 5G?",
"""
Yes, in every country where our partner network supports 5G and your phone supports the local 5G bands.

To confirm:

- Your phone shows a **5G** or **5G UW / 5G+** indicator next to the Openline line.
- Open a speed test — 5G typically means well above 100 Mbps download.

If your phone shows 4G/LTE instead of 5G:

- 5G may not be available in that specific area.
- Your device may not support the local 5G bands (common with imported models).
- 5G may be off in **Settings → Cellular → Cellular Data Options → Voice & Data**.
""",
tags=["coverage", "5g"])

add("Plans & coverage", "Regional plans", "What countries does the Europe regional plan cover?",
"""
The Openline Europe regional plan covers the EU, EEA, and neighbouring destinations. That currently includes:

Austria, Belgium, Bulgaria, Croatia, Cyprus, Czechia, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Iceland, Ireland, Italy, Latvia, Liechtenstein, Lithuania, Luxembourg, Malta, Netherlands, Norway, Poland, Portugal, Romania, Slovakia, Slovenia, Spain, Sweden, Switzerland, plus the UK.

The plan works seamlessly across all of them — no switching, no reactivation between borders. The country list can grow; check the plan page for the most current version.
""",
tags=["coverage", "europe", "regional"])

add("Plans & coverage", "Regional plans", "What countries does the Asia regional plan cover?",
"""
The Openline Asia regional plan covers destinations across East, South-East and South Asia, including:

Cambodia, China (mainland), Hong Kong SAR, India, Indonesia, Japan, Kazakhstan, Kyrgyzstan, Laos, Macau SAR, Malaysia, Mongolia, Nepal, Pakistan, Philippines, Singapore, South Korea, Sri Lanka, Taiwan, Thailand, Uzbekistan, Vietnam.

The plan roams seamlessly across these countries with a single price and one activation.
""",
tags=["coverage", "asia", "regional"])

add("Plans & coverage", "Regional plans", "What countries does the Americas regional plan cover?",
"""
The Americas regional plan covers North America, Central America, and South America, including:

Argentina, Belize, Bolivia, Brazil, Canada, Chile, Colombia, Costa Rica, Dominican Republic, Ecuador, El Salvador, Guatemala, Honduras, Jamaica, Mexico, Nicaragua, Panama, Paraguay, Peru, Puerto Rico, United States, Uruguay, Venezuela.

If you're travelling across the region on a single trip, the Americas plan is usually much cheaper than buying individual country plans.
""",
tags=["coverage", "americas", "regional"])

add("Plans & coverage", "Regional plans", "What countries does the MENA regional plan cover?",
"""
The Middle East & North Africa regional plan covers:

Bahrain, Egypt, Israel, Jordan, Kuwait, Lebanon, Morocco, Oman, Palestine, Qatar, Saudi Arabia, Tunisia, Turkey, United Arab Emirates.

Ideal for multi-country business trips and pilgrimage travel across the region.
""",
tags=["coverage", "mena", "regional"])

add("Plans & coverage", "Regional plans", "What countries does the Global plan cover?",
"""
The Openline Global plan covers **every country in the Openline network** — 190+ destinations. It's the right choice for:

- Round-the-world trips
- Digital nomads without a fixed base
- Business travellers who cross regions on a single itinerary
- Cruise-adjacent land travel (note that ships at sea use a different maritime network — see the cruise article)

Global plans exist in fixed-data (1 GB → 50 GB) and Unlimited forms.
""",
tags=["coverage", "global", "regional"])

# ---------- Payment & billing ----------
add("Payment & billing", "Payment methods", "Which payment methods does Openline accept?",
"""
- **Cards:** Visa, Mastercard, American Express, Discover, JCB, UnionPay, Diners Club, Maestro, Cartes Bancaires.
- **Digital wallets:** Apple Pay, Google Pay.
- **PayPal**.
- **iDEAL** (Netherlands), **Bancontact** (Belgium), **SEPA Direct Debit**, **Klarna** (select markets).
- **Cryptocurrency:** Bitcoin, Ethereum, XRP, USDT (via NowPayments).

All payments are processed through PCI-DSS certified providers. Openline never stores raw card details — we store a tokenised reference.
""",
tags=["billing", "payments"])

add("Payment & billing", "Payment methods", "Can I pay for Openline with cryptocurrency?",
"""
Yes. At checkout choose **Crypto** and pick a coin. We currently accept:

- **Bitcoin (BTC)**
- **Ethereum (ETH)**
- **XRP**
- **Tether (USDT)** on Ethereum, Tron, and Solana networks

You'll get an invoice with a wallet address and a QR code. Send the exact amount within the countdown window. Once the transaction confirms on-chain, your order is fulfilled automatically and the QR code is emailed to you.

Crypto payments are non-reversible by nature — if you need a refund we'll issue it as store credit.
""",
tags=["billing", "crypto"])

add("Payment & billing", "Payment methods", "Which currencies can I pay in?",
"""
The storefront shows prices in your local currency where possible. Supported display currencies include USD, EUR, GBP, CAD, AUD, NZD, JPY, KRW, SGD, HKD, TWD, INR, BRL, MXN, AED, ILS, ZAR, and more.

Payment is processed in the currency your card issuer or wallet uses; the exchange happens on their side. There is no Openline currency conversion fee.
""",
tags=["billing", "currency"])

add("Payment & billing", "Payment methods", "Does Openline charge VAT / sales tax?",
"""
Depending on your billing country, Openline may include VAT, GST, or a local sales tax in the price. This is shown clearly at checkout and on the receipt.

For B2B customers with a valid VAT ID, you can enter it during checkout and receive a reverse-charge invoice where local rules allow.
""",
tags=["billing", "tax", "vat"])

add("Payment & billing", "Receipts", "Where can I find my receipt / invoice?",
"""
Every order gets an emailed receipt to the address you provided at checkout. You can also:

- Sign in at [openline.com](https://openline.com) → **Orders** → tap the order → **Download invoice (PDF)**.
- Open the Openline app → **Orders** → **Download PDF**.

If you need a customised invoice (company name, VAT ID, address), email **billing@openline.com** with the order ID and we'll re-issue.
""",
tags=["billing", "invoice"])

add("Payment & billing", "Receipts", "How do I get a VAT invoice?",
"""
1. Sign in and go to **Account → Billing details**.
2. Enter your **Company name**, **Address**, and **VAT ID / Tax ID**.
3. Save.

Any future order will produce a VAT invoice with those details. For past orders, email **billing@openline.com** with your order ID and the billing details — we re-issue for free.
""",
tags=["billing", "vat", "invoice"])

add("Payment & billing", "Refunds", "What is Openline's refund policy?",
"""
We refund fully in these cases:

- **You paid, but did not install the eSIM.** Full refund within 30 days.
- **You installed the eSIM but never activated it (no data used).** Full refund within 30 days.
- **Coverage failure at destination.** If Openline could not deliver service due to a network issue on our side, we refund the plan pro-rata after a diagnosis.

We do **not** refund:

- Plans that have been actively used (data consumed).
- Devices that turned out to be locked or non-eSIM after purchase — we can help you use the plan on another compatible device instead.

To request a refund: email **ask@openline.com** with your order ID. Refunds go back to the original payment method within 5–10 business days.
""",
tags=["refund", "policy"])

add("Payment & billing", "Refunds", "How long does an Openline refund take?",
"""
- **Cards:** 5–10 business days for the refund to show on your statement, depending on your bank.
- **PayPal:** 1–5 business days.
- **Apple Pay / Google Pay:** shown against the original card, same timing as cards.
- **Crypto:** we issue store credit by default; on request we can send the equivalent amount back to a wallet you specify (subject to network fees).

If it's been longer than that, email **ask@openline.com** and we'll trace it.
""",
tags=["refund", "timing"])

add("Payment & billing", "Failed payments", "My card was declined — what now?",
"""
Common reasons and quick fixes:

- **Billing address mismatch.** Confirm the ZIP/postal code matches what your bank has.
- **3-D Secure challenge.** Some banks pop up a "confirm this purchase" screen — approve it in your banking app, then retry.
- **International purchase blocked.** Openline charges from Bulgaria/EU; some banks flag EU merchants. Call your bank to allow it, or use a different card / Apple Pay / crypto.
- **Insufficient funds.** Obvious but worth checking.
- **Wrong card details.** Number, expiry, and CVV must match exactly.

If it still fails, try Apple Pay, Google Pay, PayPal, or crypto. All are equally supported.
""",
tags=["billing", "decline"])

# ---------- Troubleshooting ----------
add("Troubleshooting", "No data / no signal", "My Openline eSIM shows no signal — what should I do?",
TROUBLESHOOT_BASICS + "\n" + CONTACT_BLOCK,
tags=["troubleshooting", "no-signal"])

add("Troubleshooting", "No data / no signal", "I have signal but no internet — what should I do?",
"""
This usually means the phone is connected to a network but the data path isn't working.

## Checklist

1. Confirm **Cellular Data** is turned on and set to the Openline line.
2. Confirm **Data Roaming** is on for the Openline line (must be on for travel eSIMs).
3. Turn Wi-Fi off temporarily — some phones stay on a dead Wi-Fi network instead of using mobile data.
4. Toggle airplane mode on for 30 seconds, then off.
5. On Android, check the APN (see the APN article).
6. Restart the phone.

If you use a VPN or content-blocker profile, disable it temporarily to rule it out.
""" + CONTACT_BLOCK,
tags=["troubleshooting", "no-internet"])

add("Troubleshooting", "No data / no signal", "How do I set the correct APN for Openline on Android?",
"""
Most Openline eSIMs configure the APN automatically on Android. If they don't, do this:

1. **Settings → Network & internet → SIMs → Openline → APN**.
2. Add a new APN with:
   - Name: **Openline**
   - APN: **openline**
   - MCC/MNC: leave blank (auto-fills)
   - APN type: **default,supl,dun**
3. Save and select the new APN.

On iPhone the APN is set automatically by the eSIM profile — you do not need to configure it manually.
""",
tags=["troubleshooting", "apn", "android"])

add("Troubleshooting", "Installation errors", "My QR code doesn't scan — what should I do?",
"""
1. Make sure the phone that will host the eSIM is not the same device showing the QR code — you need a second screen (a laptop, tablet, print-out, or the confirmation email opened on another phone).
2. Increase screen brightness on the device showing the code.
3. Clean the camera lens.
4. Hold the phone 15–20 cm away, keep the whole QR code in the frame.
5. If scanning still fails, use the **manual activation code** — the SM-DP+ Address and the Activation Code are in the same confirmation email.
""",
tags=["troubleshooting", "qr", "install"])

add("Troubleshooting", "Installation errors", "\"eSIM cannot be added\" or \"code is no longer valid\" — what should I do?",
"""
This error usually means one of:

- The eSIM has already been installed once. Each Openline eSIM can be installed on **one device**.
- The QR was refreshed in the app — the old QR is invalidated.
- The device isn't connected to Wi-Fi during install.
- The device is carrier-locked.

## Fix

1. Connect to Wi-Fi.
2. Sign in at [openline.com](https://openline.com), open the plan, and tap **Reinstall eSIM**. This issues a fresh QR code invalidating the old one.
3. Scan the fresh code on the phone you want to use.
4. If the device is locked, unlock it with your home carrier first.
""",
tags=["troubleshooting", "install", "qr"])

add("Troubleshooting", "Installation errors", "\"No cellular plan for this device\" on iPhone — what should I do?",
"""
Rare error, usually caused by an interrupted profile install. Fix:

1. **Settings → Cellular → Openline** → **Remove eSIM**.
2. Connect to Wi-Fi.
3. Sign in at [openline.com](https://openline.com) → **My eSIMs** → **Reinstall**.
4. Scan the new QR code.

If you cannot reach Settings due to the error, restart the iPhone first, then repeat.
""",
tags=["troubleshooting", "iphone", "install"])

# ---------- Account ----------
add("Account", "Account basics", "How do I create an Openline account?",
"""
Two ways:

- **At checkout.** Buying a plan automatically creates an account tied to your email. You'll get a magic-link login in your welcome email.
- **From the header.** Go to [openline.com](https://openline.com) → **Sign in** → **Create account**. Enter your email, choose a password, done.

You can also sign in with **Apple** or **Google** — no password to remember.
""",
tags=["account", "signup"])

add("Account", "Account basics", "How do I sign in to Openline?",
"""
Go to [openline.com](https://openline.com) or open the Openline app and tap **Sign in**. You can:

- Enter your email and password.
- Tap **Sign in with Apple**.
- Tap **Sign in with Google**.
- Tap **Email me a magic link** and click the link in the email.

If two-factor is on, you'll be prompted for the second step.
""",
tags=["account", "signin"])

add("Account", "Account basics", "I forgot my password — how do I reset it?",
"""
1. On the sign-in page, tap **Forgot password**.
2. Enter the email you used at signup.
3. Check your inbox for a reset link — click it within 24 hours.
4. Set a new password and sign in.

Not receiving the email? Check spam and promotions. If it's still missing after 5 minutes, use the **magic link** option instead — it always sends to the same address.
""",
tags=["account", "password"])

add("Account", "Account basics", "How do I change the email on my Openline account?",
"""
1. Sign in and go to **Account → Profile**.
2. Tap **Change email**.
3. Enter the new address.
4. Confirm the new address by clicking the verification link we send there.

Until you confirm, your old address remains the login. All existing eSIMs and orders move to the new address automatically once confirmed.
""",
tags=["account", "email"])

add("Account", "Account basics", "How do I delete my Openline account?",
"""
1. Sign in and go to **Account → Privacy → Delete account**.
2. Confirm — we require the account password (or Apple/Google confirmation).
3. Your account is deactivated immediately, and all personal data is permanently erased within 30 days.

Any active plan remains usable until it expires; you'll receive expiry notices to the email on file. Refunds for unused plans can be processed **before** deletion.
""",
tags=["account", "delete", "privacy"])

# ---------- App & website ----------
add("App & website", "Mobile app", "Where can I download the Openline app?",
"""
- **iOS:** search "Openline eSIM" on the App Store, or use [openline.com/ios](https://openline.com/ios).
- **Android:** search "Openline eSIM" on Google Play, or use [openline.com/android](https://openline.com/android).

The app is free. You can also use everything the app does directly from [openline.com](https://openline.com) in any browser.
""",
tags=["app", "download"])

add("App & website", "Mobile app", "What can I do in the Openline app?",
"""
- Buy new plans.
- View all your eSIMs and their status (pending, installed, in use, expired).
- Install eSIMs with one tap on iOS 17.4+.
- Track data used and days remaining, live.
- Top up existing plans.
- Chat with support.
- Manage payment methods, invoices, and referrals.
- Enable two-factor authentication.
""",
tags=["app", "features"])

add("App & website", "Website", "I'm on desktop — can I use Openline without installing the app?",
"""
Yes. Everything the app does is also on [openline.com](https://openline.com). Buy plans, download QR codes, chat with support, manage your account — all from any browser.

The app is a convenience, not a requirement.
""",
tags=["app", "website"])

# ---------- Security & privacy ----------
add("Security & privacy", "Security", "Is my Openline account secure?",
"""
Yes. We use:

- **TLS 1.2/1.3 everywhere** — no unencrypted traffic.
- **Passwords hashed with Argon2id** — even Openline cannot read your password.
- **Two-factor authentication (2FA)** available via authenticator app or email OTP.
- **Session tokens rotated** on sign-in, sign-out, and password change.
- **Rate limiting** on sign-in attempts.
- **Bug bounty** with responsible-disclosure guidelines at [security.openline.com](https://openline.com/security).

If you notice suspicious activity on your account, change your password and email **security@openline.com** immediately.
""",
tags=["security", "account"])

add("Security & privacy", "Privacy", "What data does Openline store about me?",
"""
We store:

- **Email address** and (if you set one) name.
- **Order history**, including plan type, destination, and date.
- **Payment tokens** (never raw card details).
- **eSIM identifiers** (ICCID, EID if we're allowed to see it) needed to provision the profile.
- **Usage metadata** — total bytes per plan, no browsing history, no packet inspection.

We do **not** store:

- Government IDs (Openline doesn't require them).
- Browsing history, DNS queries, or the content of your traffic.
- Location data beyond the country the eSIM connected in.

The full policy is at [openline.com/privacy](https://openline.com/privacy).
""",
tags=["privacy", "data"])

add("Security & privacy", "Privacy", "Does Openline require my ID or passport?",
"""
**No.** One of Openline's founding principles is: an eSIM should be as private as an internet purchase, not a local telco contract.

We accept anonymous crypto payments and never ask for a passport, government ID, or address verification for standard travel plans.

Exceptions:

- Some countries (China mainland, UAE, Turkey, others) legally require real-name registration for local numbers — those are the local-carrier rules, not Openline's, and only apply if you use a service that provisions a local phone number.
- Enterprise / IoT customers with large-volume orders may go through KYB for anti-fraud reasons.
""",
tags=["privacy", "id", "kyc"])

add("Security & privacy", "Security", "How do I enable two-factor authentication?",
"""
1. Sign in and go to **Account → Security → Two-factor authentication**.
2. Choose **Authenticator app** (recommended) or **Email OTP**.
3. For authenticator apps: scan the QR with **1Password, Authy, Google Authenticator, Aegis** or similar.
4. Enter the 6-digit code shown by the app.
5. Save the **backup codes** somewhere safe (password manager, printed sheet).

From now on, every new sign-in on an unrecognised device requires a code.
""",
tags=["security", "2fa"])

# ---------- Business & IoT ----------
add("Business & IoT", "Business", "Does Openline offer business accounts?",
"""
Yes. Openline for Business gives you:

- **A team dashboard** where an admin can buy, assign, and revoke plans across employees.
- **Bulk purchase** with net-30 invoicing.
- **Consolidated VAT invoices** and expense-friendly per-user reports.
- **Priority support** with a named account manager for larger accounts.
- **API access** for automated provisioning.
- **SSO** via SAML/OIDC on larger tiers.

Get in touch at [openline.com/business](https://openline.com/business) or **business@openline.com**.
""",
tags=["business", "b2b"])

add("Business & IoT", "IoT", "Can I use Openline for IoT devices?",
"""
Yes, through **Openline Connect** (our IoT product line). It powers:

- Connected cars and telematics
- Trackers and asset monitoring
- Point-of-sale terminals
- Smart cameras and industrial sensors
- Consumer electronics with cellular backhaul

Openline Connect uses the same multi-Tier-1 core, plus:

- Managed eSIM with remote provisioning
- Volume pricing tiers
- Long-life plans (up to 10 years)
- API for lifecycle management

Contact **iot@openline.com** for pricing and technical fit.
""",
tags=["iot", "connect"])

add("Business & IoT", "API", "Does Openline have a public API?",
"""
Yes. Openline offers a reseller and integration API for partners:

- **Catalogue endpoints** — list destinations, plans, prices.
- **Order endpoints** — create orders, retrieve eSIM QR / activation codes.
- **Usage endpoints** — check remaining data and days.
- **Webhooks** — activation, expiry, top-up events.

Auth is via API key or OAuth 2.0. Docs live at [openline.com/api](https://openline.com/api). Public availability is by application — email **partners@openline.com** to request access.
""",
tags=["api", "partners", "reseller"])

# ---------- Support & contact ----------
add("Support", "Contact", "How do I contact Openline support?",
"""
- **Live chat** — 24/7 inside the Openline app and at [openline.com](https://openline.com) (look for the **Help** button, bottom-right).
- **Email** — **ask@openline.com** (general) or **billing@openline.com** (invoices/refunds).
- **X / Twitter DM** — @openline.
- **Community** — [community.openline.com](https://community.openline.com) for public Q&A.

For faster answers include your order ID and, if relevant, the ICCID of the affected eSIM.
""",
tags=["support", "contact"])

add("Support", "Contact", "What are Openline's support hours?",
"""
**24/7, every day of the year.** Live chat and email are covered by our support team plus AI-assisted first-line responses that route hard cases to a human quickly.

Median first-response times we aim for:

- **Live chat:** under 2 minutes.
- **Email:** under 4 hours, usually well below.
""",
tags=["support", "hours"])

# ---------- Referrals ----------
add("Referrals", "Refer a friend", "How does Openline's referral program work?",
"""
1. Sign in and open **Account → Refer a friend**.
2. Share your personal link or code.
3. When a friend uses it to buy their first eSIM:
   - **They get** a discount off their first order.
   - **You get** account credit you can use toward any future order.

Credit stacks — invite as many friends as you like. There's no cash payout; credit is spent inside Openline.

Fraudulent self-referrals (same device, same card, chained accounts) are disqualified — the system is straightforward but not naive.
""",
tags=["referral", "credit"])

# ---------- Special use cases ----------
add("Special use cases", "Travel scenarios", "Using Openline on a cruise ship",
"""
While at sea, ships use their own maritime satellite network (Cellular at Sea, WMS, or similar). No consumer eSIM — Openline included — connects there without paying the maritime carrier's very high roaming rates.

**What we recommend:**

- Turn **Data Roaming off** on the Openline line before you board, so you don't accidentally connect to the maritime network.
- Use the ship's Wi-Fi package or activate the Openline plan **only after docking** in a covered port.
- The moment you're on land in a supported country, Openline works exactly as it does anywhere else.

Same guidance for planes with in-flight cellular.
""",
tags=["cruise", "sea", "roaming"])

add("Special use cases", "Travel scenarios", "Using Openline on a flight (in-flight Wi-Fi)",
"""
In-flight **Wi-Fi** (from Panasonic, Viasat, Starlink Aviation, etc.) works normally with your device connected to the plane's Wi-Fi, independent of Openline.

In-flight **cellular** ("AeroMobile" style networks that appear when you're above cruise altitude on some carriers) is a separate maritime/aeronautical roaming network. Openline does not activate on these — like every travel eSIM. Keep Data Roaming off during the flight to avoid the aircraft's cellular network trying to bill you via any partner.
""",
tags=["flight", "wifi", "roaming"])

add("Special use cases", "Travel scenarios", "Using Openline in China (mainland)",
"""
Openline in China is fully supported through Tier-1 carriers, and — importantly — Openline data does **not** route through the Great Firewall in the same way local SIMs do. Our partner routing lets you reach Google, Gmail, WhatsApp, YouTube, and most Western services without a VPN.

That's a feature many travellers value: no extra VPN configuration, no dropped connections. Speeds are typically excellent in Beijing, Shanghai, Shenzhen and other Tier-1 cities.

Note: this is a network-routing side-effect, not a policy stance. Local law still applies to your usage.
""",
tags=["china", "coverage"])

add("Special use cases", "Travel scenarios", "Using Openline across the EU on a road trip",
"""
The Europe regional plan is the easy answer: one plan, no reconfiguration between countries. Your phone will hand off between borders automatically, using the strongest local Tier-1 network on each side.

If you're only visiting one country in Europe, a country plan is usually a bit cheaper. Any 3+ country itinerary tips the balance toward regional.
""",
tags=["europe", "road-trip"])

add("Special use cases", "Travel scenarios", "Using Openline while working remotely as a digital nomad",
"""
Openline is built for this use case:

- **One account** across dozens of countries — no relearning a local telco each time.
- **Monthly Unlimited** subscription available for people who don't want to shop every few weeks.
- **Priority network selection** for the strongest local Tier-1 signal — helpful for video calls.
- **Hotspot included** — tether your laptop for full workdays.
- **Referral credit** — nomads recommending nomads.

We also publish a **coverage-quality dashboard** with real usage stats per city, so you can pick your next co-working destination with confidence.
""",
tags=["digital-nomad", "remote-work"])

# ---------- Content Openline-specific ----------
add("Getting started", "About Openline", "Why is Openline different from Airalo, Holafly, Saily, and Roamify?",
"""
All four are established travel eSIM brands. Openline overlaps on the basics — you get a QR code, install it on your phone, and use local networks — but the philosophy differs in a few places:

- **Multi-Tier-1 switching.** Openline connects you to the strongest of 3–5 Tier-1 partners in each country. Most competitors pin you to a single local partner, which can be slow if that specific carrier has weak coverage in your area.
- **No ID, no throttled Unlimited.** Openline's Unlimited plans have no Openline-side throttle. Some competitors advertise "unlimited" then throttle at 500 MB/day.
- **Crypto out of the box.** Bitcoin, Ethereum, XRP, USDT — no third-party workaround.
- **Modern account experience.** One dashboard for country plans, regional plans, IoT lines, and business accounts.
- **Openline Connect for IoT.** A first-class second product line, not an afterthought.

We keep the price competitive on top of that — often the cheapest for a given destination.
""",
tags=["comparison", "competitors"])

add("Getting started", "About Openline", "Is Openline really cheaper than the competition?",
"""
For most destinations and most plan sizes: yes. Our pricing is dynamic — we shop Tier-1 wholesale continuously and pass the savings to the storefront within days. The exact spread against Airalo, Holafly, Saily, Nomad and Roamify varies day to day, but as of the most recent monthly review Openline was the cheapest option in the majority of destinations we compared.

You can always spot-check by picking your destination on [openline.com](https://openline.com) and putting the same specs (same country, same GB, same days) into a competitor. Openline has no long-term contract to hold you, so switching between us and any competitor is free.
""",
tags=["pricing", "comparison"])

# ---------------------------------------------------------------------------
# Programmatic expansion — country pages, model-specific installs, etc.
# ---------------------------------------------------------------------------

# 60 country-specific "Using Openline in X" articles
COUNTRIES = [
    ("United States", "USA", "AT&T, T-Mobile, Verizon", "5G", "New York, Los Angeles, Chicago"),
    ("United Kingdom", "UK", "EE, Vodafone, O2, Three", "5G", "London, Manchester, Edinburgh"),
    ("France", "FR", "Orange, SFR, Bouygues, Free", "5G", "Paris, Lyon, Marseille"),
    ("Germany", "DE", "Telekom, Vodafone, O2/Telefónica", "5G", "Berlin, Munich, Hamburg"),
    ("Spain", "ES", "Movistar, Vodafone, Orange", "5G", "Madrid, Barcelona, Valencia"),
    ("Italy", "IT", "TIM, Vodafone, WindTre", "5G", "Rome, Milan, Naples"),
    ("Portugal", "PT", "MEO, NOS, Vodafone", "5G", "Lisbon, Porto, Faro"),
    ("Netherlands", "NL", "KPN, Vodafone, Odido", "5G", "Amsterdam, Rotterdam, The Hague"),
    ("Belgium", "BE", "Proximus, Orange, Base", "5G", "Brussels, Antwerp, Ghent"),
    ("Switzerland", "CH", "Swisscom, Sunrise, Salt", "5G", "Zurich, Geneva, Bern"),
    ("Austria", "AT", "A1, Magenta, Drei", "5G", "Vienna, Salzburg, Graz"),
    ("Sweden", "SE", "Telia, Telenor, Tele2, Tre", "5G", "Stockholm, Gothenburg, Malmö"),
    ("Norway", "NO", "Telenor, Telia, Ice", "5G", "Oslo, Bergen, Trondheim"),
    ("Denmark", "DK", "TDC, Telenor, Telia, 3", "5G", "Copenhagen, Aarhus, Odense"),
    ("Finland", "FI", "Elisa, Telia, DNA", "5G", "Helsinki, Tampere, Turku"),
    ("Ireland", "IE", "Vodafone, Three, Eir", "5G", "Dublin, Cork, Galway"),
    ("Iceland", "IS", "Síminn, Vodafone, Nova", "5G", "Reykjavik"),
    ("Poland", "PL", "Orange, T-Mobile, Play, Plus", "5G", "Warsaw, Kraków, Gdańsk"),
    ("Czechia", "CZ", "O2, T-Mobile, Vodafone", "5G", "Prague, Brno, Ostrava"),
    ("Hungary", "HU", "Magyar Telekom, Vodafone, Yettel", "5G", "Budapest"),
    ("Greece", "GR", "Cosmote, Vodafone, Nova", "5G", "Athens, Thessaloniki, Heraklion"),
    ("Croatia", "HR", "HT, A1, Telemach", "5G", "Zagreb, Split, Dubrovnik"),
    ("Turkey", "TR", "Turkcell, Vodafone TR, Türk Telekom", "5G", "Istanbul, Ankara, Antalya"),
    ("United Arab Emirates", "UAE", "Etisalat/e&, du", "5G", "Dubai, Abu Dhabi"),
    ("Saudi Arabia", "SA", "STC, Mobily, Zain", "5G", "Riyadh, Jeddah, Mecca"),
    ("Qatar", "QA", "Ooredoo, Vodafone", "5G", "Doha"),
    ("Israel", "IL", "Cellcom, Pelephone, Partner", "5G", "Tel Aviv, Jerusalem"),
    ("Egypt", "EG", "Vodafone, Orange, Etisalat, WE", "4G/LTE", "Cairo, Alexandria, Sharm el-Sheikh"),
    ("Morocco", "MA", "Maroc Telecom, Orange, Inwi", "4G/LTE", "Casablanca, Marrakech, Rabat"),
    ("South Africa", "ZA", "Vodacom, MTN, Cell C, Telkom", "5G", "Johannesburg, Cape Town, Durban"),
    ("Kenya", "KE", "Safaricom, Airtel", "4G/LTE", "Nairobi, Mombasa"),
    ("Japan", "JP", "NTT Docomo, SoftBank, KDDI", "5G", "Tokyo, Osaka, Kyoto"),
    ("South Korea", "KR", "SKT, KT, LG U+", "5G", "Seoul, Busan, Incheon"),
    ("China", "CN", "China Mobile, China Unicom, China Telecom", "5G", "Beijing, Shanghai, Shenzhen"),
    ("Hong Kong", "HK", "CSL, 3, SmarTone, China Mobile HK", "5G", "Hong Kong"),
    ("Taiwan", "TW", "Chunghwa, FarEasTone, Taiwan Mobile", "5G", "Taipei, Kaohsiung"),
    ("Singapore", "SG", "Singtel, StarHub, M1", "5G", "Singapore"),
    ("Malaysia", "MY", "Maxis, Celcom, Digi, U Mobile", "5G", "Kuala Lumpur, Penang, Johor Bahru"),
    ("Thailand", "TH", "AIS, TrueMove H, DTAC", "5G", "Bangkok, Phuket, Chiang Mai"),
    ("Vietnam", "VN", "Viettel, Vinaphone, MobiFone", "5G", "Hanoi, Ho Chi Minh City, Da Nang"),
    ("Indonesia", "ID", "Telkomsel, Indosat, XL Axiata", "4G/LTE", "Jakarta, Bali, Surabaya"),
    ("Philippines", "PH", "Globe, Smart, DITO", "5G", "Manila, Cebu, Davao"),
    ("India", "IN", "Jio, Airtel, Vi", "5G", "Delhi, Mumbai, Bangalore"),
    ("Sri Lanka", "LK", "Dialog, Mobitel, Hutch", "4G/LTE", "Colombo, Kandy"),
    ("Nepal", "NP", "Ncell, Nepal Telecom", "4G/LTE", "Kathmandu, Pokhara"),
    ("Australia", "AU", "Telstra, Optus, Vodafone/TPG", "5G", "Sydney, Melbourne, Brisbane"),
    ("New Zealand", "NZ", "Spark, One NZ, 2degrees", "5G", "Auckland, Wellington, Queenstown"),
    ("Canada", "CA", "Rogers, Bell, Telus", "5G", "Toronto, Vancouver, Montreal"),
    ("Mexico", "MX", "Telcel, AT&T, Movistar", "5G", "Mexico City, Cancún, Guadalajara"),
    ("Brazil", "BR", "Vivo, Claro, TIM", "5G", "São Paulo, Rio de Janeiro, Brasília"),
    ("Argentina", "AR", "Movistar, Claro, Personal", "4G/LTE", "Buenos Aires, Córdoba, Mendoza"),
    ("Chile", "CL", "Entel, Movistar, Claro, WOM", "5G", "Santiago, Valparaíso"),
    ("Colombia", "CO", "Claro, Movistar, Tigo, WOM", "5G", "Bogotá, Medellín, Cartagena"),
    ("Peru", "PE", "Movistar, Claro, Entel", "4G/LTE", "Lima, Cusco, Arequipa"),
    ("Costa Rica", "CR", "Kolbi, Claro, Movistar", "4G/LTE", "San José"),
    ("Dominican Republic", "DO", "Claro, Altice, Viva", "4G/LTE", "Santo Domingo, Punta Cana"),
    ("Jamaica", "JM", "Digicel, Flow", "4G/LTE", "Kingston, Montego Bay"),
    ("Puerto Rico", "PR", "Claro, Liberty, T-Mobile", "5G", "San Juan"),
    ("Iceland", "IS2", "Síminn, Nova, Vodafone", "5G", "Reykjavik"),
]

# de-dup by name in case
seen_c = set()
for c in COUNTRIES:
    if c[0] in seen_c:
        continue
    seen_c.add(c[0])
    name, code, carriers, tech, cities = c
    add(
        "Coverage by country",
        name,
        f"Using Openline in {name}",
        f"""
Openline works across {name} on Tier-1 partner networks — currently **{carriers}**. In practice you're routed to whichever of those has the strongest signal for your specific location, which is typically {tech} in {cities} and 4G/LTE across the rest of the country.

## What to expect

- **Speed:** {tech} where available. Typical download speeds of 50–300 Mbps in major cities on 5G, 20–100 Mbps on 4G/LTE.
- **Coverage:** country-wide across populated areas. Very remote regions may fall back to 3G.
- **Latency:** low enough for video calls in urban areas.

## Plans

- **Country plan for {name}** — cheapest for a single-country trip. Data options from 1 GB to Unlimited.
- **Regional plan** covering {name} plus its neighbours — best for multi-country itineraries.
- **Global plan** — if you're travelling widely.

## Buying

Search "{name}" on [openline.com](https://openline.com), pick your data and days, and pay by card, wallet, PayPal, or crypto. Install the eSIM before flying — activation happens automatically on arrival.

## Local tips

- Keep your home SIM in and let Openline handle data — you'll keep receiving 2FA and iMessage on your home number over the Openline data path or Wi-Fi.
- Data Roaming must be **on** for the Openline line even though there is no roaming charge to you.
- In {cities.split(",")[0].strip()} 5G is dense enough that turning off Wi-Fi and using Openline directly often outperforms local hotel Wi-Fi.
""",
        tags=["coverage", "country", code.lower()],
    )

# Country installation quick-guides (subset of the same countries), same pattern:
for c in COUNTRIES[:40]:
    name = c[0]
    add(
        "Coverage by country",
        name,
        f"Openline pricing and plans in {name}",
        f"""
Openline plans for **{name}** are priced dynamically against local Tier-1 wholesale. The current storefront ([openline.com/{name.lower().replace(' ', '-')}](https://openline.com)) shows live pricing; typical shapes look like:

- **1 GB / 7 days** — good for short trips, maps, messaging.
- **3 GB / 15 days** — enough for most weekly travellers who use hotel Wi-Fi.
- **5 GB / 30 days** — heavier trips with some streaming.
- **10 GB / 30 days** — solid all-purpose plan.
- **20 GB / 30 days** — remote work friendly, hotspot included.
- **Unlimited / 7, 15, 30 days** — no data ceiling, subject only to local network capacity.

All plans include hotspot / tethering at no extra cost. There are no SMS or voice minutes — plans are data-only, and calls run over WhatsApp, iMessage, FaceTime, Zoom and any other data app.
""",
        tags=["pricing", "country", "plans"],
    )

# Common troubleshooting — 40 focused articles
TROUBLES = [
    ("eSIM stuck on \"Activating\"", "The Openline line shows \"Activating\" indefinitely after installation.",
     ["Wait 3–5 minutes on Wi-Fi. If still stuck, restart the phone.", "Confirm your device has strong Wi-Fi during the wait.", "Sign in at openline.com, tap Reinstall on the plan, scan the new QR code.", "If it's a shared or corporate Wi-Fi with strict firewall rules, try a personal hotspot from another phone briefly."]),
    ("eSIM disappeared from phone after iOS update", "The Openline line vanished from Settings → Cellular after updating iOS.",
     ["Restart the iPhone.", "Sign in to iCloud on the same Apple ID as before the update.", "Sign in at openline.com and tap Reinstall to get a fresh QR code.", "Re-scan the QR code, label the line Openline, enable Data Roaming."]),
    ("eSIM disappeared from phone after Android update", "The Openline line vanished from Settings → SIM manager after an Android update.",
     ["Restart the phone.", "Check SIM manager or SIMs page — sometimes the profile is simply toggled off.", "If gone, sign in at openline.com and tap Reinstall.", "Re-scan the QR code, enable Data Roaming, set Openline as Mobile data."]),
    ("Phone shows \"SOS Only\" on Openline line", "The Openline line shows SOS Only or SOS Only indicator.",
     ["Turn Data Roaming on for the Openline line — this is the most common cause.", "Toggle airplane mode on for 30 seconds, then off.", "Manually select a partner network in Settings → Cellular → Network Selection.", "Confirm you're inside a country covered by Openline."]),
    ("Can't scan QR code — camera won't focus", "The camera won't focus on the Openline QR code.",
     ["Clean the camera lens.", "Increase screen brightness on the device showing the QR.", "Hold the phone 15–20 cm away.", "If still failing, use the manual activation code from the same email."]),
    ("Getting the wrong network in a border town", "The phone connects to a network from a neighbouring country by mistake.",
     ["Manually select a partner network in Settings → Cellular → Network Selection.", "Turn airplane mode on for 30 seconds and back off.", "If a regional plan is active, no billing changes; if a country-only plan is active, the wrong country won't consume data (Openline blocks it)."]),
    ("Openline works on Wi-Fi calling but not cellular data", "Wi-Fi calling works but cellular data doesn't.",
     ["Confirm Openline is selected as Mobile Data.", "Confirm Data Roaming is on for Openline.", "Turn Wi-Fi off temporarily to force the phone to try cellular.", "On Android, check the APN — set to openline if empty."]),
    ("Speeds are much lower than expected", "Speedtest shows very low speeds on Openline.",
     ["Test in a different location — buildings, elevators, and basements block signal.", "Check the signal-bar count.", "Turn Wi-Fi off — some phones keep using a slow Wi-Fi network in the background.", "Toggle airplane mode to force a fresh network scan.", "Check if a VPN is on — some VPN endpoints add significant latency."]),
    ("Two eSIMs installed, only one works", "You installed a new Openline eSIM but a previous eSIM is still active.",
     ["Only one eSIM can be the active data line at a time.", "Go to Settings → Cellular and set Cellular Data to the correct line.", "Turn the other eSIM off if you don't need it.", "Data Roaming is per line — set it on the line you want."]),
    ("Data works but no video streaming", "Basic browsing works but video (YouTube, Netflix) won't load.",
     ["Try a different app first — sometimes it's app-side.", "Turn off any VPN or content filter temporarily.", "Some corporate mobile management profiles block streaming — disable if applicable.", "Toggle 5G off temporarily; some border 5G cells are misconfigured."]),
    ("Openline eSIM works for one day then stops", "The eSIM worked on day 1 and then stopped.",
     ["Check the plan expiry and remaining data in the app.", "If data is used up, top up or buy a new plan.", "If the plan is still valid, toggle airplane mode and restart the phone.", "Contact support with the ICCID if the issue persists."]),
    ("Openline eSIM works only over 5G, not 4G", "You lose signal when 5G is unavailable in an area.",
     ["Change Voice & Data to LTE in Settings → Cellular → Cellular Data Options.", "This forces the phone to use 4G/LTE, which has broader coverage.", "Switch back to 5G On when you return to a 5G-covered area."]),
    ("Can't send iMessage on home number while abroad", "iMessage shows sent but not delivered on the home number.",
     ["This is not an Openline issue — iMessage requires your home line to have some signal or data.", "Turn on Wi-Fi calling on your home line if your carrier supports it.", "Alternatively, use WhatsApp or Signal over Openline data."]),
    ("Openline data doesn't work with a VPN", "Turning on VPN breaks data on Openline.",
     ["Some corporate VPN configurations conflict with certain APN routes — switch VPN protocol to WireGuard or IKEv2.", "Try a different VPN server closer to your country.", "Disable IPv6 in VPN settings if your VPN doesn't handle it."]),
    ("Openline shows \"Not Registered on Network\"", "The Openline line shows Not Registered on Network.",
     ["Turn Data Roaming on.", "Toggle airplane mode on/off.", "Manually select a partner network.", "Reinstall the eSIM if the error persists after a restart."]),
    ("QR code email didn't arrive", "You paid but received no email.",
     ["Wait 3–5 minutes; emails sometimes queue during high traffic.", "Check spam and promotions folders.", "Sign in at openline.com — the eSIM is visible in your account regardless.", "If still missing, email ask@openline.com with your order ID."]),
    ("APN reset needed on Android", "Data is stuck after network change; APN may be wrong.",
     ["Open Settings → Network & internet → SIMs → Openline → APN.", "Add a new APN named Openline with APN openline and type default,supl,dun.", "Save and select it.", "Reboot the phone."]),
    ("iPhone shows Openline as Primary but I don't want it to", "The Openline line was set as Primary by mistake and now iMessage/FaceTime are on it.",
     ["Settings → Cellular → Default Voice Line → set to your home line.", "Settings → Cellular → Cellular Data → set to Openline for data.", "Settings → Messages → iMessage → set your Apple ID phone number to the home line.", "You can also disable Openline's use for iMessage entirely."]),
    ("Wi-Fi calling breaks after enabling Openline", "Wi-Fi calling on the home line stops working.",
     ["Toggle Wi-Fi calling off and back on in Settings → Cellular → your home line.", "Restart the phone.", "Some carriers require re-registering Wi-Fi calling after any eSIM change; the toggle does that."]),
    ("iPad has no signal on Openline", "iPad shows Openline but no data.",
     ["Turn Data Roaming on.", "Check that Cellular Data is enabled globally.", "Restart the iPad.", "iPads sometimes need a manual network selection after arrival — do it in Settings → Cellular → Network Selection."]),
    ("Openline installed but line is Off in Settings", "The Openline line is off after install.",
     ["Just toggle it On in Settings → Cellular.", "Set Data Roaming on.", "Set as Cellular Data.", "Give it 60 seconds to register."]),
    ("Getting billed by home carrier despite Openline", "Home carrier still charged for roaming.",
     ["Ensure Cellular Data is set to Openline, not your home line.", "Turn Data Roaming OFF on the home line, ON on the Openline line.", "Confirm the roaming charge is not from calls/SMS on your home line — those still go through the home carrier if you use them."]),
    ("Openline works only outdoors", "Signal disappears indoors.",
     ["Local Tier-1 partner may have weak indoor coverage for that area.", "Manually select a different partner network in Settings.", "Move closer to a window or step outside briefly.", "If persistent, try the Openline mobile app's speedtest and share the result with support."]),
    ("Getting throttled to 128 kbps despite Unlimited plan", "Speed drops to 128 kbps or similar low rate.",
     ["Confirm the plan is still active in the app.", "128 kbps rate typically means data is exhausted on a metered plan — check the plan's data allowance.", "If plan is Unlimited, restart the phone and re-toggle Data Roaming.", "If still throttled, contact support — this could be a local partner fair-use issue we can escalate."]),
    ("Openline shows in Settings but not in Openline app", "The Openline app doesn't list the eSIM the phone shows.",
     ["Pull to refresh the Orders / My eSIMs screen.", "Sign out of the app and sign back in with the same email used at purchase.", "The eSIM will populate — no data is lost."]),
    ("Emergency calls only after installing Openline", "iPhone shows Emergency Calls Only on the Openline line.",
     ["Confirm you're in a country supported by Openline.", "Turn Data Roaming on.", "Toggle airplane mode on/off.", "Reinstall the eSIM from openline.com if the error persists after 5 minutes."]),
    ("Can't top up an Openline plan", "The Top up button isn't visible.",
     ["Top-up is available on most active plans until they expire.", "If the plan is already expired, buy a new one instead.", "If the plan is a subscription, top-up isn't needed — the next billing cycle refreshes the allowance.", "Contact support if the button is missing on an active, in-window plan."]),
    ("Card charged twice for the same eSIM", "You see two charges on your statement.",
     ["Sometimes an authorisation hold appears alongside the settled charge; the hold drops in 3–5 business days.", "If both charges settle, email billing@openline.com with both statement entries — we refund duplicates immediately."]),
    ("Openline account locked", "You're seeing Account temporarily locked.",
     ["Too many failed sign-ins triggers a 15-minute cooldown.", "Wait 15 minutes and retry with the correct password.", "Or use the magic-link sign-in instead — it bypasses the password.", "Reset your password if you're unsure."]),
    ("2FA code not arriving", "The 6-digit email OTP doesn't come.",
     ["Check spam/promotions.", "Wait a full minute — codes sometimes take 30–60 seconds during load spikes.", "Use a backup code from when you set up 2FA.", "If you have no backup codes, email ask@openline.com from the email on file for identity verification."]),
    ("Openline eSIM won't install because storage full", "iPhone says can't add eSIM, storage nearly full.",
     ["This is rarely a storage issue — it's usually the eSIM slot limit (iPhones cache 8 eSIMs).", "Delete an old, unused eSIM profile.", "Restart the iPhone.", "Retry the install."]),
    ("Old eSIM keeps auto-selecting instead of Openline", "The phone keeps switching to an old eSIM.",
     ["Turn the old eSIM's line off in Settings.", "Set Cellular Data explicitly to Openline.", "Disable Allow Cellular Data Switching on iPhone if enabled.", "If you don't need the old eSIM at all, remove it."]),
    ("Openline not appearing in Windows 11 eSIM sheet", "Windows can't find the Openline profile.",
     ["Settings → Network & Internet → Cellular → Manage eSIM profiles → Add profile.", "Choose Let me add a profile manually.", "Paste the SM-DP+ address and Activation Code from the Openline email.", "Save and turn the profile on."]),
    ("Openline installs but shows carrier name of partner instead of Openline", "The status bar shows a local carrier name, not Openline.",
     ["That's expected — your phone shows the partner network you're on (e.g. Vodafone, KDDI, Movistar).", "Openline uses partner networks; the Openline label is only the name of the eSIM profile in Settings.", "This means Openline is working correctly."]),
    ("Speeds okay but latency high", "Ping to nearby servers is 300 ms+.",
     ["Turn off any VPN and retest.", "Check that you're on 5G/LTE, not 3G.", "If latency is only high to specific services, it's likely a routing issue on that service, not Openline."]),
    ("Openline QR code says 'expired'", "The QR code fails with an Expired error.",
     ["This happens if the QR was regenerated. The old QR is invalidated.", "Sign in at openline.com → My eSIMs → open the plan → Show QR code — the current QR is always the newest.", "Rescan the fresh QR."]),
    ("Group data plan not showing per-user usage", "Business admin can't see who used what.",
     ["Per-user reporting is available on business plans — enable it in the admin dashboard under Settings → Data reporting.", "Individual usage rolls in with a 6-hour lag by default."]),
    ("Cannot delete an unused Openline eSIM profile", "The Remove eSIM button is greyed out.",
     ["This can happen if the phone is offline. Connect to Wi-Fi.", "Restart the phone.", "Try again from Settings → Cellular → the Openline line → Remove eSIM."]),
    ("Support chat doesn't load", "The Help chat window doesn't open.",
     ["Refresh the page.", "Disable content blockers or shields on that site.", "Try in a private/incognito window.", "Email ask@openline.com as a fallback."]),
    ("Random reboots after installing Openline", "Phone reboots more often since install.",
     ["Very rare and almost never eSIM-related — but if timing correlates, remove the Openline eSIM temporarily to test.", "Install the latest iOS/Android update.", "If it stops with Openline removed, contact support with device model and iOS/Android version for us to escalate to our RSP."]),
]

for title, ctx, steps in TROUBLES:
    steps_md = "\n".join(f"{i+1}. {s}" for i, s in enumerate(steps))
    add(
        "Troubleshooting",
        "Common issues",
        title,
        f"""
{ctx}

## Steps to try

{steps_md}

{CONTACT_BLOCK}
""",
        tags=["troubleshooting", "how-to"],
    )

# Per-device installation walkthroughs — 30 devices
DEVICES = [
    ("iPhone 16 Pro Max", "iphone"), ("iPhone 16 Pro", "iphone"), ("iPhone 16", "iphone"), ("iPhone 16 Plus", "iphone"),
    ("iPhone 15 Pro Max", "iphone"), ("iPhone 15 Pro", "iphone"), ("iPhone 15", "iphone"), ("iPhone 15 Plus", "iphone"),
    ("iPhone 14 Pro Max", "iphone"), ("iPhone 14", "iphone"), ("iPhone 13 Pro", "iphone"), ("iPhone 13", "iphone"),
    ("iPhone 12", "iphone"), ("iPhone 11", "iphone"), ("iPhone SE (2022)", "iphone"), ("iPhone XR", "iphone"),
    ("Google Pixel 9 Pro", "pixel"), ("Google Pixel 9", "pixel"), ("Google Pixel 8 Pro", "pixel"),
    ("Google Pixel 8", "pixel"), ("Google Pixel 7", "pixel"), ("Google Pixel 6", "pixel"),
    ("Samsung Galaxy S25 Ultra", "samsung"), ("Samsung Galaxy S25", "samsung"), ("Samsung Galaxy S24 Ultra", "samsung"),
    ("Samsung Galaxy S24", "samsung"), ("Samsung Galaxy S23", "samsung"), ("Samsung Galaxy Z Fold 6", "samsung"),
    ("Samsung Galaxy Z Flip 6", "samsung"), ("OnePlus 12", "oneplus"),
    ("Xiaomi 14", "xiaomi"), ("Motorola Razr 50 Ultra", "motorola"),
]

for device, brand in DEVICES:
    if brand == "iphone":
        body = f"""
Openline works fully on the **{device}**.

## Step-by-step install on {device}

1. On the {device}, connect to Wi-Fi.
2. Open the Openline confirmation email on a second screen (or on the {device} itself for one-tap install on iOS 17.4+).
3. Tap the **Install eSIM** button, or open Settings → Cellular → Add Cellular Plan → scan the QR from the email.
4. Follow the iOS prompts. Label the new line **Openline**.
5. Once installed:
   - **Cellular Data** → Openline
   - **Default Voice Line** → keep your home line
   - **Data Roaming** (on the Openline line) → ON
6. Land at your destination, turn airplane mode off, wait 30–60 seconds — you're online.

## Notes for {device}

- The {device} supports 5G on Openline where the partner network deploys it.
- Dual-eSIM is supported — your home eSIM (if you use one) can stay installed alongside Openline.
- Wi-Fi calling on the home line continues to work when Openline is active.
"""
    elif brand == "pixel":
        body = f"""
Openline installs cleanly on the **{device}**.

## Step-by-step install on {device}

1. Connect the {device} to Wi-Fi.
2. Open **Settings → Network & internet → SIMs**.
3. Tap **+ Add eSIM**.
4. Tap **Download a SIM instead?**.
5. Scan the QR code from your Openline email — or tap **Need help?** → **Enter it manually** and paste the activation code.
6. Confirm and label the SIM **Openline**.
7. Turn **Data roaming** on for the Openline SIM.
8. Set **Mobile data** to the Openline SIM.

## Notes for {device}

- Pixel devices refresh 5G bands well; Openline typically shows 5G in supported countries.
- Automatic APN configuration usually completes in under a minute.
- Restart the phone once after install to make sure the network shows up cleanly.
"""
    elif brand == "samsung":
        body = f"""
Openline works on the **{device}** with a straightforward setup.

## Step-by-step install on {device}

1. Connect to Wi-Fi.
2. Open **Settings → Connections → SIM manager**.
3. Tap **Add eSIM**.
4. Choose **Scan QR code from service provider** and scan the code from your Openline confirmation email.
5. If manual: paste the SM-DP+ Address and Activation Code from the same email.
6. Confirm and name the plan **Openline**.
7. Enable **Data roaming** on the Openline line.
8. Set **Mobile data** to Openline.

## Notes for {device}

- Samsung's Dual SIM management on One UI 6.1+ handles Openline plus a physical SIM or another eSIM without issue.
- Wi-Fi calling on the home line is preserved.
- Some regional Samsung variants sold in certain Asian markets have eSIM disabled — this doesn't apply to standard international {device} units.
"""
    else:
        body = f"""
Openline works on the **{device}** through the standard Android eSIM install flow.

## Step-by-step install on {device}

1. Connect to Wi-Fi.
2. Open **Settings** and search for **eSIM** or **SIM** — the exact path is:
   - {device.split()[0]}: SIM cards & mobile networks → Add eSIM.
3. Tap **Add** and scan the QR code from your Openline email, or paste the manual activation code.
4. Confirm and label the plan **Openline**.
5. Enable **Data roaming**.
6. Set **Mobile data** to Openline.

## Notes for {device}

- Restart once after install if the network doesn't register within 60 seconds.
- APN is set automatically; if data doesn't come up, add an APN named `openline` manually.
"""
    add("Devices & compatibility", device.split()[0], f"Install Openline on {device}", body,
        tags=["install", brand, device.lower().replace(' ', '-')])

# Data usage articles — ~25
DATA_TOPICS = [
    ("How much data does Google Maps use?", "Basic navigation with 2D maps uses roughly 5 MB per hour. Turn-by-turn navigation with live traffic is closer to 10–15 MB per hour. Offline maps (download at your hotel Wi-Fi before you leave) cut this to near zero."),
    ("How much data does WhatsApp use?", "Text and voice messages: negligible, well under 1 MB/hour of active use. Voice calls: ~500 KB per minute. Video calls: 5–8 MB per minute. Sharing photos: 200 KB–1 MB each depending on resolution."),
    ("How much data does Netflix use?", "SD streaming: about 1 GB per hour. HD: 3 GB per hour. Ultra HD/4K: 7 GB per hour. Set your app to 'Data saver' or 'Standard' while travelling."),
    ("How much data does YouTube use?", "480p: ~500 MB/hour. 720p HD: ~900 MB/hour. 1080p: 1.5 GB/hour. 4K: up to 7 GB/hour. Use YouTube's data-saver mode to cap at 480p."),
    ("How much data does Spotify use?", "Normal quality: 40 MB/hour. High quality: 70 MB/hour. Very High: 150 MB/hour. Download playlists on hotel Wi-Fi to avoid mobile data entirely."),
    ("How much data does Instagram use?", "Scrolling feed: ~500 MB/hour. Watching Reels: 1–2 GB/hour. Uploading photos: 5–10 MB each. Video uploads: dozens of MB."),
    ("How much data does TikTok use?", "About 800 MB to 1.5 GB per hour of scrolling — TikTok is one of the heaviest data-per-hour apps because everything is video."),
    ("How much data does Zoom / Google Meet use?", "One-to-one call: 500–800 MB/hour. Group call: up to 1.5 GB/hour on HD. Turn off HD video to halve the cost."),
    ("How much data do email and messaging use?", "Very little — a few MB per day at most for text-only email. Big attachments obviously cost more."),
    ("How much data does browsing use?", "Ballpark: 60–120 MB per hour of casual browsing. Data-heavy news sites with video ads can double that."),
    ("How much data does gaming use?", "Most mobile games use very little — under 100 MB/hour. Downloads and updates are the expensive part; do those on Wi-Fi."),
    ("How much data does Apple/Google Cloud sync use?", "Photo uploads can be gigabytes if you leave the sync on while travelling. Turn off cellular sync in the Photos and Files apps before leaving."),
    ("Should I turn off background app refresh while abroad?", "Yes — it's a low-effort way to save 100–500 MB a day."),
    ("How can I check my Openline data usage?", "Open the Openline app or sign in at openline.com — usage refreshes every ~15 minutes. iPhone Settings → Cellular also shows a rolling total per line but requires manual reset each month."),
    ("Does Wi-Fi count against my Openline plan?", "No. Only traffic that actually uses the Openline cellular line counts. Anything over Wi-Fi is free of your plan."),
    ("Does tethering count against my Openline plan?", "Yes — anything shared over hotspot/tethering counts as Openline data. There's no extra tethering charge, but the bytes still come out of your allowance."),
    ("Does data used by other apps count?", "Yes. All cellular traffic on the Openline line counts, regardless of the app."),
    ("How can I reduce data usage while travelling?", "Use offline maps. Cap video quality to 480p/SD. Turn off automatic photo backups on cellular. Disable background app refresh. Use Wi-Fi in cafes, hotels, and lounges."),
    ("Can I set a data alert on Openline?", "Yes. In the Openline app under a plan, tap **Set alert** and choose 50%, 75%, and/or 90% thresholds. We'll push a notification when you cross them."),
    ("What happens when I use up my data?", "Metered plans stop passing traffic once the allowance is used — you'll see a captive-portal style page inviting you to top up. Unlimited plans just keep going."),
    ("Can I top up mid-trip?", "Yes. In the Openline app tap **Top up** on the plan — you can add data, days, or both. Fresh QR code not needed; the same eSIM keeps working."),
    ("Do days count from purchase or from first use?", "Days count from the first time the eSIM connects to a supported network in a supported country. Not from purchase, not from installation."),
    ("What if I run out of data on the last day of my plan?", "You can either top up (same eSIM) or buy a new plan (new eSIM). The Openline app suggests the cheaper option in context."),
    ("Does data expire if I don't use it?", "Yes — unused data does not roll over past the plan's expiry date. Buy the right size for your trip and top up if needed."),
    ("Can I share my Openline plan with someone else?", "Not by transferring the eSIM (it's device-bound). But you can tether other devices from your phone — no charge, standard hotspot rules apply."),
]

for t, b in DATA_TOPICS:
    add("Data usage", "Consumption", t, b + "\n\n" + CONTACT_BLOCK, tags=["data", "usage"])

# Payments / billing detailed — 25 more
PAY_TOPICS = [
    ("Can I pay with Apple Pay?", "Yes. Choose Apple Pay at checkout on iPhone, iPad, or Mac (Safari). Payment is authorised with Face ID / Touch ID and the receipt is emailed and stored in your Openline account."),
    ("Can I pay with Google Pay?", "Yes. Choose Google Pay at checkout on Android or on the web. Standard Google Pay confirmation flow applies."),
    ("Can I pay with PayPal?", "Yes. Choose PayPal at checkout. You'll be redirected to log in and confirm. Your card or bank funds the transaction on the PayPal side."),
    ("Does Openline accept prepaid cards?", "Most Visa/Mastercard prepaid cards work. Some region-locked or single-currency prepaid cards may be declined by our processor. Use a wallet or crypto as an alternative."),
    ("Does Openline accept virtual / disposable cards?", "Yes — Revolut, Wise, Curve, Privacy.com and similar all work. Make sure the card is not marked 'donation only' or 'single-use consumed'."),
    ("Which crypto networks does Openline accept?", "Bitcoin (BTC main net), Ethereum (ETH mainnet), XRP (XRP Ledger), USDT (Ethereum, Tron TRC-20, Solana). More coins are added as demand grows."),
    ("How long do crypto payments take to confirm?", "BTC: usually 1–3 confirmations, 10–30 minutes. ETH: usually seconds to a few minutes. XRP: seconds. USDT: seconds on Tron/Solana, a few minutes on Ethereum."),
    ("Can I pay for Openline with USDC?", "Not yet — USDC support is on the roadmap. USDT is currently the stablecoin we support."),
    ("Can I pay for Openline with Lightning Network?", "Not yet. On-chain BTC only for now. Lightning is on the roadmap."),
    ("Are there any hidden fees on Openline plans?", "No. The price you see at checkout is the price you pay, tax-inclusive where required. There are no activation fees, no monthly fees on single-trip plans, and no cancellation fees."),
    ("Does the price change during checkout?", "Only if you change currency mid-checkout, which affects display. The plan's underlying price does not change between adding to cart and paying."),
    ("Can I use multiple discount codes?", "One discount code per order. If a code doesn't apply, the reason is usually that it's not compatible with the plan (some codes are country-specific or first-purchase only)."),
    ("Do you have a student discount?", "Not currently — but we do run periodic seasonal promotions and offer referral credit that stacks."),
    ("Do you have a military discount?", "Not currently a standing discount. Contact ask@openline.com for group deals if you're purchasing for a unit or organisation."),
    ("Do you charge in USD or in local currency?", "Prices display in your local currency where possible. The actual charge uses the currency your card/wallet issuer prefers. There's no Openline conversion fee."),
    ("Why did I see a small pending charge that disappeared?", "Some banks post a $0 or $1 authorisation to validate the card. It drops in 1–3 business days without affecting your balance."),
    ("Why was I charged in a different currency than I saw?", "Your card issuer may have converted at their FX rate. Check the receipt in your Openline account for the exact amount and currency."),
    ("Can I get a corporate / bulk quote?", "Yes — email business@openline.com with expected volume, plan types, and destinations."),
    ("Can I pay via bank transfer / SEPA?", "Yes for business accounts and large orders. Personal accounts pay by card, wallet, PayPal, or crypto."),
    ("Do you offer net-30 terms?", "Available to approved business accounts. Apply at openline.com/business."),
    ("Can I get a receipt without a name?", "Yes — receipts default to your account email. If you want a company name added, update Billing details before completing checkout."),
    ("Can I split payment between two methods?", "Not currently. Use a single payment method per order; you can spread orders across methods."),
    ("Is my payment info stored securely?", "We tokenise payments through PCI-DSS Level 1 processors. Openline systems never store your card number or CVV."),
    ("Can I remove a saved payment method?", "Yes — Account → Billing → Saved methods → Remove."),
    ("Why was my crypto payment underpaid?", "Network fees vary — send the exact invoice amount plus enough for network fees. If we detect underpayment, we credit your account for the amount received and message you to complete."),
]
for t, b in PAY_TOPICS:
    add("Payment & billing", "Details", t, b + "\n\n" + CONTACT_BLOCK, tags=["billing", "payments"])

# Getting-started detailed FAQs — 25 more
BASIC_FAQ = [
    ("What is an eSIM?", "An **eSIM** (embedded SIM) is a small chip built into your phone that can hold digital SIM profiles. Unlike a plastic SIM card you insert, an eSIM is provisioned by downloading a profile — usually by scanning a QR code."),
    ("Is an eSIM better than a physical SIM?", "For travel, yes. You can buy from anywhere, install in seconds, switch between plans, and keep multiple profiles on the same phone. For a permanent local line in your home country, physical SIMs still work fine — it's a matter of preference."),
    ("Can I use Openline as my primary line?", "Yes, technically, but Openline plans are travel-focused (7–30 day durations). You can buy successive plans to stay connected long-term, or use the monthly subscription. For a permanent home number, most people pair Openline with a home carrier."),
    ("Can I have multiple Openline plans at the same time?", "Yes, and it's a common pattern — e.g. a country plan plus a fallback global plan. Only one plan is the active data source at a time; you switch between them in Settings."),
    ("Do Openline eSIMs expire if unused?", "Unused eSIMs remain valid until first activation. Plans start counting only after the eSIM first connects at destination."),
    ("What is an ICCID?", "The **ICCID** is a 19–20 digit identifier for a specific SIM profile. It's how we identify your specific eSIM in support. You can find it on iPhone under Settings → General → About → scroll to the ICCID for that line."),
    ("What is an SM-DP+?", "**SM-DP+** (Subscription Manager - Data Preparation Plus) is the server that hosts your eSIM profile before you download it. The address is in your Openline confirmation email if you ever need manual install."),
    ("What is an activation code?", "A string that combines the SM-DP+ address and a matching profile code. Enter it in Add eSIM → Enter Manually if the QR won't scan."),
    ("What's the difference between an eSIM and an eUICC?", "**eUICC** is the underlying hardware standard (the chip itself). **eSIM** is the everyday name for a profile on that chip. Same concept, different levels of abstraction."),
    ("Can I keep my primary number while using Openline?", "Yes. Openline is a second line — your primary SIM stays inserted (or your primary eSIM stays installed) and receives calls/SMS/2FA as usual."),
    ("Will my primary number receive calls while I use Openline?", "Yes, if your home line still has signal. Turn off Data Roaming on the home line to avoid roaming charges; SMS and voice will still route via the home carrier's roaming partners."),
    ("What happens when I return home?", "Just switch **Cellular Data** back to your home line. The Openline line can stay dormant on the phone; delete it later if you want."),
    ("How many eSIMs can my phone hold?", "iPhones cache up to 8 eSIM profiles; only 2 can be actively enabled at once (dual-SIM). Most Android phones store 4–5 profiles with 2 active."),
    ("How do I switch between two eSIMs on iPhone?", "Settings → Cellular → tap the line → toggle Turn On This Line. Set Cellular Data to whichever line you want data on."),
    ("Do I need to remove my home SIM?", "No. Openline is a second line. Leave your home SIM in — that's what lets you keep your primary number reachable."),
    ("What countries can I install my Openline eSIM in?", "Anywhere. Installation is a one-time provisioning that only needs Wi-Fi. Activation (connecting to a supported network) is what requires being in a covered country."),
    ("Does Openline work for very short trips?", "Yes — country plans start at 1 day / 500 MB in some destinations. Perfect for airport layovers and one-day trips."),
    ("Does Openline work for long-term travel?", "Yes — 30-day plans in every country, plus monthly Unlimited subscriptions for digital nomads. Chain plans as long as you like."),
    ("Do I need to install anything on my phone?", "No app is required — the eSIM works natively. The Openline app is a convenience for managing plans, but not a requirement to use the service."),
    ("Do I need Wi-Fi to install the eSIM?", "Yes, or a mobile data connection on another line. The install process fetches the profile over the internet."),
    ("Do I need Wi-Fi to activate the eSIM?", "No — activation happens over cellular when you first connect to a supported partner network in a supported country."),
    ("Does Openline slow down my phone?", "No. An eSIM is a passive profile; it has no impact on phone performance."),
    ("Does Openline drain my battery faster?", "Marginally, if you have two lines actively scanning. To reduce impact, turn off the line you're not using while at home."),
    ("Does Openline work without opening any app?", "Yes. Once the eSIM is installed and the line is enabled, it just works — no app to launch."),
    ("Do I need to keep the Openline app installed?", "Only if you want in-app management (buy, top up, chat). Once the eSIM is on your phone, the service works whether the app is installed or not."),
]
for t, b in BASIC_FAQ:
    add("Getting started", "eSIM basics", t, b + "\n\n" + CONTACT_BLOCK, tags=["basics", "faq"])

# --- Privacy & Legal (25) ---
PRIVACY_TOPICS = [
    ("Where is my Openline account data stored?", "Openline stores personal account data in the EU (Frankfurt, Germany, and Amsterdam, Netherlands) under GDPR. Backups are encrypted at rest with AES-256 and geographically limited to EU regions."),
    ("Is Openline GDPR-compliant?", "Yes. Openline follows GDPR principles for data collected on EU residents — lawful basis, minimisation, right of access, right of erasure, portability, and objection. Requests: privacy@openline.com."),
    ("Is Openline CCPA-compliant?", "Yes. California residents can request access, deletion, and opt-out of any 'sale' of personal information — Openline does not sell personal data in any form. Requests: privacy@openline.com."),
    ("Does Openline share my data with advertisers?", "No. We don't sell customer data and we don't share it with third-party ad networks. Analytics we run are self-hosted and privacy-preserving."),
    ("Does Openline share my data with governments?", "Only when compelled by valid legal process in the jurisdiction we operate in, and we publish a transparency report annually. We do not proactively hand over data."),
    ("Can I download my personal data?", "Yes — Account → Privacy → Export my data. You receive a JSON archive with account details, orders, and support-conversation transcripts."),
    ("How long does Openline keep my data?", "Account data is kept while your account is active. Order and billing records are kept for the legally required retention period (typically 7 years for tax). Support conversations are kept 3 years."),
    ("How do I close my Openline account and erase my data?", "Account → Privacy → Delete account. Confirm; deletion is immediate and legally-required retention only applies to billing records anonymised of personal identifiers."),
    ("Can I use Openline anonymously?", "You can pay with cryptocurrency and use a burner email — that's about as anonymous as consumer telecom gets. We never require government ID for standard travel plans."),
    ("Does Openline log my browsing?", "No. We see byte counts per plan, not URLs, not DNS queries, not content. Anything we don't need to see, we don't see."),
    ("Does Openline see my IP address abroad?", "Your phone's public IP while on Openline is assigned by the local partner network. Openline sees your account IP when you sign in to the site or app, standard practice for any web service."),
    ("Are Openline receipts a personal-data risk?", "Receipts include your email and (optionally) billing name/address. You can update these anytime and re-issue past invoices at no cost."),
    ("Does Openline comply with LGPD (Brazil)?", "Yes. Brazilian residents can exercise LGPD rights via privacy@openline.com."),
    ("Does Openline comply with PDPA (Singapore)?", "Yes. Openline follows Singapore's Personal Data Protection Act for local residents."),
    ("Does Openline comply with the UK Data Protection Act?", "Yes. UK-GDPR and DPA 2018 obligations apply to UK residents and Openline honours them."),
    ("What legal jurisdiction is Openline based in?", "Openline LTD EOOD is incorporated in Bulgaria (EU) with operations across the EU. Consumer contracts default to EU consumer-protection rules; business contracts specify Bulgarian law."),
    ("Where can I read Openline's terms and conditions?", "At [openline.com/terms](https://openline.com/terms)."),
    ("Where can I read Openline's privacy policy?", "At [openline.com/privacy](https://openline.com/privacy)."),
    ("Where can I read Openline's acceptable use policy?", "At [openline.com/aup](https://openline.com/aup)."),
    ("Does Openline have a bug bounty?", "Yes. Responsible-disclosure guidelines and scope are at [security.openline.com](https://openline.com/security). Report to security@openline.com."),
    ("Is Openline SOC 2 audited?", "Openline is preparing for SOC 2 Type II. Current controls are documented in our trust center at [openline.com/trust](https://openline.com/trust)."),
    ("How does Openline handle law-enforcement requests?", "Requests are reviewed by counsel. We push back on overbroad or extraterritorial requests and notify users where legally permitted."),
    ("Does Openline use my data to train AI?", "No. We use anonymised, aggregated metrics (e.g. usage patterns) for capacity planning. We do not feed personal data into AI training pipelines."),
    ("Can I use Openline without an email address?", "No — an email is the minimum contact channel we require, so we can deliver your QR code and let you recover access. It doesn't need to be a real-name email."),
    ("Can I use Openline without location services on?", "Yes. Openline doesn't need Location Services on your phone. The country is determined by the partner network your phone connects to, not by GPS."),
]
for t, b in PRIVACY_TOPICS:
    add("Security & privacy", "Legal", t, b + "\n\n" + CONTACT_BLOCK, tags=["privacy", "legal"])

# --- Referrals detail (10) ---
REF_TOPICS = [
    ("How much credit do I earn per referral?", "Each qualified first-purchase referral gives you $3 in Openline credit and gives your friend a $3 discount on their first plan. Credit stacks with no cap; you can use it on any plan."),
    ("Where do I find my referral code?", "Account → Refer a friend → your code and share link are shown. You can share via WhatsApp, email, X, Instagram, or plain copy-paste."),
    ("When does referral credit appear in my account?", "Credit is added within 24 hours of your friend's first activated plan. Referral fraud checks run before crediting."),
    ("Can I refer myself with a second account?", "No — self-referrals (same device, same card, same address) are automatically disqualified. You'll see 'Referral pending review' if the system suspects it."),
    ("Does referral credit expire?", "Credit expires 12 months after issuance. You'll see the expiry date in Account → Credit balance."),
    ("Can I convert referral credit to cash?", "No — referral credit is spendable inside Openline only."),
    ("How do I use my referral credit at checkout?", "Tick 'Apply my credit balance' at checkout; the maximum applicable amount is filled automatically."),
    ("Is there a limit on how many friends I can refer?", "No cap — invite as many as you like. Anti-fraud will flag unusual patterns, so keep it real."),
    ("Can I share my referral code publicly (Reddit, YouTube)?", "Yes, unless it violates the platform's own rules. Content creators can apply for an affiliate program with higher commissions at partners@openline.com."),
    ("What counts as a 'qualified referral'?", "A new customer who signs up with your link, buys a plan, and activates it. Purchases without activation don't credit until activation lands."),
]
for t, b in REF_TOPICS:
    add("Referrals", "Details", t, b + "\n\n" + CONTACT_BLOCK, tags=["referral"])

# --- Business account details (15) ---
BUS_TOPICS = [
    ("How do I create an Openline business account?", "Go to [openline.com/business](https://openline.com/business), fill in the company details, and we'll issue an admin invite. Business accounts unlock the team dashboard, bulk buying, and consolidated invoicing."),
    ("Can I invite team members to my business account?", "Yes. Admins can invite users by email under Dashboard → Team → Invite. Users can be Admins, Buyers (can purchase for themselves), or Members (receive assigned plans only)."),
    ("Can I assign plans to specific team members?", "Yes — Dashboard → Plans → Assign. The assignee receives a personal QR code and installation instructions."),
    ("Can I revoke a plan from a team member?", "Yes. Dashboard → Plans → find the plan → Revoke. Only unused plans can be fully revoked; partially used ones can be refunded pro-rata."),
    ("Do you offer volume discounts?", "Yes. Automatic tiered discounts apply at 10, 50, 250, and 1000 plans per month. Bespoke pricing available above 1000 units — contact business@openline.com."),
    ("Can I get a single monthly invoice?", "Yes — enable Consolidated Billing under Dashboard → Billing. All orders in a month roll up into one invoice on the 1st of the following month."),
    ("Do you support SSO?", "Yes on our Growth and Enterprise tiers. SAML 2.0 and OIDC supported (Okta, Azure AD, Google Workspace, JumpCloud, others)."),
    ("Do you support SCIM provisioning?", "Yes on the Enterprise tier — SCIM 2.0 endpoints for automatic user provisioning and deprovisioning."),
    ("Do you offer a dedicated account manager?", "Enterprise tier includes a named account manager and a private Slack channel with the Openline team."),
    ("Do you have an SLA?", "Yes on Growth and Enterprise tiers: 99.9% uptime for the storefront, activation success rate targets, and support response-time commitments. Details at openline.com/business/sla."),
    ("Can I export team usage as CSV?", "Yes — Dashboard → Reports → Export CSV. Filters by date range, team, member, country, plan type."),
    ("Can I integrate Openline with our expense system?", "Yes — direct integrations with Expensify, Ramp, Brex, Pleo, Spendesk, and Bill.com. Others via CSV/API."),
    ("Is there a Slack integration?", "Yes — install the Openline Slack app so your team can request plans in-channel and admins approve inline."),
    ("Do you support net-60 or net-90 terms?", "Available for Enterprise customers on request, subject to credit review."),
    ("Can I white-label Openline for our customers?", "Yes through the Reseller API. You issue plans under your own brand while Openline handles infrastructure. Contact partners@openline.com."),
]
for t, b in BUS_TOPICS:
    add("Business & IoT", "Business account", t, b + "\n\n" + CONTACT_BLOCK, tags=["business", "b2b"])

# --- More per-country comparison / travel-tip pieces (30) ---
MORE_COUNTRIES = [
    ("Bali", "Indonesia"), ("Phuket", "Thailand"), ("Tokyo", "Japan"), ("Osaka", "Japan"),
    ("Kyoto", "Japan"), ("Seoul", "South Korea"), ("Hong Kong", "Hong Kong"),
    ("Bangkok", "Thailand"), ("Singapore", "Singapore"), ("Kuala Lumpur", "Malaysia"),
    ("Dubai", "United Arab Emirates"), ("Istanbul", "Turkey"), ("London", "United Kingdom"),
    ("Paris", "France"), ("Rome", "Italy"), ("Barcelona", "Spain"), ("Amsterdam", "Netherlands"),
    ("Berlin", "Germany"), ("Lisbon", "Portugal"), ("New York City", "United States"),
    ("Los Angeles", "United States"), ("San Francisco", "United States"), ("Miami", "United States"),
    ("Toronto", "Canada"), ("Vancouver", "Canada"), ("Mexico City", "Mexico"),
    ("Cancún", "Mexico"), ("Buenos Aires", "Argentina"), ("Rio de Janeiro", "Brazil"),
    ("Cape Town", "South Africa"), ("Marrakech", "Morocco"), ("Sydney", "Australia"),
    ("Melbourne", "Australia"), ("Auckland", "New Zealand"), ("Reykjavik", "Iceland"),
]
for city, country in MORE_COUNTRIES:
    add(
        "Coverage by country",
        country,
        f"Using Openline in {city}",
        f"""
{city} is one of the most travelled destinations in {country}, and Openline coverage there is excellent. You'll ride the strongest of the local Tier-1 partners depending on where you are in the city.

## What to expect in {city}

- **Speed:** typically 100–300 Mbps download on 5G, 20–100 Mbps on 4G/LTE in most neighbourhoods.
- **Coverage:** dense across all central districts. Suburbs and hills covered by 4G/LTE.
- **Latency:** low enough for video calls and gaming.

## Best plan for a trip to {city}

- **Short weekend (1–3 days):** country plan, 3 GB / 7 days.
- **Standard visit (4–10 days):** country plan, 10 GB / 15 days, or Unlimited / 7 days.
- **Long stay or remote work (2+ weeks):** country plan Unlimited / 30 days, or the {country} regional plan if you're combining it with nearby countries.

## Local tips

- Hotel Wi-Fi in {city} is usually good, so a 10 GB plan is enough for many travellers.
- Public transit apps and rideshare are data-hungry — install offline maps in advance.
- Metro tunnels can drop signal; the phone reconnects quickly on exit.
""",
        tags=["coverage", "city", city.lower().replace(' ', '-')],
    )

# --- Openline vs specific competitor articles (15) ---
COMPETITORS = [
    ("Airalo", "one of the largest travel eSIM marketplaces"),
    ("Holafly", "a Spanish-founded travel eSIM known for country-only unlimited plans"),
    ("Saily", "a NordVPN-owned travel eSIM launched in 2024"),
    ("Nomad", "a Singapore-based travel eSIM with strong Asia coverage"),
    ("Ubigi", "a Transatel/NTT-owned eSIM widely used on connected devices"),
    ("GigSky", "an early travel eSIM often bundled with Apple devices"),
    ("Truphone", "a business-focused eSIM operator now part of Monogoto"),
    ("Jetpac", "a Singapore-based travel eSIM with a lounge-access bundle"),
    ("Roamify", "a travel eSIM aggregator"),
    ("aloSIM", "a North-America-oriented travel eSIM aggregator"),
    ("Instabridge", "a travel eSIM originally built on top of a public Wi-Fi app"),
    ("MobiMatter", "a UK-based eSIM marketplace"),
    ("Yesim", "a Switzerland-based travel eSIM"),
    ("BNESIM", "an established international eSIM and calling provider"),
    ("Firsty", "a free-tier travel eSIM with paid upgrades"),
]
for comp, blurb in COMPETITORS:
    add(
        "Getting started",
        "Openline vs competitors",
        f"Openline vs {comp}",
        f"""
**{comp}** is {blurb}. Both {comp} and Openline are travel eSIMs — the practical experience of buying and installing a plan is similar. Where Openline stands apart:

## Where Openline wins

- **Multi-Tier-1 network switching.** In each country Openline routes you across 3–5 Tier-1 partners, not a single one. That difference is measurable in dead zones — you keep signal where competitors drop.
- **Truly unmetered Unlimited.** No Openline-side throttle on Unlimited plans. Some competitors advertise 'unlimited' but throttle to 512 kbps after a daily cap.
- **Crypto natively.** BTC, ETH, XRP, USDT with no third-party workaround.
- **No ID.** For standard travel plans, Openline never asks for a passport or ID.
- **Sharpest pricing.** Openline shops Tier-1 wholesale continuously and passes savings to the storefront within days.

## Where {comp} may fit better

- If your workflow is already built around the {comp} app and account, switching costs are real.
- {comp} may have a promotion active for a specific destination — spot-check both storefronts.

## Migration

Switching from {comp} to Openline is free — no contracts, no lock-in. Buy an Openline plan, install alongside your existing eSIM, switch Cellular Data over. Delete the old profile when your {comp} plan expires or reinstall it later.
""",
        tags=["comparison", comp.lower()],
    )

# --- Advanced connectivity FAQ (15) ---
ADV_TOPICS = [
    ("Does Openline support IPv6?", "Yes on partners that offer dual-stack. Your Openline connection will get an IPv6 address wherever the local partner supports it, alongside IPv4."),
    ("Does Openline give me a public IP?", "You typically get a carrier-grade NAT IPv4 address, plus a public IPv6 address where supported. This is standard for mobile networks — not specific to Openline."),
    ("Can I run a server on my Openline connection?", "Inbound server traffic is not practical on carrier-grade NAT. Openline is designed for client-side data (browsing, apps, calls). Use a tunnel (Cloudflare, Tailscale, WireGuard) if you need inbound reachability."),
    ("Does Openline support Wi-Fi calling?", "Wi-Fi calling is a home-carrier feature, not an Openline feature. You keep using your home carrier's Wi-Fi calling on your primary line while Openline handles data."),
    ("Does Openline support VoLTE?", "Openline plans are data-only. VoLTE is a voice-over-LTE codec used by carriers for voice minutes — not relevant to data-only plans."),
    ("Can I use Openline for BitTorrent?", "Technically yes on Unlimited plans; large sustained P2P uploads can trigger local partner traffic-shaping in some countries. Not what mobile networks are optimised for."),
    ("Can I use Openline for online gaming?", "Yes. Latency in urban centres is typically low enough for real-time gaming. Some cloud gaming services may hit congestion in rush hour — same as any local SIM."),
    ("Does Openline block any ports or protocols?", "No. Openline does not filter or block traffic. If you can't reach a specific service, it's not us — check the destination's own status and any VPN or DNS you have configured."),
    ("Can I use my own DNS on Openline?", "Yes. Openline uses the partner network's DNS by default; override in your device settings if you prefer 1.1.1.1, 9.9.9.9, or a private DNS-over-HTTPS resolver."),
    ("Does Openline support DoH / DoT?", "DNS-over-HTTPS and DNS-over-TLS are configured at the device level — Openline transports the traffic without interference."),
    ("Does Openline support MMS?", "Openline plans are data-only, no MMS. Send photos over WhatsApp, iMessage, or Signal instead."),
    ("Does Openline support RCS?", "RCS is tied to your home mobile number's carrier — not Openline. Your home line continues to handle RCS."),
    ("Can I make emergency calls on Openline?", "Every phone can make emergency calls even without an active plan, as long as any cellular signal is available. Openline is data-only and not intended for voice — for local emergency numbers, use your home line's roaming or any nearby phone."),
    ("Does Openline support Wi-Fi hotspot bridging (5G modem)?", "Yes for consumer hotspots that accept eSIM (Solis, TP-Link M7350 5G, GlocalMe, Netgear Nighthawk M6). Install the Openline QR from the modem's admin UI."),
    ("Does Openline work on rooted or jailbroken devices?", "Yes, the eSIM standard doesn't care. Rooted/jailbroken devices sometimes have modified network stacks; if data doesn't come up, revert or use a different device."),
]
for t, b in ADV_TOPICS:
    add("Technical", "Advanced", t, b + "\n\n" + CONTACT_BLOCK, tags=["technical", "advanced"])

# --- Extra troubleshooting for parity with competitor KBs (30) ---
EXTRA_TROUBLES = [
    ("Openline eSIM shows Invalid SIM after install",
     ["This is usually a mis-scanned QR. Sign in at openline.com, tap Reinstall, and rescan the new QR.",
      "Connect to Wi-Fi first.",
      "Restart the phone once install completes."]),
    ("Openline eSIM works only when Wi-Fi is off",
     ["Some phones don't switch to cellular when connected to a poor Wi-Fi network.",
      "Forget the poor Wi-Fi network, or turn Wi-Fi off temporarily.",
      "Enable Wi-Fi Assist (iPhone) or Adaptive connectivity (Android)."]),
    ("Openline installed but line greyed out on iPhone",
     ["Settings → Cellular → tap the line → Turn On This Line.",
      "If the toggle is greyed, restart the iPhone.",
      "If it persists after restart, remove the eSIM and reinstall it from openline.com."]),
    ("iOS asks 'Cellular Plan Ready to Be Installed' repeatedly",
     ["This message appears once after install and should not repeat.",
      "Tap Continue and finish the setup wizard.",
      "If it repeats after every restart, remove and reinstall the eSIM."]),
    ("Openline eSIM shows correct partner but no data on Android",
     ["Set Openline as Mobile data line.",
      "Turn Data roaming on.",
      "Verify APN is set to openline.",
      "Reboot the phone."]),
    ("Airplane mode toggle doesn't fix Openline",
     ["Try a full power-off and power-on cycle instead of airplane mode.",
      "Manually select a partner network in Settings → Cellular → Network Selection.",
      "If nothing helps, reinstall the eSIM."]),
    ("Openline eSIM registers only 2G",
     ["Some remote areas have only 2G coverage. Move toward a town centre if possible.",
      "In Cellular Data Options, allow 4G and 5G.",
      "Manually select a different partner network."]),
    ("Openline stops working when travelling between two countries in the same plan",
     ["Regional plans support border-crossing; single-country plans do not.",
      "Confirm the plan covers both countries in the app.",
      "Toggle airplane mode after crossing to force a fresh network selection."]),
    ("Openline app can't connect on a corporate Wi-Fi",
     ["Some corporate Wi-Fi blocks non-approved apps at the DNS or firewall layer.",
      "Try mobile data or a personal hotspot to sign in.",
      "Once signed in on the app, the eSIM install still works over corporate Wi-Fi."]),
    ("Push notifications from Openline app not arriving",
     ["Enable notifications in your phone's Settings for Openline.",
      "Open the app once to refresh the push token.",
      "If your phone has Do Not Disturb / Focus mode on, add Openline to the allow list."]),
    ("Openline eSIM QR looks blurry when downloaded",
     ["Open the QR image at full size on the second device before scanning.",
      "Try downloading in the app instead of the email attachment.",
      "If both fail, use the manual activation code."]),
    ("Data connection drops in the metro/subway",
     ["Underground stations often have partial or no cellular coverage.",
      "The phone will reconnect on exit; wait 10–20 seconds.",
      "If Wi-Fi is available on the platform, use it while underground."]),
    ("Openline eSIM shows Emergency Only after country switch",
     ["Toggle airplane mode after the new country is confirmed.",
      "Manually select a Tier-1 partner in the new country.",
      "If the plan only covers the previous country, buy a new plan for the new one."]),
    ("iPhone iMessage stuck 'Waiting for activation' after adding Openline",
     ["Ensure your primary line's phone number is toggled on for iMessage in Settings → Messages.",
      "Toggle iMessage off, wait 30 seconds, toggle back on.",
      "Confirm Send & Receive settings include your Apple ID email as fallback."]),
    ("Android VoWiFi drops when Openline installed",
     ["Turn Wi-Fi calling on the home line off and on again.",
      "Set the home line as Preferred SIM for Calls.",
      "On some Samsung firmware, ensure the home line is the Default SIM for calls."]),
    ("Openline profile keeps deleting itself",
     ["iOS caches up to 8 eSIMs; older ones may be pruned automatically.",
      "Remove a truly unused profile to free the slot.",
      "If Openline is the one being removed, contact support with the ICCID — we'll investigate as an OEM firmware bug."]),
    ("Signal drops overnight and never comes back",
     ["Some phones enter deep sleep and take a moment to reattach in the morning.",
      "Toggle airplane mode to force a fresh scan.",
      "If it persists day after day, try a different partner network manually."]),
    ("Openline shows plan expiring before I've used it",
     ["Days count from first activation, not purchase. Confirm the plan is 'In use' or 'Ready to use'.",
      "If the app shows the plan already started before you arrived, contact support — we investigate mis-activations and re-issue if verified."]),
    ("Data works but WhatsApp voice calls drop",
     ["WhatsApp calls are sensitive to jitter; test on Wi-Fi to compare.",
      "Try a different Openline partner network manually.",
      "If it happens across networks, share a network diagnostics screenshot with support."]),
    ("Openline data works in city A but not city B in the same country",
     ["Partner-network coverage varies by region. Force network selection to a different partner.",
      "Confirm you're inside the country's borders — the phone can attach to a neighbouring country's network from close proximity.",
      "Restart the phone."]),
    ("Payment succeeded but no eSIM appeared in app",
     ["Pull to refresh in the Orders tab.",
      "Sign out and back in.",
      "Check the email address used at checkout — sometimes buyers use a typo. Support can move an order between emails on request."]),
    ("Openline crashes on launch",
     ["Update the app to the latest version.",
      "Restart the phone.",
      "Reinstall the app — your account and eSIMs are on the server, nothing is lost."]),
    ("Wrong destination selected at checkout",
     ["If the plan is not yet activated, contact support within 24 hours — we swap the destination and re-issue the eSIM.",
      "Activated plans cannot be swapped after use."]),
    ("Received the wrong QR code (someone else's plan)",
     ["Extremely rare. Do not install it. Contact support immediately with the order ID.",
      "We invalidate the mis-issued profile and re-issue the correct one."]),
    ("Getting 'Cellular plan install error' in the middle of install",
     ["Interrupted profile transfer. Reinstall from openline.com over a stable Wi-Fi.",
      "Ensure at least 5% battery and no low-power mode during install."]),
    ("Only some websites load on Openline",
     ["Test with airplane-mode-toggle first.",
      "Test the same sites on Wi-Fi to see if it's site-specific.",
      "Change DNS on your device to 1.1.1.1 or 8.8.8.8 and retest.",
      "Turn any VPN or content-blocker off temporarily."]),
    ("Openline eSIM installed on wrong phone (roommate/family)",
     ["Each eSIM install is one-shot. If the wrong phone has it, sign in at openline.com, tap Reinstall on that plan, and scan the fresh QR on the right phone.",
      "The old profile becomes invalid automatically."]),
    ("App shows a plan I didn't buy",
     ["Sign out and sign in — verify the account email matches.",
      "If it still shows, someone else may have your credentials. Change your password and enable 2FA immediately.",
      "Contact security@openline.com."]),
    ("Openline app doesn't load QR code image",
     ["Check your device's internet connection.",
      "Force-close and reopen the app.",
      "Use the web version at openline.com instead."]),
    ("Openline eSIM removed after factory reset",
     ["Factory reset erases installed eSIM profiles. Sign in at openline.com, tap Reinstall on the plan, scan the fresh QR.",
      "If the plan is already expired, install still works but the plan won't produce data."]),
]
for title, steps in EXTRA_TROUBLES:
    steps_md = "\n".join(f"{i+1}. {s}" for i, s in enumerate(steps))
    add("Troubleshooting", "Advanced", title, f"""
## Steps to try

{steps_md}

{CONTACT_BLOCK}
""", tags=["troubleshooting"])

# --- Special use cases (10) ---
SPECIAL = [
    ("Using Openline as a backup for work travel",
     "Keep an Openline plan ready as your emergency backup on international trips. If the venue Wi-Fi collapses during a keynote or a client call, one tap in Settings and you're on cellular. The plan doesn't burn days until you actually activate it."),
    ("Using Openline for eSIM-only iPhones in the US",
     "US iPhone 14 and later have no physical SIM. Openline installs as a second eSIM alongside your home line so you keep your primary number and add local data anywhere you land."),
    ("Using Openline for a family trip",
     "Buy one plan per phone, or one plan per family and share via a hotspot. For long trips, the regional Unlimited plan is often the most predictable choice."),
    ("Using Openline for connected cameras and dashcams",
     "For consumer devices without an app store (Owl, Insta360, Blackvue with eSIM adapters), use the device's own eSIM install flow with the QR code from your Openline order."),
    ("Using Openline for a Steam Deck or gaming handheld",
     "Steam Deck and most gaming handhelds are Wi-Fi only. Use your phone's Openline hotspot to share connectivity. Cloud-gaming services work if your local partner has strong signal."),
    ("Using Openline for translation devices",
     "Pocketalk, Vasco, Timekettle, and similar translation devices with eSIM support install a QR the same way any phone does. Best paired with a country or regional plan matching your trip."),
    ("Using Openline for smart-camera trail cams",
     "For M2M/IoT cameras, use the Openline Connect IoT product line — it has long-life plans and volume pricing better suited to trail cams."),
    ("Using Openline while on a long-haul train",
     "Trains going through mountains and tunnels drop signal like any local SIM. Openline reconnects automatically on exit. Some rail Wi-Fi is decent — use it in tunnels."),
    ("Using Openline for pilgrimage travel (Hajj / Umrah)",
     "Openline covers Saudi Arabia through STC, Mobily, and Zain. Buy a country plan sized for your intended trip; Unlimited plans are ideal for group travellers who share hotspot access."),
    ("Using Openline while embedded with a remote workation",
     "Monthly Unlimited or a 30-day regional Unlimited plan removes the daily hassle. Combine with a good coworking Wi-Fi to spare the plan for outings and video calls on the go."),
]
for t, b in SPECIAL:
    add("Special use cases", "Scenarios", t, b + "\n\n" + CONTACT_BLOCK, tags=["special"])

# --- Terms & policy short answers (10) ---
TERMS = [
    ("What is Openline's acceptable use policy?",
     "You agree not to use Openline for illegal activity, spam, high-volume automated abuse, or content that violates local law. Full policy: openline.com/aup."),
    ("Can I resell Openline plans?",
     "Only through the official Reseller API. Reselling profiles obtained from consumer purchases violates the terms and will result in account suspension."),
    ("Can I transfer my Openline plan to another person?",
     "Not directly — plans are tied to your account. You can gift a plan by buying it under someone else's email; the recipient becomes the account holder."),
    ("Can Openline suspend my account?",
     "Yes, for terms violations (fraud, abuse, illegal use). We notify you first except in cases of active security incidents."),
    ("Does Openline arbitrate disputes?",
     "Business terms specify arbitration; consumer terms follow EU consumer-law dispute paths. Details in the terms of service."),
    ("How do I file a formal complaint?",
     "Email complaints@openline.com with your order ID and a clear description; we respond within 5 business days with next steps."),
    ("Does Openline follow the EU Digital Services Act (DSA)?",
     "Yes. We publish a transparency report annually and offer a designated point of contact for authorities."),
    ("Does Openline follow the Digital Markets Act?",
     "Openline isn't a gatekeeper platform under the DMA, but we're actively aligned with its openness principles — hence our open-source and public-API investments."),
    ("Where does Openline post service status?",
     "At [status.openline.com](https://status.openline.com). Historical incidents, planned maintenance, and current uptime metrics."),
    ("Does Openline offer service credits for outages?",
     "Yes on Growth and Enterprise business tiers per the SLA. Consumer plans get a pro-rata refund on request for downtime attributable to Openline."),
]
for t, b in TERMS:
    add("Legal & policy", "Terms", t, b + "\n\n" + CONTACT_BLOCK, tags=["legal", "policy"])

# --- Openline product & brand FAQ (10) ---
BRAND = [
    ("What does Openline mean?",
     "Openline stands for connectivity that stays open — open standards, open networks, and an open line to the people we serve. It's also a nod to the idea of an always-on data line without the closed-box constraints of traditional roaming."),
    ("Who owns Openline?",
     "Openline is founder-led and operated by Openline LTD EOOD (Bulgaria/EU). The company is self-funded to date, preparing for its first external investment round."),
    ("Where is Openline headquartered?",
     "Legally in Sofia, Bulgaria (EU). Operationally distributed across the EU and beyond, with the founder based in Lisbon, Portugal."),
    ("When was Openline founded?",
     "Openline was founded in 2024 after 3+ years of market research, with public launch in 2026."),
    ("Is Openline part of another company?",
     "No. Openline is independent — not owned by a VPN company, an ISP, or a legacy carrier."),
    ("How can I invest in Openline?",
     "We're in our first external fundraising cycle. Institutional investors: invest@openline.com. Friends and family: paul@openline.com (subject to jurisdiction rules)."),
    ("How can I join Openline (jobs)?",
     "See [openline.com/careers](https://openline.com/careers) or email hiring@openline.com with what you'd contribute. We hire selectively — quality over quantity."),
    ("How can I partner with Openline?",
     "Business partnerships: partners@openline.com. Media/press: press@openline.com. Integrations and APIs: dev@openline.com."),
    ("Does Openline have a public roadmap?",
     "Yes, at [openline.com/roadmap](https://openline.com/roadmap). Milestones, in-flight work, and RFCs. Community feedback shapes priorities."),
    ("Is Openline open source?",
     "Selectively. Our brand assets, connectivity standard proposals, and reference clients are open source at [github.com/openline](https://github.com/openline). Core commercial services stay proprietary."),
]
for t, b in BRAND:
    add("Company & brand", "About", t, b + "\n\n" + CONTACT_BLOCK, tags=["brand", "company"])

print(f"Article count: {len(ARTICLES)}")

# Save to JSON for the website
import os
out_path = Path(__file__).parent / "articles.json"
out_path.write_text(json.dumps(ARTICLES, ensure_ascii=False, indent=2))
print(f"Wrote {out_path}")

# Also list categories
from collections import Counter
cats = Counter((a['category'], a['subcategory']) for a in ARTICLES)
print("Categories:")
for (c, s), n in sorted(cats.items()):
    print(f"  {c} / {s}: {n}")

