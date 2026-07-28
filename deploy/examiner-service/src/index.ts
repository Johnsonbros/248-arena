/**
 * arena-examiner — The Examiner, text mode.
 * -----------------------------------------------------------------------------
 * Grounded AI tutor for the MA Journeyman exam. Every answer is generated from
 * retrieved 248 CMR study material (the app's own Code Book + cited question
 * facts) and instructed to cite sections — the model is told to say "I'm not
 * certain" rather than invent code numbers.
 *
 *   POST /api/chat { email, messages:[{role,content}...] }
 *        -> { reply, citations:[ref...] }
 *   GET  /healthz
 *
 * Wiring (all on the AiSync fleet):
 *   LLM_URL   -> OpenAI-compatible chat endpoint (LiteLLM / ai-router-controller
 *                in front of Ollama), e.g. http://ai-router-controller:4000/v1/chat/completions
 *   ACCESS_URL-> arena-access service, used to gate chat to active subscribers.
 *
 * Guardrails: per-email and global rate limits (the GPU is a shared resource),
 * bounded history, bounded reply length.
 */
import express, { type Request, type Response, type NextFunction } from "express";
import { Retriever } from "./retrieve.js";

const CFG = {
  port: parseInt(process.env.PORT ?? "8767", 10),
  siteOrigin: process.env.SITE_ORIGIN ?? "https://arena.thejohnsonbros.com",
  llmUrl: process.env.LLM_URL ?? "http://ai-router-controller:4000/v1/chat/completions",
  llmModel: process.env.LLM_MODEL ?? "ollama/llama3.1",
  llmKey: process.env.LLM_KEY ?? "",
  accessUrl: process.env.ACCESS_URL ?? "http://arena-access:8766",
  corpusPath: process.env.CORPUS_PATH ?? "./corpus.json",
  perUserPerHour: parseInt(process.env.RATE_PER_USER_HOUR ?? "40", 10),
  globalPerHour: parseInt(process.env.RATE_GLOBAL_HOUR ?? "300", 10),
};

const retriever = new Retriever(CFG.corpusPath);
console.log(`corpus loaded: ${retriever.count()} chunks`);

const SYSTEM_PROMPT = `You are The Examiner — a sharp, encouraging study tutor for the Massachusetts Journeyman Plumbing exam, built into the 248 Arena app. Rules:
1. GROUNDING: Base code answers ONLY on the 248 CMR study excerpts provided in each request. If the excerpts don't cover the question, say you're not certain and point the student to the relevant Code Book section or the official 248 CMR — NEVER invent section numbers, measurements, or requirements.
2. CITATIONS: When you state a code requirement, cite its section like (248 CMR 10.15).
3. STYLE: Talk like a seasoned journeyman coaching an apprentice — plain, direct, brief. Prefer 2-6 sentences. Use the trade's language.
4. TEACHING: When a student is wrong or confused, briefly explain WHY the code requires what it does, not just the number.
5. SCOPE: Stick to plumbing/gas code study help. This is exam prep, not authoritative code interpretation or engineering advice — remind students of that if they ask about real-world jobs.`;

// --- rate limiting -----------------------------------------------------------
const userHits = new Map<string, number[]>();
const globalHits: number[] = [];
function allow(email: string): boolean {
  const now = Date.now();
  const hour = 3600_000;
  while (globalHits.length && now - globalHits[0] > hour) globalHits.shift();
  if (globalHits.length >= CFG.globalPerHour) return false;
  const hits = (userHits.get(email) ?? []).filter(t => now - t < hour);
  if (hits.length >= CFG.perUserPerHour) return false;
  hits.push(now);
  userHits.set(email, hits);
  globalHits.push(now);
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

const app = express();
app.use(express.json({ limit: "64kb" }));
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", CFG.siteOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/healthz", (_req, res) => res.json({ ok: true, service: "arena-examiner", chunks: retriever.count() }));

app.post("/api/chat", async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  if (!email.includes("@")) return res.status(400).json({ error: "email required" });
  if (rawMessages.length === 0) return res.status(400).json({ error: "messages required" });

  if (!(await isActiveSubscriber(email))) {
    return res.status(403).json({ error: "No active subscription." });
  }
  if (!allow(email)) {
    return res.status(429).json({ error: "The Examiner needs a breather — try again in a bit." });
  }

  // Bound the history: last 10 turns, each capped, roles sanitized.
  const history = rawMessages.slice(-10).map((m: any) => ({
    role: m?.role === "assistant" ? "assistant" : "user",
    content: String(m?.content ?? "").slice(0, 2000),
  }));
  const lastUser = [...history].reverse().find(m => m.role === "user")?.content ?? "";

  // Retrieve grounding material for the latest question (plus a little recent context).
  const prevUser = history.filter(m => m.role === "user").slice(-2, -1)[0]?.content ?? "";
  const chunks = retriever.search(`${lastUser} ${prevUser}`, 6);
  const excerpts = chunks
    .map(c => `[${c.ref}] ${c.title}\n${c.text.slice(0, 1200)}`)
    .join("\n\n---\n\n");

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content: chunks.length
        ? `248 CMR study excerpts for this question:\n\n${excerpts}`
        : "No study excerpts matched this question. Tell the student you're not certain and point them to the Code Book — do not guess code requirements.",
    },
    ...history,
  ];

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (CFG.llmKey) headers["Authorization"] = `Bearer ${CFG.llmKey}`;
    const llmRes = await fetch(CFG.llmUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: CFG.llmModel, messages, max_tokens: 500, temperature: 0.3 }),
    });
    if (!llmRes.ok) {
      const errText = await llmRes.text();
      console.error(`LLM error ${llmRes.status}: ${errText.slice(0, 300)}`);
      return res.status(502).json({ error: "The Examiner is thinking too hard (AI backend error). Try again shortly." });
    }
    const data: any = await llmRes.json();
    const reply = String(data?.choices?.[0]?.message?.content ?? "").trim();
    if (!reply) return res.status(502).json({ error: "Empty reply from AI backend." });
    // Citations: sections the model actually mentioned, else what we retrieved.
    const cited = [...new Set([...reply.matchAll(/248 CMR [\d.]+(?:–[\d.]+)?/g)].map(m => m[0]))];
    const citations = cited.length ? cited : [...new Set(chunks.map(c => c.ref))].slice(0, 3);
    res.json({ reply, citations });
  } catch (e: any) {
    console.error("chat error:", e?.message ?? e);
    res.status(502).json({ error: "Could not reach the AI backend." });
  }
});

app.listen(CFG.port, () => {
  console.log(`arena-examiner listening on :${CFG.port} (llm=${CFG.llmUrl}, model=${CFG.llmModel}, access=${CFG.accessUrl})`);
});
