"""Minimal async OpenRouter client (reads OPENROUTER_API_KEY)."""
import os, ssl, json, asyncio, time, httpx, re, random
_ctx = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE"))
_ctx.verify_flags &= ~ssl.VERIFY_X509_STRICT
URL = "https://openrouter.ai/api/v1/chat/completions"
USAGE_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "usage.jsonl")

def client(conc=32):
    return httpx.AsyncClient(verify=_ctx, timeout=httpx.Timeout(300, connect=30), trust_env=True,
                             limits=httpx.Limits(max_connections=conc, max_keepalive_connections=conc),
                             headers={"HTTP-Referer": "https://kb.openline.com", "X-Title": "Openline KB i18n",
                                      **({"Authorization": "Bearer " + os.environ["OPENROUTER_API_KEY"]} if os.environ.get("OPENROUTER_API_KEY") else {})})

def _parse_json(s):
    s = s.strip()
    s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s)
    try: return json.loads(s)
    except Exception:
        i, j = s.find("{"), s.rfind("}")
        return json.loads(s[i:j+1])

async def chat_json(c, model, system, user, schema=None, max_tokens=16000, temperature=0.2, tag="", retries=4, reasoning=None):
    body = {"model": model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "temperature": temperature, "max_tokens": max_tokens, "usage": {"include": True}}
    if schema: body["response_format"] = {"type": "json_schema", "json_schema": {"name": "out", "strict": True, "schema": schema}}
    else: body["response_format"] = {"type": "json_object"}
    if reasoning: body["reasoning"] = reasoning
    body["stream"] = True
    last = None
    att = -1
    while att + 1 < retries:
        att += 1
        try:
            parts, usage, finish, model_used = [], {}, None, model
            async with c.stream("POST", URL, json=body) as r:
                if r.status_code in (429, 500, 502, 503, 504, 408):
                    last = f"HTTP {r.status_code} {(await r.aread())[:200]}"; await asyncio.sleep(3 * (att + 1) ** 2); continue
                if r.status_code >= 400:
                    raise RuntimeError(f"HTTP {r.status_code} {(await r.aread())[:300]}")
                async for line in r.aiter_lines():
                    if not line.startswith("data: "): continue
                    data = line[6:].strip()
                    if data == "[DONE]": break
                    try: d = json.loads(data)
                    except json.JSONDecodeError: continue
                    if "error" in d: raise RuntimeError(str(d["error"])[:300])
                    model_used = d.get("model", model_used)
                    if d.get("usage"): usage = d["usage"]
                    for ch in d.get("choices", []):
                        delta = ch.get("delta") or {}
                        if delta.get("content"): parts.append(delta["content"])
                        if ch.get("finish_reason"): finish = ch["finish_reason"]
            txt = "".join(parts)
            with open(USAGE_LOG, "a") as f:
                f.write(json.dumps({"t": time.time(), "tag": tag, "model": model_used, "in": usage.get("prompt_tokens"), "out": usage.get("completion_tokens"), "cost": usage.get("cost"), "finish": finish}) + "\n")
            if finish == "length": last = "truncated"; body["max_tokens"] = int(body["max_tokens"] * 1.6); continue
            return _parse_json(txt)
        except httpx.ProxyError as e:
            # credential proxy rate limit: back off and do not count as an attempt
            last = f"ProxyError: {str(e)[:120]}"; await asyncio.sleep(5 + 10 * random.random()); retries += 1 if retries < 12 else 0; continue
        except (httpx.HTTPError, json.JSONDecodeError, ValueError, RuntimeError) as e:
            last = f"{type(e).__name__}: {str(e)[:200]}"; await asyncio.sleep(2 * (att + 1))
    raise RuntimeError(f"chat_json failed [{tag}]: {last}")
