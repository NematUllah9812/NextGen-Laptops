// Standalone server for the NextGen Laptops site.
//
// A dependency-light port of the original artifact's server actions:
//   - plain node:http (no framework)
//   - storage through the async libSQL facade in ./db.mjs — a hosted
//     Turso database when TURSO_DATABASE_URL is set, otherwise a local
//     SQLite file; see db.mjs and the README
//   - serves the built client from ../dist
//   - POST /actions with a JSON body { action, args } dispatches to the
//     same action names and response shapes as the original:
//     getSiteData, seedInitialData, ensureDealImages, adminLogin,
//     adminLogout, checkSession, getAdminData, updateSettings,
//     saveDeal/deleteDeal, saveService/deleteService,
//     saveTestimonial/deleteTestimonial, saveFaq/deleteFaq
//
// Startup: initDb() creates the tables and seeds the shop data when
// the store is empty (never overwriting admin edits). When this file
// is run directly it seeds before listening; the Vercel function
// (api/actions.mjs) instead awaits initDb() lazily on first request —
// initDb() is idempotent and caches its promise, so both are safe.

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { db, dbLocation } from "./db.mjs";
import {
  SETTING_KEYS,
  SETTING_KEY_SET,
  SEED_SETTINGS,
  SEED_DEALS,
  SEED_SERVICES,
  SEED_TESTIMONIALS,
  SEED_FAQS,
  KNOWN_DEAL_IMAGES,
} from "./seed.mjs";

// Credentials for the shop's admin panel. Override in production with the
// ADMIN_USERNAME / ADMIN_PASSWORD environment variables.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "NextGen@786Admin";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_ERROR = "Your session has expired. Please log in again.";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, "..", "dist");

// ---------------------------------------------------------------------------
// Store: schema + seeding
// ---------------------------------------------------------------------------

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    processor TEXT NOT NULL DEFAULT '',
    ram TEXT NOT NULL DEFAULT '',
    storage TEXT NOT NULL DEFAULT '',
    display TEXT NOT NULL DEFAULT '',
    condition TEXT NOT NULL DEFAULT '',
    battery_note TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    price INTEGER,
    badge TEXT NOT NULL DEFAULT '',
    featured INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    rating INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
`;

async function seedIfEmpty() {
  const dealCount = (await db.get("SELECT COUNT(*) AS n FROM deals")).n;
  const settingsCount = (
    await db.get("SELECT COUNT(*) AS n FROM site_settings")
  ).n;
  if (dealCount > 0 || settingsCount > 0) return false;
  const now = Date.now();
  const statements = [];
  for (const [key, value] of Object.entries(SEED_SETTINGS)) {
    statements.push(["INSERT INTO site_settings (key, value) VALUES (?, ?)", [key, value]]);
  }
  for (const d of SEED_DEALS) {
    statements.push([
      `INSERT INTO deals (title, brand, processor, ram, storage, display,
         condition, battery_note, image_url, price, badge, featured, active,
         sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        d.title, d.brand, d.processor, d.ram, d.storage, d.display,
        d.condition, d.batteryNote, d.imageUrl, d.price, d.badge,
        d.featured, d.active, d.sortOrder, now,
      ],
    ]);
  }
  for (const sv of SEED_SERVICES) {
    statements.push([
      "INSERT INTO services (title, description, sort_order) VALUES (?, ?, ?)",
      [sv.title, sv.description, sv.sortOrder],
    ]);
  }
  for (const t of SEED_TESTIMONIALS) {
    statements.push([
      "INSERT INTO testimonials (name, role, body, rating, sort_order) VALUES (?, ?, ?, ?, ?)",
      [t.name, t.role, t.body, t.rating, t.sortOrder],
    ]);
  }
  for (const f of SEED_FAQS) {
    statements.push([
      "INSERT INTO faqs (question, answer, sort_order) VALUES (?, ?, ?)",
      [f.question, f.answer, f.sortOrder],
    ]);
  }
  // One write transaction: either the whole seed lands or none of it.
  await db.batch(statements);
  return true;
}

// Create the tables and seed if empty. Idempotent; the in-flight
// promise is cached so concurrent first requests share one init.
// Resolves to whether seeding happened.
let initPromise;
export function initDb() {
  initPromise ??= (async () => {
    await db.exec(SCHEMA_SQL);
    return seedIfEmpty();
  })();
  return initPromise;
}

// ---------------------------------------------------------------------------
// Helpers (same semantics as the original actions)
// ---------------------------------------------------------------------------

async function readSettings() {
  const rows = await db.all("SELECT key, value FROM site_settings");
  const out = { ...SEED_SETTINGS };
  for (const row of rows) out[row.key] = row.value;
  return out;
}

