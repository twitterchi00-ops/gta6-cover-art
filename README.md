[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/twitterchi00-ops/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/twitterchi00-ops/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Cover Lab — GTA-style cover art maker

Turn your photo and a caption into cover art in the style of GTA 6's posters:
the multi-panel poster look, bold caption lettering, and a Vice City sunset or
neon colour grade — exported as a PNG to share. Made for the
[make.fun GTA 6 Cover Art bounty](https://make.fun/bounty/gta6-cover-art-01)
(`gta6-cover-art-01`, $250 USDC top-50 split).

Everything is original: the art is drawn from code (gradients, sunburst,
halftone, grain, a synthwave grid floor), the lettering uses our own vendored
OFL fonts (Anton and Archivo Black), and the sample photos are the kit's free
model-made images. No Rockstar logo, artwork, character or font anywhere.

## What it does

- **Any photo** — upload one or several photos from your machine (never
  uploaded anywhere); each panel gets its own photo.
- **Crop & position** — click a panel, drag its photo to pan, scroll (or the
  slider) to zoom, arrow keys nudge, reset crop any time.
- **Multi-panel layouts** — Solo, Duo, Trio (the poster classic), Quad grid,
  and Strip (hero on top). Empty panels show a procedural synthwave scene
  (glowing slatted sun, skyline with lit windows, perspective grid floor,
  palm silhouettes) until you add a photo.
- **Caption** — title (auto-fits to one or two lines by binary search),
  subtitle, and a location tag pill; four lettering styles: Sunset gradient,
  Neon glow, Chrome, Outline.
- **Colour grades** — Vice Sunset, Neon Nights, Palm Dusk, Chrome Vice,
  Bubblegum; each with its own wash, vignette and glow.
- **Effects** — sunburst rays behind the title, halftone dots, film grain,
  poster frame with corner ticks and an inner glow hairline; all toggleable.
- **Fast** — "Use sample photos" + "🎲 Surprise me" get you from nothing to a
  cover in seconds; export is one click.
- **Export PNG** — 1080 × 1080 (square), 1080 × 1350 (portrait),
  1920 × 1080 (wide), rendered fresh at full size.

## Run it (offline, no build step)

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

Or open `app/index.html` directly in desktop Chrome — classic scripts, so it
works from `file://` too, with no network request at all. Every script, font
and image it loads is a file under `app/`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`vendor/makefun-app.ts` library.

## Screenshots

`1-cover.jpg` is the exported wide cover; `2-editor.jpg` is the editor with
photos loaded; `3-cover-portrait.jpg` and `4-cover-square.jpg` are exported
covers in the other post sizes. They were taken from the app itself
(`shots.json` lists the scenes; `?shot=cover|editor` in the URL reproduces
them) with the kit's free sample photos.

## Files

- `app/index.html`, `app/style.css` — the editor page.
- `app/src/cover.js` — the cover renderer: layouts, grades, lettering,
  procedural synthwave scenes, halftone/grain/sunburst/frame.
- `app/src/main.js` — editor wiring: upload, drag/zoom crop, export.
- `app/src/shots.js` — fixed screenshot scenes (`?shot=`) and the export test.
- `app/fonts/` — Anton + Archivo Black (SIL Open Font License, see `OFL.txt`).
- `app/samples/` — the kit's free model-made sample photos.
- `main.ts`, `vendor/makefun-app.ts`, `serve.ts`, `shots.json`.
