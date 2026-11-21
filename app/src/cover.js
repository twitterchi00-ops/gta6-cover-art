// Vice Cover Lab — the cover renderer.
//
// Draws a multi-panel GTA-style poster onto a canvas: the panels show the
// person's photos (cropped and positioned per panel) or, where no photo is
// loaded, a procedural synthwave scene drawn from scratch; a colour grade
// washes the whole cover; bold lettering carries the title and subtitle.
//
// Everything here is drawn with the canvas 2D API. No image is fetched
// over the network: photos come from the person's own machine, and the
// procedural panels are pure code.

/** A small deterministic PRNG so a procedural panel looks the same every run. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The five colour grades: sky, horizon and accent colours for the wash. */
export const GRADES = {
  sunset: { sky: '#2b0f4d', mid: '#c2257a', low: '#ff7a2f', accent: '#ffb347', name: 'Vice Sunset' },
  neon: { sky: '#04122e', mid: '#123a8f', low: '#ff2e88', accent: '#2ee6ff', name: 'Neon Night' },
  gold: { sky: '#1c1305', mid: '#7a4d12', low: '#f2b705', accent: '#37e0a0', name: 'Palm Gold' },
  noir: { sky: '#0c0c0e', mid: '#3a3a40', low: '#c8c8ce', accent: '#ffffff', name: 'Mono Noir' },
  acid: { sky: '#0d1f05', mid: '#3d7a1e', low: '#b6ff2e', accent: '#b44dff', name: 'Acid Lime' },
};

/** The four lettering styles. */
export const LETTERINGS = {
  block: { name: 'Block', font: 'Anton' },
  neon: { name: 'Neon Script', font: 'Archivo Black' },
  outline: { name: 'Outline', font: 'Anton' },
  sunset: { name: 'Sunset Fill', font: 'Anton' },
};

/** The three export sizes. */
export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  story: { w: 1080, h: 1350, label: '1080 x 1350' },
  wide: { w: 1920, h: 1080, label: '1920 x 1080' },
};

/**
 * Panel and title geometry for a layout, in canvas pixels.
 * Returns { panels: [{x, y, w, h}], title: {x, y, w, h} | null }.
 * The title band is a solid bar the caption sits in; the bleed layout
 * overlays its caption on the photo instead, so its title rect is the
 * scrim area at the foot of the canvas.
 */
export function layoutGeometry(layout, w, h) {
  const gap = Math.max(4, Math.round(w * 0.012));
  const bandH = Math.round(h * 0.17);
  const top = h - bandH;
  switch (layout) {
    case 'hero-three': {
      const heroW = Math.round(w * 0.58);
      const sideX = heroW + gap;
      const sideW = w - sideX;
      const cellH = Math.floor((top - gap * 2) / 3);
      return {
        panels: [
          { x: 0, y: 0, w: heroW, h: top },
          { x: sideX, y: 0, w: sideW, h: cellH },
          { x: sideX, y: cellH + gap, w: sideW, h: cellH },
          { x: sideX, y: (cellH + gap) * 2, w: sideW, h: top - (cellH + gap) * 2 },
        ],
        title: { x: 0, y: top + gap, w, h: bandH - gap },
      };
    }
    case 'bleed':
      return {
        panels: [{ x: 0, y: 0, w, h }],
        title: { x: 0, y: Math.round(h * 0.68), w, h: h - Math.round(h * 0.68) },
      };
    case 'strip': {
      const cellH = Math.floor((top - gap * 2) / 3);
      return {
        panels: [
          { x: 0, y: 0, w, h: cellH },
          { x: 0, y: cellH + gap, w, h: cellH },
          { x: 0, y: (cellH + gap) * 2, w, h: top - (cellH + gap) * 2 },
        ],
        title: { x: 0, y: top + gap, w, h: bandH - gap },
      };
    }
    case 'poster': {
      const heroH = Math.round(h * 0.5);
      const titleY = heroH + gap;
      const titleH = Math.round(h * 0.13);
      const bottomY = titleY + titleH + gap;
      const halfW = Math.floor((w - gap) / 2);
      return {
        panels: [
          { x: 0, y: 0, w, h: heroH },
          { x: 0, y: bottomY, w: halfW, h: h - bottomY },
          { x: halfW + gap, y: bottomY, w: w - halfW - gap, h: h - bottomY },
        ],
        title: { x: 0, y: titleY, w, h: titleH },
      };
    }
    case 'grid':
    default: {
      const halfW = Math.floor((w - gap) / 2);
      const halfH = Math.floor((top - gap) / 2);
      return {
        panels: [
          { x: 0, y: 0, w: halfW, h: halfH },
          { x: halfW + gap, y: 0, w: w - halfW - gap, h: halfH },
          { x: 0, y: halfH + gap, w: halfW, h: top - halfH - gap },
          { x: halfW + gap, y: halfH + gap, w: w - halfW - gap, h: top - halfH - gap },
        ],
        title: { x: 0, y: top + gap, w, h: bandH - gap },
      };
    }
  }
}

