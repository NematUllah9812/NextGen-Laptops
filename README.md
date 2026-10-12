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

Requires Node 22 or newer (the server uses the built-in `node:sqlite`).

```bash
npm install
npm run build
npm start            # http://localhost:3000
```

`npm run dev` does build + start in one step. The server listens on
`$PORT` (default 3000) and stores its data in `server/data/app.db`
(override with the `DATA_FILE` env var). On first run the store is
seeded automatically with the shop's current data; seeding only happens
when the store is empty, so admin edits are never overwritten.

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
server/seed.mjs     seed data + editable-settings allow-list
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
