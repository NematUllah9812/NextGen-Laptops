# NextGen Laptops — Website

Standalone, git-deployable version of the NextGen Laptops Abbottabad
website (ported from the Muse artifact of the same name, so it can run
on any normal host).

- **Public site:** soft, Apple-like design, all content (shop name,
  WhatsApp/phone, address, deals, services, testimonials, FAQs) rendered
  live from the server's data store.
- **Admin panel:** full editor for everything above — deals with
  add/edit/delete, services, testimonials, FAQs, settings and socials.
- **Stack:** React 19 + React Query client (bundled with esbuild,
  CSS compiled with the Tailwind v4 CLI) and a dependency-free Node
  server (built-in `node:http` + `node:sqlite`) that serves the built
  client and a `POST /actions` endpoint.

## Run locally

Requires Node 22 or newer.

```bash
npm install
npm run build
npm start            # http://localhost:3000
```

`npm run dev` does build + start in one step. The server listens on
`$PORT` (default 3000) and stores its data in a local SQLite file,
`server/data/app.db` (override with the `DATA_FILE` env var), through
the libSQL client in `server/db.mjs`. Local development needs **no
environment variables and no database setup** — the file is created
and seeded automatically on first run. Seeding only happens when the
store is empty, so admin edits are never overwritten. To use a hosted
Turso database instead of the file, see the Turso section below.

## Admin panel

Open the site and go to **/#/admin** (i.e. the `/admin` route — in this
hash-routed build the address is `https://your-domain/#/admin`).
There is deliberately **no link to it anywhere on the public pages**;
it can only be reached by typing the address.

Log in with the admin username and password configured on the server:

- Set them with the environment variables **`ADMIN_USERNAME`** and
  **`ADMIN_PASSWORD`** (recommended in production — set them in your
  host's dashboard, never commit them to git).
- If the env vars are unset, the server falls back to the built-in
  default credentials that were set up for the shop. Change them via
  the env vars before exposing the site publicly.

Login sessions are random tokens stored server-side with a 7-day
expiry; the browser keeps the token in localStorage.

## Free durable database with Turso

By default the site stores its data in a local SQLite file. On hosts
without a durable disk (notably Vercel) that file is ephemeral, so
admin edits would be lost on cold starts. The fix is a **free hosted
Turso (libSQL) database** — Turso's free tier needs no credit card and
is more than enough for this site. The server switches to it
automatically when two environment variables are present; no code
changes are needed.

1. Create a free account at [turso.tech](https://turso.tech) (sign up
   with GitHub or email — no card required).
2. Create a database (dashboard **Create Database**, any name, e.g.
   `nextgen-laptops`) — or with the Turso CLI: `turso db create nextgen-laptops`.
3. Get the database URL (dashboard shows it as `libsql://…`, or
   `turso db show nextgen-laptops --url`) and create an auth token
   (dashboard **Create Token**, or `turso db tokens create nextgen-laptops`).
4. Set both variables wherever the site runs:
   - **Vercel:** Project → Settings → Environment Variables →
     `TURSO_DATABASE_URL` = the `libsql://…` URL and
     `TURSO_AUTH_TOKEN` = the token. Then **redeploy** (Deployments →
     ⋯ → Redeploy) so the functions pick them up.
   - **Render (optional):** the same two variables in the service's
     Environment tab (`render.yaml` already declares them) — with
     Turso set, you no longer need a persistent disk for the data.
5. Done: on the next start the server creates the tables in Turso and
   seeds the shop data if the database is empty. From then on, admin
   edits, deals and login sessions are stored durably in Turso and
   survive redeploys and cold starts on any host.

Notes:

- Never commit the token to git — it belongs only in the host's
  environment-variable settings.
- Local development does not need any of this: with the two variables
  unset, the server uses the local file database as before.
- To go back to the file database, just remove the two variables and
  redeploy/restart.

## Deploy via git — Vercel (supported, with a storage caveat)

This repo includes a `vercel.json` and an `api/actions.mjs` serverless
function, so a plain Vercel import of the repo works:

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New → Project**, import the repo. Do not change the
   build settings — `vercel.json` already sets the build command
   (`npm run build`), the output directory (`dist`), and a rewrite from
   `/actions` to the serverless function.
3. Optionally set `ADMIN_USERNAME` / `ADMIN_PASSWORD` in the Vercel
   project's Environment Variables.

**Caveat (only without Turso):** Vercel functions have no durable
disk. If `TURSO_DATABASE_URL` is not set, the store falls back to a
SQLite file in `/tmp`, so the site always displays correctly (it
re-seeds with the shop's data on cold starts), but admin edits and
login sessions can reset between cold starts and redeploys. Set up the
free Turso database (previous section) to make Vercel fully durable —
no host change needed.

## Deploy via git — Render (recommended)



This repo includes a `Dockerfile` and a `render.yaml` Blueprint.

1. Push this folder to a GitHub repository.
2. In Render: **New → Blueprint**, pick the repo. Render reads
   `render.yaml`, builds the Docker image, and starts the web service
   (health check: `/`).
3. In the service's **Environment** tab, set `ADMIN_USERNAME` and
   `ADMIN_PASSWORD`.
4. Optional but recommended: attach a **persistent disk** and set
   `DATA_FILE` to a path on it (for example `/var/data/app.db`).
   Without a disk, the container filesystem is reset on each deploy
   and the store is re-seeded with the default shop data (admin edits
   made since the last deploy are lost).

Manual alternative on Render: **New → Web Service**, connect the repo,
choose the Docker runtime — everything else is the same.

## Deploy alternatives

- **Railway:** create a project from the GitHub repo; Railway detects
  the `Dockerfile`. Set `ADMIN_USERNAME` / `ADMIN_PASSWORD` (and
  optionally `DATA_FILE` pointing at a mounted volume) as service
  variables. Railway provides `$PORT` automatically.
- **Any VPS:** install Node 22+ and git, then:

  ```bash
  git clone <your-repo-url>
  cd nextgen-laptops-deploy
  npm install
  npm run build
  ADMIN_USERNAME=... ADMIN_PASSWORD=... PORT=3000 npm start
  ```

  Put it behind nginx/Caddy for HTTPS, and run it under systemd or
  pm2 so it restarts on reboot. Or build the Docker image
  (`docker build -t nextgen . && docker run -p 3000:3000 nextgen`).

## Project layout

```
index.html          app shell (copied to dist/ at build)
build.mjs           esbuild (JS + .webp assets) + Tailwind CSS build
client/src/         React client (Site, Admin, icons, theme.css, assets)
server/server.mjs   static file server + POST /actions dispatcher
server/db.mjs       libSQL facade — Turso when TURSO_DATABASE_URL is
                    set, otherwise the local SQLite file
server/seed.mjs     seed data + editable-settings allow-list
api/actions.mjs     Vercel serverless function (same actions)
dist/               built client (generated, git-ignored)
server/data/        sqlite data file (generated, git-ignored)
Dockerfile          node:22 multi-stage image, EXPOSE $PORT
render.yaml         Render Blueprint
```

## Notes

- Product photos are official manufacturer images with backgrounds
  removed (transparent WebP cutouts in `client/src/assets/`), shown with
  soft shadows so they work in light and dark mode. Admins can replace
  any deal's photo via the Image URL field in the admin panel.
- No opening hours are published on the site — the shop's note says to
  call or WhatsApp to confirm today's hours.