/** How many panels a layout has. */
export function panelCount(layout) {
  return layoutGeometry(layout, 100, 100).panels.length;
}

/** Draws one palm silhouette: a curved trunk and five drooping fronds. */
function drawPalm(ctx, x, y, s, lean, rnd) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.scale(s, s);
  ctx.strokeStyle = '#0a0616';
  ctx.fillStyle = '#0a0616';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, -46, 2, -92);
  ctx.stroke();
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.5 + (rnd() - 0.5) * 0.15;
    const len = 34 + rnd() * 14;
    ctx.beginPath();
    ctx.moveTo(2, -92);
    ctx.quadraticCurveTo(
      2 + Math.cos(a) * len * 0.6, -92 + Math.sin(a) * len * 0.6,
      2 + Math.cos(a) * len, -92 + Math.sin(a) * len + 16,
    );
    ctx.stroke();
  }
  ctx.restore();
}

/** Draws a little skyline: dark blocks with a few lit windows. */
function drawSkyline(ctx, x, y, w, h, rnd) {
  ctx.fillStyle = '#0a0616';
  let cx = x;
  while (cx < x + w) {
    const bw = 14 + rnd() * 34;
    const bh = h * (0.25 + rnd() * 0.6);
    ctx.fillRect(cx, y + h - bh, bw, bh);
    ctx.fillStyle = 'rgba(255, 214, 120, 0.85)';
    for (let k = 0; k < Math.floor(bw * bh / 260); k++) {
      ctx.fillRect(cx + 3 + rnd() * (bw - 7), y + h - bh + 4 + rnd() * (bh - 9), 2, 3);
    }
    ctx.fillStyle = '#0a0616';
    cx += bw + 3 + rnd() * 8;
  }
}

/**
 * A procedural synthwave panel: gradient sky, a slatted setting sun, a
 * perspective grid floor, a skyline and palms. `seed` picks the variation.
 */
