// Generate deep activation-troubleshooting articles + rewrite shallow ones.
// Merges into articles.json in place. Idempotent by slug.
import fs from 'node:fs';

const DB = './articles.json';
const articles = JSON.parse(fs.readFileSync(DB, 'utf8'));
const bySlug = new Map(articles.map(a => [a.slug, a]));

const CONTACT = `\n\n## Still stuck?\n\nReach us 24/7 via live chat inside the Openline app or at [openline.com](https://openline.com), or email **ask@openline.com**. Include your order ID and, if possible, the ICCID of your Openline eSIM — that lets us diagnose without back-and-forth.\n`;

const REDEEM = `Every Openline plan is delivered as a **purchase code** (format \`OL-4F7X-9K2Q-A3M8\`). You can redeem it in three ways: (1) inside the Openline app, (2) signed into your account at [openline.com](https://openline.com), or (3) anonymously at [openline.com/start](https://openline.com/start) with just the code — no account needed.`;

function slugify(s) {
  return s.toLowerCase().replace(/['"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
}

function nextId() {
  return Math.max(...articles.map(a => a.id)) + 1;
}

function upsert(title, category, subcategory, tags, body) {
  const slug = slugify(title);
  const existing = bySlug.get(slug);
  const article = {
    id: existing?.id ?? nextId(),
    slug,
    category,
    subcategory,
    title,
    tags,
    body: body + CONTACT,
  };
  if (existing) {
    const i = articles.findIndex(a => a.slug === slug);
    articles[i] = article;
  } else {
    articles.push(article);
    bySlug.set(slug, article);
  }
  return article;
}

// ============================================================
// 1. REWRITE SHALLOW EXISTING ARTICLES
// ============================================================

upsert(
  'How do I activate my Openline eSIM once I land?',
  'Getting started', 'Activation',
  ['activation', 'iphone', 'android', 'first-use', 'arrival'],
  `Activation happens automatically the first time your Openline line finds a partner network — usually within 30–90 seconds of turning airplane mode off in a supported country. Here's the full sequence:

## The 5-second setup

1. Turn **airplane mode off**.
2. Open **Settings → Cellular** (iPhone) or **Settings → Network & internet → SIMs** (Android).
3. Confirm the **Openline** line is **turned on**.
4. Enable **Data Roaming** on the Openline line.
5. Set **Cellular Data** to Openline for the country you're in.

Within 30–90 seconds your phone registers on a local Tier-1 carrier and you'll see signal bars next to the Openline label. Open a browser to confirm data works.

## If nothing happens after 3 minutes

- Toggle **airplane mode on for 30 seconds**, then off. This forces a fresh network scan.
- Confirm you're **in a supported country** for the plan you bought (check your plan in the Openline app).
- Confirm **Data Roaming** is on for the Openline line — travel eSIMs require it even inside their intended country.
- If you have another SIM in the phone, make sure the Openline eSIM is set as the **Cellular Data** line — not just enabled.

## If the line shows "No Service" or "Not Registered"

Go to **Settings → Cellular → Openline → Network Selection**, toggle **Automatic** off, wait 30 seconds for the carrier list, and pick one manually. Try each partner in turn if the first doesn't hold.

## If the line was never installed

If you don't see an Openline line at all, the profile wasn't installed. Reinstall it: sign in at [openline.com](https://openline.com) → **My Codes** → **Reinstall**, or use the purchase code with any of the three redemption channels (app / web account / anonymous at openline.com/start). ${REDEEM}`
);

upsert(
  'Do I need Wi-Fi to activate the eSIM?',
  'Getting started', 'Activation',
  ['activation', 'wifi', 'install', 'network'],
  `**Install vs activate — these are two different things and only one needs Wi-Fi.**

## Installation (needs internet)

Adding the Openline profile to your phone is a one-time download from Openline's SM-DP+ server. This step **needs an internet connection** — Wi-Fi is preferred, but a working mobile data connection on another line works too.

## Activation (works over cellular)

Activation is the network handshake that happens when your phone first finds a partner carrier. This happens **over cellular** the moment you land, no Wi-Fi needed. Turn airplane mode off, wait 30–90 seconds, and you're online.

## When Wi-Fi during install is a problem

Not all Wi-Fi networks are equal for eSIM installation. Some **actively block the SM-DP+ handshake** required to download the profile. Common offenders:

- **Hotel Wi-Fi with captive portals** (the "please log in" page). Traffic can be intercepted or filtered.
- **Airport Wi-Fi** — same captive-portal issue, plus aggressive port filtering.
- **Corporate Wi-Fi** — enterprise firewalls block non-approved provisioning traffic to protect their MDM stack.
- **Coffee-shop/public Wi-Fi** in some countries, especially where carriers lobby against unlicensed eSIM providers.
- **VPN connections** — many VPNs route SM-DP+ traffic through servers the carrier rejects.

If the install stalls, **switch to your home broadband, a personal hotspot, or an Airbnb host's private Wi-Fi**. Most install failures we see are just this — a hostile Wi-Fi network.

## The safest path

Install your Openline eSIM **before you leave home** on your own broadband. It won't consume any data until you activate it abroad, but the profile is safely on the device. ${REDEEM}`
);

upsert(
  'Do I need Wi-Fi to install the eSIM?',
  'Installation', 'General',
  ['install', 'wifi', 'network', 'sm-dp'],
  `Yes — installing the profile pulls it from Openline's SM-DP+ server, which requires an internet connection. Wi-Fi is preferred, but **any working data connection** works: another mobile line, tethered hotspot, or a friend's device.

## Which Wi-Fi networks to avoid during install

Some Wi-Fi networks **actively block the SM-DP+ traffic** an eSIM needs to install. If your install fails, this is the most common cause — not your phone, not the code.

**Networks that frequently break eSIM installs:**

- Hotel and Airbnb Wi-Fi with captive portals ("log in with your room number")
- Airport Wi-Fi (captive portals + heavy port filtering)
- Corporate / office Wi-Fi (enterprise firewalls block provisioning traffic)
- Public Wi-Fi in coffee shops, libraries, malls — hit or miss
- Guest Wi-Fi on carrier-owned networks (some incumbent telcos intentionally block competitor eSIMs — this is a growing pattern in 2025–2026)
- Any Wi-Fi behind an active VPN

**Networks that reliably work:**

- Your home broadband (best option)
- A trusted friend's or family's home Wi-Fi
- A personal hotspot from an already-working SIM (yours or a friend's)
- Airbnb Wi-Fi that has no login page

## What to do if install fails on hotel/public Wi-Fi

1. **Complete the captive-portal login first** (open Safari, hit any HTTP site, log in). Only then retry the install.
2. Turn off any **active VPN**.
3. Try tethering from another phone's mobile data instead.
4. If the profile got half-installed and shows "Activating…" forever, delete it and reinstall — signed into your account at [openline.com](https://openline.com), go to **My Codes → Reinstall**.

${REDEEM}`
);

upsert(
  'eSIM stuck on "Activating"',
  'Troubleshooting', 'Common issues',
  ['activation', 'stuck', 'activating', 'error'],
  `The Openline line shows **"Activating"** indefinitely after installation. The profile is on the device but the network handshake hasn't completed. Here's how to unstick it, in order of speed.

## Fast fixes (try in order)

1. **Wait 3–5 minutes.** Some networks take longer. Especially true on hotel/airport Wi-Fi.
2. **Toggle airplane mode** on for 30 seconds, then off.
3. **Restart the phone** completely.
4. **Move off captive-portal Wi-Fi.** Hotel, airport, coffee shop, and corporate Wi-Fi frequently block the SM-DP+ handshake. Switch to home broadband, a personal hotspot from another phone, or mobile data on your primary line.
5. **Turn off any active VPN.** VPNs are the #2 cause of stuck activation after captive-portal Wi-Fi.
6. **Turn off Low Data Mode** on the Wi-Fi network (iPhone: Settings → Wi-Fi → tap network → Low Data Mode = off).

## If it's still stuck

7. Sign in at [openline.com](https://openline.com) → **My Codes** → **Reinstall** on the stuck plan. The reinstall issues a fresh install token from the same underlying purchase code — no extra charge.
8. On the phone, **delete the stuck line first**: Settings → Cellular → tap the Openline line → **Delete eSIM**. Then scan the new QR or tap the one-tap install link.
9. Try the install on a **completely different Wi-Fi network** — different building if possible.

## If reinstall also stalls

10. Reset network settings (iPhone: Settings → General → Transfer or Reset iPhone → Reset → Reset Network Settings). You'll lose saved Wi-Fi passwords but eSIM profiles survive.
11. Check for a **carrier settings update**: Settings → General → About. If a prompt appears, install it.

## Why it happens

The eSIM install has two phases: (1) profile download from Openline's SM-DP+ server, and (2) network attach with your carrier abroad. "Activating" limbo means phase 1 completed but the phone can't finish phase 2. Almost always it's a network-path issue — the phone is trying to reach an activation endpoint that's blocked by the current Wi-Fi's firewall or a VPN.

${REDEEM}`
);

upsert(
  'Openline app can\'t connect on a corporate Wi-Fi',
  'Troubleshooting', 'Common issues',
  ['corporate', 'wifi', 'firewall', 'app', 'enterprise'],
  `Corporate and office Wi-Fi often blocks non-approved apps at the DNS, firewall, or proxy layer. This is a corporate IT policy — not an Openline problem — but here's how to work around it.

## Fastest fix

**Switch to mobile data** or a personal hotspot to sign in and buy your plan. Once signed in and installed, the eSIM itself works over any network including corporate Wi-Fi.

## If you need it to work on corporate Wi-Fi

- Ask IT to whitelist **openline.com**, **api.openline.com**, and the SM-DP+ hostname you'll see during install (starts with **rsp.**).
- Some corporate networks require you to install a **root certificate** before HTTPS works — check with IT.
- A **Zero Trust / SASE proxy** (Zscaler, Netskope, Cato) usually needs an explicit allow rule for eSIM provisioning traffic.
- If your company allows split-tunnel VPN, **exclude Openline traffic from the VPN** entirely.

## After you install

Once the eSIM is installed and activated, the Openline app is optional. You can manage everything from [openline.com](https://openline.com) in any browser — including on your corporate laptop.

${REDEEM}`
);

console.log('Rewrites: 5 articles');

// ============================================================
// 2. NEW ARTICLES — deep taxonomy
// ============================================================

const newArticles = [];

// ---- Category A: Network-block symptoms & fixes (natural-language) ----
newArticles.push(
  ['I can\'t activate my Openline plan — what should I do?', 'Troubleshooting', 'Common issues',
    ['activation', 'help', 'troubleshooting', 'cant-activate'],
    `Activation failures come in three flavors. Match the symptom below to jump to the fix.

## 1. The eSIM was never installed

You don't see an "Openline" line at all in **Settings → Cellular** (iPhone) or **Settings → Network & internet → SIMs** (Android). The install step failed silently — usually because the Wi-Fi network you used blocks the SM-DP+ handshake required to download eSIM profiles.

**Fix:** Switch to a friendly Wi-Fi (home broadband, personal hotspot, or Airbnb private Wi-Fi — **not** hotel, airport, corporate, or public Wi-Fi), then reinstall. Sign in at [openline.com](https://openline.com) → **My Codes** → **Reinstall**, or redeem the purchase code fresh via the app or [openline.com/start](https://openline.com/start).

## 2. The line is installed but stuck on "Activating"

The profile is on the phone but the network handshake hangs. See [eSIM stuck on "Activating"](/?a=esim-stuck-on-activating).

**Quick fix:** toggle airplane mode 30 seconds, turn off any VPN, and move off captive-portal Wi-Fi.

## 3. The line is active but shows "No Service" or "Not Registered"

The eSIM installed and activated but can't hold a signal.

**Fix:** Go to **Settings → Cellular → Openline → Network Selection** → toggle **Automatic** off → pick a carrier manually from the list. Confirm **Data Roaming is ON** for the Openline line.

## The public-Wi-Fi trap (the most common cause)

Many hotel, airport, coffee-shop, and corporate Wi-Fi networks **actively block eSIM activation traffic**. This is often because the venue's carrier partner lobbies against competing travel eSIMs. If you're on any such network:

- Complete the captive-portal login **first** (open Safari, hit any site, log in), then retry.
- If it still fails, **switch to a personal hotspot from another phone** — the eSIM install works fine over tethered mobile data.
- Home Wi-Fi, Airbnb/hotel-room private Wi-Fi without a portal, and family/friend broadband are usually reliable.

${REDEEM}`],

  ['Why does my hotel Wi-Fi block my Openline eSIM install?', 'Troubleshooting', 'Common issues',
    ['hotel', 'wifi', 'blocked', 'captive-portal', 'sm-dp'],
    `It's frustrating but common. Hotel Wi-Fi frequently blocks eSIM profile downloads for three reasons:

## 1. Captive portals intercept HTTPS traffic

The "welcome, please log in" page you see is a **captive portal**. Until you complete the login, the network hijacks all outbound traffic — including the SM-DP+ handshake your phone needs to download an eSIM profile. Even after you log in, some captive portals continue to filter traffic on non-standard ports.

**Fix:** Open Safari, load any website (not the captive portal), and complete the full login flow. Only then retry the eSIM install.

## 2. Aggressive port and protocol filtering

Hotel networks throttle or block anything that looks like "non-web" traffic to keep bandwidth for browsing. eSIM provisioning uses HTTPS on port 443, but some traffic-shaping appliances flag it as suspicious and reset the connection.

**Fix:** No user-side fix. Switch networks.

## 3. Carrier-partnership blocking

Some hotels partner with a local telco that also sells travel SIMs at the front desk. That telco has a commercial incentive to make sure competing eSIMs (Openline, Airalo, Holafly, etc.) fail to install on their venue Wi-Fi. This is increasingly common in 2025–2026, especially in Europe and Southeast Asia.

**Fix:** Tether from another phone with mobile data, or install before you check in.

## The rule of thumb

**Install your Openline eSIM at home before you travel.** The profile sits dormant on your phone and won't cost you anything until you activate it abroad. This eliminates the hotel-Wi-Fi failure mode entirely.

${REDEEM}`],

  ['Why does my airport Wi-Fi block my Openline eSIM install?', 'Troubleshooting', 'Common issues',
    ['airport', 'wifi', 'blocked', 'captive-portal', 'travel'],
    `Airport Wi-Fi is one of the worst environments for eSIM installation. Here's why and what to do.

## The three problems

1. **Captive portals** — you must log in through a browser page before any real traffic passes. Many travelers try to install the eSIM before completing this step.
2. **Time-limited access** — free tiers often expire in 30–60 minutes, exactly when your install is still finishing.
3. **Deep packet inspection** — airports contract network security appliances that flag "unusual" HTTPS traffic like SM-DP+ handshakes as potentially malicious.

## What to do at the airport

- **Open Safari or Chrome first**, load any site (like example.com), and complete the captive-portal login fully.
- **Skip the free "video ad to unlock 60 min" flow** — it often puts you on a filtered subnet.
- If your install fails, **tether from a friend's phone** or use your own primary mobile data if it still has coverage.
- If neither is available, **wait until you reach your hotel or Airbnb** — most private Wi-Fi is friendlier.

## The prevention

Install your Openline eSIM **before you leave home** on your own broadband. The profile sits dormant and activates automatically when you land. This is the single most reliable install path.

${REDEEM}`],

  ['My office / corporate Wi-Fi blocks my Openline eSIM install', 'Troubleshooting', 'Common issues',
    ['office', 'corporate', 'wifi', 'firewall', 'enterprise'],
    `Enterprise networks routinely block eSIM provisioning traffic as part of their security posture. This isn't an Openline problem — it's a corporate IT policy.

## Why corporate Wi-Fi blocks eSIM installs

- **MDM protection** — IT teams block third-party eSIMs so employees can't move company traffic off the corporate network.
- **Zero Trust proxies** (Zscaler, Netskope, Cato) inspect all HTTPS and often reject SM-DP+ handshakes that don't match a known whitelist.
- **Split-tunnel VPN** rules that force all traffic through the corporate gateway.

## Workarounds

1. **Use mobile data** on your existing primary line to install (fastest, always works).
2. **Tether from your personal phone** if the work phone can't disable enterprise Wi-Fi.
3. **Install at home tonight** on your own broadband — the eSIM will sit dormant until you activate it later.
4. Ask IT to whitelist **openline.com**, **api.openline.com**, and **rsp.openline.com** (the SM-DP+ host).

## After install: the app still won't sign in on corporate Wi-Fi

That's a separate issue — see [Openline app can't connect on a corporate Wi-Fi](/?a=openline-app-can-t-connect-on-a-corporate-wi-fi). Once the eSIM is installed, you can manage everything from a browser at [openline.com](https://openline.com), which usually works on corporate Wi-Fi even when the native app doesn't.

${REDEEM}`],

  ['Public Wi-Fi (coffee shops, libraries, malls) — will my eSIM install work?', 'Troubleshooting', 'Common issues',
    ['public-wifi', 'coffee-shop', 'library', 'install', 'reliability'],
    `**Sometimes.** Public Wi-Fi is a mixed bag — install success rates vary from ~40% to ~90% depending on the venue and country.

## What works reliably

- Small independent cafés with no captive portal
- Libraries in most Western Europe, US, Canada, Japan
- Chain coffee shops in Nordic countries and Germany

## What often fails

- Any Wi-Fi with a captive portal ("agree to terms" or "log in with email")
- Free mall Wi-Fi
- Fast-food chain Wi-Fi (McDonald's, Starbucks) in some countries — highly variable
- Any Wi-Fi in countries where the incumbent carrier lobbies against travel eSIMs (parts of France, Turkey, South America)

## If it fails

- Try the venue's Wi-Fi **after completing any captive-portal login** in your browser.
- Turn off any active VPN.
- Move closer to the access point.
- Tether from another phone as fallback.

## Best practice

Install at home. The profile sits on your phone and won't consume data or the plan window until you activate abroad.

${REDEEM}`],

  ['Does a VPN break my Openline eSIM install?', 'Troubleshooting', 'Common issues',
    ['vpn', 'install', 'blocked', 'proxy', 'wireguard'],
    `**Yes, often.** Most consumer and enterprise VPNs interfere with the SM-DP+ handshake used to download eSIM profiles.

## Why VPNs cause install failures

1. Your phone's SM-DP+ traffic gets routed through the VPN's exit server, which may be in a country the eSIM provisioning system doesn't expect.
2. VPN providers use aggressive DNS override that breaks the specific hostnames the eSIM handshake requires.
3. Some corporate VPNs actively filter provisioning traffic as a security policy.

## What to do

**Turn the VPN off before installing.** iPhone: Settings → VPN → toggle off. Android: Settings → Network & internet → VPN → disconnect.

Once the eSIM is installed and activated, you can turn the VPN back on — it doesn't affect the running cellular connection.

## VPNs that don't cause problems

Rare, but WireGuard-based split-tunnel setups where you exclude Openline hostnames from the tunnel usually work. This is only worth configuring if you never turn your VPN off.

${REDEEM}`],
);

// ---- Category B: Error messages ----
const errorMessages = [
  ['"Could not add cellular plan" — what does it mean?',
   `iPhone shows this when the SM-DP+ download completes but the phone can't finalize the profile. Usually caused by:

- **Unstable Wi-Fi** during download — retry on a stronger connection.
- **Captive portal** intercepting traffic — complete the portal login first.
- **VPN active** — turn it off and retry.
- **Profile already installed** on another device (each purchase code is single-install; use Reinstall from openline.com to get a fresh install token).

**Fix:** Delete the partial line if one appears (Settings → Cellular → tap line → Delete eSIM), switch to a clean Wi-Fi, then reinstall.`],

  ['"Unable to complete cellular plan change" — iPhone error',
   `Appears mid-install when the profile download is interrupted. Common causes:

- Wi-Fi dropped during the handshake.
- Airplane mode toggled during install.
- The install QR was scanned twice on different devices (single-install codes).

**Fix:** Restart the phone, connect to reliable Wi-Fi, and reinstall via [openline.com](https://openline.com) → **My Codes** → **Reinstall**.`],

  ['"Cellular plan not available" — iPhone error',
   `iPhone shows this when the SM-DP+ server can't be reached, usually because the current Wi-Fi network blocks provisioning traffic.

**Fix:** Switch away from hotel/airport/corporate Wi-Fi. Home broadband or a personal hotspot almost always resolves it.`],

  ['"Activation Failed" — iPhone error after install',
   `The profile installed but the network handshake with your travel carrier failed.

**Fix:** Toggle airplane mode 30 seconds, confirm Data Roaming is ON for the Openline line, and try manual network selection (Settings → Cellular → Openline → Network Selection → Automatic OFF → pick a carrier).`],

  ['"Invalid SIM" or "No SIM" on iPhone after installing Openline',
   `Usually a stale carrier settings bundle. Two things to try:

1. **Check for carrier update:** Settings → General → About → wait 10 seconds for the prompt. If one appears, install it.
2. **Reset network settings:** Settings → General → Transfer or Reset iPhone → Reset → Reset Network Settings. eSIM profiles survive this reset.`],

  ['"No Service" on the Openline line after activation',
   `The eSIM is installed and enabled but shows no signal.

**Fix in order:**

1. Confirm **Data Roaming is ON** for the Openline line (this is the #1 cause).
2. Toggle airplane mode 30 seconds.
3. Manual network selection: Settings → Cellular → Openline → Network Selection → Automatic OFF → pick a carrier.
4. If nothing on the list works, you may be **outside the plan's covered area** — check your plan's country list in the Openline app.`],

  ['"SIM Not Provisioned" error on Android after Openline install',
   `Android's equivalent of "No Service" but with a bad label. The eSIM profile is on the device but the carrier hasn't fully activated the line yet.

**Fix:** Wait 5 minutes, restart the phone. If still stuck, delete and reinstall the profile.`],

  ['"eSIM cannot be added at this time. Try again later." — Samsung / Pixel',
   `Android's SM-DP+ download failed. Almost always a Wi-Fi issue.

**Fix:** Switch to a different Wi-Fi (avoid captive-portal networks), turn off VPN, and retry.`],

  ['"MM#2" or "MM#6" error code on iPhone',
   `Modem manager errors — the carrier network rejected the eSIM registration.

**Fix:** Reset network settings and toggle airplane mode. If the error persists, contact Openline support with the exact error code and your ICCID.`],

  ['"PLMN not allowed" error — what to do',
   `The Public Land Mobile Network isn't authorized for your Openline profile in this country.

**Fix:** Confirm your plan covers this country. If it does, use manual network selection to pick a different carrier from the list.`],

  ['"Unable to activate cellular data network" — persistent iPhone error',
   `APN configuration mismatch or expired network selection.

**Fix:** Settings → Cellular → Openline → Cellular Data Network → **Reset Settings**. If that button is missing, restart the phone.`],

  ['"Could not add eSIM" on iPhone during install',
   `The SM-DP+ handshake was cut off before completion.

**Fix:** Delete any partial line, switch to a strong Wi-Fi network (not hotel/airport/corporate), turn off VPN, and try again. If your purchase code was consumed, use **Reinstall** from openline.com to get a fresh install token.`],

  ['"Cellular plan is not compatible with this device" — iPhone error',
   `Rare. Usually means the eSIM was intended for a different carrier profile format.

**Fix:** Contact Openline support with your ICCID and device model — we'll re-issue the profile with the correct format.`],

  ['"Waiting for activation" on iPhone — how long is normal?',
   `**30–90 seconds is normal.** More than 5 minutes means something is blocking activation.

**Fix in order:**

1. Toggle airplane mode.
2. Move off captive-portal Wi-Fi.
3. Turn off VPN.
4. Delete the line and reinstall.`],

  ['"Trying to activate cellular plan" on iPhone stuck loop',
   `The activation retry loop can spin forever on hostile networks.

**Fix:** Force restart the phone (iPhone: press Volume Up, Volume Down, hold Side button until Apple logo). If still stuck, delete the eSIM and reinstall on a clean network.`],
];

for (const [title, body] of errorMessages) {
  newArticles.push([title, 'Troubleshooting', 'Installation errors',
    ['error', 'install', 'activation'], body]);
}

// ---- Category C: iOS version quirks ----
const iosVersions = [
  ['iOS 17', 'eSIM Quick Transfer works from any older iPhone. If activation stalls, check the carrier settings update prompt under Settings → General → About.'],
  ['iOS 18', 'iOS 18 introduced tighter Wi-Fi assist during eSIM install. If your install stalls on a weak Wi-Fi, Apple no longer auto-falls-back to cellular. Move to stronger Wi-Fi.'],
  ['iOS 18.1', 'Bug in early 18.1 releases caused some eSIMs to disappear after reboot. Update to 18.2 or later.'],
  ['iOS 18.2', 'Fixed the eSIM-disappearance bug in 18.1. Recommended baseline for reliable eSIM operation.'],
  ['iOS 18.4', 'Introduced improved dual-eSIM switching. If your Openline line was auto-disabled after the update, re-enable it under Settings → Cellular.'],
  ['iOS 19', 'Major eSIM stack rewrite. Some users report that older eSIMs need to be deleted and reinstalled after upgrading. Openline supports this via Reinstall from openline.com.'],
  ['iOS 19.1', 'Fixed captive-portal detection bug that was blocking eSIM installs on hotel Wi-Fi. Update recommended before travel.'],
];

for (const [ver, note] of iosVersions) {
  newArticles.push([`Openline eSIM on ${ver} — known issues and tips`, 'Devices & compatibility', 'iOS version quirks',
    ['ios', ver.toLowerCase().replace(/\s/g,'-'), 'compatibility'],
    `## Summary\n\n${note}\n\n## If activation fails on ${ver}\n\n1. Confirm you're on the latest ${ver} point release.\n2. Check for carrier settings updates: Settings → General → About.\n3. Delete and reinstall the eSIM via [openline.com](https://openline.com) → **My Codes** → **Reinstall**.\n4. If the reinstall also fails, reset network settings.`]);
}

// ---- Category D: Android version + OEM quirks ----
const androidCases = [
  ['Samsung Galaxy S23', 'One UI 6.1 improved eSIM handling. If install fails, disable Adaptive Battery temporarily.'],
  ['Samsung Galaxy S24', 'Full eSIM support out of the box. Ultra models support up to 2 active eSIMs simultaneously.'],
  ['Samsung Galaxy S25', 'Latest eSIM stack, most reliable Samsung so far. Install works on nearly any Wi-Fi.'],
  ['Samsung Galaxy Z Fold 5', 'eSIM install works on both the cover and inner screen. Data Roaming toggle is under Settings → Connections → SIM Manager.'],
  ['Samsung Galaxy Z Flip 5', 'Standard eSIM support. Install via the QR code — no special steps.'],
  ['Google Pixel 8', 'Android 14 baseline. Install is straightforward. If stuck, disable Wi-Fi Assistant temporarily.'],
  ['Google Pixel 9', 'Android 15 with improved eSIM Transfer. Older Pixel eSIMs migrate automatically during setup.'],
  ['Google Pixel 9 Pro', 'Same eSIM behavior as Pixel 9. Reliable partner for Openline.'],
  ['Xiaomi 14', 'HyperOS eSIM support. Some regional variants (China ROM) do not support eSIM at all — check before travel.'],
  ['Xiaomi 15', 'Global variants support eSIM. China variants do not.'],
  ['OnePlus 12', 'Full eSIM support. Install via Settings → Wi-Fi & Network → SIM & Network → Add eSIM.'],
  ['OnePlus 13', 'Same as OnePlus 12. If activation stalls, try tethering from another phone.'],
  ['Motorola Edge 50', 'eSIM supported on global variants. US-carrier-locked models may reject third-party eSIMs.'],
  ['Nothing Phone (2)', 'eSIM supported. If the install QR scanner has trouble reading, use the manual SM-DP+ address method — Openline provides both.'],
  ['Nothing Phone (3)', 'Same as Phone (2). Reliable eSIM behavior.'],
  ['Sony Xperia 1 VI', 'eSIM supported on global unlocked variants. Some carrier variants may not.'],
  ['Honor Magic 6', 'eSIM supported on global variants (Magic 6 Pro global). China variants don\'t support eSIM.'],
  ['Vivo X100', 'Global variants (India, Southeast Asia) support eSIM. China variants don\'t.'],
  ['Oppo Find X7', 'Global variants support eSIM. China variants don\'t.'],
];

for (const [phone, note] of androidCases) {
  const cat = phone.split(' ')[0];
  const catMap = {Samsung:'Samsung',Google:'Pixel',Xiaomi:'Xiaomi',OnePlus:'Oneplus',Motorola:'Motorola',Nothing:'Nothing',Sony:'Sony',Honor:'Honor',Vivo:'Vivo',Oppo:'Oppo'};
  newArticles.push([`Openline eSIM on ${phone} — install and activation`, 'Devices & compatibility', catMap[cat] || cat,
    ['android', cat.toLowerCase(), 'install', 'activation'],
    `## ${phone} + Openline\n\n${note}\n\n## Install steps\n\n1. Sign in at [openline.com](https://openline.com), buy your plan, get your purchase code.\n2. On the phone: **Settings → Network & internet → SIMs → Add eSIM**.\n3. Scan the QR from your Openline dashboard, or tap the one-tap install link on this phone.\n4. Once installed, enable **Data Roaming** on the Openline line.\n\n## If install fails\n\n- Switch off any active VPN.\n- Move to home Wi-Fi or a personal hotspot (avoid hotel/airport/corporate Wi-Fi).\n- If stuck, delete and reinstall via **My Codes → Reinstall** at openline.com.`]);
}

// ---- Category E: Dual-SIM scenarios ----
const dualSimCases = [
  ['I have Openline and my home SIM — how do I choose which uses cellular data?',
   'iPhone: Settings → Cellular → Cellular Data → tap the line you want for data. Android: Settings → Network & internet → SIMs → Mobile data → tap the line. Set Openline as data when abroad, your home SIM when home.'],
  ['Can I keep my home number active while using Openline for data abroad?',
   'Yes — this is the most common dual-SIM setup. Keep your home SIM enabled for calls and SMS (2FA, family), and set Openline as the Cellular Data line. You still pay your home carrier for the line but pay Openline rates for data.'],
  ['My iPhone auto-switched from Openline back to my home SIM — how do I stop it?',
   'iPhone has "Allow Cellular Data Switching" which auto-fails-over to your other line during weak signal. Turn it OFF: Settings → Cellular → Cellular Data → toggle "Allow Cellular Data Switching" off. This prevents surprise roaming charges on your home line.'],
  ['Can I use two Openline plans on the same phone?',
   'Not simultaneously as separate lines — one Openline eSIM at a time. But you can install a second Openline plan as a separate eSIM if your phone supports multiple eSIMs (iPhone 13 and later, most modern Android).'],
  ['I installed Openline but it deactivated my other eSIM',
   'iPhone limits total active eSIMs to varying counts by model (usually 2 active). Adding a new one may prompt you to deactivate an existing one. Just re-enable it under Settings → Cellular.'],
  ['Openline vs my primary carrier — which do calls come through?',
   'Openline is data-only in most plans. Voice calls and SMS route through your primary carrier line. Set your primary as the default voice line: Settings → Cellular → Default Voice Line → your primary.'],
  ['I don\'t receive SMS 2FA codes when Openline is active',
   'SMS routes through your primary voice line, not Openline. Confirm the primary line has signal and is enabled. If you turned your primary off entirely, re-enable it under Settings → Cellular.'],
  ['Should I turn off my home SIM while using Openline abroad?',
   'Only if you\'re worried about accidental roaming charges. Modern iPhones with "Allow Cellular Data Switching" OFF are safe to leave both lines active. Turning off the home SIM means missing 2FA texts.'],
  ['My iPhone shows both eSIMs but Openline has no data',
   'Confirm Openline is set as the Cellular Data line (not just enabled). Settings → Cellular → Cellular Data → Openline.'],
  ['Android dual-eSIM: how do I switch between Openline and my other data plan?',
   'Settings → Network & internet → SIMs → tap the line you want → toggle "Use SIM" or "Mobile data" on/off. On Samsung: Settings → Connections → SIM Manager.'],
];

for (const [title, body] of dualSimCases) {
  newArticles.push([title, 'Devices & compatibility', 'Home-carrier interactions',
    ['dual-sim', 'esim', 'setup'], body]);
}

// ---- Category F: Country-specific activation gotchas ----
const countryGotchas = [
  ['USA', ['Verizon-locked iPhones may reject third-party eSIMs — confirm your phone is unlocked before travel', 'US carriers Verizon/AT&T/T-Mobile all have partner agreements with Openline; all three networks work depending on location', 'Rural US may only have T-Mobile — expect weaker coverage']],
  ['Canada', ['Rogers, Bell, and Telus are all partners; coverage is strong nationwide', 'North of 60° latitude, expect intermittent service — this is a partner-network limit, not Openline']],
  ['UK', ['EE, Vodafone UK, and Three are Openline partners', 'London Underground has no cellular on most Tube lines — Wi-Fi at stations only']],
  ['France', ['Orange and SFR are partners', 'Some French hotel Wi-Fi actively blocks eSIM installs — install before travel or tether from another phone']],
  ['Germany', ['Telekom, Vodafone DE, and O2 are partners', 'Rural Bavaria and eastern Germany have coverage gaps — 4G may be spotty']],
  ['Spain', ['Movistar, Orange, and Vodafone Spain are partners', 'Beach resort areas in July-August get network congestion — expect slower speeds']],
  ['Italy', ['TIM and Vodafone Italy are partners', 'Some Italian hotels have very hostile Wi-Fi — install before you go']],
  ['Portugal', ['MEO, NOS, and Vodafone Portugal are partners', 'Rural Alentejo and Serra da Estrela have coverage gaps']],
  ['Japan', ['SoftBank and NTT Docomo are partners', 'Japanese phones (SIM-locked domestic models) don\'t always support foreign eSIM profiles — check before travel', 'Rural mountain areas have Docomo-only coverage; SoftBank thinner']],
  ['South Korea', ['SK Telecom and KT are partners', 'Older Korean phones don\'t support eSIM — this is a Korean market quirk, not Openline']],
  ['China', ['Openline works in mainland China via partner roaming but data is subject to the Great Firewall', 'A VPN pre-installed on your device before travel is essential for accessing Google, Meta, etc.', 'Xiaomi/Vivo/Oppo China ROM phones don\'t support eSIM at all']],
  ['Hong Kong', ['Three HK, CSL, and SmarTone are partners', 'Full uncensored internet; VPN not needed']],
  ['Singapore', ['Singtel, StarHub, and M1 are partners', 'Excellent coverage; one of the most reliable Openline destinations']],
  ['Thailand', ['AIS, DTAC, and TrueMove are partners', 'Some tourist areas have Wi-Fi that blocks eSIM installs — install before you go']],
  ['Vietnam', ['Viettel and Vinaphone are partners', 'Government occasionally throttles international services; keep a VPN ready']],
  ['UAE', ['Etisalat and du are partners', 'Some VoIP services (WhatsApp calls, FaceTime audio) are throttled by government policy — this is not an Openline limit']],
  ['Turkey', ['Turkcell and Vodafone TR are partners', 'Some hotels partner with local telcos and block competing eSIMs on venue Wi-Fi — install before check-in']],
  ['Mexico', ['Telcel and Movistar are partners', 'Rural coverage is Telcel-only; other partners thinner']],
  ['Brazil', ['Vivo and Claro Brazil are partners', 'Amazon rainforest regions have coverage gaps']],
  ['Argentina', ['Personal and Movistar Argentina are partners', 'Coverage is dense in cities, spotty in Patagonia']],
  ['India', ['Airtel and Jio are partners', 'Indian regulations require KYC for local SIMs — Openline bypasses this via its international roaming path, no KYC needed']],
  ['Indonesia', ['Telkomsel and XL are partners', 'Island-hopping across the archipelago may cause reregistration delays']],
  ['Philippines', ['Globe and Smart are partners', 'Rural islands have limited coverage']],
  ['Malaysia', ['Maxis and Celcom are partners', 'East Malaysia (Borneo) coverage is thinner than the peninsula']],
  ['Australia', ['Telstra, Optus, and Vodafone AU are partners', 'Outback coverage is Telstra-only — the others cover cities and major highways']],
  ['New Zealand', ['Spark and One NZ are partners', 'South Island rural coverage is Spark-dominant']],
  ['Egypt', ['Vodafone Egypt and Orange Egypt are partners', 'Some tourist areas throttle VoIP services']],
  ['South Africa', ['Vodacom and MTN are partners', 'Rural areas outside major highways have coverage gaps']],
  ['Kenya', ['Safaricom is the main partner', 'Excellent Nairobi coverage; rural spotty']],
  ['Morocco', ['Maroc Telecom and Orange Morocco are partners', 'Sahara desert has essentially no coverage']],
  ['Israel', ['Cellcom, Pelephone, and Partner are partners', 'Excellent nationwide coverage']],
  ['Saudi Arabia', ['STC and Mobily are partners', 'Some VoIP throttled by government policy']],
  ['Greece', ['Cosmote and Vodafone Greece are partners', 'Island coverage varies — mainland is reliable, remote islands may only have one partner network']],
];

for (const [country, tips] of countryGotchas) {
  const body = `## Activating Openline in ${country}\n\n${tips.map(t=>`- ${t}`).join('\n')}\n\n## Standard activation flow\n\n1. Land, turn airplane mode off.\n2. Confirm Openline line is on with Data Roaming enabled.\n3. Wait 30–90 seconds for automatic registration.\n4. If nothing after 3 minutes, manually select a partner network: Settings → Cellular → Openline → Network Selection → Automatic OFF → pick a partner from the list above.\n\n## If activation fails in ${country}\n\n- Confirm your plan covers ${country} (check the Openline app).\n- Try a different partner network from the manual selection list.\n- Toggle airplane mode.\n- If nothing works, the venue Wi-Fi may be blocking your session — move location.`;
  newArticles.push([`Activating Openline in ${country} — country-specific tips`, 'Coverage by country', country,
    ['country', country.toLowerCase(), 'activation'], body]);
}

// ---- Category G: Carrier lock issues ----
const carrierLock = [
  ['Is my iPhone unlocked? How to check before buying Openline',
   `Openline eSIMs require an **unlocked** phone. Check first:

## On iPhone

Settings → General → About → scroll to **Carrier Lock**.

- **"No SIM restrictions"** = you're unlocked, Openline will work.
- Anything else = you're locked to a specific carrier and Openline won't install until you unlock.

## How to unlock

Contact your current carrier and request a **network unlock**. This is free in most countries and typically takes 1–3 business days. In the US, T-Mobile, AT&T, and Verizon all offer it for phones that have completed their contract or are fully paid off.

## After unlock

Restart the phone. The Carrier Lock field should update to "No SIM restrictions" within a few minutes.`],

  ['Is my Android phone unlocked? How to check',
   `On Android:

- **Samsung:** Settings → About phone → Status information → **Network** or **SIM status**.
- **Pixel:** Settings → About phone → SIM status.
- **Universal test:** Insert a SIM from a different carrier and see if it connects.

If unlocked, Openline will install fine. If locked, contact your carrier for a network unlock code.`],

  ['My phone is carrier-locked — will Openline work?',
   `**No.** Carrier-locked phones reject all third-party eSIMs. This is a phone-side lock, not something Openline can override.

**Fix:** Contact your carrier and request a network unlock. It's typically free once your contract ends or the phone is paid off.

**Refund policy:** If you bought an Openline plan and discovered your phone is locked, contact us at [ask@openline.com](mailto:ask@openline.com) with your order ID — we'll refund unredeemed purchase codes in full.`],
];

for (const [title, body] of carrierLock) {
  newArticles.push([title, 'Devices & compatibility', 'Compatibility basics',
    ['unlock', 'carrier-lock', 'compatibility'], body]);
}

// ---- Category H: APN, DNS, network stack ----
const networkStack = [
  ['Do I need to set an APN for Openline?',
   `**No.** Openline eSIMs configure the APN automatically. Do not manually enter an APN — leaving it blank is correct.

If you already typed one in and things are broken: iPhone → Settings → Cellular → Openline → Cellular Data Network → **Reset Settings**. Android → Settings → Network & internet → SIMs → Openline → APN → delete any custom APN and let it auto-configure.`],

  ['My Openline eSIM used to work but suddenly stopped',
   `Sudden stops after a period of working usually mean one of:

1. **Plan expired or ran out of data** — check your dashboard at [openline.com](https://openline.com).
2. **Airplane mode was toggled** — check Settings.
3. **Home carrier auto-switch enabled** — see [Allow Cellular Data Switching](/?a=my-iphone-auto-switched-from-openline-back-to-my-home-sim-how-do-i-stop-it).
4. **You moved to a country not covered by this plan** — regional plans have specific country lists.
5. **iOS/Android update reset network settings** — reset again and re-select Openline as cellular data.`],

  ['Openline has signal but no internet — what to do',
   `You're "attached" to the network but data isn't flowing.

**Fix in order:**

1. Toggle airplane mode 30 seconds.
2. Confirm Data Roaming is ON for the Openline line.
3. Confirm Openline is set as the Cellular Data line.
4. Reset APN: Settings → Cellular → Openline → Cellular Data Network → Reset Settings.
5. Restart the phone.
6. Try a manual network selection to a different partner.`],

  ['Speeds are very slow on my Openline plan — how to diagnose',
   `Slow speeds usually indicate one of:

- **Congestion** — busy area, high tourism season. Move location or wait.
- **Partner network throttling** — the local carrier may be throttling roaming traffic. Try switching to a different partner via manual network selection.
- **Weak signal** — check signal bars; low bars = low speed.
- **Fair-use throttling** — some plans throttle after a data threshold. Check your plan details in the app.
- **Background apps** — check Settings → Cellular for which apps are consuming data.

Speeds of 20–50 Mbps are typical in good conditions; 200+ Mbps possible on 5G partners.`],

  ['DNS not resolving on Openline — websites won\'t load',
   `Cellular data flows but DNS lookups fail.

**Fix:** Turn off any active VPN. Test by opening a browser and visiting an IP address directly (e.g. 1.1.1.1) — if that works, it's a DNS issue. If not, no data at all.

For DNS specifically: iPhone → Settings → Wi-Fi → tap the Wi-Fi you're on → Configure DNS → **Automatic**. On cellular, DNS is set by the carrier and can't be overridden without a Private DNS profile.`],

  ['Can I use a custom DNS with Openline?',
   `**On cellular:** No — the partner carrier provides DNS. You can install a Private DNS profile (Cloudflare 1.1.1.1, NextDNS) but it applies system-wide, not per-SIM.

**On Wi-Fi:** Yes, per network.

If you specifically need DoH/DoT for privacy, the Cloudflare 1.1.1.1 iOS/Android app works over cellular and installs as a system-wide profile.`],

  ['IPv6 issues with Openline — some sites don\'t load',
   `Very rare. If a specific site won't load but others do, and only over Openline (not Wi-Fi), try disabling IPv6.

**iPhone:** No user-facing toggle. Use a Private DNS provider like NextDNS which can force IPv4.
**Android:** Settings → Network & internet → SIMs → Openline → Access Point Names → tap APN → **APN protocol** → set to IPv4 only.

Report the specific site to [ask@openline.com](mailto:ask@openline.com) — we may be able to escalate to the partner network.`],

  ['MTU issues — some downloads fail, VPN slow',
   `Very rare, mostly affects specific VPN protocols over cellular.

**Fix:** Change your VPN's MTU to 1280 (from the default 1500). Consult your VPN app's advanced settings. If you don't use a VPN, this doesn't affect you.`],
];

for (const [title, body] of networkStack) {
  newArticles.push([title, 'Troubleshooting', 'Advanced',
    ['network', 'apn', 'dns', 'troubleshooting'], body]);
}

// ---- Category I: Reinstall / recovery flows ----
const reinstall = [
  ['How do I reinstall my Openline eSIM if it disappeared?',
   `Sign in at [openline.com](https://openline.com) → **My Codes** → find the plan → **Reinstall**. This issues a fresh install token from the same underlying purchase code — no extra charge, no consumed data. Scan the new QR on your phone.`],
  ['Can I move my Openline eSIM to a new phone?',
   `Yes. Delete the eSIM on the old phone (Settings → Cellular → tap Openline → Delete). Then on the new phone, sign in at [openline.com](https://openline.com) → **My Codes** → **Reinstall** to get a fresh install for the new device.`],
  ['My phone factory-reset. How do I get my Openline eSIM back?',
   `Same reinstall flow. Sign in at [openline.com](https://openline.com) → **My Codes** → **Reinstall**. Your purchase codes are permanently tied to your account and survive any device reset.`],
  ['I deleted my Openline eSIM by mistake — is it gone?',
   `No. The **purchase code** is separate from the installed profile. Sign in at [openline.com](https://openline.com) → **My Codes** → **Reinstall** to reinstall the same plan.`],
  ['My purchase code says "already redeemed" but I never installed it',
   `The code was redeemed on some device. Sign in at [openline.com](https://openline.com) → **My Codes** to see if the plan is active in your account. If it is, use **Reinstall** to push it to your current device. If the code was somehow redeemed on a device that isn't yours, contact [ask@openline.com](mailto:ask@openline.com) — we can trace and re-issue.`],
  ['Can I reinstall Openline on the same phone multiple times?',
   `Yes, unlimited. Each Reinstall issues a fresh install token. Useful if the profile got corrupted, if you factory-reset, or if you deleted and want it back.`],
];

for (const [title, body] of reinstall) {
  newArticles.push([title, 'Getting started', 'Activation',
    ['reinstall', 'recovery', 'purchase-code'], body]);
}

// ---- Category J: Pre-travel prep ----
const preTravelPrep = [
  ['What should I do before I leave home to make sure my Openline eSIM works?',
   `The best-practice pre-travel checklist:

## Before you leave

1. **Buy your plan at home** on your own broadband. Redeem the purchase code via app, web, or [openline.com/start](https://openline.com/start).
2. **Install the eSIM at home.** The profile sits dormant and won't consume data or start the plan window until you activate abroad.
3. **Confirm the line exists**: Settings → Cellular → you should see an "Openline" line (even if turned off).
4. **Test that Data Roaming is ready to go**: tap the Openline line and confirm the Data Roaming toggle is present (you'll turn it ON abroad).
5. **Note your ICCID** just in case (Settings → Cellular → Openline → ICCID).

## On the plane

- Airplane mode is on. Nothing to do.

## When you land

1. Turn airplane mode off.
2. Toggle Data Roaming ON for the Openline line if not already.
3. Wait 30–90 seconds for automatic registration.

That's it. Total abroad-setup time: 30 seconds.`],

  ['Can I install my Openline eSIM before I travel?',
   `**Yes, and you should.** Installing at home on your own broadband is the single most reliable install path. The profile sits dormant on your phone — no data consumed, no plan window started — until you activate it by turning Data Roaming on abroad.

## Why install at home

- Home Wi-Fi doesn't have the captive portals, port filters, and carrier-lobbied blocking that hotel/airport/corporate Wi-Fi has.
- If install fails at home, you have days to troubleshoot instead of minutes at an airport.
- You land, turn on Data Roaming, and you're online in 30 seconds.`],

  ['How early can I install my Openline eSIM before travel?',
   `As early as you want. The profile has no expiration on the device — install it a month before, six months before, whenever. The plan window starts only when you activate abroad (first successful data session).`],
];

for (const [title, body] of preTravelPrep) {
  newArticles.push([title, 'Getting started', 'Activation',
    ['pre-travel', 'install', 'preparation'], body]);
}

// ---- Category K: Purchase-code activation edge cases ----
const purchaseCodeCases = [
  ['I redeemed my Openline code but no eSIM appeared on my phone',
   `The code was accepted but the profile didn't install. Common causes:

- Hostile Wi-Fi cut off the SM-DP+ download mid-flight.
- Captive portal intercepted traffic.
- Active VPN.
- Phone rejected the profile (usually a carrier lock issue).

**Fix:** Sign in at [openline.com](https://openline.com) → **My Codes** → find the redeemed plan → **Reinstall**. This gives you a fresh install token on the same code, no charge. Then try installing on a different Wi-Fi (home broadband or personal hotspot).`],

  ['My Openline purchase code shows expired but I never used it',
   `Purchase codes don't expire on their own. If yours shows expired, either:

- It's a limited-time promo code that had a deadline.
- The code was somehow used on another account.

Contact [ask@openline.com](mailto:ask@openline.com) with the code and your order ID — we'll investigate and re-issue if appropriate.`],

  ['Can I give my Openline purchase code to a friend and they activate it?',
   `Yes. Purchase codes are bearer-redeemable — anyone with the code can redeem it via [openline.com/start](https://openline.com/start) anonymously, no account needed. This is how the gifting flow works. Once your friend redeems, the plan is tied to whatever account/device they used, not yours.`],

  ['My friend redeemed my code by mistake — can I get it back?',
   `Once redeemed, the plan belongs to the account or device where it was activated. If it hasn't been activated abroad yet (dormant profile), contact [ask@openline.com](mailto:ask@openline.com) — we may be able to void the redemption and re-issue a fresh code, but this is case-by-case.`],
];

for (const [title, body] of purchaseCodeCases) {
  newArticles.push([title, 'Troubleshooting', 'Purchase codes',
    ['purchase-code', 'redeem', 'activation'], body]);
}

// ---- Category L: Special scenarios ----
const specialScenarios = [
  ['I need Openline to work at a specific hotel — how do I know it will?',
   `Openline coverage is tied to the country and partner networks, not specific venues. If your plan covers the country and your phone can register on any of the partner networks (Settings → Cellular → Openline → Network Selection), you'll have data anywhere those networks reach.

**What might not work in a specific hotel:**

- The hotel's own Wi-Fi to *install* the eSIM (see the hotel-Wi-Fi article).
- Very remote or basement rooms may have weak partner-network signal.

**What always works:**

- Cellular data over the eSIM once installed and activated.`],

  ['Can I activate my Openline eSIM while on a flight (in-flight Wi-Fi)?',
   `Technically yes, but not recommended:

- In-flight Wi-Fi is expensive, slow, and frequently disconnects mid-download.
- SM-DP+ handshakes require a stable connection.
- The plane's Wi-Fi may block provisioning traffic.

**Better:** Install at home before travel. Activate on the ground when you land.`],

  ['I\'m at a conference / event with strong Wi-Fi. Can I install Openline?',
   `Depends on the venue. Trade-show and conference Wi-Fi is often heavily managed and can block eSIM installs. Same rule as elsewhere: try, and if it fails, tether from another phone or wait.`],

  ['I\'m at an Airbnb. Can I install Openline on their Wi-Fi?',
   `Usually yes — Airbnb Wi-Fi is typically a home router without corporate filtering. If it has a captive portal (rare), complete the login first. If install fails, tether from another phone.`],

  ['I\'m in an area with only satellite internet (Starlink, remote lodge). Can I install Openline?',
   `**Yes.** Starlink and similar satellite links pass eSIM provisioning traffic normally. Latency is higher (500–800 ms) so the install may take a bit longer but almost always completes.`],

  ['I\'m at a cruise port / on a cruise ship. Will Openline activate?',
   `**In port**, yes — you're within reach of shore-based partner networks in the port city. Standard activation applies.

**At sea**, no — cruise ship maritime networks are not Openline partners. You'd need the ship's expensive maritime plan.`],

  ['Openline coverage on trains — does it work in tunnels?',
   `On the surface, yes — Openline follows the local carrier partner's coverage. In tunnels, no cellular network works (this is a track-side infrastructure limit, not Openline). Some high-speed European trains have onboard Wi-Fi that carries the tunnel gaps.`],

  ['Openline in mountain / rural areas — will it work?',
   `Depends entirely on partner-network coverage in that specific area. Try manual network selection if the automatic one fails. In extremely remote areas (deep forest, high mountain), no cellular network works, period.`],

  ['I\'m going to Antarctica / research station. Will Openline work?',
   `**No.** No commercial cellular partner networks operate in Antarctica. Research stations typically use dedicated satellite links.`],

  ['I\'m going to Iran / North Korea / Cuba / Syria — will Openline work?',
   `Openline coverage in embargoed or heavily restricted countries is limited or unavailable. Check the specific country in the Openline app before purchase. If unavailable, the app will not offer plans for that destination.`],
];

for (const [title, body] of specialScenarios) {
  newArticles.push([title, 'Special use cases', 'Travel scenarios',
    ['travel', 'scenario', 'coverage'], body]);
}

// ---- Category M: iPhone-specific settings deep dives ----
const iphoneSettings = [
  ['iPhone Settings → Cellular explained for Openline users',
   `The Settings → Cellular screen is command central for your eSIM. Key sections:

## Cellular Data

The line currently used for data. Set to **Openline** when abroad.

## Default Voice Line

The line used for calls. Set to your **primary** (home carrier) so people can still reach you.

## SIMs

Lists all installed lines. Tap each to enable/disable and configure.

## Cellular Data Switching

Auto-fails-over to your other line if the current one has weak signal. **Turn OFF** to prevent surprise home-carrier roaming charges while abroad.

## For each line

- **Turn On This Line** — master toggle.
- **Label** — rename it (e.g. "Openline Europe").
- **Data Roaming** — must be ON for Openline abroad.
- **Network Selection** — Automatic by default; toggle off to pick a partner manually.
- **Wi-Fi Calling** — for your home carrier; irrelevant for data-only Openline.
- **Cellular Data Network** — APN settings; leave alone for Openline.
- **SIM PIN** — a security PIN; not needed for eSIMs.`],

  ['iPhone Data Roaming — why it must be ON for Openline',
   `"Data Roaming" is Apple's toggle for whether the line can use partner networks outside its home country. For Openline — which uses partner networks in every country — **Data Roaming must be ON**.

This does NOT cost you extra. Openline plans are flat-rate; there's no per-day roaming charge. The "Data Roaming" label is technical terminology from Apple's cellular framework.

**Settings → Cellular → Openline → Data Roaming → ON.**`],

  ['iPhone "Allow Cellular Data Switching" — should I turn it off?',
   `**Yes, when using Openline abroad.** This iPhone feature auto-fails-over to your other line during weak signal. If your other line is your home carrier, that means surprise international roaming charges.

**Settings → Cellular → Cellular Data → Allow Cellular Data Switching → OFF.**

Turn it back on when you're home and using both lines domestically.`],

  ['iPhone eSIM label — how to rename my Openline line',
   `Settings → Cellular → tap the Openline line → Cellular Plan Label → type your preferred name (e.g. "Europe Trip", "Japan Data", "Openline"). Purely cosmetic, doesn't affect connectivity.`],

  ['iPhone "Turn On This Line" — should Openline always be on?',
   `Only when you're actively using it. Leaving Openline enabled while home doesn't cost anything (no data is consumed if you're not routing traffic through it) but some users prefer to turn it off between trips for clarity.

Turning it off does not delete the profile — you can re-enable anytime.`],
];

for (const [title, body] of iphoneSettings) {
  newArticles.push([title, 'Devices & compatibility', 'iOS',
    ['iphone', 'settings', 'ios'], body]);
}

// ---- Category N: Android-specific settings ----
const androidSettings = [
  ['Android Settings for Openline eSIM users — the essentials',
   `Android's eSIM UI varies by manufacturer. Common paths:

## Stock Android / Pixel

Settings → Network & internet → SIMs → tap your Openline line.

## Samsung One UI

Settings → Connections → SIM manager → tap Openline.

## Xiaomi HyperOS

Settings → SIM cards & mobile networks → tap the Openline slot.

## Key toggles

- **Use SIM / Mobile data** — must be ON for the line to work.
- **Data roaming** — must be ON for Openline abroad.
- **Preferred network type** — leave on Automatic (5G/LTE/3G).
- **Access Point Names** — leave on Automatic; do not manually enter.
- **Network selection** — Automatic by default; manual selection is available if the automatic one fails.`],

  ['Android "Data roaming" — why it must be ON for Openline',
   `Same as iPhone: Data Roaming controls whether the line uses partner networks outside its home country. Openline plans are flat-rate — no extra cost from turning it on.

**Path (varies by phone):** Settings → Network & internet → SIMs → Openline → Roaming → ON.`],

  ['Samsung SIM Manager — configuring Openline eSIM',
   `Samsung's One UI puts eSIM management under Settings → Connections → **SIM manager**.

Steps:

1. Tap the Openline eSIM in the SIM manager list.
2. Toggle **Turn on**.
3. Enable **Roaming**.
4. Set **Mobile data** to Openline (top of SIM manager screen).
5. Set **Preferred SIM for calls** to your primary line.`],

  ['Pixel eSIM settings for Openline',
   `Pixel eSIM management is under Settings → **Network & internet → SIMs**.

Steps:

1. Tap the Openline SIM.
2. Toggle **Use SIM**.
3. Toggle **Roaming**.
4. Under **Mobile data**, select Openline.`],
];

for (const [title, body] of androidSettings) {
  newArticles.push([title, 'Devices & compatibility', 'Android version quirks',
    ['android', 'settings', 'setup'], body]);
}

// ---- Category O: Diagnostic questions ----
const diagnostic = [
  ['How do I find my Openline eSIM\'s ICCID?',
   `The ICCID is the eSIM's serial number. Contact support may ask for it.

**iPhone:** Settings → Cellular → tap Openline line → scroll down to ICCID (19–20 digits).
**Android:** Settings → About phone → SIM status → tap the Openline SIM slot → ICCID.

Do not share your ICCID publicly — it's a semi-sensitive identifier. Only share it with Openline support via [ask@openline.com](mailto:ask@openline.com).`],

  ['How do I find my phone\'s IMEI and EID for Openline support?',
   `**IMEI:** Dial \`*#06#\` on any phone. Shows both IMEI (for the phone) and EID (for eSIM-capable devices).

**Alternate paths:**

- iPhone: Settings → General → About → scroll to IMEI and EID.
- Android: Settings → About phone → IMEI / EID.`],

  ['How do I check my Openline data usage in real time?',
   `Sign in at [openline.com](https://openline.com) → **My Plans** → click your active plan for current usage and remaining data. Updated within a few minutes of actual consumption.

On the phone, iOS/Android built-in cellular data counters show phone-side usage, but the source of truth is the Openline dashboard.`],

  ['How do I test which partner network my Openline is connected to right now?',
   `**iPhone:** Settings → Cellular → Openline → Network Selection → the currently connected carrier is shown at the top (or as the highlighted one under Automatic).

**Android:** Settings → Network & internet → SIMs → Openline → Network operators → see the current selection.

**On the status bar:** Look at the carrier name next to the signal bars — that's your current partner.`],

  ['What does the carrier name in my status bar mean?',
   `Your phone shows the local partner-network name, not "Openline". This is standard eSIM behavior — the eSIM registers on a real carrier and the phone displays that carrier's name.

Example: In Germany, you might see "Telekom" or "Vodafone.de". In Japan, "SoftBank" or "docomo". Openline routes your traffic through whichever partner has the best signal.

If you want to see "Openline" in the status bar, you can rename the eSIM label under Settings → Cellular → Openline → Cellular Plan Label (iPhone). Note this changes the display label, not the actual carrier attach.`],
];

for (const [title, body] of diagnostic) {
  newArticles.push([title, 'Technical', 'Advanced',
    ['diagnostic', 'iccid', 'imei', 'support'], body]);
}

// ---- Category P: Refund + support paths for activation failures ----
const refundSupport = [
  ['My Openline eSIM won\'t activate — can I get a refund?',
   `**Yes, in most cases.**

- If your purchase code was never redeemed, you can get a full refund. Contact [ask@openline.com](mailto:ask@openline.com) with the order ID.
- If your code was redeemed but the eSIM won't install because of a phone-side issue (carrier lock, unsupported device), we refund fully.
- If the eSIM installed and activated but you had connectivity issues in a specific location (no partner signal in that spot), we assess case-by-case using the compatibility checker.

**We never refund** based on the no-antenna edge case: if the coverage checker on our site said the area was covered but there's literally no cell tower at your exact location, that's a coverage limit we can't compensate — but this is rare.

Contact [ask@openline.com](mailto:ask@openline.com) with your ICCID and a description of the issue.`],

  ['How long does Openline support take to respond to activation problems?',
   `Live chat inside the Openline app: usually **under 5 minutes** during peak hours, up to 30 minutes off-peak.
Email at [ask@openline.com](mailto:ask@openline.com): usually **under 4 hours** during business hours, up to 24 hours on weekends.

For urgent activation issues while traveling, live chat is fastest.`],

  ['What info should I include when contacting Openline about an activation issue?',
   `To resolve fastest:

1. Your **order ID** (from the confirmation email or dashboard).
2. Your **ICCID** (Settings → Cellular → Openline → ICCID on iPhone).
3. Your **device model** (e.g. "iPhone 15 Pro").
4. Your **iOS/Android version**.
5. The **country** you're activating in.
6. What **Wi-Fi network** you tried to install on (hotel / home / office / hotspot).
7. Any **error messages** verbatim (or screenshot).
8. What **troubleshooting steps** you've already tried.`],
];

for (const [title, body] of refundSupport) {
  newArticles.push([title, 'Support', 'Contact',
    ['support', 'refund', 'help'], body]);
}

// Now write all new
console.log('New articles to add:', newArticles.length);
for (const [title, category, subcategory, tags, body] of newArticles) {
  upsert(title, category, subcategory, tags, body);
}

// Save
fs.writeFileSync(DB, JSON.stringify(articles, null, 2));
console.log('Total articles now:', articles.length);
