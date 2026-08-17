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
| `POST /api/chat` | `{ email, messages, kind? }` → `{ reply, citations }` — active subscribers only (checked against arena-access, fail-closed) |
| `POST /api/voice` | `{ email, kind?, audio(base64), mime?, messages? }` → `{ transcript, reply, citations, audio? }` — full voice loop: **whisper** STT → grounded chat → **kokoro** TTS, all on the fleet |
| `GET /healthz` | liveness + corpus size |

`kind`: `tutor` (default — Socratic explainer) or `oral` (**mock oral exam** — asks one
exam question at a time, judges the answer with a citation, presses on weak answers, keeps
a running score and gives a verdict).

Guardrails: 40 messages/user/hour (voice counts double — it's GPU time ×3), 300/hour
globally, bounded history/reply, audio payload caps. TTS is best-effort: if kokoro is
down, the text reply still comes back.

## Setup (~10 min, on AiSync)
```bash
cd /mnt/user/appdata/248-arena/deploy/examiner-service
cp .env.example .env      # point LLM_URL at your gateway; set LLM_MODEL (+ LLM_KEY if needed)
node build-corpus.mjs     # regenerate after content changes (also safe to skip; corpus.json is committed)
docker compose up -d --build
curl -s localhost:8767/healthz
```
Then expose `arena-ai.248arena.com → http://<AiSync-LAN-IP>:8767` via the Cloudflare
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

## Voice (phase 2 — shipped)
Push-to-talk in the app's Examiner chat: tap 🎙️, speak, tap ⏹️ — the clip goes to
`/api/voice`, whisper transcribes it, the grounded chat answers, kokoro speaks the reply
back. Combined with **oral mode** this is a spoken mock oral exam on your own hardware,
at $0 per session. The mic button and Tutor/Oral toggle appear automatically when the
service is reachable and the user is in server mode.

Voice defaults assume the fleet's existing containers (`whisper` on :8000,
`kokoro-tts` on :8880) — adjust `STT_URL`/`TTS_URL`/`TTS_VOICE` in `.env` to match your
network names. Roadmap: streaming/barge-in via the realtime voice gateway.
