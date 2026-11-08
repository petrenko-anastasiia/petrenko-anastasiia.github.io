const puppeteer = require('/tmp/node_modules/puppeteer-core');
const URL = process.env.SITE_URL || 'http://127.0.0.1:8766/index.html';

function go(id, p) {
  var el = document.getElementById(id);
  var total = el.offsetHeight - window.innerHeight;
  var top = el.getBoundingClientRect().top + window.scrollY;
  window.scrollTo(0, top + total * p);
}
function skillSnap() {
  var track = document.getElementById('skillTrack');
  var grid = document.getElementById('skill-grid');
  var sticky = track.querySelector('.StickyViewport');
  var total = track.offsetHeight - window.innerHeight;
  var p = Math.max(0, Math.min(1, -track.getBoundingClientRect().top / Math.max(1, total)));
  var cells = [].slice.call(grid.querySelectorAll(':scope > .cell'));
  var moved = 0, topBand = 0, sumY = 0, sumDy = 0, nDy = 0, maxBottom = 0;
  cells.forEach(function (c) {
    var m = /translate3d\(\s*(-?[0-9.]+)px,\s*(-?[0-9.]+)px/.exec(c.style.transform || '');
    var dy = m ? parseFloat(m[2]) : 0;
    var r = c.getBoundingClientRect();
    if (r.bottom > maxBottom) maxBottom = r.bottom;
    if (Math.abs(dy) > 10) {
      moved++;
      sumDy += dy;
      nDy++;
      sumY += r.top + r.height / 2;
      if (r.top + r.height / 2 < window.innerHeight * 0.42) topBand++;
    }
  });
  var gr = grid.getBoundingClientRect();
  return {
    p: p,
    stickyTop: sticky.getBoundingClientRect().top,
    vh: window.innerHeight,
    gridTop: gr.top,
    gridBottom: gr.bottom,
    moved: moved,
    topBand: topBand,
    meanDy: nDy ? sumDy / nDy : 0,
    meanY: nDy ? sumY / nDy : 0,
    maxBottom: maxBottom
  };
}
function contactSnap() {
  var track = document.getElementById('engineTrack');
  var sticky = track.querySelector('.engine-sticky');
  var link = track.querySelector('.engine-heading-link');
  var total = track.offsetHeight - window.innerHeight;
  var tr = track.getBoundingClientRect();
  var p = Math.max(0, Math.min(1, -tr.top / Math.max(1, total)));
  var lines = [].slice.call(track.querySelectorAll('#engine-heading .engine-line')).map(function (line) {
    var cs = getComputedStyle(line);
    var t = cs.transform;
    var m = /matrix\(([^)]+)\)/.exec(t);
    var parts = m ? m[1].split(',').map(parseFloat) : null;
    var r = line.getBoundingClientRect();
    return {
      text: line.textContent.trim(),
      transform: t,
      inline: line.style.transform,
      sx: parts ? parts[0] : (t === 'none' ? 1 : null),
      sy: parts ? parts[3] : (t === 'none' ? 1 : null),
      top: r.top,
      h: r.height,
      opacity: parseFloat(cs.opacity),
      syVar: cs.getPropertyValue('--line-sy').trim()
    };
  });
  var tiles = [].slice.call(document.querySelectorAll('#skill-grid > .cell'));
  var over = 0;
  tiles.forEach(function (c) {
    if (!c.style.transform) return;
    var r = c.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth) over++;
  });
  return {
    p: p,
    stickyTop: sticky.getBoundingClientRect().top,
    stickyPos: getComputedStyle(sticky).position,
    href: link.getAttribute('href'),
    lines: lines,
    tilesOver: over,
    kickerTransform: getComputedStyle(track.querySelector('.engine-kicker')).transform,
    kickerText: track.querySelector('.engine-kicker').textContent.trim()
  };
}
function scrollToEndGap() {
  var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, Math.max(0, maxScroll - 80));
}
function endSnap() {
  var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  var lines = [].slice.call(document.querySelectorAll('#engine-heading .engine-line')).map(function (line) {
    var t = getComputedStyle(line).transform;
    var m = /matrix\(([^)]+)\)/.exec(t);
    var parts = m ? m[1].split(',').map(parseFloat) : null;
    var r = line.getBoundingClientRect();
    return { text: line.textContent.trim(), sx: parts ? parts[0] : 1, sy: parts ? parts[3] : 1, h: r.height };
  });
  var over = 0;
  [].slice.call(document.querySelectorAll('#skill-grid > .cell')).forEach(function (c) {
    var r = c.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight && r.height > 2 && r.width > 2) over++;
  });
  var kicker = document.querySelector('.engine-kicker');
  return {
    remain: maxScroll - window.scrollY,
    lines: lines,
    tilesOver: over,
    kickerTransform: getComputedStyle(kicker).transform,
    kickerText: kicker.textContent.trim(),
    curtainVisibility: getComputedStyle(document.getElementById('physicsCurtain')).visibility
  };
}
function roomSnap() {
  return {
    hud: document.getElementById('hudCounterText').textContent,
    play: document.getElementById('roomPlay').textContent.trim(),
    pressed: document.getElementById('roomPlay').getAttribute('aria-pressed')
  };
}
function assert(cond, msg, extra) {
  if (!cond) {
    var err = new Error(msg + (extra ? ' ' + JSON.stringify(extra) : ''));
    err.extra = extra;
    throw err;
  }
}

