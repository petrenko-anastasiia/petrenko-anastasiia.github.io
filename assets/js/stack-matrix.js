/* Stack matrix — connected word capsules (upgrade v1) */
(function () {
  'use strict';
  var section = document.getElementById('stack');
  var board = document.getElementById('sm-board');
  if (!section || !board) return;

  var COLS = 15;
  var ROWS = 7;
  var PILLAR = { ai: 'AI & Ops', paid: 'Paid Social & Strategy', data: 'Data', egg: 'Hidden word' };

  // Proof copy comes from the case studies on this site.
  var WORDS = [
    { word: 'HIGGSFIELD', row: 0, col: 0, dir: 'h', pillar: 'ai', tag: 'AI video generation',
      desc: 'Generated the ZOLA, L-Theanine and SOLÈNE spec ads and the Postroom promo. No shoot on any of them.',
      kpi: '4 Hook Lab pieces', href: '#hooklab', cta: 'Open Hook Lab' },
    { word: 'META', row: 0, col: 11, dir: 'h', pillar: 'paid', tag: 'Paid social',
      desc: 'Ad sets split by hook type in Meta Ads Manager, losers cut on CPA per paid checkout, budget moved to the product-demo hook.',
      kpi: '−54% CPA in 6 weeks', href: '#paid', cta: 'Open case' },
    { word: 'PRODUCTION', row: 1, col: 0, dir: 'h', pillar: 'ai', tag: 'AI production',
      desc: 'Led an 8–12 person content team. Hook Lab is six AI-produced pieces, one hook type each.',
      kpi: '6 pieces, no shoot', href: '#hooklab', cta: 'Open Hook Lab' },
    { word: 'GA4', row: 1, col: 12, dir: 'v', pillar: 'data', tag: 'Analytics & reporting',
      desc: 'GA4 and Looker Studio for reporting. Creative decisions are made on CPA per paid checkout, not on views.',
      kpi: '', href: '#paid', cta: 'See the test' },
    { word: 'STRATEGY', row: 2, col: 0, dir: 'h', pillar: 'paid', tag: 'Creative strategy',
      desc: 'Every variant starts from a written hypothesis; hooks are tested by type, then cut or scaled.',
      kpi: '8–10 new variants a week', href: '#paid', cta: 'Open case' },
    { word: 'COMFYUI', row: 3, col: 0, dir: 'h', pillar: 'ai', tag: 'Node-based image & video',
      desc: 'Outfit transition: a plain white dress turns into a black chained look on the beat at ~3s.',
      kpi: 'Before/After Transition', href: '#hooklab', cta: 'Open Hook Lab' },
    { word: 'CAPCUT', row: 4, col: 0, dir: 'h', pillar: 'paid', tag: 'Short-form editing',
      desc: 'Short-form production for TikTok and Reels, alongside Canva and Notion for the team.',
      kpi: '', href: '#strategy', cta: 'Open organic growth' },
    { word: 'TIKTOK', row: 4, col: 9, dir: 'h', pillar: 'paid', tag: 'TikTok & Reels',
      desc: 'Creative testing on Meta and TikTok, plus short-form strategy across client accounts.',
      kpi: '~1M organic views, 1 month, 3 accounts', href: '#strategy', cta: 'Open organic growth' },
    { word: 'CLAUDE', row: 5, col: 1, dir: 'h', pillar: 'ai', tag: 'LLM workflows',
      desc: 'Part of the ARGŌ spec-ad stack (Nano Banana, Veo, ffmpeg, Claude) and my everyday toolkit with Claude Code.',
      kpi: '', href: 'work/argo/', cta: 'Open ARGŌ case' },
    { word: 'POSTROOM', row: 6, col: 0, dir: 'h', pillar: 'ai', tag: 'Built in Cursor',
      desc: 'AI captions, approval, scheduling and Instagram API publishing in one workspace. Used in production.',
      kpi: '~75% faster publishing', href: 'work/postroom/', cta: 'Try the demo' }
  ];
  var EGG = { word: 'ROAS', row: 3, col: 8, dir: 'v', pillar: 'egg', tag: 'Hidden word',
    desc: 'ROAS held at 2.5–4.0× while CPA fell ~54% in the six-week Meta test. Full breakdown on request.',
    kpi: '2.5–4.0×', href: 'mailto:apetrenko597@gmail.com?subject=ROAS%20breakdown', cta: 'Ask for it' };

  var FILLER = 'KVXWQZBNJLPYRHD';
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Build the matrix ---------- */
  var cells = [];
  for (var r = 0; r < ROWS; r++) {
    cells[r] = [];
    for (var c = 0; c < COLS; c++) {
      cells[r][c] = { ch: FILLER[(r * 7 + c * 3) % FILLER.length], pillars: [], egg: -1 };
    }
  }
  function eachCell(w, fn) {
    for (var i = 0; i < w.word.length; i++) {
      var rr = w.dir === 'v' ? w.row + i : w.row;
      var cc = w.dir === 'h' ? w.col + i : w.col;
      fn(cells[rr][cc], i, rr, cc);
    }
  }
  WORDS.forEach(function (w) {
    eachCell(w, function (cell, i) { cell.ch = w.word[i]; cell.pillars.push(w.pillar); });
  });
  eachCell(EGG, function (cell, i) { cell.ch = EGG.word[i]; cell.egg = i; });

  var tiles = [];
  var frag = document.createDocumentFragment();
  for (r = 0; r < ROWS; r++) {
    tiles[r] = [];
    for (c = 0; c < COLS; c++) {
      var info = cells[r][c];
      var t = document.createElement('div');
      t.className = 'sm-tile' + (info.pillars.length ? ' is-word' : '') + (info.egg >= 0 ? ' is-egg' : '');
      t.textContent = info.ch;
      t.setAttribute('aria-hidden', 'true');
      if (info.egg >= 0) t.setAttribute('data-egg', String(info.egg));
      frag.appendChild(t);
      tiles[r][c] = t;
    }
  }
  board.appendChild(frag);

  /* ---------- Capsules, synced to tile geometry ---------- */
  var capsLayer = document.getElementById('sm-caps');
  var caps = [];

  function makeCapsule(w) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sm-cap';
    b.setAttribute('data-pillar', w.pillar);
    b.setAttribute('aria-label', w.word + ', ' + PILLAR[w.pillar] + '. Show proof');
    b.setAttribute('aria-controls', 'sm-card');
    b.setAttribute('aria-expanded', 'false');
    b.textContent = w.word;
    capsLayer.appendChild(b);
    var cap = { el: b, w: w };
    caps.push(cap);
    bindCapsule(cap);
    layout();
    return cap;
  }

  function layout() {
    for (var rr = 0; rr < ROWS; rr++) {
      for (var cc = 0; cc < COLS; cc++) {
        var tile = tiles[rr][cc];
        tile.style.setProperty('--ox', tile.offsetLeft + 'px');
        tile.style.setProperty('--oy', tile.offsetTop + 'px');
      }
    }
    var pad = window.innerWidth <= 720 ? 1 : 2;
    caps.forEach(function (cap) {
      var w = cap.w;
      var a = tiles[w.row][w.col];
      var endR = w.dir === 'v' ? w.row + w.word.length - 1 : w.row;
      var endC = w.dir === 'h' ? w.col + w.word.length - 1 : w.col;
      var z = tiles[endR][endC];
      cap.el.style.left = (a.offsetLeft - pad) + 'px';
      cap.el.style.top = (a.offsetTop - pad) + 'px';
      cap.el.style.width = (z.offsetLeft + z.offsetWidth - a.offsetLeft + pad * 2) + 'px';
      cap.el.style.height = (z.offsetTop + z.offsetHeight - a.offsetTop + pad * 2) + 'px';
    });
  }
  WORDS.forEach(makeCapsule);
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(board);
  else window.addEventListener('resize', layout);

  /* ---------- Proof-of-work card ---------- */
  var card = document.getElementById('sm-card');
  var cardLink = document.getElementById('sm-card-link');
  var pinned = null;   // capsule currently pinned
  var hovered = null;

  function fill(w) {
    card.setAttribute('data-pillar', w.pillar);
    document.getElementById('sm-card-tag').textContent = PILLAR[w.pillar] + ' · ' + w.tag;
    document.getElementById('sm-card-name').textContent = w.word;
    document.getElementById('sm-card-desc').textContent = w.desc;
    document.getElementById('sm-card-kpi').textContent = w.kpi;
    cardLink.textContent = w.cta;
    cardLink.setAttribute('href', w.href);
  }
  function place(x, y) {
    var pad = 16;
    var cw = card.offsetWidth || 290;
    var ch = card.offsetHeight || 160;
    var left = x + 16;
    if (left + cw > window.innerWidth - pad) left = x - cw - 16;
    left = Math.min(Math.max(pad, left), window.innerWidth - cw - pad);
    var top = y - ch - 12;
    if (top < pad) top = y + 18;
    top = Math.min(Math.max(pad, top), window.innerHeight - ch - pad);
    card.style.left = left + 'px';
    card.style.top = top + 'px';
  }
  function placeAt(el) {
    var rect = el.getBoundingClientRect();
    place(rect.left + Math.min(rect.width, 160) / 2, rect.top);
  }
  function show(cap, x, y) {
    fill(cap.w);
    card.hidden = false;
    if (x === undefined) placeAt(cap.el); else place(x, y);
    requestAnimationFrame(function () { card.classList.add('is-visible'); });
    caps.forEach(function (o) { o.el.classList.toggle('is-active', o === cap); });
  }
  function hide() {
    card.classList.remove('is-visible', 'is-pinned');
    card.hidden = true;
    caps.forEach(function (o) {
      o.el.classList.remove('is-active');
      o.el.setAttribute('aria-expanded', 'false');
    });
  }
  function unpin(returnFocus) {
    var was = pinned;
    pinned = null;
    hide();
    if (returnFocus && was) was.el.focus();
  }
  function pin(cap, fromKeyboard) {
    pinned = cap;
    show(cap);
    card.classList.add('is-pinned');
    cap.el.setAttribute('aria-expanded', 'true');
    if (fromKeyboard) cardLink.focus();
  }

  function bindCapsule(cap) {
    var el = cap.el;
    el.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse' || pinned) return;
      hovered = cap;
      show(cap, e.clientX, e.clientY);
    });
    el.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || pinned || hovered !== cap) return;
      place(e.clientX, e.clientY);
    });
    el.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse' || pinned || hovered !== cap) return;
      hovered = null;
      hide();
    });
    el.addEventListener('focus', function () {
      if (!pinned && el.matches(':focus-visible')) show(cap);
    });
    el.addEventListener('blur', function () {
      if (!pinned) hide();
    });
    el.addEventListener('click', function (e) {
      var keyboard = e.detail === 0;
      if (pinned === cap) { unpin(keyboard); return; }
      pin(cap, keyboard);
    });
  }

  document.getElementById('sm-card-close').addEventListener('click', function () { unpin(true); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && (pinned || !card.hidden)) unpin(true);
  });
  document.addEventListener('pointerdown', function (e) {
    if (!pinned) return;
    if (card.contains(e.target) || (e.target.closest && e.target.closest('.sm-cap'))) return;
    unpin(false);
  });
  window.addEventListener('scroll', function () { if (pinned) placeAt(pinned.el); }, { passive: true });

  /* ---------- Filters ---------- */
  var filter = 'all';
  var pills = Array.prototype.slice.call(section.querySelectorAll('.sm-pill'));
  function applyFilter() {
    caps.forEach(function (cap) {
      cap.el.classList.toggle('is-dimmed', filter !== 'all' && cap.w.pillar !== filter);
    });
    for (var rr = 0; rr < ROWS; rr++) for (var cc = 0; cc < COLS; cc++) {
      var cell = cells[rr][cc];
      var match = filter === 'all' || cell.pillars.indexOf(filter) >= 0;
      tiles[rr][cc].classList.toggle('is-dimmed', !match);
    }
  }
  pills.forEach(function (p) {
    p.addEventListener('click', function () {
      filter = p.getAttribute('data-filter');
      pills.forEach(function (o) { o.setAttribute('aria-pressed', String(o === p)); });
      if (pinned && pinned.w.pillar !== filter && filter !== 'all') unpin(false);
      applyFilter();
    });
  });

  /* ---------- Cursor glow across the dark tiles ---------- */
  var frame = document.getElementById('sm-frame');
  var raf = 0, gx = 0, gy = 0;
  frame.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var fr = frame.getBoundingClientRect();
    var br = board.getBoundingClientRect();
    gx = e.clientX; gy = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      frame.style.setProperty('--mx', (gx - fr.left) + 'px');
      frame.style.setProperty('--my', (gy - fr.top) + 'px');
      board.style.setProperty('--bx', (gx - br.left) + 'px');
      board.style.setProperty('--by', (gy - br.top) + 'px');
    });
  });
  frame.addEventListener('pointerleave', function () {
    board.style.removeProperty('--bx');
    board.style.removeProperty('--by');
  });

  /* ---------- Hidden ROAS: click or drag R → O → A → S down column 9 ---------- */
  var eggTiles = [0, 1, 2, 3].map(function (i) { return tiles[EGG.row + i][EGG.col]; });
  var eggStep = 0;
  var eggFound = false;
  var dragging = false;
  var status = document.getElementById('sm-egg-status');
  var live = document.getElementById('sm-live');
  var BASE = 'Hidden word: click or drag R, O, A, S down column 9';

  function resetEgg() {
    eggStep = 0;
    eggTiles.forEach(function (t) { t.classList.remove('is-picked'); });
    status.textContent = BASE + ' (0/4)';
  }
  function pick(idx) {
    if (eggFound) return;
    if (idx === eggStep) {
      eggTiles[idx].classList.add('is-picked');
      eggStep += 1;
      status.textContent = BASE + ' (' + eggStep + '/4)';
      if (eggStep === 4) unlock();
    } else if (idx !== eggStep - 1) {
      resetEgg();
      if (idx === 0) pick(0);
    }
  }
  function unlock() {
    eggFound = true;
    dragging = false;
    eggTiles.forEach(function (t) { t.classList.remove('is-picked', 'is-hinted'); t.classList.add('is-word'); t.classList.remove('is-egg'); });
    var cap = makeCapsule(EGG);
    applyFilter();
    section.querySelector('.sm-egg').classList.add('is-found');
    status.textContent = 'ROAS unlocked. Open the gold capsule.';
    live.textContent = 'ROAS capsule unlocked.';
    document.getElementById('sm-hint').hidden = true;
    pin(cap, false);
  }
  eggTiles.forEach(function (t, i) {
    t.addEventListener('pointerdown', function (e) {
      if (eggFound) return;
      e.preventDefault();
      dragging = true;
      if (t.releasePointerCapture && t.hasPointerCapture && t.hasPointerCapture(e.pointerId)) t.releasePointerCapture(e.pointerId);
      pick(i);
    });
  });
  board.addEventListener('pointermove', function (e) {
    if (!dragging || eggFound) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    var tile = el && el.closest && el.closest('.sm-tile.is-egg');
    if (tile) pick(Number(tile.getAttribute('data-egg')));
  });
  window.addEventListener('pointerup', function () { dragging = false; });
  window.addEventListener('pointercancel', function () { dragging = false; });

  // Hint: first press highlights the four tiles; second press reveals the word (keyboard path)
  var hint = document.getElementById('sm-hint');
  var hinted = false;
  hint.addEventListener('click', function () {
    if (eggFound) return;
    if (!hinted) {
      hinted = true;
      eggTiles.forEach(function (t) {
        t.classList.remove('is-hinted');
        void t.offsetWidth;
        t.classList.add('is-hinted');
      });
      hint.textContent = 'Reveal it';
      live.textContent = 'The hidden letters are highlighted in column 9.';
    } else {
      unlock();
    }
  });

  resetEgg();
  // keep the reduced-motion preference live
  if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', layout);
})();