export function drawSynthwave(ctx, rect, grade, seed) {
  const { x, y, w, h } = rect;
  const rnd = mulberry32(seed * 7919 + 13);
  const g = GRADES[grade] ?? GRADES.sunset;
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, g.sky);
  sky.addColorStop(0.55, g.mid);
  sky.addColorStop(1, g.low);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);

  // Stars in the upper sky.
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 26; i++) {
    const sx = x + rnd() * w;
    const sy = y + rnd() * h * 0.3;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }

  // The sun, cut by horizontal slats as it sets.
  const horizon = y + h * 0.58;
  const sunR = Math.min(w, h) * 0.26;
  const sunX = x + w * (0.3 + rnd() * 0.4);
  const sunY = horizon - sunR * 0.25;
  const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sun.addColorStop(0, '#ffe259');
  sun.addColorStop(1, '#ff7e5f');
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, horizon - y);
  ctx.clip();
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = g.mid;
  let slatY = sunY + sunR * 0.1;
  let slatH = 2;
  while (slatY < sunY + sunR) {
    ctx.fillRect(sunX - sunR - 2, slatY, sunR * 2 + 4, slatH);
    slatY += slatH + 7;
    slatH += 2;
  }
  ctx.restore();

  // The grid floor.
  const floor = ctx.createLinearGradient(0, horizon, 0, y + h);
  floor.addColorStop(0, g.mid);
  floor.addColorStop(1, '#12041f');
  ctx.fillStyle = floor;
  ctx.fillRect(x, horizon, w, y + h - horizon);
  ctx.strokeStyle = g.accent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1;
  const cx = x + w / 2;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * w * 0.03, horizon);
    ctx.lineTo(cx + i * w * 0.22, y + h);
    ctx.stroke();
  }
  let gy = horizon + 4;
  let step = 5;
  while (gy < y + h) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
    ctx.stroke();
    gy += step;
    step *= 1.5;
  }
  ctx.globalAlpha = 1;

  // Skyline and palms on the horizon.
  drawSkyline(ctx, x + w * 0.04, horizon - h * 0.16, w * 0.5, h * 0.16, rnd);
  drawPalm(ctx, x + w * 0.86, horizon + 2, Math.min(w, h) / 340, -0.12, rnd);
  drawPalm(ctx, x + w * 0.1, horizon + 2, Math.min(w, h) / 420, 0.1, rnd);
}

/** Fits a fitted-text font size for `text` inside `maxWidth`. */
function fitFont(ctx, family, weight, startSize, text, maxWidth) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/**
 * Draws the title and subtitle into the title rect, in the chosen
 * lettering style. The title is fitted to the band; the subtitle sits
 * under it in a smaller tracking-wide line.
 */
