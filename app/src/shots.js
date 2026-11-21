// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo loaded; ?shot=cover shows the cover alone, full frame, at the
// export size the query picks; ?shot=gallery shows the editor with two
// exports in the gallery. The query picks layout, grade, lettering, size,
// photo, title and subtitle. window.__shotReady is set once painted, after
// the fonts have loaded so the lettering is exact.

import { SIZES } from './cover.js';

/** Applies the query's choices to the shared state. */
function applyQuery(query, api) {
  const s = api.state;
  if (query.get('layout')) s.layout = query.get('layout');
  if (query.get('grade')) s.grade = query.get('grade');
  if (query.get('lettering')) s.lettering = query.get('lettering');
  if (query.get('size')) s.size = query.get('size');
  if (query.get('title')) s.title = query.get('title');
  if (query.get('subtitle') !== null) s.subtitle = query.get('subtitle');
  api.resetPanels();
}

/** Loads the named sample photo into every panel, then redraws. */
async function loadPhoto(query, api) {
  const name = query.get('photo') ?? 'pier';
  const img = await api.loadSample(name);
  api.state.photos = [img];
  api.assignPhotos();
  api.redraw();
}

/** Signals the screenshot driver that the scene is painted. */
function ready() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

export async function runShot(shot, query, api) {
  applyQuery(query, api);
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = SIZES[api.state.size] ?? SIZES.wide;
    api.canvas.width = size.w;
    api.canvas.height = size.h;
    await loadPhoto(query, api);
    await document.fonts.ready;
    api.redraw();
    ready();
    return;
  }
  await loadPhoto(query, api);
  if (shot === 'gallery') {
    await api.exportCover('square');
    await api.exportCover('wide');
    api.setStatus('Two exports in the gallery');
  }
  await document.fonts.ready;
  api.redraw();
  ready();
}
