/**
 * arena-examiner — The Examiner: grounded AI tutor (text + voice).
 * -----------------------------------------------------------------------------
 *   POST /api/chat  { email, messages:[{role,content}...], kind? }
 *        -> { reply, citations:[ref...] }
 *   POST /api/voice { email, kind?, audio: <base64>, mime?, messages?:[...] }
 *        -> { transcript, reply, citations, audio?: <base64 mp3> }
 *        Voice loop, all on the fleet: whisper (STT) -> grounded chat -> kokoro (TTS).
 *   GET  /healthz
 *
 * kind: 'tutor' (default, Socratic explainer) | 'oral' (mock oral examiner —
 * asks questions, presses on weak answers, keeps a running verbal score).
 *
 * Fleet wiring (all env-configurable):
 *   LLM_URL    OpenAI-compatible chat endpoint (ai-router-controller / LiteLLM)
 *   STT_URL    faster-whisper-server /v1/audio/transcriptions
 *   TTS_URL    kokoro-fastapi /v1/audio/speech
 *   ACCESS_URL arena-access (subscription gate, fail-closed)
 *
 * Guardrails: per-email + global rate limits (voice counts double — GPU time),
 * bounded history, bounded reply, audio payload caps.
 */
import express, { type Request, type Response, type NextFunction } from "express";
import { Retriever } from "./retrieve.js";
import { ModelRouter } from "./router.js";

const CFG = {
  port: parseInt(process.env.PORT ?? "8767", 10),
  siteOrigin: process.env.SITE_ORIGIN ?? "https://248arena.com",
  llmUrl: process.env.LLM_URL ?? "http://ai-router-controller:4000/v1/chat/completions",
  llmModel: process.env.LLM_MODEL ?? "ollama/llama3.1",
  llmKey: process.env.LLM_KEY ?? "",
  sttUrl: process.env.STT_URL ?? "http://whisper:8000/v1/audio/transcriptions",
  sttModel: process.env.STT_MODEL ?? "Systran/faster-whisper-base.en",
  ttsUrl: process.env.TTS_URL ?? "http://kokoro-tts:8880/v1/audio/speech",
  ttsVoice: process.env.TTS_VOICE ?? "am_adam",
  ttsModel: process.env.TTS_MODEL ?? "kokoro",
  accessUrl: process.env.ACCESS_URL ?? "http://arena-access:8766",
  corpusPath: process.env.CORPUS_PATH ?? "./corpus.json",
  perUserPerHour: parseInt(process.env.RATE_PER_USER_HOUR ?? "40", 10),
  globalPerHour: parseInt(process.env.RATE_GLOBAL_HOUR ?? "300", 10),
};

const retriever = new Retriever(CFG.corpusPath);
console.log(`corpus loaded: ${retriever.count()} chunks`);

// Tiered routing: the 3090 handles the bulk; premium models are reserved for
// genuinely hard turns and high-value workflows, under a hard hourly cap.
const router = new ModelRouter({
  localModel: CFG.llmModel,
  localUrl: CFG.llmUrl,
  localKey: CFG.llmKey,
  premiumModel: process.env.PREMIUM_MODEL ?? "",
  premiumUrl: process.env.PREMIUM_URL ?? CFG.llmUrl, // route through the same gateway by default
  premiumKey: process.env.PREMIUM_KEY ?? CFG.llmKey,
  premiumPerHour: parseInt(process.env.PREMIUM_PER_HOUR ?? "20", 10),
});
console.log(`model routing: local=${CFG.llmModel} premium=${process.env.PREMIUM_MODEL || "(disabled)"}`);

const TUTOR_PROMPT = `You are The Examiner — a sharp, encouraging study tutor for the Massachusetts Journeyman Plumbing exam, built into the 248 Arena app. Rules:
1. GROUNDING: Base code answers ONLY on the 248 CMR study excerpts provided in each request. If the excerpts don't cover the question, say you're not certain and point the student to the relevant Code Book section or the official 248 CMR — NEVER invent section numbers, measurements, or requirements.
2. CITATIONS: When you state a code requirement, cite its section like (248 CMR 10.15).
3. STYLE: Talk like a seasoned journeyman coaching an apprentice — plain, direct, brief. Prefer 2-6 sentences. Use the trade's language.
4. TEACHING: When a student is wrong or confused, briefly explain WHY the code requires what it does, not just the number.
5. SCOPE: Stick to plumbing/gas code study help. This is exam prep, not authoritative code interpretation or engineering advice — remind students of that if they ask about real-world jobs.`;

