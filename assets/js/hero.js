/* Hero — single-screen dark editorial (upgrade v1) */
(function () {
  'use strict';
  var root = document.querySelector('.ph-hero');
  if (!root) return;

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reduced() { return reduceMQ.matches; }
  function $(sel) { return root.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  /* ---------- KPI count-up ---------- */
  function countUp() {
    if (reduced()) return;
    $$('.ph-kpi-value').forEach(function (el) {
      var target = Number(el.getAttribute('data-ph-count'));
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      var final = el.textContent;
      var start = performance.now();
      var duration = 950;
      el.setAttribute('aria-label', final);
      function tick() {
        // performance.now() rather than the rAF timestamp, which can start earlier than "start"
        var p = Math.max(0, Math.min((performance.now() - start) / duration, 1));
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else { el.textContent = final; el.removeAttribute('aria-label'); }
      }
      requestAnimationFrame(tick);
      // never leave a partial number on screen, even if frames stop (background tab)
      window.setTimeout(function () { el.textContent = final; el.removeAttribute('aria-label'); }, duration + 150);
    });
  }
  countUp();

  /* ---------- KPI case-proof drawer ---------- */
  var KPI = {
    cpa: {
      tag: 'Paid social · Meta campaign, DTC subscription brand',
      copy: 'Ad sets split by hook type, 8–10 new variants a week. Budget moved to the product-demo hook: CPA ~$48 → ~$22 in six weeks, ROAS held at 2.5–4.0×.',
      href: '#paid', room: 'paid', monitor: 'ph-monitor-hook'
    },
    rev: {
      tag: 'Growth case · flagship subscription account',
      copy: '$471K since launch, top 2% on the platform, 86% from lifecycle and CRM, 0% chargebacks.',
      href: '#ap-growth-case-study', room: 'growth', monitor: 'ph-monitor-hook'
    },
    ops: {
      tag: 'Postroom · built in Cursor',
      copy: 'AI captions, approval, scheduling and Instagram API publishing in one workspace. Used in production; end-to-end posting time down ~75%.',
      href: 'work/postroom/', room: 'postroom', monitor: 'ph-monitor-pipe'
    }
  };
  var drawer = $('#ph-drawer');
  var activeKpi = null;

  function closeDrawer() {
    activeKpi = null;
    drawer.hidden = true;
    $$('.ph-kpi').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    $$('.ph-monitor').forEach(function (m) { m.classList.remove('is-pulse'); });
  }

  $$('.ph-kpi').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-kpi');
      if (activeKpi === key) { closeDrawer(); return; }
      closeDrawer();
      activeKpi = key;
      var info = KPI[key];
      btn.setAttribute('aria-expanded', 'true');
      $('#ph-drawer-tag').textContent = info.tag;
      $('#ph-drawer-copy').textContent = info.copy;
      $('#ph-drawer-case').setAttribute('href', info.href);
      $('#ph-drawer-room').setAttribute('data-room-target', info.room);
      drawer.hidden = false;
      var mon = document.getElementById(info.monitor);
      if (mon) mon.classList.add('is-pulse');
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && activeKpi) {
      var btn = root.querySelector('.ph-kpi[aria-expanded="true"]');
      closeDrawer();
      if (btn && root.contains(document.activeElement)) btn.focus();
    }
  });

  /* "See it in the room" — any link with data-room-target asks the showroom to glide there */
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('[data-room-target]');
    if (!link) return;
    var id = link.getAttribute('data-room-target');
    window.setTimeout(function () {
      window.dispatchEvent(new CustomEvent('showroom:focus', { detail: { id: id } }));
    }, reduced() ? 0 : 450);
  });

  /* ---------- Left monitor: Hook Lab decoder ---------- */
  // Hook copy comes from the Hook Lab case cards. Curve shapes are illustrative only.
  var HOOKS = [
    { piece: 'ARGŌ golden body oil', type: 'Macro Texture Reveal', format: '9:16',
      steps: ['A gold oil drop swells in extreme macro.', 'Hard cut to the splash.', 'One glittering drop sells texture and builds tension before the product is named.'],
      pts: [[0,12.0], [22,14.0], [44,24.0], [80,40.0], [110,50.0], [165,68.0], [220,80.0]] },
    { piece: 'ZOLA Brow Soap Mini', type: 'Question Hook', format: '9:16',
      steps: ['“Brows with attitude?” on screen in giant type.', 'The product is already in frame while the question lands.', 'A bold question earns the next second; the product answers it.'],
      pts: [[0,8.0], [22,10.0], [44,18.0], [80,36.0], [110,48.0], [165,64.0], [220,76.0]] },
    { piece: 'L-Theanine drink', type: 'Before/After Scene Switch', format: '9:16',
      steps: ['“What 200mg of L-Theanine actually feels like.”', 'An office desk flips to a calm garden in about 2s.', 'The swap itself is the payoff, so the benefit is shown, not told.'],
      pts: [[0,16.0], [22,22.0], [44,32.0], [80,34.0], [110,42.0], [165,58.0], [220,70.0]] },
    { piece: 'SOLÈNE fragrance', type: 'Sensory Reveal', format: '16:9',
      steps: ['Mist sprays from an amber bottle.', 'Cut to dewy figs in warm light.', 'Visible mist lets a silent scroller imagine the scent.'],
      pts: [[0,14.0], [22,18.0], [44,26.0], [80,42.0], [110,54.0], [165,72.0], [220,86.0]] },
    { piece: 'Outfit transition', type: 'Before/After Transition', format: '9:16',
      steps: ['A plain white dress in a crimson set.', 'The black chained look lands on the beat at ~3s.', 'Viewers stay for a change they can see coming.'],
      pts: [[0,18.0], [22,24.0], [44,32.0], [80,38.0], [110,40.0], [165,60.0], [220,74.0]] },
    { piece: 'Postroom promo', type: 'Outcome Claim', format: '9:16',
      steps: ['“75% less posting time.” in big type.', 'The dashboard sits behind the claim.', 'Leading with the outcome qualifies the right viewer in one line.'],
      pts: [[0,10.0], [22,12.0], [44,22.0], [80,38.0], [110,48.0], [165,66.0], [220,78.0]] }
  ];
  var hookIdx = 0;
  var stepIdx = 0;
  var line = $('#ph-curve-line');
  var area = $('#ph-curve-area');
  var playhead = $('#ph-playhead');
  var detail = $('#ph-step-detail');

  function smoothPath(pts) {
    // Catmull-Rom to cubic Bézier for a soft retention curve
    var d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2[0] + ' ' + p2[1];
    }
    return d;
  }

  function renderHook(animate) {
    var h = HOOKS[hookIdx];
    $('#ph-hook-piece').textContent = h.piece;
    $('#ph-hook-type').textContent = h.type;
    $('#ph-hook-format').textContent = h.format;
    var d = smoothPath(h.pts);
    line.setAttribute('d', d);
    area.setAttribute('d', d + ' L220 96 L0 96 Z');
    if (animate && !reduced() && line.getTotalLength) {
      var len = Math.ceil(line.getTotalLength());
      line.style.strokeDasharray = len;
      line.style.setProperty('--len', len);
      line.classList.remove('is-drawing');
      void line.getBoundingClientRect();
      line.classList.add('is-drawing');
    } else {
      line.style.strokeDasharray = '';
      line.classList.remove('is-drawing');
    }
    renderStep();
  }

  function renderStep() {
    $$('.ph-step').forEach(function (b) {
      b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-step')) === stepIdx));
    });
    $$('.ph-band').forEach(function (r) {
      r.classList.toggle('is-on', Number(r.getAttribute('data-band')) === stepIdx);
    });
    detail.textContent = HOOKS[hookIdx].steps[stepIdx];
    if (reduced()) placePlayhead(stepIdx === 0 ? 22 : stepIdx === 1 ? 77 : 165);
  }

  function placePlayhead(x) {
    if (!line.getTotalLength) return;
    // binary-search the point on the path at horizontal position x
    var total = line.getTotalLength(), lo = 0, hi = total, pt = line.getPointAtLength(0);
    for (var i = 0; i < 18; i++) {
      var mid = (lo + hi) / 2;
      pt = line.getPointAtLength(mid);
      if (pt.x < x) lo = mid; else hi = mid;
    }
    playhead.setAttribute('cx', pt.x.toFixed(1));
    playhead.setAttribute('cy', pt.y.toFixed(1));
  }

  $$('.ph-step').forEach(function (b) {
    b.addEventListener('click', function () {
      stepIdx = Number(b.getAttribute('data-step'));
      renderStep();
    });
  });
  $('#ph-hook-next').addEventListener('click', function () {
    hookIdx = (hookIdx + 1) % HOOKS.length;
    stepIdx = 0;
    renderHook(true);
  });

  // Playhead loops along the curve while the hero is on screen
  var heroVisible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      if (heroVisible) startLoop();
    }).observe(root);
  }
  var loopStart = null;
  var looping = false;
  function startLoop() {
    if (looping) return;
    looping = true;
    requestAnimationFrame(loop);
  }
  function loop(now) {
    if (!heroVisible || reduced() || document.hidden) { loopStart = null; looping = false; return; }
    if (loopStart === null) loopStart = now;
    var t = ((now - loopStart) % 6000) / 6000;
    placePlayhead(t * 220);
    requestAnimationFrame(loop);
  }
  renderHook(false);
  startLoop();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) startLoop(); });
  reduceMQ.addEventListener && reduceMQ.addEventListener('change', function () { renderStep(); startLoop(); });

  /* ---------- Right monitor: pipeline batch simulation ---------- */
  var NODE_INFO = [
    'Brief in, hook angles out: Claude drafts hypotheses per hook type before anything is generated.',
    'Visuals generated in ComfyUI and Higgsfield, no shoot, cut to 9:16 and 4:5.',
    'Postroom proposes caption options for each creative.',
    'The team edits and approves in Postroom, then picks a posting slot.',
    'Postroom publishes straight through the Instagram API.'
  ];
  var nodes = $$('.ph-node');
  var log = $('#ph-pipe-log');
  var runBtn = $('#ph-run-batch');
  var batchNo = 0;
  var running = false;

  nodes.forEach(function (n) {
    n.addEventListener('click', function () {
      if (running) return;
      nodes.forEach(function (o) { o.classList.toggle('is-selected', o === n); });
      log.textContent = NODE_INFO[Number(n.getAttribute('data-node'))];
    });
  });

  runBtn.addEventListener('click', function () {
    if (running) return;
    running = true;
    batchNo += 1;
    runBtn.disabled = true;
    nodes.forEach(function (n) { n.classList.remove('is-done', 'is-running', 'is-selected'); });
    var step = reduced() ? 0 : 650;
    var i = 0;
    function next() {
      if (i > 0) {
        nodes[i - 1].classList.remove('is-running');
        nodes[i - 1].classList.add('is-done');
      }
      if (i === nodes.length) {
        log.textContent = 'Simulated batch ' + batchNo + ': 3 creatives captioned, approved and scheduled.';
        runBtn.textContent = 'Run another batch';
        runBtn.disabled = false;
        running = false;
        return;
      }
      nodes[i].style.setProperty('--dur', step + 'ms');
      nodes[i].classList.add('is-running');
      if (!reduced()) log.textContent = 'Batch ' + batchNo + ' · ' + nodes[i].querySelector('.ph-node-name').textContent + '…';
      i += 1;
      window.setTimeout(next, step);
    }
    if (reduced()) {
      nodes.forEach(function (n) { n.classList.add('is-done'); });
      i = nodes.length;
      next();
    } else {
      next();
    }
  });

  /* ---------- Copy email ---------- */
  var copyBtn = $('#ph-copy');
  copyBtn.addEventListener('click', function () {
    var email = copyBtn.getAttribute('data-email');
    var action = $('#ph-copy-action');
    var status = $('#ph-copy-status');
    function done() {
      copyBtn.classList.add('is-copied');
      action.textContent = 'Copied';
      status.textContent = 'Email address copied';
      window.setTimeout(function () {
        copyBtn.classList.remove('is-copied');
        action.textContent = 'Copy';
        status.textContent = '';
      }, 1800);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(email).then(done, function () { window.location.href = 'mailto:' + email; });
    } else {
      window.location.href = 'mailto:' + email;
    }
  });

  /* ---------- 3D tilt on the monitors (fine pointers only) ---------- */
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  $$('[data-tilt]').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      if (reduced() || !finePointer.matches || window.innerWidth < 1180) return;
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      card.classList.add('is-tilting');
      card.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
      card.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
      card.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(1) + '%');
      card.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(1) + '%');
    });
    card.addEventListener('pointerleave', function () {
      card.classList.remove('is-tilting');
      card.style.removeProperty('--ry');
      card.style.removeProperty('--rx');
    });
  });
})();
