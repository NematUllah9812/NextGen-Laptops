// Standalone server for the NextGen Laptops site.
//
// A dependency-light port of the original artifact's server actions:
//   - plain node:http (no framework)
//   - node:sqlite (built into Node 22+) for storage
//   - serves the built client from ../dist
//   - POST /actions with a JSON body { action, args } dispatches to the
//     same action names and response shapes as the original:
//     getSiteData, seedInitialData, ensureDealImages, adminLogin,
//     adminLogout, checkSession, getAdminData, updateSettings,
//     saveDeal/deleteDeal, saveService/deleteService,
//     saveTestimonial/deleteTestimonial, saveFaq/deleteFaq
//
// Data file: DATA_FILE env var, or ./data/app.db next to this file.
// Seeding happens automatically at startup when the store is empty and
// never overwrites admin edits.

import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

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
const DATA_FILE =
  process.env.DATA_FILE ||
  // On Vercel the project filesystem is read-only; the only writable
  // location is /tmp (per-instance, so the store re-seeds on cold starts
  // and admin edits are not durable there — see README).
  (process.env.VERCEL ? "/tmp/nextgen-app.db" : join(__dirname, "data", "app.db"));

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

mkdirSync(dirname(DATA_FILE), { recursive: true });
const db = new DatabaseSync(DATA_FILE);
db.exec(`
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
`);

// ---------------------------------------------------------------------------
// Helpers (same semantics as the original actions)
// ---------------------------------------------------------------------------