function mapDeal(row) {
  return {
    id: row.id,
    title: row.title,
    brand: row.brand,
    processor: row.processor,
    ram: row.ram,
    storage: row.storage,
    display: row.display,
    condition: row.condition,
    batteryNote: row.battery_note,
    imageUrl: row.image_url,
    price: row.price,
    badge: row.badge,
    featured: row.featured === 1,
    active: row.active === 1,
    sortOrder: row.sort_order,
  };
}

async function loadCollections(activeDealsOnly) {
  const dealRows = await db.all(
    activeDealsOnly
      ? "SELECT * FROM deals WHERE active = 1 ORDER BY sort_order ASC, id ASC"
      : "SELECT * FROM deals ORDER BY sort_order ASC, id ASC",
  );
  const serviceRows = await db.all(
    "SELECT * FROM services ORDER BY sort_order ASC, id ASC",
  );
  const testimonialRows = await db.all(
    "SELECT * FROM testimonials ORDER BY sort_order ASC, id ASC",
  );
  const faqRows = await db.all(
    "SELECT * FROM faqs ORDER BY sort_order ASC, id ASC",
  );
  return {
    deals: dealRows.map(mapDeal),
    services: serviceRows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      sortOrder: r.sort_order,
    })),
    testimonials: testimonialRows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      body: r.body,
      rating: r.rating,
      sortOrder: r.sort_order,
    })),
    faqs: faqRows.map((r) => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      sortOrder: r.sort_order,
    })),
  };
}

async function isAdmin(token) {
  if (!token) return false;
  const session = await db.get(
    "SELECT * FROM admin_sessions WHERE token = ?",
    [token],
  );
  if (!session) return false;
  if (session.expires_at < Date.now()) {
    await db.run("DELETE FROM admin_sessions WHERE token = ?", [token]);
    return false;
  }
  return true;
}

const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
const reqStr = (v, max) => {
  const s = str(v, max).trim();
  return s.length > 0 ? s : null;
};
const sortOrderOf = (v) =>
  Number.isInteger(v) && v >= 0 && v <= 9999 ? v : null;

// ---------------------------------------------------------------------------
// Actions (same names and response shapes as the original)
// ---------------------------------------------------------------------------

