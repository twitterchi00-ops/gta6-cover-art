// Vice Cover Lab — editor wiring: photo loading, pickers, per-panel crop,
// live preview, PNG export, and the ?shot= staging used for screenshots.
import { drawCover, LAYOUTS, GRADES, LETTERINGS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const state = {
  layout: 'hero',
  grade: 'vice',
  lettering: 'block',
  size: 'square',
  title: 'Sunset Heist',
  subtitle: 'Vice City Stories',
  photos: [],
  pans: [],
  selectedPanel: 0,
};

const $ = (id) => document.getElementById(id);
const preview = $('preview');

function sizeOf() {
  return SIZES.find((s) => s.id === state.size) || SIZES[0];
}

function ensurePans(n) {
  while (state.pans.length < n) state.pans.push({ x: 0, y: 0, zoom: 1 });
  state.pans.length = n;
}

function render() {
  const size = sizeOf();
  preview.width = size.w;
  preview.height = size.h;
  ensurePans(5);
  drawCover(preview, state.photos, {
    layout: state.layout,
    grade: state.grade,
    lettering: state.lettering,
    title: state.title,
    subtitle: state.subtitle,
    pans: state.pans,
  });
  // Gallery: small previews of the other two sizes.
  const gal = $('gallery');
  gal.innerHTML = '';
  SIZES.filter((s) => s.id !== state.size).forEach((s) => {
    const c = document.createElement('canvas');
    c.width = s.w;
    c.height = s.h;
    c.className = 'gal';
    c.title = s.label;
    drawCover(c, state.photos, {
      layout: state.layout,
      grade: state.grade,
      lettering: state.lettering,
      title: state.title,
      subtitle: state.subtitle,
      pans: state.pans,
    });
    gal.appendChild(c);
  });
  const pan = state.pans[state.selectedPanel] || { x: 0, y: 0, zoom: 1 };
  $('panX').value = pan.x;
  $('panY').value = pan.y;
  $('zoom').value = pan.zoom;
  $('panelLabel').textContent = `Panel ${state.selectedPanel + 1}`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSample(name) {
  const img = await loadImage(`samples/${name}.png`);
  state.photos = [img];
  state.pans = [];
  render();
}

function buildPickers() {
  const mk = (el, items, current, onPick) => {
    el.innerHTML = '';
    items.forEach((it) => {
      const b = document.createElement('button');
      b.textContent = typeof it === 'string' ? it : it.label;
      b.className = 'pick' + ((typeof it === 'string' ? it : it.id) === current ? ' on' : '');
      b.addEventListener('click', () => {
        onPick(typeof it === 'string' ? it : it.id);
        buildPickers();
        render();
      });
      el.appendChild(b);
    });
  };
  mk($('layouts'), LAYOUTS, state.layout, (v) => { state.layout = v; });
  mk($('grades'), GRADES, state.grade, (v) => { state.grade = v; });
  mk($('letterings'), LETTERINGS, state.lettering, (v) => { state.lettering = v; });
  mk($('sizes'), SIZES, state.size, (v) => { state.size = v; });
}

function wire() {
  $('title').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('photoFile').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = await loadImage(url);
    state.photos = [img];
    state.pans = [];
    render();
  });
  $('sampleBoulevard').addEventListener('click', () => loadSample('boulevard'));
  $('samplePier').addEventListener('click', () => loadSample('pier'));
  $('panX').addEventListener('input', (e) => { state.pans[state.selectedPanel].x = Number(e.target.value); render(); });
  $('panY').addEventListener('input', (e) => { state.pans[state.selectedPanel].y = Number(e.target.value); render(); });
  $('zoom').addEventListener('input', (e) => { state.pans[state.selectedPanel].zoom = Number(e.target.value); render(); });
  $('nextPanel').addEventListener('click', () => {
    state.selectedPanel = (state.selectedPanel + 1) % 5;
    render();
  });
  $('exportBtn').addEventListener('click', () => {
    const size = sizeOf();
    const c = document.createElement('canvas');
    c.width = size.w;
    c.height = size.h;
    drawCover(c, state.photos, {
      layout: state.layout,
      grade: state.grade,
      lettering: state.lettering,
      title: state.title,
      subtitle: state.subtitle,
      pans: state.pans,
    });
    c.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${size.id}.png`;
      a.click();
    }, 'image/png');
  });
  preview.addEventListener('click', () => {
    state.selectedPanel = (state.selectedPanel + 1) % 5;
    render();
  });
}

async function boot() {
  buildPickers();
  wire();
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (q.get('caption')) { state.title = q.get('caption'); $('title').value = state.title; }
  if (q.get('subtitle')) { state.subtitle = q.get('subtitle'); $('subtitle').value = state.subtitle; }
  if (q.get('layout')) state.layout = q.get('layout');
  if (q.get('grade')) state.grade = q.get('grade');
  if (q.get('lettering')) state.lettering = q.get('lettering');
  if (q.get('size')) state.size = q.get('size');
  if (shot) {
    await runShot(shot, q, loadSample);
    render();
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
    return;
  }
  await loadSample('pier');
}

boot();