function readSettings() {
  const rows = db.prepare("SELECT key, value FROM site_settings").all();
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

function loadCollections(activeDealsOnly) {
  const dealRows = activeDealsOnly
    ? db
        .prepare(
          "SELECT * FROM deals WHERE active = 1 ORDER BY sort_order ASC, id ASC",
        )
        .all()
    : db.prepare("SELECT * FROM deals ORDER BY sort_order ASC, id ASC").all();
  const serviceRows = db
    .prepare("SELECT * FROM services ORDER BY sort_order ASC, id ASC")
    .all();
  const testimonialRows = db
    .prepare("SELECT * FROM testimonials ORDER BY sort_order ASC, id ASC")
    .all();
  const faqRows = db
    .prepare("SELECT * FROM faqs ORDER BY sort_order ASC, id ASC")
    .all();
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

function isAdmin(token) {
  if (!token) return false;
  const session = db
    .prepare("SELECT * FROM admin_sessions WHERE token = ?")
    .get(token);
  if (!session) return false;
  if (session.expires_at < Date.now()) {
    db.prepare("DELETE FROM admin_sessions WHERE token = ?").run(token);
    return false;
  }
  return true;
}

function seedIfEmpty() {
  const dealCount = db.prepare("SELECT COUNT(*) AS n FROM deals").get().n;
  const settingsCount = db
    .prepare("SELECT COUNT(*) AS n FROM site_settings")
    .get().n;
  if (dealCount > 0 || settingsCount > 0) return false;
  const now = Date.now();
  db.exec("BEGIN");
  try {
    const insSetting = db.prepare(
      "INSERT INTO site_settings (key, value) VALUES (?, ?)",
    );
    for (const [key, value] of Object.entries(SEED_SETTINGS)) {
      insSetting.run(key, value);
    }
    const insDeal = db.prepare(
      `INSERT INTO deals (title, brand, processor, ram, storage, display,
         condition, battery_note, image_url, price, badge, featured, active,
         sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const d of SEED_DEALS) {
      insDeal.run(
        d.title, d.brand, d.processor, d.ram, d.storage, d.display,
        d.condition, d.batteryNote, d.imageUrl, d.price, d.badge,
        d.featured, d.active, d.sortOrder, now,
      );
    }
    const insService = db.prepare(
      "INSERT INTO services (title, description, sort_order) VALUES (?, ?, ?)",
    );
    for (const sv of SEED_SERVICES) insService.run(sv.title, sv.description, sv.sortOrder);
    const insTestimonial = db.prepare(
      "INSERT INTO testimonials (name, role, body, rating, sort_order) VALUES (?, ?, ?, ?, ?)",
    );
    for (const t of SEED_TESTIMONIALS) insTestimonial.run(t.name, t.role, t.body, t.rating, t.sortOrder);
    const insFaq = db.prepare(
      "INSERT INTO faqs (question, answer, sort_order) VALUES (?, ?, ?)",
    );
    for (const f of SEED_FAQS) insFaq.run(f.question, f.answer, f.sortOrder);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
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
  getSiteData() {
    return { settings: readSettings(), ...loadCollections(true) };
  },

  seedInitialData() {
    return { seeded: seedIfEmpty() };
  },

  ensureDealImages() {
    const rows = db.prepare("SELECT id, title, image_url FROM deals").all();
    let updated = 0;
    const upd = db.prepare("UPDATE deals SET image_url = ? WHERE id = ?");
    for (const row of rows) {
      if (row.image_url.trim() !== "") continue;
      const known = KNOWN_DEAL_IMAGES.find((k) => row.title.includes(k.match));
      if (!known) continue;
      upd.run(known.imageUrl, row.id);
      updated += 1;
    }
    return { updated };
  },

  adminLogin(args) {
    if (args.username !== ADMIN_USERNAME || args.password !== ADMIN_PASSWORD) {
      return { ok: false, token: null, error: "Incorrect username or password." };
    }
    const token = `${randomUUID()}-${randomUUID()}`;
    const now = Date.now();
    db.prepare(
      "INSERT INTO admin_sessions (token, created_at, expires_at) VALUES (?, ?, ?)",
    ).run(token, now, now + SESSION_TTL_MS);
    return { ok: true, token, error: null };
  },

  adminLogout(args) {
    db.prepare("DELETE FROM admin_sessions WHERE token = ?").run(str(args.token, 500));
    return { ok: true, error: null };
  },

  checkSession(args) {
    return { ok: isAdmin(str(args.token, 500)) };
  },

  getAdminData(args) {
    if (!isAdmin(str(args.token, 500))) {
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
    return { ok: true, error: null, settings: readSettings(), ...loadCollections(false) };
  },

  updateSettings(args) {
    if (!isAdmin(str(args.token, 500))) return { ok: false, error: SESSION_ERROR };
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
    const upsert = db.prepare(
      `INSERT INTO site_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    );
    for (const [key, value] of entries) upsert.run(key, value);
    return { ok: true, error: null };
  },

  saveDeal(args) {
    if (!isAdmin(str(args.token, 500))) return { ok: false, error: SESSION_ERROR, id: null };
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
      const info = db
        .prepare(
          `INSERT INTO deals (title, brand, processor, ram, storage, display,
             condition, battery_note, image_url, price, badge, featured,
             active, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(...values, Date.now());
      return { ok: true, error: null, id: Number(info.lastInsertRowid) };
    }
    db.prepare(
      `UPDATE deals SET title = ?, brand = ?, processor = ?, ram = ?,
         storage = ?, display = ?, condition = ?, battery_note = ?,
         image_url = ?, price = ?, badge = ?, featured = ?, active = ?,
         sort_order = ? WHERE id = ?`,
    ).run(...values, args.id);
    return { ok: true, error: null, id: args.id };
  },

  deleteDeal(args) {
    if (!isAdmin(str(args.token, 500))) return { ok: false, error: SESSION_ERROR };
    db.prepare("DELETE FROM deals WHERE id = ?").run(args.id);
    return { ok: true, error: null };
  },

  saveService(args) {
    if (!isAdmin(str(args.token, 500))) return { ok: false, error: SESSION_ERROR, id: null };
    const title = reqStr(args.title, 200);
    if (!title) return { ok: false, error: "Title is required.", id: null };
    const so = sortOrderOf(args.sortOrder);
    if (so === null) return { ok: false, error: "Sort order is out of range.", id: null };
    const description = str(args.description, 1000).trim();
    if (args.id === null || args.id === undefined) {
      const info = db
        .prepare("INSERT INTO services (title, description, sort_order) VALUES (?, ?, ?)")
        .run(title, description, so);
      return { ok: true, error: null, id: Number(info.lastInsertRowid) };
    }
    db.prepare("UPDATE services SET title = ?, description = ?, sort_order = ? WHERE id = ?")
      .run(title, description, so, args.id);
    return { ok: true, error: null, id: args.id };
  },

  deleteService(args) {
    if (!isAdmin(str(args.token, 500))) return { ok: false, error: SESSION_ERROR };
    db.prepare("DELETE FROM services WHERE id = ?").run(args.id);
    return { ok: true, error: null };
  },

  saveTestimonial(args) {
    if (!isAdmin(str(args.token, 500))) return { ok: false, error: SESSION_ERROR, id: null };
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
      const info = db
        .prepare("INSERT INTO testimonials (name, role, body, rating, sort_order) VALUES (?, ?, ?, ?, ?)")
        .run(name, role, body, rating, so);
      return { ok: true, error: null, id: Number(info.lastInsertRowid) };
    }
    db.prepare("UPDATE testimonials SET name = ?, role = ?, body = ?, rating = ?, sort_order = ? WHERE id = ?")
      .run(name, role, body, rating, so, args.id);
    return { ok: true, error: null, id: args.id };
  },

  deleteTestimonial(args) {
    if (!isAdmin(str(args.token, 500))) return { ok: false, error: SESSION_ERROR };
    db.prepare("DELETE FROM testimonials WHERE id = ?").run(args.id);
    return { ok: true, error: null };
  },

  saveFaq(args) {
    if (!isAdmin(str(args.token, 500))) return { ok: false, error: SESSION_ERROR, id: null };
    const question = reqStr(args.question, 300);
    const answer = reqStr(args.answer, 2000);
    if (!question) return { ok: false, error: "Question is required.", id: null };
    if (!answer) return { ok: false, error: "Answer is required.", id: null };
    const so = sortOrderOf(args.sortOrder);
    if (so === null) return { ok: false, error: "Sort order is out of range.", id: null };
    if (args.id === null || args.id === undefined) {
      const info = db
        .prepare("INSERT INTO faqs (question, answer, sort_order) VALUES (?, ?, ?)")
        .run(question, answer, so);
      return { ok: true, error: null, id: Number(info.lastInsertRowid) };
    }
    db.prepare("UPDATE faqs SET question = ?, answer = ?, sort_order = ? WHERE id = ?")
      .run(question, answer, so, args.id);
    return { ok: true, error: null, id: args.id };
  },

  deleteFaq(args) {
    if (!isAdmin(str(args.token, 500))) return { ok: false, error: SESSION_ERROR };
    db.prepare("DELETE FROM faqs WHERE id = ?").run(args.id);
    return { ok: true, error: null };
  },
};

// Seed on startup (no-op when data already exists).
const seeded = seedIfEmpty();
console.log(`[nextgen] data store: ${DATA_FILE} (seeded: ${seeded})`);

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
    req.on("end", () => {
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
        sendJson(res, 200, handler(args));
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
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[nextgen] listening on http://0.0.0.0:${PORT}`);
  });
}
