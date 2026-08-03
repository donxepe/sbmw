# Minimalist Full Body — installable workout PWA

A self-contained Progressive Web App: 2-day full-body hypertrophy routine, per-set logging
(lbs), session history, and JSON export/import. All data lives in your browser's
`localStorage`. No accounts, no server, no tracking.

## Files
- `index.html` — the whole app (React via CDN, compiled in-browser by Babel)
- `manifest.webmanifest` — makes it installable ("Add to Home Screen")
- `sw.js` — service worker; caches everything for **offline** use after first load
- `icon-192.png`, `icon-512.png` — app icons

---

## Option 1 — Just run it in your phone browser (quickest)

The catch: the **service worker and install prompt only work over `https://` or
`localhost`**, not `file://`. So you need to serve the folder, not just open the file.

From the folder on any machine on your network:

```bash
# Python (already on most systems)
python3 -m http.server 8080
# …or Node
npx serve -l 8080
```

Then on your phone, open `http://<that-machine-ip>:8080`.

Since you already run Tailscale, the cleanest path is to serve from your desktop
(`nivmizzet`) and hit its Tailscale IP/hostname from your phone — works anywhere, no
port-forwarding. For a *true* install (offline + home-screen icon) you want HTTPS;
`tailscale serve` can put it behind HTTPS in one command:

```bash
# serves the current dir over your tailnet with a valid cert
tailscale serve --bg 8080      # after starting the http.server above on :8080
```

…then open the `https://<host>.ts.net` URL on your phone.

---

## Option 2 — Host it for free (best; real install, offline, HTTPS)

**GitHub Pages** is the simplest permanent home:

1. Create a repo, drop these 5 files in the root, push.
2. Repo → Settings → Pages → Source: `main` branch, `/root`.
3. Open the `https://<you>.github.io/<repo>/` URL on your phone.

Any static host works too (Netlify drag-and-drop, Cloudflare Pages, Vercel).

---

## Installing on your phone

- **Android / Chrome:** open the hosted URL → menu (⋮) → **Add to Home screen** /
  **Install app**. It launches fullscreen, works offline.
- **iOS / Safari:** open the URL → Share → **Add to Home Screen**. (iOS PWAs use the
  manifest + apple-touch-icon already included.)

After the first online load, the service worker caches the app + React/Babel, so it
opens offline at the gym.

---

## Backups

Your log + history live in `localStorage`, which is per-browser. **Export regularly**
(↓ export downloads a JSON file). To restore or move to another phone, use ↑ import →
choose the file (or paste the JSON). History merges by ID, so re-importing won't
duplicate sessions.

> Note: clearing browser data / site data wipes `localStorage`. The export file is your
> real backup.

---

## Tweaking the routine

Everything is data-driven. Open `index.html` and edit the `days` array near the top —
exercise names, sets, reps, RIR, rest, coaching notes, `dropSet` flags, and the
`videoQuery` used for the YouTube form-video link. You don't need to touch the `CACHE`
version in `sw.js` — the GitHub Pages deploy stamps it with a hash of the app files, so a
phone always picks up a changed app instead of serving the old cached one.

## Optional: a "real" build later

If you'd rather drop the in-browser Babel compile (slightly faster cold start), this
ports cleanly to a Vite + React project — move the `Routine` component into `App.jsx`,
keep the `localStorage` helpers, and add `vite-plugin-pwa` to generate the manifest +
service worker. Not necessary, just an option.
