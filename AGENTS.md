# AGENTS.md

Context for AI agents working on this repo. Read this before editing.

## What this is

A single-file, installable PWA for logging a specific 2-day full-body hypertrophy
routine. No build step, no framework CLI, no dependencies to install. It is deliberately
minimal — resist the urge to "modernize" it into a bundled project unless explicitly
asked.

Deployed via **GitHub Pages**, used on a phone (Chrome/Android) at the gym, often
offline.

## Files

| File | Role |
|---|---|
| `index.html` | **The entire app.** Data, component, styles, bootstrap — all of it (~543 lines) |
| `sw.js` | Service worker. Cache-first offline shell |
| `manifest.webmanifest` | PWA manifest (install / home-screen) |
| `icon-192.png`, `icon-512.png` | App icons |
| `README.md` | End-user setup / hosting instructions |

## Architecture

Everything lives in one `<script type="text/babel">` block in `index.html`. React 18 +
Babel standalone load from unpkg CDN and JSX is compiled **in the browser at runtime**.

Rough layout of that script block:

- `STORE_LOGS` / `STORE_HISTORY` — localStorage keys
- `days[]` — **the routine data.** Two day objects (A/B), each with `exercises[]`
- `principles[]` — the "Why this works" cards
- `key()`, `loadJSON()`, `saveJSON()` — helpers
- `Routine()` — the single component holding all state and both views
- `btn()`, `modalBg`, `modalCard` — shared style helpers (defined *after* `Routine`;
  function hoisting makes this fine, don't "fix" it)
- `ReactDOM.createRoot(...).render(...)` + service worker registration

### Exercise object shape

```js
{
  name: "Chest Press Machine",
  videoQuery: "jeff nippard chest press machine form", // → YouTube search URL
  sets: 3,
  reps: "6–8",          // display string, not parsed
  rir: "1–2",           // display string
  rest: "3 min",        // display string
  note: "...",          // coaching cue
  target: "Chest, Anterior Delt, Triceps",
  warmup: [{ pct: 50, reps: 8, label: "50%" }],  // [] = no warm-up sets
  warmupNote: "...",    // shown either way; explains the why
  dropSet: true,        // optional — adds badge, protocol box, d1/d2 log rows
  dropNote: "...",      // required if dropSet
}
```

### Data model (localStorage)

Two keys, both JSON:

- `workout-logs-min` — the **current, in-progress sheet**. Flat map:
  `{ "A-0-0": { weight: "135", reps: "8" }, "A-4-d1": {...} }`
  Key format is `` `${dayId}-${exerciseIndex}-${setKey}` `` where `setKey` is a numeric
  index (`0`, `1`, `2`) for working sets or `d1`/`d2` for drop-set drops.
- `workout-history-min` — array of finished sessions, newest first:
  `{ id: <Date.now()>, date: <ISO>, dayId: "A", focus: "Full Body A", entries: {...} }`
  where `entries` is a frozen copy of a logs map.

Every keystroke writes through to localStorage immediately (`updateLog` → `saveJSON`).
There is no debounce and it doesn't need one.

**Export/import JSON envelope:**

```json
{ "app": "minimalist-full-body", "version": 1, "exportedAt": "...",
  "current": { /* logs map */ }, "history": [ /* sessions */ ] }
```

Import merges history **by session `id`** so re-importing is idempotent, and refuses to
clobber an in-progress sheet (only restores `current` when the live sheet is empty).
Preserve both behaviors.

## Critical rules

1. **Don't hand-edit the cache version in `sw.js`.** The Pages deploy rewrites
   `const CACHE = "…"` to `minimalist-fb-<8 hex>`, a sha256 over `index.html`, `sw.js`,
   `manifest.webmanifest` and the two icons, in the published artifact only — so a changed
   app can never be served from a stale cache, and a docs-only commit can never invalidate
   one. The literal committed in `sw.js` is just what a local `python3 -m http.server`
   sees. Keep line 2 in the exact shape `const CACHE = "…";`: if
   `.github/scripts/stamp-cache.sh` can't match it, the deploy fails.
2. **Never break backwards compatibility of the localStorage schema.** The user has real
   training history in there and it is not backed up anywhere but manual exports. If a
   schema change is unavoidable, migrate on read and keep reading the old shape.
3. **Don't reorder or delete entries in `days[].exercises[]` casually.** Log keys encode
   the exercise *index*. Reordering silently re-associates historical data with the wrong
   exercise. Appending to the end is safe; inserting in the middle is not.
4. **No build step. No npm install. No bundler.** Adding a dependency means adding a CDN
   `<script>` tag *and* adding that URL to `ASSETS` in `sw.js`, or it breaks offline.
5. Keep it a single file. New sections go in `index.html`, not new modules.

## Conventions

- **Styling is inline `style={{}}` objects.** No CSS framework, no classes (a handful of
  global resets live in the `<style>` block for tap-highlight, number-input spinners,
  safe-area insets). Match the existing style — don't introduce Tailwind or styled-components.
- **Palette:** bg `#0e0f11`, card `#111317`, card-open `#14161a`, border `#1c1e24`,
  text `#e8e6e1`, muted `#888`/`#555`/`#444`. Day A accent `#e05c3a`, Day B `#3a7de0`,
  success/green `#3aa87d`. Accents are used with hex-alpha suffixes (`+ "18"`, `+ "44"`,
  `+ "66"`).
- **Fonts:** `DM Sans` for prose, `DM Mono` for numbers, labels, and anything tabular.
- **Mobile first.** Inputs must stay at `fontSize: 16` or iOS zooms on focus. Keep
  `inputMode="decimal"` / `"numeric"` on the log fields.
- Use `React.Fragment` explicitly in the log-row `.map()`s — the grid layout depends on
  the three children being direct grid items, so shorthand `<>` with a `key` won't do.
- Units are **lbs** throughout.

## Verifying a change

There's no test suite. Minimum bar before committing:

```bash
# 1. Does the JSX still compile? (Babel compiles at runtime, so a syntax
#    error = white screen with only a console message.)
npx @babel/cli --presets @babel/preset-react --no-babelrc <extracted script> -o /dev/null

# 2. Serve and click through it.
python3 -m http.server 8080
```

Then manually: expand an exercise, type in a weight, reload the page (values persist),
Finish & save (session appears in History), export (file downloads), import it back
(no duplicates).

Because JSX compiles in-browser, **a syntax error produces a blank page, not a build
error.** Always load the page once after editing.

## Domain notes

The programming is evidence-based and intentional — this isn't generic filler content.
Before changing sets, reps, rest, or exercise selection, know that:

- **6–8 reps** is chosen for stimulus-to-fatigue ratio, not because it's uniquely
  hypertrophic.
- **3 min rest** on compounds is for phosphocreatine resynthesis (~95% at 3 min);
  90 sec on isolations is deliberate, not an oversight.
- **Drop sets appear only on the final isolation** of each day — evidence supports them
  as time-efficient, and machines/cables make training past failure safe there. Don't
  add them to compounds.
- **Leg volume is deliberately low** (one quad, one hamstring/glute movement). The user
  bike-commutes ~20 min round trip daily, which covers quad exposure and aerobic work.
- **Warm-up percentages** taper by position in the session: two warm-up sets for the
  first exercise and for the first fresh joint pattern (hack squat), one for
  already-warm muscles, none for isolations.

If asked to change programming, flag tradeoffs rather than silently applying them.

## Known constraints

- Babel-in-browser adds a small cold-start delay. Accepted tradeoff for zero build.
  Porting to Vite + `vite-plugin-pwa` is the sanctioned path *if* the user asks.
- Service worker + install prompt require HTTPS (or localhost). `file://` won't work.
- localStorage is per-browser and per-origin; clearing site data wipes everything.
  Manual export is the only real backup — treat the export path as load-bearing.