const ORAL_PROMPT = `You are The Examiner running a MOCK ORAL EXAM for the Massachusetts Journeyman Plumbing exam, built into the 248 Arena app. You speak like a firm but fair examiner at the board. Rules:
1. FLOW: Ask ONE exam-style question at a time, drawn from the 248 CMR study excerpts provided. Wait for the candidate's answer before continuing.
2. JUDGING: After each answer, say plainly whether it's right or wrong, give the correct answer with its citation like (248 CMR 10.15), then ask the next question. If an answer is shaky, press with ONE follow-up before moving on.
3. GROUNDING: Use ONLY the provided excerpts for questions and rulings — never invent section numbers or requirements. If you lack material, say so and switch topics.
4. PACE: Keep every turn short — 1-4 sentences. This is spoken aloud.
5. SCORE: Keep a running tally ("That's 3 of 4.") and give a verdict with weak areas when the candidate says they're done.
Start (or continue) the exam based on the conversation so far.`;

// --- rate limiting -----------------------------------------------------------
const userHits = new Map<string, number[]>();
const globalHits: number[] = [];
function allow(email: string, cost = 1): boolean {
  const now = Date.now();
  const hour = 3600_000;
  while (globalHits.length && now - globalHits[0] > hour) globalHits.shift();
  if (globalHits.length + cost > CFG.globalPerHour) return false;
  const hits = (userHits.get(email) ?? []).filter(t => now - t < hour);
  if (hits.length + cost > CFG.perUserPerHour) return false;
  for (let i = 0; i < cost; i++) { hits.push(now); globalHits.push(now); }
  userHits.set(email, hits);
  if (userHits.size > 5000) userHits.clear(); // bound memory; resets limits, acceptable
  return true;
}

async function isActiveSubscriber(email: string): Promise<boolean> {
  try {
    const res = await fetch(`${CFG.accessUrl}/api/access?email=${encodeURIComponent(email)}`);
    const body: any = await res.json();
    return !!body?.active;
  } catch {
    return false; // access service unreachable -> fail closed
  }
}

interface ChatTurn { role: "user" | "assistant"; content: string; }

function sanitizeHistory(raw: unknown): ChatTurn[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.slice(-10).map((m: any) => ({
    role: m?.role === "assistant" ? "assistant" as const : "user" as const,
    content: String(m?.content ?? "").slice(0, 2000),
  }));
}

/** One LLM call against a chosen tier. */
async function callModel(messages: unknown[], decision: { model: string; url: string; key: string }, kind: string): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (decision.key) headers["Authorization"] = `Bearer ${decision.key}`;
  const res = await fetch(decision.url, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: decision.model, messages, max_tokens: 500, temperature: kind === "oral" ? 0.5 : 0.3 }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data: any = await res.json();
  return String(data?.choices?.[0]?.message?.content ?? "").trim();
}

/** The grounded chat pipeline shared by text and voice. */
async function runChat(history: ChatTurn[], kind: string): Promise<{ reply: string; citations: string[]; tier: string }> {
  const lastUser = [...history].reverse().find(m => m.role === "user")?.content ?? "";
  const prevUser = history.filter(m => m.role === "user").slice(-2, -1)[0]?.content ?? "";
  // In oral mode the examiner also needs material to ASK about, not just answer with.
  const query = kind === "oral" && !lastUser ? "exam questions" : `${lastUser} ${prevUser}`;
  const chunks = retriever.search(query, 6);
  const excerpts = chunks.map(c => `[${c.ref}] ${c.title}\n${c.text.slice(0, 1200)}`).join("\n\n---\n\n");

  const messages = [
    { role: "system", content: kind === "oral" ? ORAL_PROMPT : TUTOR_PROMPT },
    {
      role: "system",
      content: chunks.length
        ? `248 CMR study excerpts for this exchange:\n\n${excerpts}`
        : "No study excerpts matched. Tell the student you're not certain and point them to the Code Book — do not guess code requirements.",
    },
    ...history,
  ];

  // Route: local 3090 model by default, premium only when the turn is hard.
  let decision = router.route(lastUser, kind);
  let reply = await callModel(messages, decision, kind);

  // One escalation retry if the local answer looks weak and premium is free.
  if (decision.tier === "local" && router.looksWeak(reply)) {
    const retry = router.route(lastUser, kind, true);
    if (retry.tier === "premium") {
      console.log(`escalating: local reply looked weak -> ${retry.model}`);
      try {
        const better = await callModel(messages, retry, kind);
        if (better) { reply = better; decision = retry; }
      } catch (e: any) {
        console.error("premium retry failed, keeping local reply:", e?.message ?? e);
      }
    }
  }
  if (!reply) throw new Error("Empty reply from LLM");
  console.log(`[${decision.tier}] ${decision.reason} · mix ${router.mix().localPct}% local`);

  const cited = [...new Set([...reply.matchAll(/(?:248 CMR|NFPA) [\d.]+(?:–[\d.]+)?/g)].map(m => m[0]))];
  const citations = cited.length ? cited : [...new Set(chunks.map(c => c.ref))].slice(0, 3);
  return { reply, citations, tier: decision.tier };
}