export function drawCaption(ctx, rect, title, subtitle, lettering, grade) {
  const g = GRADES[grade] ?? GRADES.sunset;
  const { x, y, w, h } = rect;
  const words = (title || 'VICE CITY').trim().toUpperCase();
  const sub = (subtitle || '').trim().toUpperCase();
  const style = LETTERINGS[lettering] ?? LETTERINGS.block;
  const family = `'${style.font}', 'Arial Black', sans-serif`;

  const titleSize = fitFont(ctx, family, 400, Math.round(h * (sub ? 0.52 : 0.72)), words, w * 0.94);
  const titleY = y + (sub ? h * 0.52 : h * 0.62);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  if (lettering === 'neon') {
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = titleSize * 0.45;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(words, x + w / 2, titleY);
    ctx.shadowColor = g.accent;
    ctx.shadowBlur = titleSize * 0.2;
    ctx.fillText(words, x + w / 2, titleY);
    ctx.shadowBlur = 0;
  } else if (lettering === 'outline') {
    ctx.lineWidth = Math.max(2, titleSize * 0.06);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(words, x + w / 2, titleY);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillText(words, x + w / 2, titleY);
  } else if (lettering === 'sunset') {
    const grad = ctx.createLinearGradient(x, titleY - titleSize / 2, x, titleY + titleSize / 2);
    grad.addColorStop(0, '#ffe259');
    grad.addColorStop(0.55, '#ff7e5f');
    grad.addColorStop(1, '#ff2e88');
    ctx.lineWidth = Math.max(2, titleSize * 0.08);
    ctx.strokeStyle = 'rgba(10,4,20,0.9)';
    ctx.strokeText(words, x + w / 2, titleY);
    ctx.fillStyle = grad;
    ctx.fillText(words, x + w / 2, titleY);
  } else {
    ctx.lineWidth = Math.max(2, titleSize * 0.09);
    ctx.strokeStyle = 'rgba(8,4,18,0.95)';
    ctx.strokeText(words, x + w / 2, titleY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(words, x + w / 2, titleY);
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = titleSize * 0.12;
    ctx.shadowOffsetY = titleSize * 0.04;
    ctx.fillText(words, x + w / 2, titleY);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  if (sub) {
    const subSize = fitFont(ctx, `'Archivo Black', 'Arial Black', sans-serif`, 400, Math.round(h * 0.2), sub, w * 0.9);
    ctx.font = `400 ${subSize}px 'Archivo Black', 'Arial Black', sans-serif`;
    ctx.fillStyle = g.accent;
    ctx.fillText(sub, x + w / 2, y + h * 0.84);
  }
}

/** Washes a panel with the grade's colours and a soft vignette. */
function gradeWash(ctx, rect, grade) {
  const g = GRADES[grade] ?? GRADES.sunset;
  const { x, y, w, h } = rect;
  const wash = ctx.createLinearGradient(0, y, 0, y + h);
  wash.addColorStop(0, g.mid + '00');
  wash.addColorStop(1, g.mid + '55');
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  const vig = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.35,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
}

/** Draws one panel: the photo (cover-fit, panned and zoomed) or the procedural scene. */
function drawPanel(ctx, rect, panel, grade, seedBase) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (panel && panel.photo) {
    const img = panel.photo;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const zoom = panel.zoom || 1;
    const base = Math.max(w / iw, h / ih) * zoom;
    const pw = iw * base;
    const ph = ih * base;
    // Clamp the pan so the photo always covers the panel: a strong pan on
    // a tight crop would otherwise slide the photo out and leave a dark
    // gap at the panel's edge.
    const ox = Math.min(x, Math.max(x + w - pw, x + (w - pw) / 2 + (panel.panX || 0) * w * 0.2));
    const oy = Math.min(y, Math.max(y + h - ph, y + (h - ph) / 2 + (panel.panY || 0) * h * 0.2));
    if (grade === 'noir') ctx.filter = 'grayscale(1) contrast(1.25)';
    ctx.drawImage(img, ox, oy, pw, ph);
    ctx.filter = 'none';
  } else {
    drawSynthwave(ctx, rect, grade, seedBase);
  }
  gradeWash(ctx, rect, grade);
  ctx.restore();
  // A thin dark seam between panels.
  ctx.strokeStyle = 'rgba(6,3,14,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

/** A sprinkle of deterministic grain over the whole cover. */
function grain(ctx, w, h, seed) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < Math.floor((w * h) / 900); i++) {
    ctx.fillRect(rnd() * w, rnd() * h, 1.5, 1.5);
  }
  ctx.restore();
}

/**
 * Draws the whole cover onto `canvas` at its own pixel size.
 * `state` carries layout, grade, lettering, title, subtitle and panels
 * (an array of { photo, zoom, panX, panY } in layout order).
 * Returns the geometry used, so the editor can hit-test its panels.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const layout = state.layout || 'grid';
  const grade = state.grade || 'sunset';
  const geo = layoutGeometry(layout, w, h);
  ctx.fillStyle = '#0a0616';
  ctx.fillRect(0, 0, w, h);

  const panels = state.panels || [];
  geo.panels.forEach((rect, i) => {
    drawPanel(ctx, rect, panels[i] || null, grade, i + 1 + layout.length * 7);
  });

  // The title band (or the scrim for the bleed layout).
  if (layout === 'bleed') {
    const scrim = ctx.createLinearGradient(0, geo.title.y - h * 0.08, 0, h);
    scrim.addColorStop(0, 'rgba(6,3,14,0)');
    scrim.addColorStop(1, 'rgba(6,3,14,0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, geo.title.y - h * 0.08, w, h - geo.title.y + h * 0.08);
  } else {
    ctx.fillStyle = '#0a0616';
    ctx.fillRect(geo.title.x, geo.title.y, geo.title.w, geo.title.h);
    ctx.fillStyle = GRADES[grade].accent;
    ctx.fillRect(geo.title.x, geo.title.y, geo.title.w, 4);
  }
  drawCaption(ctx, geo.title, state.title, state.subtitle, state.lettering, grade);

  grain(ctx, w, h, 42);
  return geo;
}
