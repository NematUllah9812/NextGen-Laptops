// Database facade for the NextGen Laptops site (libSQL).
//
// One async code path for every action, backed by @libsql/client:
//   - If TURSO_DATABASE_URL is set, the store is the hosted Turso
//     (libSQL) database at that URL, authenticated with
//     TURSO_AUTH_TOKEN. This is what makes admin edits durable on
//     Vercel — the database lives outside the serverless filesystem.
//   - Otherwise the same client talks to a local SQLite file
//     ("file:" + DATA_FILE), with DATA_FILE resolved exactly as before:
//     the DATA_FILE env var, else /tmp/nextgen-app.db on Vercel, else
//     ./data/app.db next to this file. Local dev and the Docker/Render
//     deployment therefore need no configuration at all.
//
// The facade mirrors the bits of the old node:sqlite API the actions
// used, but async: all/get/run/exec, plus batch() for transactional
// multi-statement writes (used for seeding).

import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = dirname(fileURLToPath(import.meta.url));

export const DATA_FILE =
  process.env.DATA_FILE ||
  // On Vercel the project filesystem is read-only; the only writable
  // location is /tmp (per-instance — only used when no Turso database
  // is configured; see README).
  (process.env.VERCEL
    ? "/tmp/nextgen-app.db"
    : join(serverDir, "data", "app.db"));

const TURSO_URL = process.env.TURSO_DATABASE_URL || "";

export const usingTurso = TURSO_URL !== "";
// Human-readable store location for startup logs. Never includes the
// auth token.
export const dbLocation = usingTurso ? `turso (${TURSO_URL})` : DATA_FILE;

let client;
if (usingTurso) {
  client = createClient({
    url: TURSO_URL,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });
} else {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  client = createClient({ url: "file:" + DATA_FILE });
}

// libSQL rows carry both numeric indexes and column names; the actions
// only ever read column names, so strip the indexes to keep rows plain
// (and JSON-clean).
function plainRow(row) {
  const out = {};
  for (const key of Object.keys(row)) {
    if (!/^\d+$/.test(key)) out[key] = row[key];
  }
  return out;
}

export const db = {
  // Run a query and return all rows as plain objects.
  async all(sql, params = []) {
    const rs = await client.execute({ sql, args: params });
    return rs.rows.map(plainRow);
  },

  // Run a query and return the first row, or undefined.
  async get(sql, params = []) {
    const rs = await client.execute({ sql, args: params });
    return rs.rows.length > 0 ? plainRow(rs.rows[0]) : undefined;
  },

  // Run a write and return the result; lastInsertRowid is normalised
  // to a JS number (libSQL reports it as a bigint).
  async run(sql, params = []) {
    const rs = await client.execute({ sql, args: params });
    return {
      rowsAffected: rs.rowsAffected,
      lastInsertRowid:
        rs.lastInsertRowid != null ? Number(rs.lastInsertRowid) : undefined,
    };
  },

  // Run several ;-separated statements (DDL / schema creation).
  async exec(sql) {
    await client.executeMultiple(sql);
  },

  // Run a list of [sql, params] statements as one write transaction.
  async batch(statements) {
    return client.batch(
      statements.map(([sql, args]) => ({ sql, args: args ?? [] })),
      "write",
    );
  },
};
