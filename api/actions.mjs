// Vercel serverless function for the NextGen Laptops site.
//
// The client POSTs { action, args } to /actions; vercel.json rewrites
// that path to this function (/api/actions). The action handlers and the
// SQLite store are shared with the long-running server
// (server/server.mjs), which exports them without starting HTTP when
// imported.
//
// Storage on Vercel: server.mjs points DATA_FILE at /tmp when the VERCEL
// env var is present, because the project filesystem is read-only. /tmp
// is per-instance and ephemeral, so the shop data re-seeds on cold
// starts and admin edits do NOT persist reliably on Vercel. For a
// durable admin panel use the Render/Docker deployment (see README).

import { Actions } from "../server/server.mjs";

async function readPayload(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(text || "{}");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  let payload;
  try {
    payload = await readPayload(req);
  } catch {
    res.status(400).json({ ok: false, error: "Invalid JSON body." });
    return;
  }
  const action = payload?.action;
  const args =
    payload?.args && typeof payload.args === "object" ? payload.args : {};
  const fn = typeof action === "string" ? Actions[action] : undefined;
  if (!fn) {
    res.status(404).json({ ok: false, error: `Unknown action: ${String(action)}` });
    return;
  }
  try {
    res.status(200).json(fn(args));
  } catch (err) {
    console.error(`[nextgen] action ${action} failed:`, err);
    res.status(500).json({ ok: false, error: "Internal error." });
  }
}
