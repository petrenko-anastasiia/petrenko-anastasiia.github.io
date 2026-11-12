/* Stack matrix — word search with connected capsules (upgrade v2)
 * Every letter looks the same until a word is found. HIGGSFIELD starts found.
 * Find a word by dragging across it, tapping its first and last letter,
 * or with the keyboard (arrows + Enter). Found words become pillar-coloured
 * capsules that open a proof-of-work card.
 */
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

  var ALL = WORDS.concat([EGG]);
  var FILLER = 'KVXWQZBNJLPYRHD';
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Build the matrix ---------- */
  var cells = [];
  var r, c;
  for (r = 0; r < ROWS; r++) {
    cells[r] = [];
    for (c = 0; c < COLS; c++) cells[r][c] = { ch: FILLER[(r * 7 + c * 3) % FILLER.length] };
  }
  function wordCells(w) {
    var out = [];
    for (var i = 0; i < w.word.length; i++) {
      out.push([w.dir === 'v' ? w.row + i : w.row, w.dir === 'h' ? w.col + i : w.col]);
    }
    return out;
  }
  ALL.forEach(function (w) {
    wordCells(w).forEach(function (rc, i) { cells[rc[0]][rc[1]].ch = w.word[i]; });
  });

  var tiles = [];
  var frag = document.createDocumentFragment();
  for (r = 0; r < ROWS; r++) {
    tiles[r] = [];
    for (c = 0; c < COLS; c++) {
      var t = document.createElement('div');
      t.className = 'sm-tile';
      t.id = 'sm-t-' + r + '-' + c;
      t.textContent = cells[r][c].ch;
      t.setAttribute('aria-hidden', 'true');
      t.setAttribute('data-r', r);
      t.setAttribute('data-c', c);
      frag.appendChild(t);
      tiles[r][c] = t;
    }
  }
  board.appendChild(frag);

  /* ---------- Capsules, synced to tile geometry ---------- */
  var capsLayer = document.getElementById('sm-caps');
  var caps = [];
  var found = {};

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

  /* ---------- Finding words ---------- */
  var progress = document.getElementById('sm-progress');
  var live = document.getElementById('sm-live');
  var revealBtn = document.getElementById('sm-reveal');
  var eggStatus = document.getElementById('sm-egg-status');

  function updateProgress() {
    var n = WORDS.filter(function (w) { return found[w.word]; }).length;
    progress.textContent = n === WORDS.length ? 'All ' + n + ' found' : n + ' of ' + WORDS.length + ' found';
    if (n === WORDS.length) revealBtn.hidden = true;
  }

  function markFound(w, opts) {
    if (found[w.word]) return null;
    found[w.word] = true;
    wordCells(w).forEach(function (rc) {
      var tile = tiles[rc[0]][rc[1]];
      tile.classList.add('is-word');
    });
    var cap = makeCapsule(w);
    if (w.pillar === 'egg') {
      section.querySelector('.sm-egg').classList.add('is-found');
      eggStatus.textContent = 'Bonus found: ROAS. Open the gold capsule.';
    } else {
      updateProgress();
    }
    if (opts && opts.announce && !demoOn) scheduleNudge();
    if (opts && opts.announce) {
      live.textContent = 'Found ' + w.word + '.';
      if (!reduceMQ.matches) {
        cap.el.classList.add('is-new');
        window.setTimeout(function () { cap.el.classList.remove('is-new'); }, 900);
      }
    }
    if (opts && opts.open) pin(cap, false);
    return cap;
  }

  // Selection runs in a straight line from the first cell, snapped to the
  // row or column the pointer has moved along most.
  var selStart = null;
  var selEnd = null;
  var selCells = [];

  function lineCells(a, b) {
    var dr = b[0] - a[0], dc = b[1] - a[1];
    var out = [];
    if (Math.abs(dc) >= Math.abs(dr)) {
      var step = dc >= 0 ? 1 : -1;
      for (var cc = a[1]; cc !== b[1] + step; cc += step) out.push([a[0], cc]);
    } else {
      var stepR = dr >= 0 ? 1 : -1;
      for (var rr = a[0]; rr !== b[0] + stepR; rr += stepR) out.push([rr, a[1]]);
    }
    return out;
  }
  function paintSelection() {
    section.querySelectorAll('.sm-tile.is-selecting').forEach(function (el) { el.classList.remove('is-selecting'); });
    selCells.forEach(function (rc) { tiles[rc[0]][rc[1]].classList.add('is-selecting'); });
  }
  function setSelection(a, b) {
    selStart = a; selEnd = b;
    selCells = a ? lineCells(a, b || a) : [];
    paintSelection();
  }
  function sameCells(x, y) {
    if (x.length !== y.length) return false;
    for (var i = 0; i < x.length; i++) if (x[i][0] !== y[i][0] || x[i][1] !== y[i][1]) return false;
    return true;
  }
  function checkSelection() {
    var picked = selCells.slice();
    var rev = picked.slice().reverse();
    var hit = null;
    ALL.forEach(function (w) {
      if (hit || found[w.word]) return;
      var wc = wordCells(w);
      if (sameCells(wc, picked) || sameCells(wc, rev)) hit = w;
    });
    if (hit) {
      setSelection(null);
      markFound(hit, { announce: true, open: true });
      return true;
    }
    if (picked.length > 1) {
      picked.forEach(function (rc) {
        var tile = tiles[rc[0]][rc[1]];
        tile.classList.remove('is-miss');
        void tile.offsetWidth;
        tile.classList.add('is-miss');
      });
      live.textContent = 'Not a word from the stack. Try again.';
    }
    setSelection(null);
    return false;
  }

  function tileAt(x, y) {
    var el = document.elementFromPoint(x, y);
    var t = el && el.closest && el.closest('.sm-tile');
    if (!t || !board.contains(t)) return null;
    return [Number(t.getAttribute('data-r')), Number(t.getAttribute('data-c'))];
  }

  // Pointer: drag across a word, or tap the first and last letter
  var drag = null;      // { start, moved }
  var tapStart = null;  // first letter of a two-tap selection
  board.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    var t = e.target.closest('.sm-tile');
    if (!t || t.classList.contains('is-word')) return;
    var rc = [Number(t.getAttribute('data-r')), Number(t.getAttribute('data-c'))];
    if (pinned) unpin(false);
    drag = { start: tapStart || rc, origin: rc, moved: false, id: e.pointerId };
    setSelection(drag.start, rc);
    if (e.pointerType === 'mouse') e.preventDefault();
  });
  board.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var rc = tileAt(e.clientX, e.clientY);
    if (!rc) return;
    if (rc[0] !== drag.origin[0] || rc[1] !== drag.origin[1]) drag.moved = true;
    setSelection(drag.start, rc);
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var d = drag;
    drag = null;
    if (d.moved) { tapStart = null; checkSelection(); return; }
    if (!tapStart) {
      tapStart = d.origin;          // first tap: remember the first letter
      setSelection(tapStart, tapStart);
      return;
    }
    var hit = checkSelection();    // second tap: check first → this letter
    tapStart = null;
    if (!hit) setSelection(null);
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', function () { if (drag && !tapStart) setSelection(null); drag = null; });

  // Keyboard: arrows move a cursor, Enter/Space marks first then last letter
  var cursor = [0, 0];
  var keyStart = null;
  function paintCursor() {
    section.querySelectorAll('.sm-tile.is-cursor').forEach(function (el) { el.classList.remove('is-cursor'); });
    var t = tiles[cursor[0]][cursor[1]];
    t.classList.add('is-cursor');
    board.setAttribute('aria-activedescendant', t.id);
    live.textContent = 'Row ' + (cursor[0] + 1) + ', column ' + (cursor[1] + 1) + ', ' + cells[cursor[0]][cursor[1]].ch + (keyStart ? '. Selecting' : '');
  }
  board.addEventListener('focus', function () { if (board.matches(':focus-visible')) paintCursor(); });
  board.addEventListener('blur', function () {
    section.querySelectorAll('.sm-tile.is-cursor').forEach(function (el) { el.classList.remove('is-cursor'); });
  });
  board.addEventListener('keydown', function (e) {
    var moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      cursor = [Math.min(ROWS - 1, Math.max(0, cursor[0] + moves[e.key][0])), Math.min(COLS - 1, Math.max(0, cursor[1] + moves[e.key][1]))];
      if (keyStart) setSelection(keyStart, cursor);
      paintCursor();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!keyStart) { keyStart = cursor.slice(); setSelection(keyStart, keyStart); paintCursor(); }
      else { setSelection(keyStart, cursor); keyStart = null; checkSelection(); }
    } else if (e.key === 'Escape' && keyStart) {
      keyStart = null; setSelection(null);
    }
  });

  /* ---------- Show all ---------- */
  revealBtn.addEventListener('click', function () {
    WORDS.forEach(function (w) { markFound(w, {}); });
    live.textContent = 'All words shown.';
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

  /* ---------- Cursor demo: finds every tool, one after another ---------- */
  var ghost = document.getElementById('sm-ghost');
  var demoOn = false;
  var tookOver = reduceMQ.matches;   // the visitor took over (or reduced motion): no automatic demo
  var demoToken = 0;
  var startTimer = 0;
  var nudgeTimer = 0;
  var ghostFade = 0;
  var stackVisible = false;

  function dWait(token, ms, fn) {
    window.setTimeout(function () { if (token === demoToken) fn(); }, ms);
  }
  function ghostAt(rc, fast) {
    var t = tiles[rc[0]][rc[1]];
    ghost.style.transitionDuration = fast ? '0.07s' : '0.5s';
    ghost.style.transform = 'translate(' + Math.round(t.offsetLeft + t.offsetWidth * 0.5) + 'px,' + Math.round(t.offsetTop + t.offsetHeight * 0.5) + 'px)';
  }
  function ghostJump(rc) {
    ghost.style.transition = 'none';
    ghostAt(rc);
    void ghost.offsetWidth;
    ghost.style.transition = '';
  }
  function ghostShow() { window.clearTimeout(ghostFade); ghost.classList.add('is-on'); }
  function ghostHide() { window.clearTimeout(ghostFade); ghost.classList.remove('is-on', 'is-down'); }

  // Press on the first letter, drag across the word, release: the word is found
  function demoSelect(w, token, done, startDelay) {
    var list = wordCells(w);
    ghostAt(list[0]);
    dWait(token, startDelay === undefined ? 560 : startDelay, function () {
      ghost.classList.add('is-down');
      setSelection(list[0], list[0]);
      var i = 1;
      (function step() {
        if (token !== demoToken) return;
        if (i >= list.length) {
          dWait(token, 150, function () {
            ghost.classList.remove('is-down');
            setSelection(null);
            markFound(w, { announce: true });
            dWait(token, 300, done);
          });
          return;
        }
        ghostAt(list[i], true);
        setSelection(list[0], list[i]);
        i += 1;
        dWait(token, 70, step);
      })();
    });
  }

  // The next tool still hidden (the bonus word is left for the visitor)
  function nextTool() {
    for (var i = 0; i < WORDS.length; i++) if (!found[WORDS[i].word]) return WORDS[i];
    return null;
  }
  // Point at the next tool's first letter, drag across it, then move on to the one after
  function demoRun(token) {
    if (token !== demoToken) return;
    var w = nextTool();
    if (!w) { endDemo(); return; }
    ghostAt(wordCells(w)[0]);
    dWait(token, 450, function () {
      demoSelect(w, token, function () { demoRun(token); }, 200);
    });
  }

  function endDemo() {
    demoToken += 1;
    demoOn = false;
    ghostHide();
    scheduleNudge();
  }
  function startDemo() {
    if (demoOn || tookOver || !nextTool()) return;
    demoOn = true;
    var token = (demoToken += 1);
    ghostJump([0, 14]);
    ghostShow();
    live.textContent = 'Demo: a cursor finds each tool in turn. Touch anything to take over.';
    demoRun(token);
  }
  function stopDemo() {
    if (!demoOn) return;
    demoToken += 1;
    demoOn = false;
    setSelection(null);
    ghostHide();
  }

  // After a find (or a quiet spell), nudge once: point at the next word's first letter
  function scheduleNudge() {
    window.clearTimeout(nudgeTimer);
    if (reduceMQ.matches) return;
    nudgeTimer = window.setTimeout(function () {
      if (demoOn || pinned || document.hidden || !stackVisible) return;
      var w = nextTool();
      if (!w) return;
      ghostJump(wordCells(w)[0]);
      ghostShow();
      ghostFade = window.setTimeout(ghostHide, 4000);
    }, 10000);
  }

  // Real input from the visitor (a tap, a click, a drag across letters, or keys):
  // stop the demo and leave the grid to them. Scrolling past the grid is not input.
  function onStackInput() {
    window.clearTimeout(startTimer);
    if (demoOn) stopDemo(); else ghostHide();
    tookOver = true;
    scheduleNudge();
  }
  var touchDown = false;
  section.addEventListener('pointerdown', function (e) {
    touchDown = true;
    // a finger on the letters may be the start of a drag: pause the demo so the two don't fight
    if (demoOn && board.contains(e.target)) stopDemo();
  }, { passive: true, capture: true });
  window.addEventListener('pointercancel', function () {
    if (!touchDown) return;
    touchDown = false;
    // the browser took the touch for scrolling: carry on with the demo
    if (!tookOver && stackVisible && !demoOn) {
      window.clearTimeout(startTimer);
      startTimer = window.setTimeout(startDemo, 250);
    }
  });
  window.addEventListener('pointerup', function () {
    if (!touchDown) return;
    touchDown = false;
    onStackInput();
  }, true);
  section.addEventListener('keydown', onStackInput, true);

  // Back to the starting grid (HIGGSFIELD only), done off screen so the run can play again
  function resetBoard() {
    if (pinned) unpin(false);
    setSelection(null);
    tapStart = null;
    WORDS.forEach(function (w) {
      if (w.word === 'HIGGSFIELD' || !found[w.word]) return;
      found[w.word] = false;
      wordCells(w).forEach(function (rc) { tiles[rc[0]][rc[1]].classList.remove('is-word'); });
    });
    for (var i = caps.length - 1; i >= 0; i--) {
      if (!found[caps[i].w.word]) { caps[i].el.parentNode.removeChild(caps[i].el); caps.splice(i, 1); }
    }
    // a letter shared with a word still on the board keeps its highlight
    caps.forEach(function (c) { wordCells(c.w).forEach(function (rc) { tiles[rc[0]][rc[1]].classList.add('is-word'); }); });
    revealBtn.hidden = false;
    updateProgress();
    layout();
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var en = entries[0];
      stackVisible = en.isIntersecting;
      if (en.isIntersecting && en.intersectionRatio >= 0.3 && !tookOver && !demoOn) {
        window.clearTimeout(startTimer);
        startTimer = window.setTimeout(startDemo, 150);
      } else if (!en.isIntersecting) {
        window.clearTimeout(startTimer);
        stopDemo();
        if (!tookOver) resetBoard();    // scroll back and the whole run plays again
      }
    }, { threshold: [0, 0.3] }).observe(document.getElementById('sm-frame'));
  }

  // HIGGSFIELD is found from the start, as the example
  markFound(WORDS[0], {});
  updateProgress();
  if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', layout);
})();
