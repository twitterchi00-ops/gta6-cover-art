// Vice Cover Lab — fixed scenes for screenshots (plain classic script).
// ?shot=cover  — the cover alone, full viewport, for the cover screenshots.
// ?shot=editor — the editor with sample photos loaded.
// ?shot=test   — runs the real PNG export at all three sizes and writes the
//                dimensions + byte sizes into the page, for headless checks.
// Query params: photo (pier|boulevard), photo2, caption, subtitle, tag,
// layout, grade, lettering, size (square|portrait|wide), and 0/1 flags
// sunburst, halftone, grain, frame. window.__shotReady is set once painted.
(function (global) {
  'use strict';
  var LAB = global.ViceCoverLab;

  function param(query, name, fallback) {
    var v = query.get(name);
    return v === null || v === '' ? fallback : v;
  }

  function externalRequestCount() {
    try {
      var entries = performance.getEntriesByType('resource');
      var external = 0;
      entries.forEach(function (e) {
        if (/^https?:\/\//.test(e.name) && e.name.indexOf(location.origin) !== 0) external++;
      });
      return external;
    } catch (e) { return -1; }
  }

  async function run(shot, query, api) {
    var cover = api.cover;
    cover.layout = param(query, 'layout', 'trio');
    cover.grade = param(query, 'grade', 'sunset');
    cover.lettering = param(query, 'lettering', 'sunset');
    cover.title = param(query, 'caption', 'Sunset Heist');
    cover.subtitle = param(query, 'subtitle', 'A Vice City story');
    cover.tag = param(query, 'tag', 'Vice City');
    cover.size = param(query, 'size', 'square');
    cover.sunburst = query.get('sunburst') !== '0';
    cover.halftone = query.get('halftone') !== '0';
    cover.grain = query.get('grain') !== '0';
    cover.frame = query.get('frame') !== '0';
    api.fitPanels();

    var titleInput = document.getElementById('title');
    if (titleInput) titleInput.value = cover.title;
    var subInput = document.getElementById('subtitle');
    if (subInput) subInput.value = cover.subtitle;
    var tagInput = document.getElementById('tag');
    if (tagInput) tagInput.value = cover.tag;

    // Load the kit's free sample photos into the panels.
    var photoA = param(query, 'photo', 'pier');
    var photoB = param(query, 'photo2', 'boulevard');
    var images = [];
    try {
      var a = await api.loadImage('samples/' + photoA + '.jpg');
      var b = await api.loadImage('samples/' + photoB + '.jpg');
      var n = LAB.panelCount(cover.layout);
      var pool = [a, b, a, b];
      for (var i = 0; i < n; i++) images.push(pool[i]);
    } catch (e) {
      images = [];
    }
    if (images.length) {
      api.placePhotos(images);
      // A photo that fills two panels gets a different crop in the second
      // one, so the cover never shows the same framing twice.
      var seen = [];
      cover.panels.forEach(function (panel) {
        if (!panel.img) return;
        if (seen.indexOf(panel.img) !== -1) {
          panel.zoom = 1.7;
          panel.ox = 0.05;
          panel.oy = -0.45; // close crop on the face, not the same framing
        } else {
          seen.push(panel.img);
        }
      });
    }

    if (shot === 'cover') {
      document.body.classList.add('shot-cover');
      api.setPicked(-1); // no editor selection outline on exported covers
    }
    if (shot === 'editor') document.body.classList.add('shot-editor');
    if (shot === 'test') {
      document.body.classList.add('shot-test');
      var report = document.getElementById('testReport');
      var results = await global.__coverLab.verifyExports();
      var lines = results.map(function (r) {
        return r.size + ': ' + r.width + 'x' + r.height + ' PNG ' + r.bytes +
          ' bytes, decodes to ' + r.decodedWidth + 'x' + r.decodedHeight +
          ' — ' + (r.ok && r.decodedWidth === r.width && r.decodedHeight === r.height ? 'OK' : 'FAIL');
      });
      report.textContent = 'EXPORT TEST\n' + lines.join('\n') +
        '\nExternal requests: ' + externalRequestCount();
      report.style.display = 'block';
    }

    // Wait for the vendored fonts, then paint twice before signalling ready.
    if (document.fonts) {
      try {
        await document.fonts.load('120px Anton');
        await document.fonts.load('28px "Archivo Black"');
        await document.fonts.ready;
      } catch (e) { /* fall back to system fonts; still a valid render */ }
    }
    api.paint();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { global.__shotReady = true; });
    });
  }

  global.CoverShots = { run: run };
})(window);
