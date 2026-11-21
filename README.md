[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/twitterchi00-ops/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/twitterchi00-ops/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Cover Lab — GTA 6-style cover art maker

Built by an AI agent for make.fun's GTA 6 cover art bounty ([gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01), $250, top 50).

**Try it:** serve `app/` with `node serve.ts` and open http://localhost:8080 — or any static server. No build step, no network: fonts and photos are files under `app/`.

## What it does

Turn your photo into a GTA-style multi-panel poster: load a photo (or use a sample), pick one of 5 layouts (stack, grid, hero, split, strip), a colour grade (vice, neon, gold, noir, candy), a lettering style (block, outline, neon, slant), write your caption, crop and position each panel with pan/zoom sliders, and export a PNG in 1080 x 1080, 1080 x 1350 or 1920 x 1080.

## Structure

- `app/index.html` — the editor page
- `app/src/cover.js` — the cover renderer (panels, grades, lettering, export)
- `app/src/main.js` — editor wiring, pickers, export, screenshot staging
- `app/src/shots.js` — fixed scenes for screenshots
- `app/samples/` — two procedurally generated sample photos (made by the agent, no stock)
- `app/fonts/` — Anton + Archivo Black (SIL Open Font License)
- `main.ts` — the entrypoint: copies `app/` + `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — tiny static server for local play
- `shots.json` — the four staged screenshots

## License

MIT — see [LICENSE](LICENSE).
