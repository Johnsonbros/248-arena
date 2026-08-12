/**
 * Tiered model routing — keep the 3090 doing the work, pay only when it matters.
 *
 * Policy:
 *   LOCAL (default)  — the 3090 model via the fleet gateway. Handles the large
 *                      majority of tutoring: definitions, table lookups, "what
 *                      size trap", oral-exam Q&A. $0 per call.
 *   PREMIUM (rare)   — a high-tier hosted model, used ONLY when the request is
 *                      genuinely hard or a designated high-value workflow.
 *
 * Escalation is (a) heuristic, (b) hard-capped per hour, and (c) fully
 * disable-able (leave PREMIUM_MODEL empty and everything stays local).
 * Every decision is logged with its reason so you can tune the mix from real
 * traffic — the target is roughly 80–95% local.
 */

export type Tier = "local" | "premium";

export interface RouteDecision {
  tier: Tier;
  model: string;
  url: string;
  key: string;
  reason: string;
}

export interface RouterConfig {
  localModel: string;
  localUrl: string;
  localKey: string;
  premiumModel: string;   // empty = premium disabled, always local
  premiumUrl: string;
  premiumKey: string;
  premiumPerHour: number; // hard cap on paid calls
}

// Signals that the local model will likely struggle: multi-step reasoning,
// calculations, comparisons, or an explicit request for depth.
const HARD_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /\b(calculate|compute|size the|sizing for|how many|total|add up|work out)\b/i, reason: "calculation" },
  { re: /\b(why|explain why|reason|rationale|intent of the code)\b/i, reason: "reasoning" },
  { re: /\b(compare|versus|vs\.?|difference between|instead of)\b/i, reason: "comparison" },
  { re: /\b(walk me through|step by step|in detail|deep dive|thorough)\b/i, reason: "depth-requested" },
  { re: /\b(disagree|that'?s wrong|are you sure|but the code says|contradic)/i, reason: "challenge" },
];

// Workflows that always deserve the best model available.
const PREMIUM_WORKFLOWS = new Set(["plan", "grade"]); // study-plan building, oral-exam final verdict

export class ModelRouter {
  private premiumHits: number[] = [];
  private stats = { local: 0, premium: 0 };

  constructor(private cfg: RouterConfig) {}

  private premiumAvailable(): boolean {
    if (!this.cfg.premiumModel || !this.cfg.premiumUrl) return false;
    const now = Date.now();
    while (this.premiumHits.length && now - this.premiumHits[0] > 3600_000) this.premiumHits.shift();
    return this.premiumHits.length < this.cfg.premiumPerHour;
  }

  private local(reason: string): RouteDecision {
    this.stats.local++;
    return { tier: "local", model: this.cfg.localModel, url: this.cfg.localUrl, key: this.cfg.localKey, reason };
  }

  private premium(reason: string): RouteDecision {
    this.premiumHits.push(Date.now());
    this.stats.premium++;
    return { tier: "premium", model: this.cfg.premiumModel, url: this.cfg.premiumUrl, key: this.cfg.premiumKey, reason };
  }

  /**
   * @param text     the user's latest message
   * @param workflow 'chat' | 'oral' | 'plan' | 'grade'
   * @param retry    true when a local attempt already failed/looked weak
   */
  route(text: string, workflow: string, retry = false): RouteDecision {
    if (!this.premiumAvailable()) {
      return this.local(this.cfg.premiumModel ? "premium-cap-reached" : "premium-disabled");
    }
    if (retry) return this.premium("local-retry-escalation");
    if (PREMIUM_WORKFLOWS.has(workflow)) return this.premium(`workflow:${workflow}`);

    const t = (text || "").trim();
    // Long, multi-part questions are the ones small models fumble.
    if (t.length > 320) return this.premium("long-question");
    const questionMarks = (t.match(/\?/g) || []).length;
    if (questionMarks >= 3) return this.premium("multi-question");
    for (const p of HARD_PATTERNS) {
      if (p.re.test(t)) return this.premium(p.reason);
    }
    return this.local("routine");
  }

  /** Cheap quality check on a local reply — triggers one premium retry. */
  looksWeak(reply: string): boolean {
    const r = (reply || "").trim();
    if (r.length < 40) return true;                                  // stub answer
    if (/^(i (don'?t|do not) know|i'?m not sure)\b/i.test(r)) return true;
    if (/(as an ai|i cannot help|i can'?t assist)/i.test(r)) return true;
    return false;
  }

  mix() {
    const total = this.stats.local + this.stats.premium || 1;
    return {
      ...this.stats,
      localPct: Math.round((this.stats.local / total) * 100),
      premiumRemainingThisHour: Math.max(0, this.cfg.premiumPerHour - this.premiumHits.length),
    };
  }
}
