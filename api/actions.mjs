// Vercel serverless function for the NextGen Laptops site.
//
// The client POSTs { action, args } to /actions; vercel.json rewrites
// that path to this function (/api/actions). The action handlers are
// shared with the long-running server (server/server.mjs), which
// exports them without starting HTTP when imported.
//
// Storage: set TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) in the Vercel
// project to use a hosted Turso (libSQL) database — that is what makes
// shop data and admin edits durable on Vercel. Without those env vars
// the store falls back to a SQLite file in /tmp (per-instance and
// ephemeral: data re-seeds on cold starts). See the README's Turso
// section.

import { Actions, initDb } from "../server/server.mjs";

// Lazy, idempotent initialisation: create tables + seed on the first
// request this instance serves, not at module load. initDb() itself
// caches its promise, so concurrent first requests share one init.
let ready;
function ensureReady() {
  ready ??= initDb();
  return ready;
}

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
    await ensureReady();
    res.status(200).json(await fn(args));
  } catch (err) {
    console.error(`[nextgen] action ${action} failed:`, err);
    res.status(500).json({ ok: false, error: "Internal error." });
  }
}
