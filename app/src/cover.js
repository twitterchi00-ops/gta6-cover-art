// Vice Cover Lab — cover renderer. Draws a GTA-style multi-panel poster onto a
// canvas: procedural synthwave grade, per-panel photo crop/position, bold caption
// lettering. Pure canvas 2D, no network, no library.
export const LAYOUTS = ['stack', 'grid', 'hero', 'split', 'strip'];
export const GRADES = ['vice', 'neon', 'gold', 'noir', 'candy'];
export const LETTERINGS = ['block', 'outline', 'neon', 'slant'];
export const SIZES = [
  { id: 'square', w: 1080, h: 1080, label: '1080 x 1080' },
  { id: 'portrait', w: 1080, h: 1350, label: '1080 x 1350' },
  { id: 'wide', w: 1920, h: 1080, label: '1920 x 1080' },
];

const GRADE_STOPS = {
  vice: ['#ff2d78', '#ff7a18', '#ffd319'],
  neon: ['#00e5ff', '#7b2ff7', '#ff2d78'],
  gold: ['#ffb347', '#ffcc33', '#fff3b0'],
  noir: ['#0b1026', '#1b2a6b', '#3d5afe'],
  candy: ['#ff5da2', '#b967ff', '#3ec5ff'],
};

const GRADE_TINT = {
  vice: 'rgba(255,45,120,0.20)',
  neon: 'rgba(0,229,255,0.18)',
  gold: 'rgba(255,179,71,0.22)',
  noir: 'rgba(20,40,120,0.25)',
  candy: 'rgba(255,93,162,0.18)',
};

// Panel rectangles for each layout, as fractions of the cover [x, y, w, h].
export function layoutPanels(layout, w, h) {
  const full = [0, 0, w, h];
  switch (layout) {
    case 'stack':
      return [
        [0, 0, w, h * 0.42],
        [0, h * 0.42, w * 0.5, h * 0.33],
        [w * 0.5, h * 0.42, w * 0.5, h * 0.33],
        [0, h * 0.75, w, h * 0.25],
      ];
    case 'grid':
      return [
        [0, 0, w * 0.5, h * 0.5],
        [w * 0.5, 0, w * 0.5, h * 0.5],
        [0, h * 0.5, w * 0.5, h * 0.5],
        [w * 0.5, h * 0.5, w * 0.5, h * 0.5],
      ];
    case 'hero':
      return [
        [0, 0, w, h * 0.62],
        [0, h * 0.62, w * 0.5, h * 0.38],
        [w * 0.5, h * 0.62, w * 0.5, h * 0.38],
      ];
    case 'split':
      return [
        [0, 0, w * 0.5, h],
        [w * 0.5, 0, w * 0.5, h],
      ];
    case 'strip':
      return [0, 1, 2, 3, 4].map((i) => [w * (i / 5), 0, w / 5, h]);
    default:
      return [full];
  }
}

function coverFit(img, rect, panX, panY, zoom) {
  const [x, y, w, h] = rect;
  const scale = Math.max(w / img.width, h / img.height) * zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2 + panX * w * 0.25;
  const dy = y + (h - dh) / 2 + panY * h * 0.25;
  return [dx, dy, dw, dh];
}

function paintGrade(ctx, grade, w, h) {
  const stops = GRADE_STOPS[grade] || GRADE_STOPS.vice;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, stops[0]);
  g.addColorStop(0.55, stops[1]);
  g.addColorStop(1, stops[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Sun disc with horizontal slits, synthwave style.
  const cx = w * 0.72;
  const cy = h * 0.3;
  const r = Math.min(w, h) * 0.2;
  const sun = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  sun.addColorStop(0, '#fff3b0');
  sun.addColorStop(0.7, stops[2]);
  sun.addColorStop(1, stops[1]);
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = GRADE_STOPS[grade][0];
  for (let i = 0; i < 5; i++) {
    const sy = cy + r * (0.1 + i * 0.16);
    ctx.fillRect(cx - r, sy, r * 2, r * 0.05);
  }
}

function drawPanel(ctx, img, rect, opts, index) {
  const [x, y, w, h] = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (img) {
    const pan = opts.pans[index] || { x: 0, y: 0, zoom: 1 };
    const [dx, dy, dw, dh] = coverFit(img, rect, pan.x, pan.y, pan.zoom);
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    paintGrade(ctx, opts.grade, w, h);
  }
  ctx.fillStyle = GRADE_TINT[opts.grade] || GRADE_TINT.vice;
  ctx.fillRect(x, y, w, h);
  // Panel frame + index tag.
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.restore();
}

function drawCaption(ctx, opts, w, h) {
  const title = (opts.title || 'VICE CITY').toUpperCase();
  const subtitle = (opts.subtitle || '').toUpperCase();
  const size = Math.min(w, h) * 0.11;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cy = h * 0.86;
  const font = (weight, px) => `${weight} ${px}px Anton, 'Archivo Black', sans-serif`;
  if (opts.lettering === 'slant') ctx.transform(1, 0, -0.12, 1, 0, 0);
  if (opts.lettering === 'outline') {
    ctx.font = font(400, size);
    ctx.lineWidth = Math.max(2, size * 0.08);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(title, w / 2, cy);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText(title, w / 2 + 3, cy + 3);
  } else if (opts.lettering === 'neon') {
    ctx.font = font(400, size);
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = size * 0.35;
    ctx.fillStyle = '#eafcff';
    ctx.fillText(title, w / 2, cy);
    ctx.shadowBlur = 0;
  } else {
    ctx.font = font(400, size);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.05;
    ctx.fillText(title, w / 2, cy);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = Math.max(2, size * 0.05);
    ctx.strokeText(title, w / 2, cy);
  }
  if (subtitle) {
    ctx.font = `400 ${Math.round(size * 0.32)}px 'Archivo Black', sans-serif`;
    ctx.fillStyle = '#ffd319';
    ctx.fillText(subtitle, w / 2, cy + size * 0.62);
  }
  ctx.restore();
  // Small maker tag, bottom corner.
  ctx.save();
  ctx.font = `400 ${Math.round(Math.min(w, h) * 0.02)}px 'Archivo Black', sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'right';
  ctx.fillText('VICE COVER LAB', w - 14, h - 12);
  ctx.restore();
}

// Draw the whole cover. opts: { layout, grade, lettering, title, subtitle, pans }.
// pans: array of {x, y, zoom} per panel index. photos: array of images (one per panel, or one reused).
export function drawCover(canvas, photos, opts) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  paintGrade(ctx, opts.grade, w, h);
  const panels = layoutPanels(opts.layout, w, h);
  panels.forEach((rect, i) => {
    const img = photos[i % photos.length] || null;
    drawPanel(ctx, img, rect, opts, i);
  });
  drawCaption(ctx, opts, w, h);
  return canvas;
}
