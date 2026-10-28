# Openline KB translation pipeline

Scripts used to localize the knowledge base into the 32 non-English languages of openline.com, through [OpenRouter](https://openrouter.ai). Run from a working directory (outputs go to `work/`); the repository root is detected automatically or set with `KB_DIR`. Requires `OPENROUTER_API_KEY`.

| Step | Script | Model |
| --- | --- | --- |
| Glossary, register, interface strings, categories | `glossary.py` | Claude Sonnet 5.5 |
| Interface native review | `ui_review.py` | Claude Sonnet 5.5 |
| Shared support footer | `tail.py` | Claude Sonnet 5.5 |
| Articles | `translate.py` | Claude Haiku 5.5 (European, Southeast Asian), GPT-5.6 Luna (ja, zh, zh-TW, ko, hi, bn, th); Gemini 3.8 Flash fallback |
| Native proofreading (targeted edits) | `proofread.py` | Gemini 3.8 Flash |
| Language suggestion dialog strings (`i18n/offer.json`) | `offer.py` | Claude Sonnet 5.5, proofread by Gemini 3.8 Flash |
| Native digits for Bengali prose | `digits.py` | — |
| Build `i18n/<code>.json` and `i18n/<code>.articles.json` | `compile.py` | — |

`tcore.py` validates every result against the English source (headings, list items, table rows, URLs, inline code, numbers, control characters, escape sequences) and the pipeline retries or rejects anything that does not match. Translations are keyed by a hash of the English article, so editing an English article and re-running `translate.py`, `proofread.py` and `compile.py` updates only what changed. `pilot.py` and `judge.py` are the model-selection benchmark.
