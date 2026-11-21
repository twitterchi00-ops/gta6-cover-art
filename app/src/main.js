// Vice Cover Lab — wires the page.
//
// The state is one plain object: layout, grade, lettering, export size,
// title, subtitle, the loaded photos and one panel record per panel
// (which photo it shows, its zoom and its pan). Every control edits the
// state and calls redraw(); the canvas is the only view of the cover.
// A `?shot=` query sets up a fixed scene for a screenshot instead
// (./shots.js).

import { drawCover, panelCount, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const stage = document.getElementById('stage');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const status = document.getElementById('status');
const gallery = document.getElementById('gallery');
const photoInput = document.getElementById('photo');
const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('panx');
const panYInput = document.getElementById('pany');
const panelLabel = document.getElementById('panel-label');

const state = {
  layout: 'grid',
  grade: 'sunset',
  lettering: 'block',
  size: 'wide',
  title: 'VICE CITY',
  subtitle: 'Sunset Heist',
  photos: [],
  panels: [],
  selected: 0,
};

let geometry = null;

/** Rebuilds the panel records when the layout changes, keeping photos. */
function resetPanels() {
  const old = state.panels;
  state.panels = Array.from({ length: panelCount(state.layout) }, (_, i) => {
    const keep = old[i];
    return {
      photo: keep && keep.photo ? keep.photo : null,
      zoom: keep ? keep.zoom : 1,
      panX: keep ? keep.panX : 0,
      panY: keep ? keep.panY : 0,
    };
  });
  state.selected = 0;
  syncPanelControls();
}

/** Gives every panel a photo: one photo fills all panels, several spread out. */
function assignPhotos() {
  if (!state.photos.length) {
    state.panels.forEach((p) => { p.photo = null; });
    return;
  }
  state.panels.forEach((p, i) => {
    p.photo = state.photos.length === 1 ? state.photos[0] : state.photos[i % state.photos.length];
  });
  // Panels that share one photo would otherwise show the same centred crop:
  // spread each shared photo's crops across it, so every panel frames a
  // different part of the photo instead of the same torso three times.
  const seen = new Map();
  state.panels.forEach((p) => {
    if (!p.photo) return;
    const key = state.photos.indexOf(p.photo);
    const j = seen.get(key) ?? 0;
    seen.set(key, j + 1);
    const shared = state.panels.filter((q) => q.photo === p.photo).length;
    if (shared === 1) return;
    p.panX = -0.8 + (1.6 * j) / (shared - 1);
    p.panY = [-0.5, 0, 0.5][j % 3];
    p.zoom = 1.25 + 0.1 * (j % 3);
  });
}

/** Shows the selected panel's zoom and pan on the sliders. */
function syncPanelControls() {
  const p = state.panels[state.selected];
  if (!p) return;
  zoomInput.value = p.zoom;
  panXInput.value = p.panX;
  panYInput.value = p.panY;
  panelLabel.textContent = `Panel ${state.selected + 1} of ${state.panels.length}`;
}

/** Sets every editor control from the current state — title, subtitle, the
 * layout/grade/lettering/size pickers and the selected panel's sliders —
 * so a loaded shot's scene and its controls agree instead of the controls
 * still showing the page's defaults. */
function syncControls() {
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-lettering]').forEach((b) => b.classList.toggle('active', b.dataset.lettering === state.lettering));
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  syncPanelControls();
}

function redraw() {
  geometry = drawCover(canvas, state);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Waits for the vendored fonts, then redraws so lettering is exact. */
async function waitForFonts() {
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('80px "Archivo Black"'),
    ]);
    await document.fonts.ready;
  } catch {
    // System fonts stand in; the cover still draws.
  }
  redraw();
}