export const Actions = {
  async getSiteData() {
    return { settings: await readSettings(), ...(await loadCollections(true)) };
  },

  async seedInitialData() {
    return { seeded: await seedIfEmpty() };
  },

  async ensureDealImages() {
    const rows = await db.all("SELECT id, title, image_url FROM deals");
    const statements = [];
    for (const row of rows) {
      if (row.image_url.trim() !== "") continue;
      const known = KNOWN_DEAL_IMAGES.find((k) => row.title.includes(k.match));
      if (!known) continue;
      statements.push(["UPDATE deals SET image_url = ? WHERE id = ?", [known.imageUrl, row.id]]);
    }
    if (statements.length > 0) await db.batch(statements);
    return { updated: statements.length };
  },

  async adminLogin(args) {
    if (args.username !== ADMIN_USERNAME || args.password !== ADMIN_PASSWORD) {
      return { ok: false, token: null, error: "Incorrect username or password." };
    }
    const token = `${randomUUID()}-${randomUUID()}`;
    const now = Date.now();
    await db.run(
      "INSERT INTO admin_sessions (token, created_at, expires_at) VALUES (?, ?, ?)",
      [token, now, now + SESSION_TTL_MS],
    );
    return { ok: true, token, error: null };
  },

  async adminLogout(args) {
    await db.run("DELETE FROM admin_sessions WHERE token = ?", [str(args.token, 500)]);
    return { ok: true, error: null };
  },

  async checkSession(args) {
    return { ok: await isAdmin(str(args.token, 500)) };
  },

  async getAdminData(args) {
    if (!(await isAdmin(str(args.token, 500)))) {
      return {
        ok: false,
        error: SESSION_ERROR,
        settings: {},
        deals: [],
        services: [],
        testimonials: [],
        faqs: [],
      };
    }
    return { ok: true, error: null, settings: await readSettings(), ...(await loadCollections(false)) };
  },

  async updateSettings(args) {
    if (!(await isAdmin(str(args.token, 500)))) return { ok: false, error: SESSION_ERROR };
    const values =
      args.values && typeof args.values === "object" ? args.values : {};
    const entries = Object.entries(values)
      .filter(([key]) => SETTING_KEY_SET.has(key))
      .map(([key, v]) => [key, str(v, 4000)]);
    if (entries.length === 0) return { ok: false, error: "Nothing to save." };
    for (const [key, raw] of entries) {
      if (key === "whatsapp_number") {
        const digits = raw.replace(/\D/g, "");
        if (digits.length < 10 || digits.length > 15) {
          return {
            ok: false,
            error:
              "WhatsApp number must be 10 to 15 digits, including the country code (for example 923215744034).",
          };
        }
      }
      if (key === "email" && raw.trim() !== "" && !/^\S+@\S+\.\S+$/.test(raw.trim())) {
        return { ok: false, error: "That email address does not look right." };
      }
    }
    await db.batch(
      entries.map(([key, value]) => [
        `INSERT INTO site_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, value],
      ]),
    );
    return { ok: true, error: null };
  },

  async saveDeal(args) {
    if (!(await isAdmin(str(args.token, 500)))) return { ok: false, error: SESSION_ERROR, id: null };
    const title = reqStr(args.title, 200);
    if (!title) return { ok: false, error: "Title is required.", id: null };
    const so = sortOrderOf(args.sortOrder);
    if (so === null) return { ok: false, error: "Sort order is out of range.", id: null };
    const price =
      args.price === null || args.price === undefined
        ? null
        : Number.isInteger(args.price) && args.price >= 0 && args.price <= 100_000_000
          ? args.price
          : undefined;
    if (price === undefined) return { ok: false, error: "Price is out of range.", id: null };
    const values = [
      title,
      str(args.brand, 80).trim(),
      str(args.processor, 120).trim(),
      str(args.ram, 60).trim(),
      str(args.storage, 60).trim(),
      str(args.display, 120).trim(),
      str(args.condition, 200).trim(),
      str(args.batteryNote, 200).trim(),
      str(args.imageUrl, 1000).trim(),
      price,
      str(args.badge, 80).trim(),
      args.featured ? 1 : 0,
      args.active ? 1 : 0,
      so,
    ];
    if (args.id === null || args.id === undefined) {
      const info = await db.run(
        `INSERT INTO deals (title, brand, processor, ram, storage, display,
           condition, battery_note, image_url, price, badge, featured,
           active, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [...values, Date.now()],
      );
      return { ok: true, error: null, id: Number(info.lastInsertRowid) };
    }
    await db.run(
      `UPDATE deals SET title = ?, brand = ?, processor = ?, ram = ?,
         storage = ?, display = ?, condition = ?, battery_note = ?,
         image_url = ?, price = ?, badge = ?, featured = ?, active = ?,
         sort_order = ? WHERE id = ?`,
      [...values, args.id],
    );
    return { ok: true, error: null, id: args.id };
  },

  async deleteDeal(args) {
    if (!(await isAdmin(str(args.token, 500)))) return { ok: false, error: SESSION_ERROR };
    await db.run("DELETE FROM deals WHERE id = ?", [args.id]);
    return { ok: true, error: null };
  },

  async saveService(args) {
    if (!(await isAdmin(str(args.token, 500)))) return { ok: false, error: SESSION_ERROR, id: null };
    const title = reqStr(args.title, 200);
    if (!title) return { ok: false, error: "Title is required.", id: null };
    const so = sortOrderOf(args.sortOrder);
    if (so === null) return { ok: false, error: "Sort order is out of range.", id: null };
    const description = str(args.description, 1000).trim();
    if (args.id === null || args.id === undefined) {
      const info = await db.run(
        "INSERT INTO services (title, description, sort_order) VALUES (?, ?, ?)",
        [title, description, so],
      );
      return { ok: true, error: null, id: Number(info.lastInsertRowid) };
    }
    await db.run(
      "UPDATE services SET title = ?, description = ?, sort_order = ? WHERE id = ?",
      [title, description, so, args.id],
    );
    return { ok: true, error: null, id: args.id };
  },

  async deleteService(args) {
    if (!(await isAdmin(str(args.token, 500)))) return { ok: false, error: SESSION_ERROR };
    await db.run("DELETE FROM services WHERE id = ?", [args.id]);
    return { ok: true, error: null };
  },

  async saveTestimonial(args) {
    if (!(await isAdmin(str(args.token, 500)))) return { ok: false, error: SESSION_ERROR, id: null };
    const name = reqStr(args.name, 120);
    const body = reqStr(args.body, 2000);
    if (!name) return { ok: false, error: "Name is required.", id: null };
    if (!body) return { ok: false, error: "Text is required.", id: null };
    const so = sortOrderOf(args.sortOrder);
    if (so === null) return { ok: false, error: "Sort order is out of range.", id: null };
    const rating =
      args.rating === null || args.rating === undefined
        ? null
        : Number.isInteger(args.rating) && args.rating >= 1 && args.rating <= 5
          ? args.rating
          : undefined;
    if (rating === undefined) return { ok: false, error: "Rating is out of range.", id: null };
    const role = str(args.role, 160).trim();
    if (args.id === null || args.id === undefined) {
      const info = await db.run(
        "INSERT INTO testimonials (name, role, body, rating, sort_order) VALUES (?, ?, ?, ?, ?)",
        [name, role, body, rating, so],
      );
      return { ok: true, error: null, id: Number(info.lastInsertRowid) };
    }
    await db.run(
      "UPDATE testimonials SET name = ?, role = ?, body = ?, rating = ?, sort_order = ? WHERE id = ?",
      [name, role, body, rating, so, args.id],
    );
    return { ok: true, error: null, id: args.id };
  },

  async deleteTestimonial(args) {
    if (!(await isAdmin(str(args.token, 500)))) return { ok: false, error: SESSION_ERROR };
    await db.run("DELETE FROM testimonials WHERE id = ?", [args.id]);
    return { ok: true, error: null };
  },

  async saveFaq(args) {
    if (!(await isAdmin(str(args.token, 500)))) return { ok: false, error: SESSION_ERROR, id: null };
    const question = reqStr(args.question, 300);
    const answer = reqStr(args.answer, 2000);
    if (!question) return { ok: false, error: "Question is required.", id: null };
    if (!answer) return { ok: false, error: "Answer is required.", id: null };
    const so = sortOrderOf(args.sortOrder);
    if (so === null) return { ok: false, error: "Sort order is out of range.", id: null };
    if (args.id === null || args.id === undefined) {
      const info = await db.run(
        "INSERT INTO faqs (question, answer, sort_order) VALUES (?, ?, ?)",
        [question, answer, so],
      );
      return { ok: true, error: null, id: Number(info.lastInsertRowid) };
    }
    await db.run(
      "UPDATE faqs SET question = ?, answer = ?, sort_order = ? WHERE id = ?",
      [question, answer, so, args.id],
    );
    return { ok: true, error: null, id: args.id };
  },

  async deleteFaq(args) {
    if (!(await isAdmin(str(args.token, 500)))) return { ok: false, error: SESSION_ERROR };
    await db.run("DELETE FROM faqs WHERE id = ?", [args.id]);
    return { ok: true, error: null };
  },
};

// Whether this file is being run directly (`node server/server.mjs`)
// as opposed to imported by the Vercel function.
const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

// Seed on startup when run directly (no-op when data already exists).
// When imported (Vercel), initDb() is instead awaited lazily by the
// function before its first dispatch — see api/actions.mjs.
if (isDirectRun) {
  const seeded = await initDb();
  console.log(`[nextgen] data store: ${dbLocation} (seeded: ${seeded})`);
}

// ---------------------------------------------------------------------------
// HTTP server: static dist/ + POST /actions
// ---------------------------------------------------------------------------

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function serveStatic(req, res, pathname) {
  let rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  if (rel === "/" || rel === "." || rel === "") rel = "index.html";
  let filePath = join(DIST_DIR, rel);
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    // SPA fallback: unknown non-file routes get the app shell.
    if (extname(rel) !== "") { res.writeHead(404); res.end("Not found"); return; }
    filePath = join(DIST_DIR, "index.html");
    if (!existsSync(filePath)) { res.writeHead(404); res.end("Not built yet — run npm run build"); return; }
  }
  const body = readFileSync(filePath);
  res.writeHead(200, {
    "content-type": MIME[extname(filePath).toLowerCase()] || "application/octet-stream",
    "content-length": body.length,
    "cache-control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
  });
  res.end(req.method === "HEAD" ? undefined : body);
}

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (req.method === "POST" && url.pathname === "/actions") {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) { req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", async () => {
      let payload;
      try {
        payload = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch {
        sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
        return;
      }
      const action = payload?.action;
      const args = payload?.args && typeof payload.args === "object" ? payload.args : {};
      const handler = typeof action === "string" ? Actions[action] : undefined;
      if (!handler) {
        sendJson(res, 404, { ok: false, error: `Unknown action: ${String(action)}` });
        return;
      }
      try {
        sendJson(res, 200, await handler(args));
      } catch (err) {
        console.error(`[nextgen] action ${action} failed:`, err);
        sendJson(res, 500, { ok: false, error: "Internal error." });
      }
    });
    return;
  }
  if (req.method === "GET" && url.pathname === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }
  if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res, url.pathname);
    return;
  }
  res.writeHead(405); res.end("Method not allowed");
});

const PORT = Number(process.env.PORT) || 3000;
// Only listen when run directly (`node server/server.mjs`). The Vercel
// serverless function (api/actions.mjs) imports { Actions } from this
// module and must not start an HTTP server.
if (isDirectRun) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[nextgen] listening on http://0.0.0.0:${PORT}`);
  });
}
