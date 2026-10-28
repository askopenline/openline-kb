#!/usr/bin/env python3
"""Rolling, multi-region deploy of kb.openline.com on Fly.io (Machines API, no flyctl).

Usage:  FLY_API_TOKEN=… python3 tools/fly-deploy.py <commit-sha> [regions…]
Default regions: cdg (Paris, primary), iad (Virginia), sin (Singapore).

Each machine boots by downloading the pinned GitHub tarball of <commit-sha>
(see tools/fly-machine.template.json). Machines are updated one at a time and
each must pass its /healthz check before the next one starts, so Fly's anycast
always has a healthy machine to route visitors to — no downtime on release.
Missing regions get a new machine.
"""
import json, os, subprocess, sys, time, datetime, pathlib

APP = "openline-kb"
API = f"https://api.machines.dev/v1/apps/{APP}/machines"
HERE = pathlib.Path(__file__).resolve().parent

def call(method, url, body=None):
    cmd = ["curl", "-sS", "-m", "180", "-X", method, "-H", "Content-Type: application/json"]
    if os.environ.get("FLY_API_TOKEN"): cmd += ["-H", "Authorization: Bearer " + os.environ["FLY_API_TOKEN"]]
    if body is not None: cmd += ["--data-binary", "@-"]
    out = subprocess.run(cmd + [url], input=json.dumps(body).encode() if body is not None else None, capture_output=True, check=True).stdout
    return json.loads(out or b"{}")

def config(sha):
    t = (HERE / "fly-machine.template.json").read_text()
    t = t.replace("{{SHA}}", sha).replace("{{DATE}}", datetime.date.today().isoformat())
    return json.loads(t)

def wait_healthy(mid, timeout=300):
    t0 = time.time()
    while time.time() - t0 < timeout:
        m = call("GET", f"{API}/{mid}")
        checks = m.get("checks") or []
        if m.get("state") == "started" and checks and all(c.get("status") == "passing" for c in checks):
            return m
        time.sleep(5)
    raise SystemExit(f"machine {mid} not healthy after {timeout}s")

def main():
    sha = sys.argv[1]
    regions = sys.argv[2:] or ["cdg", "iad", "sin"]
    cfg = config(sha)
    machines = [m for m in call("GET", API) if m.get("state") != "destroyed"]
    by_region = {}
    for m in machines: by_region.setdefault(m["region"], []).append(m)
    for r in regions:
        for m in by_region.get(r, []):
            print(f"update {m['id']} ({r}) → {sha[:7]}", flush=True)
            call("POST", f"{API}/{m['id']}", {"config": cfg})
            wait_healthy(m["id"]); print("  healthy", flush=True)
        if not by_region.get(r):
            print(f"create machine in {r} → {sha[:7]}", flush=True)
            m = call("POST", API, {"name": f"kb-{r}", "region": r, "config": cfg})
            if "id" not in m: raise SystemExit(f"create failed: {m}")
            wait_healthy(m["id"]); print(f"  {m['id']} healthy", flush=True)

if __name__ == "__main__":
    main()