(async function () {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', function (e) { errors.push(String(e)); });
  await page.setViewport({ width: 1024, height: 640, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(function () {
    document.documentElement.style.scrollBehavior = 'auto';
    var load = document.getElementById('ap-load');
    if (load) load.remove();
    document.body.classList.add('hero-stage-content', 'hero-stage-nav', 'hero-stage-spotlight');
  });

  await page.evaluate(function () {
    var el = document.getElementById('scrollTrack');
    var total = el.offsetHeight - window.innerHeight;
    var top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + total * 0.22);
    var card = document.querySelector('#cardsContainer .case-frame.slot-center');
    var r = card.getBoundingClientRect();
    card.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'mouse'
    }));
  });
  await new Promise(function (r) { setTimeout(r, 900); });
  var early = await page.evaluate(roomSnap);
  assert(early.play === 'Pause' && early.pressed === 'true', 'sitting pointer before start left the room on Play', early);
  assert(/Paid social/.test(early.hud), 'first card should be Paid social', early);

  await page.evaluate(function () {
    var card = document.querySelector('#cardsContainer .case-frame.slot-center');
    var r = card.getBoundingClientRect();
    card.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: r.left + 12, clientY: r.top + 12, pointerId: 1, pointerType: 'mouse'
    }));
    card.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, clientX: r.left + 36, clientY: r.top + 28, pointerId: 1, pointerType: 'mouse'
    }));
  });
  var hovered = await page.evaluate(roomSnap);
  assert(hovered.play === 'Play', 'hover after start should pause', hovered);
  await page.evaluate(function () {
    var card = document.querySelector('#cardsContainer .case-frame.slot-center');
    card.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true, pointerId: 1, pointerType: 'mouse' }));
  });
  await new Promise(function (r) { setTimeout(r, 80); });
  var left = await page.evaluate(roomSnap);
  assert(left.play === 'Pause', 'leaving the card should resume', left);

  var advanced = false;
  var hudLog = [left.hud];
  for (var i = 0; i < 16; i++) {
    await new Promise(function (r) { setTimeout(r, 600); });
    var snap = await page.evaluate(roomSnap);
    hudLog.push(snap.hud);
    if (snap.hud !== '1 / 5 · Paid social') { advanced = true; break; }
  }
  assert(advanced, 'presentation did not advance', hudLog);

  function roomDepth() {
    var track = document.getElementById('scrollTrack');
    var total = track.offsetHeight - window.innerHeight;
    var p = Math.max(0, Math.min(1, -track.getBoundingClientRect().top / Math.max(1, total)));
    var g = document.getElementById('galleryViewport');
    var cs = getComputedStyle(g);
    var center = document.querySelector('.case-frame.slot-center');
    var visual = center.querySelector('.card-visual');
    var metric = center.querySelector('.card-metric');
    var cr = center.getBoundingClientRect();
    var mr = metric.getBoundingClientRect();
    var foreign = 0;
    [[0.3, 0.35], [0.5, 0.5], [0.7, 0.62]].forEach(function (pt) {
      var el = document.elementFromPoint(cr.left + cr.width * pt[0], cr.top + cr.height * pt[1]);
      var card = el && el.closest && el.closest('.case-frame');
      if (card && card !== center) foreign++;
    });
    return {
      p: Math.round(p * 1000) / 1000,
      push: parseFloat(cs.getPropertyValue('--room-push')) || 0,
      persp: parseFloat(cs.getPropertyValue('--room-persp')) || 0,
      origin: parseFloat(cs.getPropertyValue('--room-origin')) || 0,
      stage: document.getElementById('roomStage3D').style.transform,
      opacity: getComputedStyle(center).opacity,
      bg: getComputedStyle(visual).backgroundColor,
      metricInside: mr.top >= cr.top - 1 && mr.bottom <= cr.bottom + 2 && mr.left >= cr.left - 1 && mr.right <= cr.right + 1,
      foreign: foreign,
      hud: document.getElementById('hudCounterText').textContent,
      back: document.getElementById('roomBackLink').textContent.trim()
    };
  }
  var depthAt = {};
  for (var dp of [0.02, 0.16, 0.4]) {
    await page.evaluate(go, 'scrollTrack', dp);
    await new Promise(function (r) { setTimeout(r, 180); });
    depthAt[dp] = await page.evaluate(roomDepth);
  }
  assert(depthAt[0.02].push < 8 && depthAt[0.02].persp > 1320, 'room camera jumped before the scroll', depthAt[0.02]);
  assert(depthAt[0.16].push > depthAt[0.02].push + 25 && depthAt[0.16].persp < depthAt[0.02].persp - 40, 'a small room scroll did not move the camera', depthAt);
  assert(depthAt[0.4].push > depthAt[0.16].push && depthAt[0.4].push <= 130.5 && depthAt[0.4].persp >= 1070, 'room dolly overshot', depthAt[0.4]);
  assert(depthAt[0.4].opacity === '1' && depthAt[0.4].bg === 'rgb(16, 24, 40)' && depthAt[0.4].foreign === 0 && depthAt[0.4].metricInside, 'front card layered or clipped during the dolly', depthAt[0.4]);
  assert(depthAt[0.4].back === 'Back to introduction', 'room back link changed', depthAt[0.4]);
  await page.evaluate(go, 'scrollTrack', 0.02);
  await new Promise(function (r) { setTimeout(r, 180); });
  var depthBack = await page.evaluate(roomDepth);
  assert(depthBack.push < 8 && depthBack.persp > 1320, 'scrolling back did not restore the room camera', depthBack);
  await page.evaluate(go, 'scrollTrack', 0.2);
  await new Promise(function (r) { setTimeout(r, 200); });
  var beforeOpen = await page.evaluate(function () {
    var center = document.querySelector('.case-frame.slot-center');
    return { hud: document.getElementById('hudCounterText').textContent, hash: center.getAttribute('data-hash'), id: center.getAttribute('data-hash').replace('#', '') };
  });
  await page.evaluate(function () { document.querySelector('.case-frame.slot-center').click(); });
  await new Promise(function (r) { setTimeout(r, 200); });
  var opened = await page.evaluate(function (id) {
    var sheet = document.getElementById(id);
    return { sheet: document.body.classList.contains('is-sheet'), open: !!(sheet && sheet.classList.contains('is-open')), hash: location.hash };
  }, beforeOpen.id);
  assert(opened.sheet && opened.open && opened.hash === beforeOpen.hash, 'center card did not open the case', { beforeOpen: beforeOpen, opened: opened });
  await page.evaluate(function () { location.hash = ''; });
  await new Promise(function (r) { setTimeout(r, 200); });
  var closed = await page.evaluate(function () { return document.body.classList.contains('is-sheet'); });
  assert(!closed, 'closing the case left the sheet open', closed);
  assert(/Paid social|Postroom|Hook Lab|Growth case|Organic growth/.test(beforeOpen.hud), 'room hud missing before open', beforeOpen);

  var order = await page.evaluate(function () {
    return {
      skill: document.getElementById('skillTrack').offsetTop,
      room: document.getElementById('scrollTrack').offsetTop,
      contact: document.querySelector('.contact').offsetTop,
      nested: document.querySelectorAll('section.skill-scene').length,
      labels: document.querySelectorAll('[aria-label="Find the word"]').length,
      visibleLabel: [].slice.call(document.querySelectorAll('h2')).filter(function (h) {
        return h.textContent.trim() === 'Find the word' && getComputedStyle(h).position !== 'absolute';
      }).length
    };
  });
  assert(order.room < order.skill && order.skill < order.contact, 'page order is not intro, room, grid, contact', order);
  assert(order.nested === 0 && order.labels === 1, 'duplicate Find the word section remains', order);
  var copy = await page.evaluate(function () {
    var note = document.querySelector('.hero-proof-note');
    var quote = document.getElementById('hero-quote');
    var bios = [].slice.call(document.querySelectorAll('p')).filter(function (p) { return /Four years leading paid social/.test(p.textContent); });
    var nums = [].slice.call(document.querySelectorAll('.hero-proof .num')).map(function (n) { return n.textContent.trim(); });
    var skillBio = document.querySelector('#skillTrack .skill-bio, #skillTrack .hero-bio');
    var quoteNext = quote && quote.nextElementSibling;
    return {
      note: note ? note.textContent.trim() : '',
      noteFont: note ? getComputedStyle(note).fontFamily : '',
      nums: nums,
      bios: bios.length,
      bioInIntro: !!(bios[0] && document.getElementById('intro').contains(bios[0])),
      bioAfterQuote: !!(quoteNext && /Four years leading paid social/.test(quoteNext.textContent)),
      skillBio: !!skillBio
    };
  });
  assert(copy.note === 'Paid CPA on Meta · flagship revenue since launch · time saved with Postroom.', 'proof line changed', copy);
  assert(copy.noteFont.toLowerCase().indexOf('mono') === -1, 'proof line is still monospace', copy);
  assert(copy.nums.join('|') === '−54%|$471K|~75%', 'hero numbers changed', copy);
  assert(copy.bios === 1 && copy.bioInIntro && copy.bioAfterQuote && !copy.skillBio, 'bio is not a single line under the quote', copy);

  function solvedWords() {
    var cells = [].slice.call(document.querySelectorAll('#skill-grid > .cell'));
    var by = {};
    cells.forEach(function (c) {
      if (!c.dataset.word) return;
      var w = c.dataset.word;
      if (!by[w]) by[w] = { n: 0, accent: 0, found: 0 };
      by[w].n++;
      if (c.classList.contains('is-accent')) by[w].accent++;
      if (c.classList.contains('found')) by[w].found++;
    });
    var full = [];
    Object.keys(by).forEach(function (w) {
      if (by[w].n === w.length && by[w].found === w.length && by[w].accent === w.length) full.push(w);
    });
    var fillerAccent = cells.filter(function (c) { return !c.dataset.word && c.classList.contains('is-accent'); }).length;
    return {
      full: full,
      cursor: !!document.querySelector('.skill-auto-cursor.is-on'),
      fillerAccent: fillerAccent,
      tracing: cells.filter(function (c) { return c.classList.contains('tracing'); }).length
    };
  }

  await page.evaluate(go, 'skillTrack', 0);
  await new Promise(function (r) { setTimeout(r, 250); });
  var entry = await page.evaluate(skillSnap);
  await page.evaluate(function () { window.scrollBy(0, 40); });
  await new Promise(function (r) { setTimeout(r, 200); });
  var n40 = await page.evaluate(skillSnap);
  await page.evaluate(function () { window.scrollBy(0, 40); });
  await new Promise(function (r) { setTimeout(r, 200); });
  var n80 = await page.evaluate(skillSnap);
  await page.evaluate(function () { window.scrollBy(0, 40); });
  await new Promise(function (r) { setTimeout(r, 200); });
  var n120 = await page.evaluate(skillSnap);
  assert(entry.moved === 0 && n40.moved === 0 && n80.moved === 0 && n120.moved === 0, 'a small scroll scrambled the word grid', { entry: entry, n40: n40, n80: n80, n120: n120 });
  assert(n40.p > 0.03 && n120.p < 0.52, '40–120px did not stay inside the stable entry', { n40: n40, n120: n120 });

  var auto = { full: [] };
  for (var waitStep = 0; waitStep < 16 && auto.full.length < 3; waitStep++) {
    await new Promise(function (r) { setTimeout(r, 600); });
    auto = await page.evaluate(solvedWords);
    var snap = await page.evaluate(skillSnap);
    assert(snap.moved === 0, 'grid collapsed while words were selecting themselves', { snap: snap, auto: auto });
  }
  assert(auto.full.length >= 3, 'automatic cursor did not finish three words', auto);
  assert(auto.fillerAccent === 0, 'automatic selection accented filler tiles', auto);
  assert(auto.full.indexOf('HIGGSFIELD') >= 0 && auto.full.indexOf('META') >= 0, 'first words were not traced in order', auto);
  var fittedCells = await page.evaluate(function () {
    var cells = [].slice.call(document.querySelectorAll('#skill-grid > .cell'));
    var rows = {};
    var outside = 0;
    cells.forEach(function (c, i) {
      var r = c.getBoundingClientRect();
      var row = Math.floor(i / 15);
      rows[row] = (rows[row] || 0) + 1;
      if (r.top < -1 || r.bottom > window.innerHeight + 1 || r.height < 8) outside++;
    });
    return { count: cells.length, outside: outside, rows: Object.keys(rows).length, transformed: cells.filter(function (c) { return !!c.style.transform; }).length };
  });
  assert(fittedCells.count === 105 && fittedCells.rows === 7 && fittedCells.outside === 0 && fittedCells.transformed === 0, 'a solved grid hid a row on a short laptop', fittedCells);

  var beforeTouch = auto.full.slice();
  await page.evaluate(function () {
    var cell = document.querySelector('#skill-grid > .cell');
    var r = cell.getBoundingClientRect();
    var x = r.left + r.width / 2;
    var y = r.top + r.height / 2;
    cell.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch' }));
    document.getElementById('skill-grid').dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: x, clientY: y + 72, pointerId: 7, pointerType: 'touch' }));
    document.getElementById('skill-grid').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: x, clientY: y + 72, pointerId: 7, pointerType: 'touch' }));
    window.scrollBy(0, 40);
  });
  await new Promise(function (r) { setTimeout(r, 200); });
  var afterTouchScroll = await page.evaluate(skillSnap);
  assert(afterTouchScroll.moved === 0 && afterTouchScroll.p < 0.52, 'touch scroll scrambled the grid', afterTouchScroll);
  var afterTouch = { full: beforeTouch };
  for (var touchWait = 0; touchWait < 12 && afterTouch.full.length <= beforeTouch.length; touchWait++) {
    await new Promise(function (r) { setTimeout(r, 600); });
    afterTouch = await page.evaluate(solvedWords);
  }
  assert(afterTouch.full.length > beforeTouch.length, 'a vertical touch cancelled automatic selection', { beforeTouch: beforeTouch, afterTouch: afterTouch });

  var reversals = [];
  for (var n = 0; n < 3; n++) {
    await page.evaluate(go, 'skillTrack', 0.69);
    await new Promise(function (r) { setTimeout(r, 700); });
    var mid = await page.evaluate(skillSnap);
    await page.evaluate(go, 'skillTrack', 0.02);
    await new Promise(function (r) { setTimeout(r, 350); });
    var back = await page.evaluate(skillSnap);
    var shown = await page.evaluate(function () {
      return getComputedStyle(document.getElementById('physicsCurtain')).visibility;
    });
    await page.evaluate(go, 'scrollTrack', 0.25);
    await new Promise(function (r) { setTimeout(r, 250); });
    var overRoom = await page.evaluate(function () {
      var nOver = 0;
      [].slice.call(document.querySelectorAll('#skill-grid > .cell')).forEach(function (c) {
        var r = c.getBoundingClientRect();
        if (r.height > 2 && r.bottom > 40 && r.top < window.innerHeight - 40) nOver++;
      });
      return nOver;
    });
    reversals.push({ mid: mid, back: back, overRoom: overRoom, shown: shown });
    assert(mid.moved > 12, 'fall did not move tiles on pass ' + n, mid);
    assert(mid.topBand < mid.moved * 0.35, 'tiles clumped in the top band on pass ' + n, mid);
    assert(mid.meanY > mid.vh * 0.45, 'fallen tiles stayed in the top half on pass ' + n, mid);
    assert(back.moved === 0, 'reverse to the skills start left transforms on pass ' + n, back);
    assert(shown === 'visible', 'reverse did not restore the grid layer on pass ' + n, shown);
    assert(overRoom === 0, 'skill tiles covered the room after reverse on pass ' + n, overRoom);
  }

  await page.evaluate(go, 'skillTrack', 0.94);
  await new Promise(function (r) { setTimeout(r, 400); });
  var risen = await page.evaluate(function () {
    var floor = document.getElementById('physicsFloorLine');
    var curtain = document.getElementById('physicsCurtain');
    var posed = [].slice.call(document.querySelectorAll('#skill-grid > .cell')).filter(function (c) {
      return !!c.style.transform;
    }).length;
    return {
      floorTop: parseFloat(floor.style.top),
      visibility: getComputedStyle(curtain).visibility,
      opacity: getComputedStyle(curtain).opacity,
      pointerEvents: getComputedStyle(curtain).pointerEvents,
      posed: posed
    };
  });
  assert(risen.floorTop <= -200, 'floor did not travel to -220', risen);
  assert(risen.visibility === 'hidden' && risen.opacity === '0' && risen.pointerEvents === 'none', 'physics layer stayed interactive after the wipe', risen);
  assert(risen.posed === 0, 'fallen tile transforms remained after the floor rose', risen);

  var tail = await page.evaluate(function () {
    var footer = document.querySelector('.contact').getBoundingClientRect();
    return { gap: Math.round(footer.top - window.innerHeight), vh: window.innerHeight };
  });
  assert(tail.gap < tail.vh * 0.22, 'hidden skill tail leaves a screen of blank above the footer', tail);
  await page.evaluate(go, 'skillTrack', 1);
  await new Promise(function (r) { setTimeout(r, 200); });
  await page.evaluate(function () { window.scrollBy(0, -220); });
  await new Promise(function (r) { setTimeout(r, 350); });
  var returned = await page.evaluate(function () {
    var curtain = document.getElementById('physicsCurtain');
    var cells = [].slice.call(document.querySelectorAll('#skill-grid > .cell'));
    var seen = 0;
    cells.forEach(function (c) {
      var r = c.getBoundingClientRect();
      if (r.width > 4 && r.bottom > 80 && r.top < window.innerHeight - 24) seen++;
    });
    return {
      curtain: getComputedStyle(curtain).visibility,
      seen: seen,
      moved: cells.filter(function (c) { return !!c.style.transform; }).length
    };
  });
  assert(returned.curtain === 'visible' && returned.seen > 20 && returned.moved === 0, 'scrolling back from the footer did not restore the word grid', returned);

  await page.evaluate(go, 'skillTrack', 0.02);
  await new Promise(function (r) { setTimeout(r, 300); });
  var fitted = await page.evaluate(skillSnap);
  assert(fitted.gridBottom <= fitted.vh + 2, 'grid lower edge is clipped on a short laptop', fitted);
  assert(fitted.gridTop >= 0, 'grid top is above the pinned viewport', fitted);

  await page.evaluate(go, 'skillTrack', 0.6);
  await new Promise(function (r) { setTimeout(r, 280); });
  var partialA = await page.evaluate(skillSnap);
  await new Promise(function (r) { setTimeout(r, 900); });
  var partialB = await page.evaluate(skillSnap);
  var keptFalling = partialB.meanDy > partialA.meanDy + 8;
  var settledLow = partialB.meanY > partialB.vh * 0.55 && Math.abs(partialB.meanDy - partialA.meanDy) < 24;
  assert(partialA.moved > 0 && partialB.moved > 0, 'partial fall released nothing', { partialA: partialA, partialB: partialB });
  assert(keptFalling || settledLow, 'partial fall froze in the air', { partialA: partialA, partialB: partialB });
  assert(partialB.topBand < Math.max(4, partialB.moved * 0.4), 'partial fall clumped at the top', partialB);

  var contacts = {};
  for (var cp of [0.05, 0.2, 0.45, 0.75, 1]) {
    await page.evaluate(go, 'engineTrack', cp);
    await new Promise(function (r) { setTimeout(r, 120); });
    contacts[cp] = await page.evaluate(contactSnap);
    var shot = contacts[cp];
    assert(shot.lines.length === 2, 'missing footer lines', shot);
    assert(shot.href.indexOf('mailto:apetrenko597@gmail.com') === 0, 'mailto link changed', shot.href);
    assert(shot.tilesOver === 0, 'physics tiles still cover contact at ' + cp, shot);
    assert(shot.kickerTransform === 'none', 'Open to work is transformed at contact ' + cp, shot);
    shot.lines.forEach(function (line) {
      assert(line.sx != null && line.sx <= 1.05 && line.sx >= 0.95, 'scaleX left 1 at p ' + cp, line);
      assert(line.sy != null && line.sy >= 0.88, 'scaleY collapsed at p ' + cp, line);
      assert(!/scaleX\(/.test(line.inline), 'inline scaleX transform returned', line);
      assert(line.h >= 24, 'line is a flat bar at p ' + cp, line);
    });
    if (cp >= 0.45) {
      assert(Math.abs(shot.stickyTop) < 30, 'contact pin missed at p ' + cp, shot);
      shot.lines.forEach(function (line) {
        assert(line.sy >= 0.97, 'headline not readable by mid progress ' + cp, line);
        assert(line.h >= 28, 'headline too short at p ' + cp, line);
        assert(line.opacity >= 0.9, 'headline still faded at p ' + cp, line);
      });
    }
  }
  assert(contacts[0.45].lines[0].text === "Let's scale", 'heading copy changed', contacts[0.45]);
  assert(contacts[0.45].lines[1].text === 'Your growth engine', 'heading copy changed', contacts[0.45]);
  assert(contacts[0.2].lines[0].h > 24 && contacts[1].lines[0].sy >= 0.97, 'readable state exists only at the endpoint', contacts);
  await page.evaluate(scrollToEndGap);
  await new Promise(function (r) { setTimeout(r, 250); });
  var atEnd = await page.evaluate(endSnap);
  assert(Math.abs(atEnd.remain - 80) < 2, 'did not stop 80px before max scroll', atEnd);
  atEnd.lines.forEach(function (line) {
    assert(line.sx >= 0.98 && line.sx <= 1.02 && line.sy >= 0.98, 'headline not fully readable 80px before the end', line);
    assert(line.h >= 28, 'headline is flat 80px before the end', line);
  });
  assert(atEnd.kickerTransform === 'none' && /open to work/i.test(atEnd.kickerText), 'Open to work warped at the end', atEnd);
  assert(atEnd.tilesOver === 0 && atEnd.curtainVisibility === 'hidden', 'tiles still cover the footer', atEnd);

  var tiles = await page.evaluate(function () {
    var cells = [].slice.call(document.querySelectorAll('#skill-grid > .cell'));
    var filler = cells.filter(function (c) { return !c.dataset.word; });
    var accent = cells.filter(function (c) { return c.classList.contains('is-accent'); });
    var sample = filler[0];
    var cs = getComputedStyle(sample);
    return {
      count: cells.length,
      letterTiles: cells.filter(function (c) { return c.classList.contains('letter-tile'); }).length,
      fillerAccent: filler.filter(function (c) { return c.classList.contains('is-accent'); }).length,
      accentWithoutWord: accent.filter(function (c) { return !c.dataset.word; }).length,
      bg: cs.backgroundColor,
      color: cs.color,
      radius: cs.borderTopLeftRadius,
      transition: cs.transitionProperty
    };
  });
  await page.evaluate(function () {
    var word = [].slice.call(document.querySelectorAll('#skill-grid > .cell')).filter(function (c) { return c.dataset.word && !c.classList.contains('is-accent'); })[0];
    word.dataset.accentProbe = '1';
    word.classList.add('is-accent');
  });
  await new Promise(function (r) { setTimeout(r, 260); });
  var accentStyle = await page.evaluate(function () {
    var word = document.querySelector('#skill-grid > .cell[data-accent-probe="1"]');
    var cs = getComputedStyle(word);
    word.classList.remove('is-accent');
    word.removeAttribute('data-accent-probe');
    return { accentBg: cs.backgroundColor, accentColor: cs.color };
  });
  tiles.accentBg = accentStyle.accentBg;
  tiles.accentColor = accentStyle.accentColor;
  assert(tiles.letterTiles === tiles.count && tiles.count > 20, 'letter-tile missing on grid nodes', tiles);
  assert(tiles.fillerAccent === 0 && tiles.accentWithoutWord === 0, 'filler tiles were accented', tiles);
  assert(tiles.bg === 'rgb(17, 23, 34)', 'unselected tile has no tile background', tiles);
  assert(tiles.accentBg === 'rgb(77, 166, 255)', 'accent tile is not the skill blue', tiles);
  assert(tiles.accentColor === 'rgb(4, 16, 34)', 'accent type color changed', tiles);
  assert(tiles.transition.indexOf('transform') === -1, 'physics transform is transitioned', tiles);

  const reducePage = await browser.newPage();
  await reducePage.setViewport({ width: 1024, height: 640 });
  await reducePage.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await reducePage.goto(URL, { waitUntil: 'domcontentloaded' });
  const reduced = await reducePage.evaluate(async function () {
    document.documentElement.style.scrollBehavior = 'auto';
    var load = document.getElementById('ap-load');
    if (load) load.remove();
    function go(id, p) {
      var el = document.getElementById(id);
      var total = el.offsetHeight - window.innerHeight;
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + total * p);
    }
    go('scrollTrack', 0.35);
    await new Promise(function (r) { setTimeout(r, 200); });
    var roomStill = (function () {
      var g = getComputedStyle(document.getElementById('galleryViewport'));
      return { push: parseFloat(g.getPropertyValue('--room-push')) || 0, persp: parseFloat(g.getPropertyValue('--room-persp')) || 1350 };
    })();
    go('skillTrack', 0.45);
    await new Promise(function (r) { setTimeout(r, 500); });
    var moved = [].slice.call(document.querySelectorAll('#skill-grid > .cell')).filter(function (c) { return c.style.transform; }).length;
    go('engineTrack', 0.3);
    await new Promise(function (r) { setTimeout(r, 200); });
    var lines = [].slice.call(document.querySelectorAll('#engine-heading .engine-line')).map(function (line) {
      var r = line.getBoundingClientRect();
      return { h: r.height, transform: getComputedStyle(line).transform, sy: getComputedStyle(line).getPropertyValue('--line-sy').trim() };
    });
    var play = document.getElementById('roomPlay');
    return { moved: moved, lines: lines, playDisplay: play ? getComputedStyle(play).display : '', roomStill: roomStill };
  });
  assert(reduced.moved === 0, 'reduced motion still ran the tile fall', reduced);
  assert(reduced.roomStill.push === 0 && reduced.roomStill.persp >= 1340, 'reduced motion still dollied the room', reduced);
  reduced.lines.forEach(function (line) {
    assert(line.h >= 28, 'reduced-motion headline is not readable', line);
    assert(line.transform === 'none', 'reduced-motion headline still transforms', line);
  });
  assert(reduced.playDisplay === 'none', 'reduced motion still shows the room play control', reduced);
  await reducePage.close();

  for (var vp of [{ w: 1440, h: 900, name: 'desktop' }, { w: 390, h: 844, name: 'phone' }]) {
    var vpPage = await browser.newPage();
    vpPage.on('pageerror', function (e) { errors.push(vp.name + ' ' + String(e)); });
    await vpPage.setViewport({ width: vp.w, height: vp.h });
    await vpPage.goto(URL, { waitUntil: 'domcontentloaded' });
    await vpPage.evaluate(function () {
      document.documentElement.style.scrollBehavior = 'auto';
      var load = document.getElementById('ap-load');
      if (load) load.remove();
    });
    var vpOrder = await vpPage.evaluate(function () {
      return {
        skill: document.getElementById('skillTrack').offsetTop,
        room: document.getElementById('scrollTrack').offsetTop,
        contact: document.querySelector('.contact').offsetTop
      };
    });
    assert(vpOrder.room < vpOrder.skill && vpOrder.skill < vpOrder.contact, vp.name + ' section order changed', vpOrder);
    var vpDepth = {};
    for (var rp of [0.04, 0.36]) {
      await vpPage.evaluate(go, 'scrollTrack', rp);
      await new Promise(function (r) { setTimeout(r, 160); });
      vpDepth[rp] = await vpPage.evaluate(function () {
        var g = getComputedStyle(document.getElementById('galleryViewport'));
        var center = document.querySelector('.case-frame.slot-center');
        var cr = center.getBoundingClientRect();
        var metric = center.querySelector('.card-metric').getBoundingClientRect();
        return {
          push: parseFloat(g.getPropertyValue('--room-push')) || 0,
          persp: parseFloat(g.getPropertyValue('--room-persp')) || 0,
          opacity: getComputedStyle(center).opacity,
          metricInside: metric.bottom <= cr.bottom + 2 && metric.top >= cr.top - 1
        };
      });
    }
    assert(vpDepth[0.36].push > vpDepth[0.04].push + 40 && vpDepth[0.36].persp < vpDepth[0.04].persp - 60, vp.name + ' room scroll did not add depth', vpDepth);
    assert(vpDepth[0.36].opacity === '1' && vpDepth[0.36].metricInside && vpDepth[0.36].push <= 130.5, vp.name + ' room dolly clipped the card', vpDepth);
    await vpPage.evaluate(go, 'scrollTrack', 0.04);
    await new Promise(function (r) { setTimeout(r, 140); });
    var vpDepthBack = await vpPage.evaluate(function () {
      return parseFloat(getComputedStyle(document.getElementById('galleryViewport')).getPropertyValue('--room-push')) || 0;
    });
    assert(vpDepthBack < vpDepth[0.04].push + 8, vp.name + ' room camera did not come back', { back: vpDepthBack, start: vpDepth[0.04] });
    var vpCopy = await vpPage.evaluate(function () {
      var note = document.querySelector('.hero-proof-note');
      var quote = document.getElementById('hero-quote');
      var bios = [].slice.call(document.querySelectorAll('p')).filter(function (p) { return /Four years leading paid social/.test(p.textContent); });
      var r = note.getBoundingClientRect();
      return {
        note: note.textContent.trim(),
        lines: Math.round(r.height / parseFloat(getComputedStyle(note).lineHeight)),
        bioAfterQuote: !!(quote.nextElementSibling && /Four years leading paid social/.test(quote.nextElementSibling.textContent)),
        skillBio: !!document.querySelector('#skillTrack .hero-bio, #skillTrack .skill-bio'),
        bios: bios.length,
        bioBelowQuote: document.querySelector('.hero-bio').getBoundingClientRect().top > document.getElementById('hero-quote').getBoundingClientRect().top
      };
    });
    assert(vpCopy.note.indexOf('Paid CPA on Meta') === 0 && vpCopy.lines <= 3 && vpCopy.bioAfterQuote && vpCopy.bioBelowQuote && vpCopy.bios === 1 && !vpCopy.skillBio, vp.name + ' intro copy layout changed', vpCopy);
    await vpPage.evaluate(go, 'skillTrack', 0.2);
    await new Promise(function (r) { setTimeout(r, 250); });
    var vpStable = await vpPage.evaluate(skillSnap);
    assert(vpStable.moved === 0 && vpStable.p < 0.52, vp.name + ' small entry scroll scrambled the grid', vpStable);
    await vpPage.evaluate(go, 'skillTrack', 0.69);
    await new Promise(function (r) { setTimeout(r, 700); });
    var vpFall = await vpPage.evaluate(skillSnap);
    assert(vpFall.moved > 8, vp.name + ' fall did not run', vpFall);
    await vpPage.evaluate(go, 'skillTrack', 0.96);
    await new Promise(function (r) { setTimeout(r, 300); });
    var vpHide = await vpPage.evaluate(function () {
      var curtain = document.getElementById('physicsCurtain');
      var posed = [].slice.call(document.querySelectorAll('#skill-grid > .cell')).filter(function (c) { return !!c.style.transform; }).length;
      return { visibility: getComputedStyle(curtain).visibility, floor: parseFloat(document.getElementById('physicsFloorLine').style.top), posed: posed };
    });
    assert(vpHide.visibility === 'hidden' && vpHide.floor <= -200 && vpHide.posed === 0, vp.name + ' tiles stayed over the next section', vpHide);
    await vpPage.evaluate(scrollToEndGap);
    await new Promise(function (r) { setTimeout(r, 250); });
    var vpEnd = await vpPage.evaluate(endSnap);
    assert(Math.abs(vpEnd.remain - 80) < 2, vp.name + ' footer was not measured 80px before the end', vpEnd);
    vpEnd.lines.forEach(function (line) {
      assert(line.sy >= 0.98 && line.sx >= 0.98 && line.sx <= 1.02 && line.h >= 20, vp.name + ' headline not readable 80px before the end', line);
    });
    assert(vpEnd.kickerTransform === 'none' && vpEnd.tilesOver === 0, vp.name + ' Open to work or tiles failed', vpEnd);
    await vpPage.close();
  }

  const repeat = await browser.newPage();
  await repeat.evaluateOnNewDocument(function () { localStorage.setItem('ap-loader-seen-v1', '1'); });
  await repeat.setViewport({ width: 1024, height: 640 });
  await repeat.goto(URL, { waitUntil: 'domcontentloaded' });
  await new Promise(function (r) { setTimeout(r, 1600); });
  const hero = await repeat.evaluate(function () {
    var h = document.getElementById('waveHeading');
    return {
      chars: h.querySelectorAll('.hero-wave-char').length,
      color: getComputedStyle(h).color,
      wave: document.body.classList.contains('hero-stage-wave'),
      spotlight: document.body.classList.contains('hero-stage-spotlight'),
      quote: document.getElementById('hero-quote').textContent.indexOf('decode what makes') >= 0,
      replay: document.querySelectorAll('.hook-replay').length
    };
  });
  assert(hero.chars > 10 && hero.wave && hero.spotlight, 'repeat visit skipped the hero wave', hero);
  assert(hero.color !== 'rgba(243, 246, 252, 0.16)', 'headline stayed dim on a repeat visit', hero);
  assert(hero.quote && hero.replay === 0, 'static quote was replaced', hero);
  await repeat.mouse.move(512, 340);
  var parked = false;
  for (var step = 0; step < 90 && !parked; step++) {
    await repeat.mouse.wheel({ deltaY: 160 });
    await new Promise(function (r) { setTimeout(r, 30); });
    parked = await repeat.evaluate(function () {
      var s = document.getElementById('roomStage3D').getBoundingClientRect();
      return s.top < 80 && s.bottom > window.innerHeight - 80;
    });
  }
  assert(parked, 'native wheel never brought the room on screen');
  var before = await repeat.evaluate(roomSnap);
  var movedCase = false;
  var roomLog = [before.hud + ' ' + before.play];
  for (var tick = 0; tick < 14; tick++) {
    await new Promise(function (r) { setTimeout(r, 1000); });
    var now = await repeat.evaluate(roomSnap);
    roomLog.push(now.hud + ' ' + now.play);
    if (now.hud !== before.hud) { movedCase = true; break; }
  }
  assert(movedCase, 'parked cursor on a visible room did not advance', roomLog);
  await repeat.evaluate(function () {
    var h = document.getElementById('engine-heading');
    window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.9);
  });
  await new Promise(function (r) { setTimeout(r, 250); });
  const entering = await repeat.evaluate(function () {
    var line = document.querySelector('#engine-heading .engine-line');
    var t = getComputedStyle(line).transform;
    var m = /matrix\(([^)]+)\)/.exec(t);
    var parts = m ? m[1].split(',').map(parseFloat) : [1, 0, 0, 1];
    return { sy: parts[3], sx: parts[0], top: document.getElementById('engine-heading').getBoundingClientRect().top, vh: window.innerHeight };
  });
  assert(entering.sy >= 0.85 && entering.sy < 0.99 && entering.sx <= 1.02, 'footer did not animate while the heading was entering', entering);
  await repeat.close();

  for (var bleedVp of [{ w: 1024, h: 640, name: 'laptop' }, { w: 1440, h: 900, name: 'desktop' }, { w: 390, h: 844, name: 'phone' }]) {
    var bleedPage = await browser.newPage();
    await bleedPage.setViewport({ width: bleedVp.w, height: bleedVp.h, isMobile: bleedVp.w < 500 });
    await bleedPage.evaluateOnNewDocument(function () { localStorage.setItem('ap-loader-seen-v1', '1'); });
    await bleedPage.goto(URL, { waitUntil: 'domcontentloaded' });
    await bleedPage.evaluate(go, 'scrollTrack', 0.2);
    await new Promise(function (r) { setTimeout(r, 200); });
    var bleed = await bleedPage.evaluate(async function () {
      var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
      var next = document.getElementById('nextBtn');
      var bad = [];
      async function probe(label) {
        await wait(40);
        var anims = document.getAnimations().filter(function (a) {
          return a.effect && a.effect.target && a.effect.target.classList && a.effect.target.classList.contains('case-frame');
        });
        var times = [0, 140, 275, 400, 540];
        for (var ti = 0; ti < times.length; ti++) {
          anims.forEach(function (a) { try { a.pause(); a.currentTime = times[ti]; } catch (e) {} });
          var center = document.querySelector('.case-frame.slot-center');
          var rect = center.getBoundingClientRect();
          var foreign = 0;
          for (var gy = 0.22; gy <= 0.78; gy += 0.28) {
            for (var gx = 0.22; gx <= 0.78; gx += 0.28) {
              var el = document.elementFromPoint(rect.left + rect.width * gx, rect.top + rect.height * gy);
              var card = el && el.closest && el.closest('.case-frame');
              if (card && card !== center) foreign++;
            }
          }
          if (foreign) bad.push({ label: label, t: times[ti], foreign: foreign, hud: document.getElementById('hudCounterText').textContent });
        }
        anims.forEach(function (a) { try { a.finish(); } catch (e) {} });
        await wait(20);
      }
      for (var step = 0; step < 5; step++) { next.click(); await probe('next-' + step); }
      for (var rush = 0; rush < 5; rush++) next.click();
      await probe('rapid');
      return bad;
    });
    assert(!bleed.length, bleedVp.name + ' center card shows another case during the move', bleed);
    await bleedPage.close();
  }

  assert(!errors.length, 'page errors', errors);
  console.log(JSON.stringify({
    ok: true,
    early: early,
    hudLog: hudLog,
    reversals: reversals.map(function (r) {
      return { moved: r.mid.moved, topBand: r.mid.topBand, meanY: Math.round(r.mid.meanY), backMoved: r.back.moved };
    }),
    partial: { aDy: Math.round(partialA.meanDy), bDy: Math.round(partialB.meanDy), bY: Math.round(partialB.meanY) },
    contactSy: Object.keys(contacts).map(function (k) {
      return { p: k, sy: contacts[k].lines.map(function (l) { return l.sy; }), h: contacts[k].lines.map(function (l) { return Math.round(l.h); }) };
    }),
    tiles: tiles
  }, null, 2));
  await browser.close();
})().catch(function (e) {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
