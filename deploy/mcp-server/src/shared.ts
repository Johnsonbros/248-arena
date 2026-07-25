/**
 * Shared config + helpers for arena-ops-mcp.
 */
import { execFile } from "node:child_process";

export const CFG = {
  port: parseInt(process.env.MCP_PORT ?? "8765", 10),
  authToken: process.env.MCP_AUTH_TOKEN ?? "",
  appDir: process.env.APP_DIR ?? "/mnt/user/appdata/248-arena",
  repoSlug: process.env.REPO_SLUG ?? "Johnsonbros/248-arena",
  defaultBranch: process.env.DEFAULT_BRANCH ?? "main",
  gitToken: process.env.GIT_TOKEN ?? "",
  container: process.env.CONTAINER_NAME ?? "arena248",
  appPort: parseInt(process.env.ARENA_PORT ?? "8248", 10),
  // Optional: a RESTRICTED, read-only Stripe key enables the stripe_* tools.
  stripeKey: process.env.STRIPE_KEY ?? "",
};

export const BRANCH_RE = /^[A-Za-z0-9._/-]{1,200}$/;

export function run(
  cmd: string,
  args: string[],
  cwd?: string,
  timeoutMs = 120_000
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      const code = err && typeof (err as any).code === "number" ? (err as any).code : err ? 1 : 0;
      resolve({ code, stdout: stdout.toString(), stderr: stderr.toString() });
    });
  });
}

export const redact = (s: string) => (CFG.gitToken ? s.split(CFG.gitToken).join("***") : s);

/** GET-only Stripe API helper. No other HTTP verbs exist in this server. */
export async function stripeGet(path: string): Promise<any> {
  if (!CFG.stripeKey) {
    throw new Error(
      "Stripe tools are disabled: STRIPE_KEY is not set in .env. " +
        "Create a RESTRICTED key (Dashboard → Developers → API keys → Create restricted key) " +
        "with read-only access and set STRIPE_KEY=rk_live_... then restart this container."
    );
  }
  const res = await fetch(`https://api.stripe.com${path}`, {
    headers: { Authorization: `Bearer ${CFG.stripeKey}` },
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Stripe API ${res.status}: ${body?.error?.message ?? "unknown error"} (path: ${path})`);
  }
  return body;
}

export const usd = (cents: number | null | undefined) =>
  cents == null ? "n/a" : `$${(cents / 100).toFixed(2)}`;

/** Crude but dependency-free HTML → text for page verification. */
export function htmlToText(html: string): { title: string; text: string } {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return { title, text };
}
