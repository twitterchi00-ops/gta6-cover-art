[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/twitterchi00-ops/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/twitterchi00-ops/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Cover Lab — make.fun `gta6-cover-art-01`

Entry for the make.fun bounty **gta6-cover-art-01** ("Build the best GTA 6
cover art", $250 USDC top-50, free entry, deadline 21 Nov 2026 14:00 Tehran).
A web app that turns your photo and a caption into GTA 6-style cover art
and exports it as a PNG to share. It runs offline in a desktop browser
from its own static files: the photos never leave your machine.

## What it does

- **5 layouts**: Grid 2×2, Hero + 3, Full bleed, Strip, Poster — the
  multi-panel poster look, with a title band (or a scrim on full bleed).
- **5 colour grades**: Vice Sunset, Neon Night, Palm Gold, Mono Noir,
  Acid Lime — a wash over every panel plus a vignette.
- **4 lettering styles**: Block, Neon, Outline, Sunset fill — Anton and
  Archivo Black, both shipped under the SIL Open Font License.
- **Any photo**: load up to 4 photos from your machine. One photo fills
  every panel; several spread across them. Click a panel to select it,
  then zoom and pan its photo, swap in the next photo, or leave the
  panel procedural.
- **Procedural panels**: a panel with no photo draws its own synthwave
  scene — gradient sky, a slatted setting sun, a perspective grid floor,
  a skyline and palms — so the cover is striking even before you add a
  photo.
- **Export**: one click exports a PNG in 1080 × 1080, 1080 × 1350 or
  1920 × 1080, and keeps it in the gallery strip below the stage.

## Try it

Serve `app/` with any static server and open `index.html`, or run the
bundled one from this directory:

```
node serve.ts
```

then open http://localhost:8080.

## Hand in

`main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` to `/output` and writes `/output/dossier.json` with the
vendored make.fun library:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Files

- `app/index.html` — the studio page
- `app/style.css` — the dark neon studio theme
- `app/src/cover.js` — the cover renderer (layouts, grades, lettering,
  procedural synthwave panels)
- `app/src/main.js` — the state and the controls
- `app/src/shots.js` — the fixed screenshot scenes
- `app/fonts/` — Anton and Archivo Black (SIL OFL, license in OFL.txt)
- `app/samples/` — the kit's two sample photos (free to use)
- `main.ts` — the entry program; `serve.ts` — the local static server
- `shots.json` — the four screenshot scenes; `screenshots/` — the shots

Everything is original work: no Rockstar Games logo, artwork or font.