// --- voice helpers -----------------------------------------------------------
async function transcribe(audio: Buffer, mime: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([audio], { type: mime || "audio/webm" }), "audio.webm");
  form.append("model", CFG.sttModel);
  const res = await fetch(CFG.sttUrl, { method: "POST", body: form });
  if (!res.ok) throw new Error(`STT ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data: any = await res.json();
  return String(data?.text ?? "").trim();
}

async function speak(text: string): Promise<string | null> {
  try {
    // Strip citation parentheticals' clutter for smoother speech, keep the numbers.
    const spoken = text.replace(/\(248 CMR ([\d.–]+)\)/g, ", 248 CMR $1,").slice(0, 1500);
    const res = await fetch(CFG.ttsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: CFG.ttsModel, voice: CFG.ttsVoice, input: spoken, response_format: "mp3" }),
    });
    if (!res.ok) {
      console.error(`TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch (e: any) {
    console.error("TTS error:", e?.message ?? e);
    return null; // voice reply is best-effort; text always comes back
  }
}

const app = express();
app.use(express.json({ limit: "8mb" })); // voice notes arrive as base64 JSON
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", CFG.siteOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/healthz", (_req, res) => res.json({ ok: true, service: "arena-examiner", chunks: retriever.count(), routing: router.mix() }));

app.post("/api/chat", async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const history = sanitizeHistory(req.body?.messages);
  const kind = req.body?.kind === "oral" ? "oral" : "tutor";
  if (!email.includes("@")) return res.status(400).json({ error: "email required" });
  if (history.length === 0) return res.status(400).json({ error: "messages required" });
  if (!(await isActiveSubscriber(email))) return res.status(403).json({ error: "No active subscription." });
  if (!allow(email)) return res.status(429).json({ error: "The Examiner needs a breather — try again in a bit." });
  try {
    res.json(await runChat(history, kind));
  } catch (e: any) {
    console.error("chat error:", e?.message ?? e);
    res.status(502).json({ error: "The Examiner can't reach the AI backend right now. Try again shortly." });
  }
});

app.post("/api/voice", async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const kind = req.body?.kind === "oral" ? "oral" : "tutor";
  const audioB64 = String(req.body?.audio ?? "");
  const mime = String(req.body?.mime ?? "audio/webm").slice(0, 50);
  if (!email.includes("@")) return res.status(400).json({ error: "email required" });
  if (!audioB64 || audioB64.length > 6_000_000) return res.status(400).json({ error: "audio required (max ~4MB)" });
  if (!(await isActiveSubscriber(email))) return res.status(403).json({ error: "No active subscription." });
  if (!allow(email, 2)) return res.status(429).json({ error: "The Examiner needs a breather — try again in a bit." });

  try {
    const transcript = await transcribe(Buffer.from(audioB64, "base64"), mime);
    if (!transcript) return res.json({ transcript: "", reply: "", citations: [], error: "Couldn't hear anything — try again closer to the mic." });
    const history = [...sanitizeHistory(req.body?.messages), { role: "user" as const, content: transcript }];
    const { reply, citations } = await runChat(history, kind);
    const audio = await speak(reply);
    res.json({ transcript, reply, citations, ...(audio ? { audio, audioMime: "audio/mpeg" } : {}) });
  } catch (e: any) {
    console.error("voice error:", e?.message ?? e);
    res.status(502).json({ error: "Voice pipeline error — the STT/TTS/AI backend may be down." });
  }
});

app.listen(CFG.port, () => {
  console.log(`arena-examiner listening on :${CFG.port} (llm=${CFG.llmUrl}, stt=${CFG.sttUrl}, tts=${CFG.ttsUrl})`);
});
