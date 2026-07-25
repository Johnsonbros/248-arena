/**
 * arena-ops-mcp (v0.2 — grew out of arena-deploy-mcp)
 * -----------------------------------------------------------------------------
 * A token-gated MCP server that gives an authorized Claude session a builder's
 * cockpit for 248 Arena on the Unraid host — over HTTPS, no SSH/Tailnet:
 *
 *   Ops    : deploy / restart / status / logs           (only mutating tools)
 *   Git    : what commit is actually live
 *   Verify : fetch live pages, check for broken links   (read-only)
 *   Fleet  : read-only docker ps
 *   Stripe : read-only payment-link/price/revenue checks (GET-only, restricted key)
 *
 * Transport: Streamable HTTP (stateless JSON). Auth: static bearer token,
 * fail-closed. Run it behind the Cloudflare Tunnel + Cloudflare Access — it
 * mounts the Docker socket, which is root-equivalent on the host.
 *
 * See README.md for run + connect instructions.
 */
import express, { type Request, type Response, type NextFunction } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CFG } from "./shared.js";
import { registerAll } from "./tools.js";

if (!CFG.authToken || CFG.authToken.length < 16) {
  console.error("FATAL: MCP_AUTH_TOKEN must be set (>=16 chars). Refusing to start.");
  process.exit(1);
}

function buildServer(): McpServer {
  const server = new McpServer({ name: "arena-ops", version: "0.2.0" });
  registerAll(server);
  return server;
}

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true, service: "arena-ops-mcp" }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const auth = req.header("authorization") ?? "";
  const expected = `Bearer ${CFG.authToken}`;
  if (auth.length !== expected.length || auth !== expected) {
    return res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null });
  }
  next();
});

app.post("/mcp", async (req: Request, res: Response) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null });
  }
});

app.get("/mcp", (_req, res) => res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed (stateless server)" }, id: null }));

app.listen(CFG.port, () => {
  console.log(`arena-ops-mcp listening on :${CFG.port}  (repo=${CFG.repoSlug} appDir=${CFG.appDir} container=${CFG.container} stripe=${CFG.stripeKey ? "enabled" : "disabled"})`);
});
