// Vice Cover Lab — cover renderer (plain classic script, no imports, no
// network). Draws a GTA-poster-style multi-panel cover on any 2D canvas:
// photo panels, a neon-sunset colour grade, a synthwave scene for empty
// panels, sunburst + halftone + grain, and bold poster lettering in our own
// vendored OFL fonts (Anton / Archivo Black). Nothing here names Rockstar,
// its logos, artwork or fonts.
(function (global) {
  'use strict';

  // ------------------------------------------------------------- panel maps
  // A layout is a set of rectangles in normalised cover space (0..1), so the
  // same layout serves the square, portrait and wide export sizes.
  var LAYOUTS = {
    solo: {
      label: 'Solo',
      blurb: 'One big moment',
      rects: [{ x: 0, y: 0, w: 1, h: 1 }],
    },
    duo: {
      label: 'Duo',
      blurb: 'Two sides',
      rects: [
        { x: 0, y: 0, w: 0.58, h: 1 },
        { x: 0.58, y: 0, w: 0.42, h: 1 },
      ],
    },
    trio: {
      label: 'Trio',
      blurb: 'Poster classic',
      rects: [
        { x: 0, y: 0, w: 0.58, h: 1 },
        { x: 0.58, y: 0, w: 0.42, h: 0.52 },
        { x: 0.58, y: 0.52, w: 0.42, h: 0.48 },
      ],
    },
    quad: {
      label: 'Quad',
      blurb: 'Four scenes',
      rects: [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
      ],
    },
    strip: {
      label: 'Strip',
      blurb: 'Hero on top',
      rects: [
        { x: 0, y: 0, w: 1, h: 0.6 },
        { x: 0, y: 0.6, w: 0.5, h: 0.4 },
        { x: 0.5, y: 0.6, w: 0.5, h: 0.4 },
      ],
    },
  };

  // ---------------------------------------------------------------- grades
  // A grade is a colour treatment: the sky of the procedural panels, the wash
  // and shade laid over photos, the sunburst glow colour, and how hard the
  // vignette bites.
  var GRADES = {
    sunset: {
      label: 'Vice Sunset',
      sky: ['#ffe08a', '#ff8a3d', '#f43f5e', '#6d28a8'],
      wash: 'rgba(244, 63, 94, 0.15)',
      shade: 'rgba(60, 8, 70, 0.30)',
      glow: '#ffc53d',
      sun: '#fff3c4',
      vignette: 0.34,
    },
    neon: {
      label: 'Neon Nights',
      sky: ['#22d3ee', '#8b5cf6', '#ec4899', '#170a33'],
      wash: 'rgba(236, 72, 153, 0.17)',
      shade: 'rgba(18, 0, 58, 0.34)',
      glow: '#22d3ee',
      sun: '#f5d0fe',
      vignette: 0.40,
    },
    palm: {
      label: 'Palm Dusk',
      sky: ['#fde68a', '#d97706', '#0d9488', '#0c2d3a'],
      wash: 'rgba(217, 119, 6, 0.12)',
      shade: 'rgba(12, 45, 58, 0.30)',
      glow: '#fbbf24',
      sun: '#fef9c3',
      vignette: 0.32,
    },
    chrome: {
      label: 'Chrome Vice',
      sky: ['#f0f9ff', '#7dd3fc', '#475569', '#0b1526'],
      wash: 'rgba(125, 211, 252, 0.13)',
      shade: 'rgba(11, 21, 38, 0.30)',
      glow: '#bae6fd',
      sun: '#ffffff',
      vignette: 0.30,
    },
    bubble: {
      label: 'Bubblegum',
      sky: ['#fce7f3', '#f472b6', '#8b5cf6', '#2e1065'],
      wash: 'rgba(244, 114, 182, 0.19)',
      shade: 'rgba(46, 16, 101, 0.30)',
      glow: '#f9a8d4',
      sun: '#fff1f2',
      vignette: 0.36,
    },
  };

  // ------------------------------------------------------------- lettering
  var LETTERING = {
    sunset: { label: 'Sunset gradient', mode: 'gradient' },
    neon: { label: 'Neon glow', mode: 'neon' },
    chrome: { label: 'Chrome', mode: 'chrome' },
    outline: { label: 'Outline', mode: 'outline' },
  };

  // ---------------------------------------------------------- export sizes
  var SIZES = {
    square: { label: 'Square 1080 × 1080', w: 1080, h: 1080 },
    portrait: { label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
    wide: { label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
  };

  var HEAD_FONT = 'Anton, "Archivo Black", sans-serif';
  var BODY_FONT = '"Archivo Black", "Anton", sans-serif';

  // --------------------------------------------------------------- helpers
  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function rgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function tint(hex, a) {
    var c = rgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  // Deterministic pseudo-random stream, so a panel's procedural art is
  // identical in the preview and in every export.
  function rng(seed) {
    var s = (seed * 9301 + 49297) % 233280;
    return function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  // ---------------------------------------------------- procedural panels
  // A synthwave scene drawn from code — sky, glowing slatted sun, skyline
  // with lit windows, a perspective grid floor — so a panel with no photo yet
  // still looks like cover art instead of an empty grey box.
  function drawPalm(ctx, x, y, s, lean) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.rotate(lean);
    ctx.strokeStyle = 'rgba(12, 6, 20, 0.94)';
    ctx.lineCap = 'round';
    // Trunk, bending away from the lean.
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-4, -48, 8, -88);
    ctx.stroke();
    // Six fronds drooping from the crown, fanned left to right.
    ctx.lineWidth = 4.5;
    for (var i = 0; i < 6; i++) {
      var a = Math.PI * (0.06 + i * 0.17);
      var tipX = 8 + Math.cos(a) * 54;
      var tipY = -88 - Math.sin(a) * 26 - (i === 2 || i === 3 ? 10 : 0);
      ctx.beginPath();
      ctx.moveTo(8, -88);
      ctx.quadraticCurveTo(8 + Math.cos(a) * 34, -88 - Math.sin(a) * 46, tipX, tipY);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSynthPanel(ctx, px, py, pw, ph, grade, seed) {
    var next = rng(seed * 31 + 11);
    var sky = ctx.createLinearGradient(0, py, 0, py + ph);
    for (var i = 0; i < grade.sky.length; i++) {
      sky.addColorStop(i / (grade.sky.length - 1), grade.sky[i]);
    }
    ctx.fillStyle = sky;
    ctx.fillRect(px, py, pw, ph);

    // Glowing slatted sun.
    var r = Math.min(pw, ph) * (0.19 + next() * 0.07);
    var sx = px + pw * (0.32 + next() * 0.36);
    var sy = py + ph * (0.32 + next() * 0.10);
    ctx.save();
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = r * 0.9;
    var disc = ctx.createLinearGradient(0, sy - r, 0, sy + r);
    disc.addColorStop(0, grade.sun);
    disc.addColorStop(1, grade.sky[1]);
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Slats: sky-coloured cuts across the sun's lower half, widening down.
    ctx.save();
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.clip();
    var cut = 0;
    for (var y = sy + r * 0.08; y < sy + r; y += r * 0.18) {
      cut += 1;
      ctx.fillStyle = grade.sky[2];
      ctx.globalAlpha = 0.88;
      ctx.fillRect(sx - r, y, r * 2, 2 + cut * 1.8);
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // Skyline blocks with a few lit windows.
    var horizon = py + ph * 0.66;
    ctx.fillStyle = 'rgba(12, 6, 20, 0.6)';
    var bx = px;
    while (bx < px + pw) {
      var bw = pw * (0.07 + next() * 0.13);
      var bh = ph * (0.05 + next() * 0.17);
      ctx.fillRect(bx, horizon - bh, bw, bh);
      var windows = 2 + Math.floor(next() * 5);
      ctx.fillStyle = tint(grade.glow, 0.85);
      for (var w = 0; w < windows; w++) {
        ctx.fillRect(
          bx + bw * (0.14 + next() * 0.7),
          horizon - bh + bh * (0.12 + next() * 0.6),
          Math.max(2, bw * 0.08),
          Math.max(2, bh * 0.09)
        );
      }
      ctx.fillStyle = 'rgba(12, 6, 20, 0.6)';
      bx += bw + pw * 0.025;
    }

    // Floor: dark ground, a sun streak, and a perspective grid.
    var floor = ctx.createLinearGradient(0, horizon, 0, py + ph);
    floor.addColorStop(0, 'rgba(12, 6, 20, 0.92)');
    floor.addColorStop(1, 'rgba(12, 6, 20, 1)');
    ctx.fillStyle = floor;
    ctx.fillRect(px, horizon, pw, py + ph - horizon);
    var streakW = Math.min(pw * 0.22, r * 1.2);
    ctx.fillStyle = tint(grade.glow, 0.45);
    ctx.fillRect(sx - streakW / 2, horizon + 2, streakW, py + ph - horizon - 2);
    // Grid lines fanning from a vanishing point under the sun.
    ctx.strokeStyle = tint(grade.glow, 0.28);
    ctx.lineWidth = Math.max(1, pw * 0.0016);
    var vx = sx;
    var vy = horizon;
    for (var g = -5; g <= 5; g++) {
      ctx.beginPath();
      ctx.moveTo(vx + g * pw * 0.06, vy);
      ctx.lineTo(vx + g * pw * 0.42, py + ph);
      ctx.stroke();
    }
    var rows = 5;
    for (var h = 1; h <= rows; h++) {
      var gy = horizon + (py + ph - horizon) * (h * h) / (rows * rows);
      ctx.beginPath();
      ctx.moveTo(px, gy);
      ctx.lineTo(px + pw, gy);
      ctx.stroke();
    }

    // Palms framing the scene.
    var ps = Math.min(pw, ph) / 250;
    drawPalm(ctx, px + pw * 0.09, py + ph * 0.99, ps * (0.8 + next() * 0.35), -0.10);
    drawPalm(ctx, px + pw * 0.93, py + ph * 0.99, ps * (0.7 + next() * 0.35), 0.12);
  }

  // ----------------------------------------------------------------- grain
  var grainTile = null;
  function grainFill(ctx) {
    if (!grainTile) {
      var tile = document.createElement('canvas');
      tile.width = 96;
      tile.height = 96;
      var tctx = tile.getContext('2d');
      var img = tctx.createImageData(96, 96);
      var next = rng(7);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = Math.floor(next() * 255);
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      tctx.putImageData(img, 0, 0);
      grainTile = ctx.createPattern(tile, 'repeat');
    }
    return grainTile;
  }

  // ------------------------------------------------------------ photo draw
  // Cover-fit with the panel's own zoom + pan. Pan is a fraction (-1..1) of
  // the slack, clamped so the photo always covers its panel.
  function drawPhoto(ctx, img, px, py, pw, ph, panel) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var base = Math.max(pw / iw, ph / ih);
    var z = panel.zoom || 1;
    var dw = iw * base * z;
    var dh = ih * base * z;
    var slackX = Math.max(0, (dw - pw) / 2);
    var slackY = Math.max(0, (dh - ph) / 2);
    var ox = clamp(panel.ox || 0, -1, 1) * slackX;
    var oy = clamp(panel.oy || 0, -1, 1) * slackY;
    ctx.drawImage(img, px + (pw - dw) / 2 - ox, py + (ph - dh) / 2 - oy, dw, dh);
  }

  function drawHalftone(ctx, px, py, pw, ph, u) {
    var step = Math.max(11, u * 18);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (var y = py + step / 2; y < py + ph * 0.25; y += step) {
      var row = (y - py) / (ph * 0.25);
      for (var x = px + step / 2; x < px + pw; x += step) {
        var r = (1 - row) * step * 0.26 + 0.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawVignette(ctx, px, py, pw, ph, strength) {
    var g = ctx.createRadialGradient(
      px + pw / 2, py + ph / 2, Math.min(pw, ph) * 0.40,
      px + pw / 2, py + ph / 2, Math.max(pw, ph) * 0.80
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,' + strength + ')');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, pw, ph);
  }

  // -------------------------------------------------------------- sunburst
  function drawSunburst(ctx, W, H, cx, cy, radius, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    var wedges = 24;
    for (var i = 0; i < wedges; i++) {
      var a0 = (i / wedges) * Math.PI * 2;
      var a1 = a0 + (Math.PI * 2 / wedges) * 0.38;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ----------------------------------------------------------------- title
  // Fits the title to the cover with a binary search: the biggest size whose
  // single line fits the width; if even a small size cannot hold one line,
  // every word split is tried and the split whose two lines fit at the
  // biggest size wins (ties go to the more balanced split).
  function titleSizeFor(ctx, lines, maxW, lo, hi) {
    var best = lo;
    while (lo <= hi) {
      var mid = Math.floor((lo + hi) / 2);
      ctx.font = mid + 'px ' + HEAD_FONT;
      var widest = 0;
      for (var i = 0; i < lines.length; i++) {
        widest = Math.max(widest, ctx.measureText(lines[i]).width);
      }
      if (widest <= maxW) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return best;
  }

  function fitTitle(ctx, text, maxW, cap) {
    var words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return { lines: [], size: 0 };
    var one = titleSizeFor(ctx, [text], maxW, 12, cap);
    if (one >= Math.floor(cap * 0.45)) return { lines: [text], size: one };
    var best = null;
    for (var s = 1; s < words.length; s++) {
      var l1 = words.slice(0, s).join(' ');
      var l2 = words.slice(s).join(' ');
      var size = titleSizeFor(ctx, [l1, l2], maxW * 0.97, 12, Math.floor(cap * 0.62));
      var balance = Math.abs(
        ctx.measureText(l1).width - ctx.measureText(l2).width
      );
      if (!best || size > best.size || (size === best.size && balance < best.balance)) {
        best = { lines: [l1, l2], size: size, balance: balance };
      }
    }
    if (!best) return { lines: [text], size: one };
    return { lines: best.lines, size: best.size };
  }

  // Paints the fitted title. The fitted font is set first — without it the
  // title inherits whatever font the subtitle left behind and renders tiny
  // while its stroke is drawn at the fitted size.
  function paintTitle(ctx, lines, size, cx, topY, lettering) {
    ctx.font = size + 'px ' + HEAD_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    var lineH = size * 0.98;
    lines.forEach(function (line, i) {
      var y = topY + size + i * lineH;
      var grad = null;
      if (lettering.mode === 'gradient') {
        grad = ctx.createLinearGradient(0, y - size, 0, y + size * 0.12);
        grad.addColorStop(0, '#fff7d6');
        grad.addColorStop(0.45, '#ffb347');
        grad.addColorStop(0.75, '#ff5e78');
        grad.addColorStop(1, '#a61e6b');
      } else if (lettering.mode === 'chrome') {
        grad = ctx.createLinearGradient(0, y - size, 0, y);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.48, '#cbd5e1');
        grad.addColorStop(0.52, '#64748b');
        grad.addColorStop(1, '#f1f5f9');
      }
      ctx.lineWidth = Math.max(2, size * 0.09);
      ctx.strokeStyle = 'rgba(18, 6, 26, 0.92)';
      if (lettering.mode !== 'outline') ctx.strokeText(line, cx, y);
      if (lettering.mode === 'neon') {
        ctx.save();
        ctx.shadowColor = '#ff2fb3';
        ctx.shadowBlur = size * 0.32;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(line, cx, y);
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = size * 0.16;
        ctx.fillText(line, cx, y);
        ctx.restore();
      } else if (lettering.mode === 'outline') {
        // White outline only — a dark under-stroke would merge the strokes
        // into a blob. A soft shadow keeps it readable on light photos.
        ctx.save();
        ctx.shadowColor = 'rgba(18, 6, 26, 0.85)';
        ctx.shadowBlur = size * 0.12;
        ctx.lineWidth = Math.max(2, size * 0.05);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeText(line, cx, y);
        ctx.restore();
      } else {
        ctx.fillStyle = grad;
        ctx.fillText(line, cx, y);
      }
    });
    return topY + size + (lines.length - 1) * lineH;
  }

  // -------------------------------------------------------------- main draw
  // state: { layout, grade, lettering, title, subtitle, tag, sunburst,
  //          halftone, grain, frame, panels: [{img, zoom, ox, oy}] }
  // selected: the panel the editor highlights (-1 = none, for exports).
  function drawCover(ctx, W, H, state, selected) {
    var grade = GRADES[state.grade] || GRADES.sunset;
    var layout = LAYOUTS[state.layout] || LAYOUTS.trio;
    var u = Math.min(W, H) / 1080; // scale unit: 1 at 1080px
    var gutter = Math.max(3, Math.round(10 * u));

    // Backdrop: the warm gutter colour shows between panels.
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f5efe4';
    ctx.fillRect(0, 0, W, H);

    // Title-block geometry: the subtitle sits directly above the title and
    // the block ends a small margin above the bottom edge.
    var titleText = (state.title || '').trim().toUpperCase();
    var subSize = Math.max(11, Math.min(W, H) * 0.028);
    var fitted = titleText
      ? fitTitle(ctx, titleText, W * 0.92, Math.min(W, H) * 0.24)
      : { lines: [], size: 0 };
    var titleH = fitted.lines.length * fitted.size * 0.98;
    var gap = fitted.lines.length && state.subtitle ? fitted.size * 0.26 : 0;
    var subH = state.subtitle ? subSize * 1.1 + gap : 0;
    var bottomMargin = Math.min(W, H) * 0.045;
    var blockH = titleH + subH;
    var blockTop = H - bottomMargin - blockH;

    // Panels.
    layout.rects.forEach(function (r, i) {
      var px = r.x * W + gutter / 2;
      var py = r.y * H + gutter / 2;
      var pw = r.w * W - gutter;
      var ph = r.h * H - gutter;
      var panel = (state.panels && state.panels[i]) || {};
      ctx.save();
      ctx.beginPath();
      ctx.rect(px, py, pw, ph);
      ctx.clip();
      if (panel.img) {
        drawPhoto(ctx, panel.img, px, py, pw, ph, panel);
      } else {
        drawSynthPanel(ctx, px, py, pw, ph, grade, i * 17 + 3);
      }
      // Grade: warm wash from the top, shade rising from the foot.
      var wash = ctx.createLinearGradient(0, py, 0, py + ph);
      wash.addColorStop(0, grade.wash);
      wash.addColorStop(0.55, 'rgba(0,0,0,0)');
      wash.addColorStop(1, grade.shade);
      ctx.fillStyle = wash;
      ctx.fillRect(px, py, pw, ph);
      if (state.halftone) drawHalftone(ctx, px, py, pw, ph, u);
      drawVignette(ctx, px, py, pw, ph, grade.vignette);
      ctx.restore();

      // Editor selection outline.
      if (selected === i) {
        ctx.save();
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = Math.max(3, 4 * u);
        ctx.setLineDash([14 * u, 8 * u]);
        ctx.strokeRect(px + 2, py + 2, pw - 4, ph - 4);
        ctx.restore();
      }
    });

    // Sunburst rays behind the title block.
    if (state.sunburst && fitted.lines.length) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, blockTop - H * 0.05, W, H - blockTop + H * 0.05);
      ctx.clip();
      drawSunburst(ctx, W, H, W / 2, H * 1.02, Math.max(W, H) * 0.85, grade.glow, 0.10);
      ctx.restore();
    }

    // Scrim so the lettering reads on any photo.
    if (fitted.lines.length || state.subtitle) {
      var scrim = ctx.createLinearGradient(0, blockTop - H * 0.05, 0, H);
      scrim.addColorStop(0, 'rgba(10, 4, 18, 0)');
      scrim.addColorStop(0.35, 'rgba(10, 4, 18, 0.45)');
      scrim.addColorStop(1, 'rgba(10, 4, 18, 0.74)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, blockTop - H * 0.05, W, H - blockTop + H * 0.05);
    }

    // Subtitle directly above the title, letterspaced, in the grade's glow.
    if (state.subtitle) {
      ctx.font = subSize + 'px ' + BODY_FONT;
      try { ctx.letterSpacing = Math.max(2, 6 * u) + 'px'; } catch (e) {}
      ctx.textAlign = 'center';
      ctx.fillStyle = grade.glow;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 6 * u;
      ctx.fillText(state.subtitle.trim().toUpperCase(), W / 2, blockTop + subSize);
      ctx.shadowBlur = 0;
      try { ctx.letterSpacing = '0px'; } catch (e) {}
    }

    // The title itself.
    if (fitted.lines.length) {
      paintTitle(ctx, fitted.lines, fitted.size, W / 2, blockTop + subH,
        LETTERING[state.lettering] || LETTERING.sunset);
    }

    // Location tag pill, top-left.
    if (state.tag) {
      var tagSize = Math.max(11, Math.min(W, H) * 0.024);
      ctx.font = tagSize + 'px ' + BODY_FONT;
      try { ctx.letterSpacing = Math.max(2, 4 * u) + 'px'; } catch (e) {}
      var tagText = state.tag.trim().toUpperCase();
      var tw = ctx.measureText(tagText).width + 28 * u;
      var th = tagSize + 16 * u;
      var tx = 18 * u;
      var ty = 18 * u;
      ctx.fillStyle = 'rgba(10, 4, 18, 0.72)';
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, th / 2);
      ctx.fill();
      ctx.strokeStyle = grade.glow;
      ctx.lineWidth = Math.max(1.5, 2 * u);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagText, tx + 14 * u, ty + th / 2 + 1);
      ctx.textBaseline = 'alphabetic';
      try { ctx.letterSpacing = '0px'; } catch (e) {}
    }

    // Grain over everything, then the frame.
    if (state.grain) {
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = grainFill(ctx);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (state.frame) {
      ctx.save();
      ctx.strokeStyle = '#f5efe4';
      ctx.lineWidth = Math.max(4, 8 * u);
      ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
      // Inner glow hairline + corner ticks.
      ctx.strokeStyle = tint(grade.glow, 0.55);
      ctx.lineWidth = Math.max(1, 2 * u);
      var inset = Math.max(8, 16 * u);
      ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
      ctx.strokeStyle = grade.glow;
      ctx.lineWidth = Math.max(3, 5 * u);
      var c = 26 * u;
      var m = Math.max(6, 12 * u);
      [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(function (k) {
        ctx.beginPath();
        ctx.moveTo(k[0] + k[2] * c, k[1]);
        ctx.lineTo(k[0], k[1]);
        ctx.lineTo(k[0], k[1] + k[3] * c);
        ctx.stroke();
      });
      ctx.restore();
    }
  }

  // Hit-test: which panel holds normalised point (nx, ny)? -1 if none.
  function panelAt(state, nx, ny) {
    var layout = LAYOUTS[state.layout] || LAYOUTS.trio;
    for (var i = 0; i < layout.rects.length; i++) {
      var r = layout.rects[i];
      if (nx >= r.x && nx < r.x + r.w && ny >= r.y && ny < r.y + r.h) return i;
    }
    return -1;
  }

  function panelCount(layoutKey) {
    return (LAYOUTS[layoutKey] || LAYOUTS.trio).rects.length;
  }

  global.ViceCoverLab = {
    LAYOUTS: LAYOUTS,
    GRADES: GRADES,
    LETTERING: LETTERING,
    SIZES: SIZES,
    drawCover: drawCover,
    panelAt: panelAt,
    panelCount: panelCount,
    clamp: clamp,
  };
})(window);
