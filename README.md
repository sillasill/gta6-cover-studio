# Neon Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/sillasill/gta6-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/sillasill/gta6-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your photos and a caption into GTA-style multi-panel cover art — sunset/neon grades, bold Anton lettering with a neon Pacifico subtitle, and PNG export in 1080×1080, 1080×1350 and 1920×1080. Entered in make.fun's gta6-cover-art-01 bounty.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: every script, font and sample photo is a file under `app/`, and your photos are read on your own machine, never uploaded.

## What it does

- **Any photo** — load up to 6 photos, place any of them in any panel, crop and position each panel by dragging, scrolling to zoom, or with the sliders.
- **Six layouts** — Tilted Snapshots, Hero + Three, Four Grid, Nine Grid, Triptych, Full Bleed.
- **Five grades** — Sunset, Neon Vice, Palm Dusk, Hot Pink and Teal Night gradient-map grades.
- **Lettering** — a halftone title band with gradient Anton capitals, a glowing Pacifico subtitle, a star badge and ribbon.
- **Fast** — photo to PNG in a few clicks; export one size or all three at once. Undo/redo included.

## Fonts & samples

Anton and Pacifico are bundled under `app/fonts/` under the SIL Open Font License (`OFL.txt`). The two sample photos under `app/samples/` were made with an image model and are free to use. Nothing here is Rockstar Games artwork, logo or font — the art, lettering and layouts are original.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
node /path/to/kit/cli/makefun.mjs check --kit /path/to/kit --repo . --worktree
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=bfyeqrq3&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
