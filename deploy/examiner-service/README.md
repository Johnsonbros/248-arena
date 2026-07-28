# arena-examiner — The Examiner (text mode)

The AI moat: a **grounded** study tutor for the MA Journeyman exam. Runs entirely on the
AiSync fleet (your 3090 pays the token bill — $0 per session), answers from the app's own
248 CMR content, and cites sections that deep-link into the Code Book.

## How grounding works
1. `build-corpus.mjs` compiles the app's content — every Code Book section plus all 165
   cited question facts — into `corpus.json` (184 chunks).
2. Each chat request retrieves the most relevant chunks (IDF-weighted keyword scoring,
   with a boost for exact section numbers like "10.16").
3. The LLM is instructed to answer **only** from those excerpts, cite sections
   (248 CMR 10.15), and say "I'm not certain" instead of inventing code — with a
   no-excerpts hard fallback when retrieval comes up empty.

## Endpoints
| Endpoint | Purpose |
|---|---|
| `POST /api/chat` | `{ email, messages }` → `{ reply, citations }` — active subscribers only (checked against arena-access, fail-closed) |
| `GET /healthz` | liveness + corpus size |

Guardrails: 40 messages/user/hour, 300/hour globally (the GPU is shared), bounded history
and reply length.

## Setup (~10 min, on AiSync)
```bash
cd /mnt/user/appdata/248-arena/deploy/examiner-service
cp .env.example .env      # point LLM_URL at your gateway; set LLM_MODEL (+ LLM_KEY if needed)
node build-corpus.mjs     # regenerate after content changes (also safe to skip; corpus.json is committed)
docker compose up -d --build
curl -s localhost:8767/healthz
```
Then expose `arena-ai.thejohnsonbros.com → http://<AiSync-LAN-IP>:8767` via the Cloudflare
Tunnel. The app's chat (`ACCESS_CONFIG.examinerBase`) is already pointed at that hostname.

**Gateway note:** `LLM_URL` defaults to `http://ai-router-controller:4000/v1/chat/completions`
— the same gateway AiSync Tutor uses. If this container isn't on that docker network, use
the host LAN IP, or attach the network in docker-compose. Pick any model your gateway
routes (an 8–14B instruct model on the 3090 is plenty for grounded Q&A).

## Front-end behavior
- In **server mode** with an active subscription, the in-app Examiner chat calls this
  service; replies render with 📖 citation links that open the Code Book at the right section.
- The local **quiz mode** ("quiz me") stays client-side.
- Offline / code mode / service down → graceful fallback to the original canned coaching.

## Roadmap (phase 2)
Voice: whisper (STT) + kokoro (TTS) + the realtime voice gateway already on the fleet —
streaming spoken mock-oral-exam mode. This service's `/api/chat` is the brain either way.