/** Renders the current cover at an export size and downloads it as a PNG. */
export async function exportCover(sizeId) {
  const size = SIZES[sizeId] ?? SIZES.wide;
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vice-cover-${size.w}x${size.h}.png`;
  a.click();
  status.textContent = `Saved vice-cover-${size.w}x${size.h}.png`;
  addToGallery(off, size);
  return url;
}

/** Adds a small thumbnail of an export to the gallery strip. */
function addToGallery(sourceCanvas, size) {
  const thumb = document.createElement('canvas');
  const scale = 320 / sourceCanvas.width;
  thumb.width = 320;
  thumb.height = Math.round(sourceCanvas.height * scale);
  thumb.getContext('2d').drawImage(sourceCanvas, 0, 0, thumb.width, thumb.height);
  const figure = document.createElement('figure');
  figure.appendChild(thumb);
  const caption = document.createElement('figcaption');
  caption.textContent = `${size.label} — ${state.title}`;
  figure.appendChild(caption);
  gallery.appendChild(figure);
}

// --- Controls -------------------------------------------------------------

document.querySelectorAll('[data-layout]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.layout = btn.dataset.layout;
    document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b === btn));
    resetPanels();
    assignPhotos();
    redraw();
  });
});
document.querySelectorAll('[data-grade]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.grade = btn.dataset.grade;
    document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b === btn));
    redraw();
  });
});
document.querySelectorAll('[data-lettering]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.lettering = btn.dataset.lettering;
    document.querySelectorAll('[data-lettering]').forEach((b) => b.classList.toggle('active', b === btn));
    redraw();
  });
});
document.querySelectorAll('[data-size]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.size = btn.dataset.size;
    document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b === btn));
    status.textContent = `Export size ${SIZES[state.size].label}`;
  });
});

photoInput.addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  const images = [];
  for (const file of files.slice(0, 4)) {
    images.push(await loadImage(URL.createObjectURL(file)));
  }
  state.photos = images;
  assignPhotos();
  status.textContent = `${images.length} photo${images.length > 1 ? 's' : ''} loaded`;
  redraw();
});

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });

zoomInput.addEventListener('input', () => {
  const p = state.panels[state.selected];
  if (p) { p.zoom = Number(zoomInput.value); redraw(); }
});
panXInput.addEventListener('input', () => {
  const p = state.panels[state.selected];
  if (p) { p.panX = Number(panXInput.value); redraw(); }
});
panYInput.addEventListener('input', () => {
  const p = state.panels[state.selected];
  if (p) { p.panY = Number(panYInput.value); redraw(); }
});

document.getElementById('next-photo').addEventListener('click', () => {
  const p = state.panels[state.selected];
  if (!p || !state.photos.length) return;
  const current = state.photos.indexOf(p.photo);
  p.photo = state.photos[(current + 1) % state.photos.length];
  redraw();
});

document.getElementById('clear-photo').addEventListener('click', () => {
  const p = state.panels[state.selected];
  if (!p) return;
  p.photo = null;
  redraw();
});

// Clicking a panel on the canvas selects it for the zoom and pan sliders.
canvas.addEventListener('click', (e) => {
  if (!geometry) return;
  const rect = canvas.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const hit = geometry.panels.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
  if (hit >= 0) {
    state.selected = hit;
    syncPanelControls();
    status.textContent = `Panel ${hit + 1} selected — zoom and pan it below`;
  }
});

document.getElementById('export').addEventListener('click', () => exportCover(state.size));
document.getElementById('sample').addEventListener('click', async () => {
  state.photos = [await loadImage('samples/pier.jpg'), await loadImage('samples/boulevard.jpg')];
  assignPhotos();
  status.textContent = 'Sample photos loaded';
  redraw();
});

// --- Start ---------------------------------------------------------------

resetPanels();
redraw();
waitForFonts();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    state,
    canvas,
    stage,
    loadSample: (name) => loadImage(`samples/${name}.jpg`),
    redraw,
    resetPanels,
    assignPhotos,
    exportCover,
    setStatus: (text) => { status.textContent = text; },
  }).then(() => syncControls());
}
