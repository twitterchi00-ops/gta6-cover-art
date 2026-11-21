// Vice Cover Lab — the program that hands this entry in (Node 22, standard
// library only). It copies this repository's app/ and screenshots/ into the
// output directory and writes /output/dossier.json with the vendored make.fun
// library, exactly as the kit's starter does. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The app itself is plain static files under app/: index.html plus classic
// scripts, vendored OFL fonts and the kit's free sample photos. It runs
// offline in desktop Chrome (serve it with `node serve.ts`, or open
// app/index.html directly — classic scripts work from file:// too).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree(join(root, 'app'), join(outDir, 'app'));
if (existsSync(join(root, 'screenshots'))) {
  copyTree(join(root, 'screenshots'), join(outDir, 'screenshots'));
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of
// app files, in all, or a path under app/ over 1000 bytes: app/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
