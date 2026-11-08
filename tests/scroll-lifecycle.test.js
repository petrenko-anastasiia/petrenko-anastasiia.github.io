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
  assert(order.skill < order.room && order.room < order.contact, 'page order is not intro grid, room, contact', order);
  assert(order.nested === 0 && order.labels === 1, 'duplicate Find the word section remains', order);

  var reversals = [];
  for (var n = 0; n < 3; n++) {
    await page.evaluate(go, 'skillTrack', 0.22);
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

  await page.evaluate(go, 'skillTrack', 0.64);
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

  await page.evaluate(go, 'skillTrack', 0.02);
  await new Promise(function (r) { setTimeout(r, 300); });
  var fitted = await page.evaluate(skillSnap);
  assert(fitted.gridBottom <= fitted.vh + 2, 'grid lower edge is clipped on a short laptop', fitted);
  assert(fitted.gridTop >= 0, 'grid top is above the pinned viewport', fitted);

  await page.evaluate(go, 'skillTrack', 0.14);
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
    return { moved: moved, lines: lines, playDisplay: play ? getComputedStyle(play).display : '' };
  });
  assert(reduced.moved === 0, 'reduced motion still ran the tile fall', reduced);
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
    assert(vpOrder.skill < vpOrder.room && vpOrder.room < vpOrder.contact, vp.name + ' section order changed', vpOrder);
    await vpPage.evaluate(go, 'skillTrack', 0.22);
    await new Promise(function (r) { setTimeout(r, 500); });
    var vpFall = await vpPage.evaluate(skillSnap);
    assert(vpFall.moved > 8, vp.name + ' fall did not run', vpFall);
    await vpPage.evaluate(go, 'skillTrack', 0.7);
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
