// Vice Cover Lab — editor wiring (plain classic script, no imports).
// Photo upload + per-panel crop/position (drag to pan, wheel to zoom),
// layout / grade / lettering / caption editing, and PNG export in the three
// post sizes. Photos are read on this machine only and never uploaded
// anywhere.
(function () {
  'use strict';
  var LAB = window.ViceCoverLab;

  // ------------------------------------------------------------- the state
  function blankPanels(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push({ img: null, zoom: 1, ox: 0, oy: 0 });
    return out;
  }

  var cover = {
    layout: 'trio',
    grade: 'sunset',
    lettering: 'sunset',
    title: 'Sunset Heist',
    subtitle: 'A Vice City story',
    tag: 'Vice City',
    sunburst: true,
    halftone: true,
    grain: true,
    frame: true,
    size: 'square',
    panels: blankPanels(3),
  };
  var picked = 0;

  var IDEAS = [
    'Sunset Heist', 'Boulevard Queen', 'Neon Nights', 'Palm Dusk',
    'Chrome Vice', 'Midnight Run', 'Ocean Drive', 'Vice City Lights',
  ];

  // ------------------------------------------------------------------ dom
  function $(id) { return document.getElementById(id); }
  var stage = $('stage');
  var statusLine = $('status');
  var zoomRange = $('zoom');
  var zoomReadout = $('zoomReadout');

  function say(msg) { statusLine.textContent = msg; }

  // ---------------------------------------------------------------- paint
  function activeSize() {
    return LAB.SIZES[cover.size] || LAB.SIZES.square;
  }

  function paint() {
    var s = activeSize();
    if (stage.width !== s.w || stage.height !== s.h) {
      stage.width = s.w;
      stage.height = s.h;
    }
    LAB.drawCover(stage.getContext('2d'), s.w, s.h, cover, picked);
    var panel = cover.panels[picked];
    if (panel) {
      zoomRange.value = String(Math.round((panel.zoom || 1) * 100));
      zoomReadout.textContent = Math.round((panel.zoom || 1) * 100) + '%';
    }
    $('panelInfo').textContent = 'Panel ' + (picked + 1) + ' of ' + cover.panels.length;
  }

  function fitPanels() {
    var n = LAB.panelCount(cover.layout);
    while (cover.panels.length < n) cover.panels.push({ img: null, zoom: 1, ox: 0, oy: 0 });
    cover.panels.length = n;
    if (picked >= n) picked = 0;
  }

  // --------------------------------------------------------------- images
  function loadImage(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = url;
    });
  }

  function fileToImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { loadImage(reader.result).then(resolve, reject); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Hand images out in order: the picked panel first, then the next empty
  // panels, then round-robin from panel 0. One file, one panel.
  function placePhotos(images) {
    var order = [picked];
    var n = cover.panels.length;
    for (var i = 0; i < n; i++) {
      if (i !== picked && !cover.panels[i].img) order.push(i);
    }
    for (var j = 0; j < n; j++) {
      if (order.indexOf(j) === -1) order.push(j);
    }
    images.forEach(function (img, k) {
      var slot = order[k % order.length];
      cover.panels[slot] = { img: img, zoom: 1, ox: 0, oy: 0 };
    });
    picked = order[0];
    paint();
  }

  async function loadSamples() {
    try {
      var pier = await loadImage('samples/pier.jpg');
      var blvd = await loadImage('samples/boulevard.jpg');
      placePhotos([pier, blvd, pier, blvd].slice(0, cover.panels.length));
      say('Sample photos loaded — drag a panel photo to reposition it.');
    } catch (e) {
      say('Could not load the sample photos.');
    }
  }

  // ------------------------------------------------------------ export PNG
  // Renders the cover fresh at the requested size and downloads it as a PNG.
  // Returns a promise of { width, height, bytes } for the in-page verifier.
  function exportPNG(sizeKey) {
    var size = LAB.SIZES[sizeKey] || activeSize();
    return new Promise(function (resolve, reject) {
      var off = document.createElement('canvas');
      off.width = size.w;
      off.height = size.h;
      LAB.drawCover(off.getContext('2d'), size.w, size.h, cover, -1);
      off.toBlob(function (blob) {
        if (!blob) { reject(new Error('PNG encode failed')); return; }
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'vice-cover-' + size.w + 'x' + size.h + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
        say('Exported vice-cover-' + size.w + 'x' + size.h + '.png (' +
          Math.round(blob.size / 1024) + ' KB)');
        resolve({ width: size.w, height: size.h, bytes: blob.size });
      }, 'image/png');
    });
  }

  // Verifier hook: export all three sizes without downloading, and decode
  // each blob back to prove it is a valid PNG. Used by the headless check.
  function verifyExports() {
    var keys = Object.keys(LAB.SIZES);
    var out = [];
    var chain = Promise.resolve();
    keys.forEach(function (key) {
      chain = chain.then(function () {
        var size = LAB.SIZES[key];
        var off = document.createElement('canvas');
        off.width = size.w;
        off.height = size.h;
        LAB.drawCover(off.getContext('2d'), size.w, size.h, cover, -1);
        return new Promise(function (resolve) {
          off.toBlob(function (blob) {
            loadImage(URL.createObjectURL(blob)).then(function (img) {
              out.push({
                size: key, width: size.w, height: size.h,
                bytes: blob.size, decodedWidth: img.naturalWidth,
                decodedHeight: img.naturalHeight, ok: true,
              });
              resolve();
            }, function () {
              out.push({
                size: key, width: size.w, height: size.h,
                bytes: blob ? blob.size : 0, ok: false,
              });
              resolve();
            });
          }, 'image/png');
        });
      });
    });
    return chain.then(function () { return out; });
  }

  // ----------------------------------------------------------- panel input
  function canvasPoint(e) {
    var r = stage.getBoundingClientRect();
    return {
      nx: (e.clientX - r.left) / r.width,
      ny: (e.clientY - r.top) / r.height,
      x: (e.clientX - r.left) * (stage.width / r.width),
      y: (e.clientY - r.top) * (stage.height / r.height),
    };
  }

  var drag = null;
  stage.addEventListener('pointerdown', function (e) {
    var p = canvasPoint(e);
    var hit = LAB.panelAt(cover, p.nx, p.ny);
    if (hit === -1) return;
    picked = hit;
    var panel = cover.panels[picked];
    drag = {
      panel: panel, startX: p.x, startY: p.y,
      ox: panel.ox || 0, oy: panel.oy || 0,
    };
    stage.setPointerCapture(e.pointerId);
    paint();
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var p = canvasPoint(e);
    var s = activeSize();
    var rect = LAB.LAYOUTS[cover.layout].rects[picked];
    var pw = rect.w * s.w;
    var ph = rect.h * s.h;
    // Pan in fractions of the drawn photo: scale the drag by panel size.
    drag.panel.ox = LAB.clamp(drag.ox + (p.x - drag.startX) / Math.max(pw, ph) * 1.4, -1, 1);
    drag.panel.oy = LAB.clamp(drag.oy + (p.y - drag.startY) / Math.max(pw, ph) * 1.4, -1, 1);
    paint();
  });
  function endDrag() { drag = null; }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('wheel', function (e) {
    e.preventDefault();
    var panel = cover.panels[picked];
    if (!panel) return;
    panel.zoom = LAB.clamp((panel.zoom || 1) * Math.exp(-e.deltaY * 0.0012), 1, 4);
    paint();
  }, { passive: false });

  // Arrow keys nudge the picked panel's photo.
  document.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    var panel = cover.panels[picked];
    if (!panel || !panel.img) return;
    var step = e.shiftKey ? 0.1 : 0.03;
    if (e.key === 'ArrowLeft') { panel.ox = LAB.clamp((panel.ox || 0) - step, -1, 1); }
    else if (e.key === 'ArrowRight') { panel.ox = LAB.clamp((panel.ox || 0) + step, -1, 1); }
    else if (e.key === 'ArrowUp') { panel.oy = LAB.clamp((panel.oy || 0) - step, -1, 1); }
    else if (e.key === 'ArrowDown') { panel.oy = LAB.clamp((panel.oy || 0) + step, -1, 1); }
    else return;
    e.preventDefault();
    paint();
  });

  // ----------------------------------------------------------- control UI
  function optionButtons(containerId, items, current, onPick) {
    var box = $(containerId);
    box.innerHTML = '';
    Object.keys(items).forEach(function (key) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt' + (key === current ? ' active' : '');
      b.textContent = items[key].label || items[key];
      b.dataset.key = key;
      b.addEventListener('click', function () {
        onPick(key);
        Array.prototype.forEach.call(box.children, function (c) {
          c.classList.toggle('active', c.dataset.key === key);
        });
      });
      box.appendChild(b);
    });
  }

  function layoutButtons() {
    var box = $('layouts');
    box.innerHTML = '';
    Object.keys(LAB.LAYOUTS).forEach(function (key) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'layout' + (key === cover.layout ? ' active' : '');
      b.dataset.key = key;
      b.title = LAB.LAYOUTS[key].label + ' — ' + LAB.LAYOUTS[key].blurb;
      b.setAttribute('aria-label', LAB.LAYOUTS[key].label + ' — ' + LAB.LAYOUTS[key].blurb);
      var mini = document.createElement('span');
      mini.className = 'mini mini-' + key;
      b.appendChild(mini);
      var lbl = document.createElement('span');
      lbl.className = 'layout-name';
      lbl.textContent = LAB.LAYOUTS[key].label;
      b.appendChild(lbl);
      b.addEventListener('click', function () {
        cover.layout = key;
        fitPanels();
        Array.prototype.forEach.call(box.children, function (c) {
          c.classList.toggle('active', c.dataset.key === key);
        });
        paint();
      });
      box.appendChild(b);
    });
  }

  function gradeButtons() {
    var box = $('grades');
    box.innerHTML = '';
    Object.keys(LAB.GRADES).forEach(function (key) {
      var g = LAB.GRADES[key];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'grade' + (key === cover.grade ? ' active' : '');
      b.dataset.key = key;
      b.title = g.label;
      b.setAttribute('aria-label', g.label);
      b.style.background = 'linear-gradient(135deg,' + g.sky.join(',') + ')';
      b.addEventListener('click', function () {
        cover.grade = key;
        $('gradeName').textContent = g.label;
        Array.prototype.forEach.call(box.children, function (c) {
          c.classList.toggle('active', c.dataset.key === key);
        });
        paint();
      });
      box.appendChild(b);
    });
  }

  function letteringButtons() {
    optionButtons('lettering', LAB.LETTERING, cover.lettering, function (key) {
      cover.lettering = key;
      paint();
    });
  }

  function sizeButtons() {
    var box = $('sizes');
    box.innerHTML = '';
    Object.keys(LAB.SIZES).forEach(function (key) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt' + (key === cover.size ? ' active' : '');
      b.dataset.key = key;
      b.textContent = LAB.SIZES[key].label;
      b.addEventListener('click', function () {
        cover.size = key;
        Array.prototype.forEach.call(box.children, function (c) {
          c.classList.toggle('active', c.dataset.key === key);
        });
        paint();
      });
      box.appendChild(b);
    });
  }

  function bindToggle(id, field) {
    $(id).addEventListener('change', function (e) {
      cover[field] = e.target.checked;
      paint();
    });
  }

  // ------------------------------------------------------------ wire inputs
  $('photo').addEventListener('change', async function (e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    if (!files.length) return;
    try {
      var images = [];
      for (var i = 0; i < files.length; i++) images.push(await fileToImage(files[i]));
      placePhotos(images);
      say(files.length + ' photo' + (files.length > 1 ? 's' : '') +
        ' loaded — click a panel, drag to crop, scroll to zoom.');
    } catch (err) {
      say('That file could not be read as an image.');
    }
    e.target.value = '';
  });
  $('samples').addEventListener('click', loadSamples);
  $('clearPanel').addEventListener('click', function () {
    cover.panels[picked] = { img: null, zoom: 1, ox: 0, oy: 0 };
    paint();
    say('Panel ' + (picked + 1) + ' cleared — it shows the sunset scene until you add a photo.');
  });
  $('title').addEventListener('input', function (e) { cover.title = e.target.value; paint(); });
  $('subtitle').addEventListener('input', function (e) { cover.subtitle = e.target.value; paint(); });
  $('tag').addEventListener('input', function (e) { cover.tag = e.target.value; paint(); });
  zoomRange.addEventListener('input', function (e) {
    var panel = cover.panels[picked];
    if (!panel) return;
    panel.zoom = LAB.clamp(Number(e.target.value) / 100, 1, 4);
    zoomReadout.textContent = e.target.value + '%';
    paint();
  });
  $('resetCrop').addEventListener('click', function () {
    var panel = cover.panels[picked];
    if (!panel) return;
    panel.zoom = 1; panel.ox = 0; panel.oy = 0;
    paint();
  });
  $('surprise').addEventListener('click', function () {
    var layoutKeys = Object.keys(LAB.LAYOUTS);
    var gradeKeys = Object.keys(LAB.GRADES);
    var letterKeys = Object.keys(LAB.LETTERING);
    cover.layout = layoutKeys[Math.floor(Math.random() * layoutKeys.length)];
    cover.grade = gradeKeys[Math.floor(Math.random() * gradeKeys.length)];
    cover.lettering = letterKeys[Math.floor(Math.random() * letterKeys.length)];
    cover.title = IDEAS[Math.floor(Math.random() * IDEAS.length)];
    $('title').value = cover.title;
    fitPanels();
    layoutButtons();
    gradeButtons();
    letteringButtons();
    paint();
    say('Surprise look: ' + LAB.LAYOUTS[cover.layout].label + ' · ' +
      LAB.GRADES[cover.grade].label + ' · ' + LAB.LETTERING[cover.lettering].label + '.');
  });
  $('export').addEventListener('click', function () {
    exportPNG(cover.size).catch(function () { say('Export failed — try again.'); });
  });

  bindToggle('sunburst', 'sunburst');
  bindToggle('halftone', 'halftone');
  bindToggle('grain', 'grain');
  bindToggle('frame', 'frame');

  layoutButtons();
  gradeButtons();
  letteringButtons();
  sizeButtons();

  // Shot mode (?shot=...) drives fixed scenes for screenshots; see shots.js.
  var shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    window.CoverShots.run(shot, new URLSearchParams(location.search), {
      cover: cover, loadImage: loadImage, placePhotos: placePhotos,
      fitPanels: fitPanels, paint: paint,
      setPicked: function (i) { picked = i; },
    });
  } else {
    // Fonts first, then the first paint — Anton is what makes the poster.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(paint);
    }
    paint();
    loadSamples();
  }

  // Test + shot hooks.
  window.__coverLab = {
    cover: cover,
    exportPNG: exportPNG,
    verifyExports: verifyExports,
    paint: paint,
    loadSamples: loadSamples,
  };
})();
