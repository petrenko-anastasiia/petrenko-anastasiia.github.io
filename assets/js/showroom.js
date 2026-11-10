/* Recent works — spatial 3D showroom (upgrade v8: gallery hall)
 * A long monochrome hall. The cases stand one after another down it, each under its own
 * ceiling projector. WebGLRenderer (hall, props, light) + CSS3DRenderer (the real DOM cards)
 * share one camera. Needs assets/vendor/three.r128.min.js and css3d-renderer.r128.js.
 */
(function () {
  'use strict';
  var section = document.getElementById('work');
  var stage = document.getElementById('vr-stage');
  if (!section || !stage) return;

  var cardEls = Array.prototype.slice.call(section.querySelectorAll('.vr-card'));
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reduced() { return reduceMQ.matches; }

  /* ---------- Fallback: flat, scrollable row of cards ---------- */
  function goFlat() {
    section.classList.add('is-flat');
    if (!section.querySelector('.vr-flat-head')) {
      var head = document.createElement('div');
      head.className = 'vr-flat-head';
      var h = document.getElementById('vr-title');
      head.appendChild(h);
      section.insertBefore(head, document.getElementById('vr-cards'));
    }
    cardEls.forEach(function (card) {
      var btn = card.querySelector('.vr-play');
      if (btn) btn.remove();
      var v = card.querySelector('video');
      if (v) { v.controls = true; v.preload = 'none'; if (!v.src) v.src = v.getAttribute('data-src'); }
    });
  }

  var THREE = window.THREE;
  if (!THREE || !THREE.CSS3DRenderer) { goFlat(); return; }

  var webglHost = document.getElementById('vr-webgl');
  var cssHost = document.getElementById('vr-css');
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (err) {
    goFlat();
    return;
  }
  var clamp = THREE.MathUtils.clamp;

  /* ---------- Layout of the hall ---------- */
  var EYE_Y = 2.35;
  var CARD_Y = 2.15;
  var CARD_SCALE = 0.009;
  var VIEW_DIST = 7.0;        // how far in front of a case you stand to look at it
  var CINEMA_DIST = 5.0;
  var SPACING = 11;           // distance between cases along the hall
  var FIRST_Z = -9;
  var COUNT = cardEls.length;
  var slots = cardEls.map(function (card, i) {
    return { x: (i % 2 === 0 ? -1 : 1) * 1.3, z: FIRST_Z - SPACING * i };
  });
  var HALL = { w: 9, h: 6.5, near: 9, far: FIRST_Z - SPACING * (COUNT - 1) - 9 };
  var LEN = HALL.near - HALL.far;
  var MID_Z = (HALL.near + HALL.far) / 2;
  var BOUND_X = 4.0;

  var W = stage.clientWidth || window.innerWidth;
  var H = stage.clientHeight || window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(W, H);
  renderer.setClearColor(0x07090e, 1);
  webglHost.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  var cssRenderer = new THREE.CSS3DRenderer();
  cssRenderer.setSize(W, H);
  cssHost.appendChild(cssRenderer.domElement);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x07090e, 12, 58);
  var cssScene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 120);
  camera.rotation.order = 'YXZ';

  /* ---------- Textures drawn in code: wall washes, floor, light pools, felt ---------- */
  function makeCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function makeTexture(c) { var t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t; }

  // u runs along the hall: for the left wall it starts at the entrance, for the right wall at the far end
  function zToU(z, isLeft) { return isLeft ? (HALL.near - z) / LEN : (z - HALL.far) / LEN; }

  function wallTexture(isLeft) {
    var TW = 2048, TH = 512;
    var c = makeCanvas(TW, TH);
    var g = c.getContext('2d');
    g.fillStyle = '#18202f';
    g.fillRect(0, 0, TW, TH);
    // a long soft wash, strongest near the entrance
    var along = g.createLinearGradient(isLeft ? 0 : TW, 0, isLeft ? TW : 0, 0);
    along.addColorStop(0, 'rgba(125,211,252,0.34)');
    along.addColorStop(0.5, 'rgba(125,211,252,0.16)');
    along.addColorStop(1, 'rgba(125,211,252,0.04)');
    g.fillStyle = along;
    g.fillRect(0, 0, TW, TH);
    // a pool of light on the wall beside each case
    slots.forEach(function (s) {
      var px = zToU(s.z + 2.5, isLeft) * TW;
      g.save();
      g.translate(px, TH * 0.56);
      g.scale(3.2, 1);
      var rg = g.createRadialGradient(0, 0, 0, 0, 0, 150);
      rg.addColorStop(0, 'rgba(186,230,253,0.72)');
      rg.addColorStop(0.45, 'rgba(56,189,248,0.32)');
      rg.addColorStop(1, 'rgba(56,189,248,0)');
      g.fillStyle = rg;
      g.beginPath();
      g.arc(0, 0, 150, 0, Math.PI * 2);
      g.fill();
      g.restore();
    });
    // darker toward the ceiling and the floor
    var vg = g.createLinearGradient(0, 0, 0, TH);
    vg.addColorStop(0, 'rgba(7,9,14,0.9)');
    vg.addColorStop(0.32, 'rgba(0,0,0,0.05)');
    vg.addColorStop(0.78, 'rgba(0,0,0,0.12)');
    vg.addColorStop(1, 'rgba(7,9,14,0.7)');
    g.fillStyle = vg;
    g.fillRect(0, 0, TW, TH);
    return makeTexture(c);
  }

  function floorTexture() {
    var c = makeCanvas(512, 2048);
    var g = c.getContext('2d');
    g.fillStyle = '#0b0e14';
    g.fillRect(0, 0, 512, 2048);
    for (var i = 0; i < 3200; i++) {
      g.fillStyle = 'rgba(125,211,252,' + (Math.random() * 0.06).toFixed(3) + ')';
      g.fillRect(Math.random() * 512, Math.random() * 2048, 1.4, 1.4);
    }
    return makeTexture(c);
  }

  function radialTexture(alpha) {
    var c = makeCanvas(256, 256);
    var g = c.getContext('2d');
    var rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    rg.addColorStop(0, 'rgba(125,211,252,' + alpha + ')');
    rg.addColorStop(0.5, 'rgba(56,189,248,' + (alpha * 0.35).toFixed(3) + ')');
    rg.addColorStop(1, 'rgba(56,189,248,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 256, 256);
    return makeTexture(c);
  }

  function edgeGlowTexture(brightAtStart) {
    var c = makeCanvas(64, 4);
    var g = c.getContext('2d');
    var lg = g.createLinearGradient(brightAtStart ? 0 : 64, 0, brightAtStart ? 64 : 0, 0);
    lg.addColorStop(0, 'rgba(56,189,248,0.75)');
    lg.addColorStop(1, 'rgba(56,189,248,0)');
    g.fillStyle = lg;
    g.fillRect(0, 0, 64, 4);
    return makeTexture(c);
  }

  function feltTexture() {
    var c = makeCanvas(128, 128);
    var g = c.getContext('2d');
    g.fillStyle = '#1c2434';
    g.fillRect(0, 0, 128, 128);
    for (var i = 0; i < 2600; i++) {
      var v = Math.floor(Math.random() * 30);
      g.fillStyle = 'rgb(' + (22 + v) + ',' + (30 + v) + ',' + (46 + v) + ')';
      g.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5);
    }
    var t = makeTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 1);
    return t;
  }

  /* ---------- The hall ---------- */
  var hallMats = [];
  function basic(opts) { var m = new THREE.MeshBasicMaterial(opts); hallMats.push(m); return m; }

  var floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL.w, LEN), basic({ map: floorTexture() }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, MID_Z);
  scene.add(floor);

  var wallL = new THREE.Mesh(new THREE.PlaneGeometry(LEN, HALL.h), basic({ map: wallTexture(true), side: THREE.DoubleSide }));
  wallL.rotation.y = Math.PI / 2;
  wallL.position.set(-HALL.w / 2, HALL.h / 2, MID_Z);
  scene.add(wallL);
  var wallR = new THREE.Mesh(new THREE.PlaneGeometry(LEN, HALL.h), basic({ map: wallTexture(false), side: THREE.DoubleSide }));
  wallR.rotation.y = -Math.PI / 2;
  wallR.position.set(HALL.w / 2, HALL.h / 2, MID_Z);
  scene.add(wallR);

  var ceiling = new THREE.Mesh(new THREE.PlaneGeometry(HALL.w, LEN), new THREE.MeshBasicMaterial({ color: 0x07090e, side: THREE.DoubleSide }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, HALL.h, MID_Z);
  scene.add(ceiling);
  var endWall = new THREE.Mesh(new THREE.PlaneGeometry(HALL.w, HALL.h), new THREE.MeshBasicMaterial({ color: 0x0b0e14 }));
  endWall.position.set(0, HALL.h / 2, HALL.far);
  scene.add(endWall);

  // glowing white lines where the walls meet the floor
  [-1, 1].forEach(function (side) {
    var line = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, LEN), new THREE.MeshBasicMaterial({ color: 0x7dd3fc }));
    line.position.set(side * (HALL.w / 2 - 0.04), 0.05, MID_Z);
    scene.add(line);
    var glow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, LEN), new THREE.MeshBasicMaterial({
      map: edgeGlowTexture(side < 0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(side * (HALL.w / 2 - 0.6), 0.015, MID_Z);
    scene.add(glow);
  });

  var ambient = new THREE.AmbientLight(0xdbeafe, 0.5);
  scene.add(ambient);

  /* ---------- Cases, projectors, stools ---------- */
  var dock = document.getElementById('vr-dock');
  var live = document.getElementById('vr-live');
  var stations = [];
  var pickables = [];
  var poolTex = radialTexture(0.34);
  var feltMat = new THREE.MeshLambertMaterial({ map: feltTexture() });
  var feltTop = new THREE.MeshLambertMaterial({ color: 0x1c2434 });
  var STOOLS = [[2.4, 2.6, 0.46, 0.5], [-2.0, 3.9, 0.4, 0.62], [0.9, 5.4, 0.5, 0.46]];

  function viewFor(i, dist) {
    var s = slots[i];
    var fx = s.x * 0.55;
    var fz = s.z + dist;
    return { x: fx, z: fz, yaw: Math.atan2(-(s.x - fx), -(s.z - fz)) };
  }

  cardEls.forEach(function (card, idx) {
    var s = slots[idx];

    // a pool of light on the floor in front of the case (also what you click to go there)
    var pool = new THREE.Mesh(new THREE.CircleGeometry(3.3, 48), new THREE.MeshBasicMaterial({
      map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.2
    }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(s.x, 0.02, s.z + 3.2);
    pool.userData.station = idx;
    scene.add(pool);
    pickables.push(pool);

    // ceiling projector on a cable, and its cone of light
    var proj = new THREE.Group();
    proj.position.set(s.x, 5.2, s.z + 0.3);
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.2, 0.36), new THREE.MeshBasicMaterial({ color: 0xcbd5e1 }));
    proj.add(body);
    var lens = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.04), new THREE.MeshBasicMaterial({ color: 0x0c0c0c }));
    lens.position.set(0, -0.02, 0.2);
    proj.add(lens);
    var cable = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, HALL.h - 5.2, 6), new THREE.MeshBasicMaterial({ color: 0x050505 }));
    cable.position.set(0, (HALL.h - 5.2) / 2 + 0.1, 0);
    proj.add(cable);
    scene.add(proj);

    var cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.7, 40, 1, true), new THREE.MeshBasicMaterial({
      color: 0x7dd3fc, transparent: true, opacity: 0.03, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    cone.position.set(s.x, 2.85, s.z + 0.3);
    scene.add(cone);

    var light = new THREE.PointLight(0xbae6fd, 0.5, 11);
    light.position.set(s.x, 4.4, s.z + 1.6);
    scene.add(light);

    // felt stools near each case
    STOOLS.forEach(function (st, k) {
      var sign = (idx + k) % 2 === 0 ? 1 : -1;
      var stool = new THREE.Mesh(new THREE.CylinderGeometry(st[2], st[2] * 1.04, st[3], 28), [feltMat, feltTop, feltMat]);
      stool.position.set(s.x + st[0] * sign * 0.9, st[3] / 2, s.z + st[1]);
      scene.add(stool);
    });

    var view = viewFor(idx, VIEW_DIST);
    var obj = new THREE.CSS3DObject(card);
    obj.scale.setScalar(CARD_SCALE);
    obj.position.set(s.x, CARD_Y, s.z);
    obj.lookAt(view.x, CARD_Y, view.z);
    cssScene.add(obj);

    var pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'vr-pill';
    pill.textContent = card.getAttribute('data-label');
    pill.addEventListener('click', function () { focusStation(idx, { announce: true }); });
    dock.appendChild(pill);

    var playBtn = card.querySelector('.vr-play');
    if (playBtn) {
      playBtn.addEventListener('click', function (e) {
        if (suppressClick) { e.preventDefault(); return; }
        if (cinemaIdx === idx) stopCinema(); else startCinema(idx);
      });
    }
    // keyboard users tabbing into a card get carried to it
    card.addEventListener('focusin', function () {
      if (activeIdx !== idx && cinemaIdx === -1) focusStation(idx, {});
    });

    stations.push({ id: card.getAttribute('data-id'), label: card.getAttribute('data-label'), x: s.x, z: s.z,
      cone: cone, pool: pool, light: light, card: card, obj: obj, pill: pill, video: card.querySelector('video'), center: idx === 0, fade: 1 });
  });

  /* ---------- Camera state ---------- */
  var v0 = viewFor(0, VIEW_DIST);
  var cam = { x: v0.x, y: EYE_Y, z: v0.z, yaw: v0.yaw, pitch: 0, tx: v0.x, ty: EYE_Y, tz: v0.z, tyaw: v0.yaw, tpitch: 0 };
  var activeIdx = -1;
  var cinemaIdx = -1;
  var dirty = true;

  /* ---------- Counter and [ VIEW CASE ] ---------- */
  var countEl = document.getElementById('vr-count');
  var viewEl = document.getElementById('vr-view');
  var viewText = document.getElementById('vr-view-text');
  var VIEW_LABEL = '[ VIEW CASE ]';
  var scrambleTimer = 0;
  function scramble(el, text) {
    window.clearInterval(scrambleTimer);
    if (reduced()) { el.textContent = text; return; }
    var pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var frames = 0;
    scrambleTimer = window.setInterval(function () {
      frames += 1;
      var out = '';
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        out += (i < frames / 1.4 || ch === ' ' || ch === '[' || ch === ']') ? ch : pool.charAt(Math.floor(Math.random() * pool.length));
      }
      el.textContent = out;
      if (frames > text.length * 1.4) { window.clearInterval(scrambleTimer); el.textContent = text; }
    }, 40);
  }
  function updateFoot(idx, animate) {
    var st = stations[idx];
    if (!st) return;
    countEl.textContent = (idx + 1) + '/' + stations.length;
    var open = st.card.querySelector('.vr-open');
    if (open) viewEl.setAttribute('href', open.getAttribute('href'));
    viewEl.setAttribute('aria-label', 'Open the case: ' + st.label);
    if (animate) scramble(viewText, VIEW_LABEL);
  }
  viewEl.addEventListener('mouseenter', function () { scramble(viewText, VIEW_LABEL); });

  /* ---------- Previous / next arrows beside the counter (wrap around both ways) ---------- */
  function stepCase(delta) {
    var n = stations.length;
    if (!n) return;
    var from = activeIdx < 0 ? 0 : activeIdx;
    focusStation(((from + delta) % n + n) % n, { announce: true });
  }
  var prevBtn = document.getElementById('vr-prev');
  var nextBtn = document.getElementById('vr-next');
  if (prevBtn) prevBtn.addEventListener('click', function () { stepCase(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { stepCase(1); });

  function setActive(idx) {
    var changed = idx !== activeIdx;
    activeIdx = idx;
    stations.forEach(function (st, i) {
      var on = i === idx;
      var playing = i === cinemaIdx;
      st.card.classList.toggle('is-focused', on);
      if (on) st.pill.setAttribute('aria-current', 'true'); else st.pill.removeAttribute('aria-current');
      st.cone.material.opacity = playing ? 0.12 : on ? 0.075 : (cinemaIdx >= 0 ? 0.012 : 0.03);
      st.pool.material.opacity = playing ? 0.55 : on ? 0.45 : (cinemaIdx >= 0 ? 0.08 : 0.2);
      st.light.intensity = playing ? 1.5 : on ? 1.2 : (cinemaIdx >= 0 ? 0.15 : 0.5);
    });
    ambient.intensity = cinemaIdx >= 0 ? 0.2 : 0.5;
    var shade = cinemaIdx >= 0 ? 0.32 : 1;
    hallMats.forEach(function (m) { m.color.setScalar(shade); });
    updateFoot(idx, changed);
    dirty = true;
  }

  function shortestYaw(from, to) {
    var d = to - from;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return from + d;
  }

  /* ---------- Entry: the room shows up from above ---------- */
  var INTRO_MS = 3400;
  var intro = null;
  var introPlayed = false;
  function easeInOut(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function startIntro() {
    if (introPlayed || reduced()) return false;
    introPlayed = true;
    var v = viewFor(0, VIEW_DIST);
    setActive(0);
    intro = { t0: 0, x: v.x, yaw: v.yaw, y0: HALL.h - 0.45, y1: EYE_Y, z0: v.z + 1.6, z1: v.z, p0: -1.05, p1: 0 };
    cam.x = cam.tx = v.x;
    cam.yaw = cam.tyaw = v.yaw;
    cam.y = cam.ty = intro.y0;
    cam.z = cam.tz = intro.z0;
    cam.pitch = cam.tpitch = intro.p0;
    section.classList.add('is-intro');
    dirty = true;
    start();
    return true;
  }
  // soft: hand the rest of the move to the normal easing (the visitor took over)
  function endIntro(soft) {
    if (!intro) return;
    var it = intro;
    intro = null;
    section.classList.remove('is-intro');
    cam.tx = it.x; cam.ty = it.y1; cam.tz = it.z1; cam.tpitch = it.p1;
    if (!soft) { cam.y = it.y1; cam.z = it.z1; cam.pitch = it.p1; }
    dirty = true;
  }

  function focusStation(idx, opts) {
    var st = stations[idx];
    if (!st) return;
    if (intro) endIntro(true);
    if (cinemaIdx >= 0 && cinemaIdx !== idx) stopCinema(true);
    var v = viewFor(idx, VIEW_DIST);
    cam.tx = v.x;
    cam.tz = v.z;
    cam.tyaw = shortestYaw(cam.yaw, v.yaw);
    cam.tpitch = 0;
    setActive(idx);
    if (opts && opts.announce) live.textContent = st.label;
  }

  function startCinema(idx) {
    var st = stations[idx];
    if (cinemaIdx >= 0) stopCinema(true);
    cinemaIdx = idx;
    var v = viewFor(idx, CINEMA_DIST);
    cam.tx = st.x * 0.2;
    cam.tz = v.z;
    cam.tyaw = shortestYaw(cam.yaw, Math.atan2(-(st.x - cam.tx), -(st.z - v.z)));
    cam.tpitch = 0;
    section.classList.add('is-cinema');
    st.card.classList.add('is-playing');
    var btn = st.card.querySelector('.vr-play');
    if (btn) { btn.setAttribute('aria-pressed', 'true'); btn.textContent = 'Stop'; }
    if (st.video) {
      if (!st.video.getAttribute('src')) st.video.setAttribute('src', st.video.getAttribute('data-src'));
      var p = st.video.play();
      if (p && p.catch) p.catch(function () {});
    }
    setActive(idx);
    live.textContent = 'Playing ' + st.label + '. Press Escape to stop.';
  }

  function stopCinema(keepPosition) {
    if (cinemaIdx < 0) return;
    var st = stations[cinemaIdx];
    var idx = cinemaIdx;
    cinemaIdx = -1;
    section.classList.remove('is-cinema');
    st.card.classList.remove('is-playing');
    var btn = st.card.querySelector('.vr-play');
    if (btn) { btn.setAttribute('aria-pressed', 'false'); btn.textContent = 'Play'; }
    if (st.video) st.video.pause();
    if (!keepPosition) {
      var v = viewFor(idx, VIEW_DIST + 1.2);
      cam.tx = v.x;
      cam.tz = v.z;
    }
    setActive(idx);
  }

  /* ---------- Look: drag, trackpad, wheel ---------- */
  var drag = null;
  var suppressClick = false;

  stage.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    if (e.target.closest('a, button, video')) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, type: e.pointerType };
    suppressClick = false;
    if (e.pointerType === 'mouse' && document.activeElement !== stage) stage.focus({ preventScroll: true });
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) { hoverPick(e); return; }
    var dx = e.clientX - drag.x;
    var dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) {
      drag.moved = true;
      endIntro(true);
      stage.classList.add('is-dragging');
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (cinemaIdx >= 0) stopCinema(true);
    }
    if (!drag.moved) return;
    cam.tyaw += dx * 0.004;
    if (drag.type === 'mouse') cam.tpitch = clamp(cam.tpitch + dy * 0.0025, -0.3, 0.3);
    dirty = true;
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var wasClick = !drag.moved;
    suppressClick = drag.moved;
    stage.classList.remove('is-dragging');
    drag = null;
    if (wasClick && e && e.type === 'pointerup' && !e.target.closest('.vr-card, .vr-hud-top, .vr-dock, .vr-foot')) clickPick(e);
    window.setTimeout(function () { suppressClick = false; }, 0);
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', function (e) {
    if (drag && e.pointerId === drag.id) { stage.classList.remove('is-dragging'); drag = null; }
  });
  // swallow the click that ends a drag over a card link
  stage.addEventListener('click', function (e) {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // Two-finger horizontal trackpad pan always works; vertical wheel is the page's unless Walk mode is on.
  stage.addEventListener('wheel', function (e) {
    var ax = Math.abs(e.deltaX), ay = Math.abs(e.deltaY);
    if (ax > ay) {
      e.preventDefault();
      endIntro(true);
      cam.tyaw -= e.deltaX * 0.0022;
      dirty = true;
    } else if (walkMode) {
      e.preventDefault();
      var fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
      cam.tx += fx * (-e.deltaY * 0.008);
      cam.tz += fz * (-e.deltaY * 0.008);
      dirty = true;
    }
  }, { passive: false });

  /* ---------- Walk mode ---------- */
  var walkMode = false;
  var walkBtn = document.getElementById('vr-walk');
  function setWalk(on) {
    walkMode = on;
    walkBtn.setAttribute('aria-pressed', String(on));
    walkBtn.textContent = 'Walk mode: ' + (on ? 'on' : 'off');
    live.textContent = on ? 'Walk mode on. Scroll and arrow keys now move you. Press Escape to turn it off.' : 'Walk mode off.';
  }
  walkBtn.addEventListener('click', function () { setWalk(!walkMode); });

  /* ---------- Keyboard: WASD always (stage focused), arrows ---------- */
  var keys = {};
  var MOVE = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1 };
  stage.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (cinemaIdx >= 0) { stopCinema(false); e.preventDefault(); return; }
      if (walkMode) { setWalk(false); e.preventDefault(); return; }
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (!MOVE[e.code]) return;
    var tag = e.target.tagName;
    if (e.target !== stage && (tag === 'A' || tag === 'BUTTON') && /Arrow/.test(e.code)) return;
    // Up/Down arrows scroll the page unless Walk mode is on
    if ((e.code === 'ArrowUp' || e.code === 'ArrowDown') && !walkMode) return;
    e.preventDefault();
    endIntro(true);
    keys[e.code] = true;
    if (cinemaIdx >= 0) stopCinema(true);
  });
  stage.addEventListener('keyup', function (e) { delete keys[e.code]; });
  stage.addEventListener('focusout', function (e) { if (!stage.contains(e.relatedTarget)) keys = {}; });

  /* ---------- Picking the pools of light ---------- */
  var raycaster = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  function pickAt(e) {
    var r = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    var hit = raycaster.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.station : -1;
  }
  var hoverRaf = 0;
  function hoverPick(e) {
    if (e.pointerType !== 'mouse' || hoverRaf) return;
    hoverRaf = requestAnimationFrame(function () {
      hoverRaf = 0;
      var over = !e.target.closest('.vr-card, .vr-hud-top, .vr-dock, .vr-foot') && pickAt(e) >= 0;
      stage.classList.toggle('is-over-pedestal', over);
    });
  }
  function clickPick(e) {
    var idx = pickAt(e);
    if (idx >= 0) focusStation(idx, { announce: true });
  }

  /* ---------- Map: the hall from above ---------- */
  var radar = document.getElementById('vr-radar');
  var rctx = radar.getContext('2d');
  var RW = 120, RH = 92;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  radar.width = RW * dpr; radar.height = RH * dpr;
  function drawRadar() {
    rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rctx.clearRect(0, 0, RW, RH);
    var k = (RW - 14) / LEN;
    var cy = RH / 2;
    function mx(z) { return 7 + (HALL.near - z) * k; }
    function my(x) { return cy + x * 3; }
    rctx.strokeStyle = 'rgba(125,211,252,0.3)';
    rctx.lineWidth = 1;
    rctx.strokeRect(mx(HALL.near) + 0.5, my(-HALL.w / 2) + 0.5, LEN * k, HALL.w * 3);

    var px = mx(cam.z), py = my(cam.x);
    var hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
    var look = -cam.yaw;
    var grad = rctx.createRadialGradient(px, py, 0, px, py, 30);
    grad.addColorStop(0, 'rgba(125,211,252,0.4)');
    grad.addColorStop(1, 'rgba(125,211,252,0)');
    rctx.fillStyle = grad;
    rctx.beginPath();
    rctx.moveTo(px, py);
    rctx.arc(px, py, 30, look - hfov / 2, look + hfov / 2);
    rctx.closePath();
    rctx.fill();

    stations.forEach(function (st, i) {
      rctx.fillStyle = i === activeIdx || i === cinemaIdx ? '#7dd3fc' : '#64748b';
      rctx.beginPath();
      rctx.arc(mx(st.z), my(st.x), i === activeIdx ? 3 : 2.2, 0, Math.PI * 2);
      rctx.fill();
    });
    rctx.fillStyle = '#bae6fd';
    rctx.beginPath();
    rctx.arc(px, py, 2.6, 0, Math.PI * 2);
    rctx.fill();
  }

  /* ---------- Loop (runs only while the room is on screen) ---------- */
  var visible = false;
  var running = false;
  var fwd = new THREE.Vector3();
  var toCard = new THREE.Vector3();
  var last = 0;

  function frame(now) {
    if (!visible || document.hidden) { running = false; return; }
    requestAnimationFrame(frame);
    var dt = last ? Math.min((now - last) / 16.67, 3) : 1;
    last = now;

    var speed = 0.09 * dt;
    var fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
    var rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    var moving = false;
    if (keys.KeyW || keys.ArrowUp) { cam.tx += fx * speed; cam.tz += fz * speed; moving = true; }
    if (keys.KeyS || keys.ArrowDown) { cam.tx -= fx * speed; cam.tz -= fz * speed; moving = true; }
    if (keys.KeyA || keys.ArrowLeft) { cam.tx -= rx * speed; cam.tz -= rz * speed; moving = true; }
    if (keys.KeyD || keys.ArrowRight) { cam.tx += rx * speed; cam.tz += rz * speed; moving = true; }

    if (intro) {
      if (!intro.t0) intro.t0 = now;
      var u = Math.min(1, (now - intro.t0) / INTRO_MS);
      var e = easeInOut(u);
      cam.y = cam.ty = intro.y0 + (intro.y1 - intro.y0) * e;
      cam.z = cam.tz = intro.z0 + (intro.z1 - intro.z0) * e;
      // look down at the floor first, lift the gaze a little later than the drop
      var ep2 = easeInOut(Math.max(0, (u - 0.12) / 0.88));
      cam.pitch = cam.tpitch = intro.p0 + (intro.p1 - intro.p0) * ep2;
      moving = true;
      if (u >= 1) endIntro(false);
    }

    cam.tx = clamp(cam.tx, -BOUND_X, BOUND_X);
    cam.tz = clamp(cam.tz, HALL.far + 4, HALL.near - 1.5);

    var k = reduced() ? 1 : 1 - Math.pow(1 - 0.08, dt);
    var ex = cam.tx - cam.x, ez = cam.tz - cam.z, ey = cam.tyaw - cam.yaw, ep = cam.tpitch - cam.pitch, eh = cam.ty - cam.y;
    var settling = Math.abs(ex) + Math.abs(ez) + Math.abs(ey) + Math.abs(ep) + Math.abs(eh) > 0.0005;
    if (!settling && !moving && !dirty) return;
    cam.x += ex * k; cam.z += ez * k; cam.yaw += ey * k; cam.pitch += ep * k; cam.y += eh * k;

    camera.position.set(cam.x, cam.y, cam.z);
    camera.rotation.y = cam.yaw;
    camera.rotation.x = cam.pitch;
    camera.updateMatrixWorld();

    // cases behind you or far down the hall are hidden or faded (DOM cards ignore fog)
    camera.getWorldDirection(fwd);
    stations.forEach(function (st) {
      var dx = st.x - cam.x, dz = st.z - cam.z;
      var dist = Math.sqrt(dx * dx + dz * dz);
      toCard.set(dx, 0, dz).normalize();
      st.obj.visible = fwd.x * toCard.x + fwd.z * toCard.z > 0.05 && dist < 30;
      var fade = dist < 16 ? 1 : Math.max(0, 1 - (dist - 16) / 12);
      if (Math.abs(fade - st.fade) > 0.02) {
        st.fade = fade;
        st.card.style.setProperty('--fade', fade.toFixed(2));
      }
    });

    renderer.render(scene, camera);
    cssRenderer.render(cssScene, camera);
    drawRadar();
    dirty = false;
  }
  function start() {
    if (running || !visible) return;
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) { dirty = true; start(); }
      else if (cinemaIdx >= 0) stopCinema(true);
    }, { rootMargin: '120px 0px' }).observe(stage);
  } else {
    visible = true;
    start();
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { dirty = true; start(); } });

  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    if (!W || !H) return;
    camera.aspect = W / H;
    // narrow screens: widen the view a little so a whole card fits
    camera.fov = W / H < 0.8 ? 62 : 52;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
    cssRenderer.setSize(W, H);
    dirty = true;
    start();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener('resize', resize);
  resize();

  /* ---------- Guided tour: a ghost cursor shows the cases until the visitor takes over ---------- */
  var tourBtn = document.getElementById('vr-tour');
  var ghost = document.getElementById('vr-ghost');
  var tourOn = false;
  var tourAuto = !reduced();      // may start by itself; reduced motion = manual only
  var tourStarted = false;
  var tourPlayedHere = false;     // finished a run during this visit to the room
  var inRoom = false;
  var tourToken = 0;
  var tourCinema = false;
  var tourHover = null;
  var idleTimer = 0;
  var startTimer = 0;

  function setTourLabel() {
    tourBtn.textContent = tourOn ? 'Pause tour' : (tourStarted ? 'Replay tour' : 'Play tour');
  }
  function tourWait(token, ms, fn) {
    window.setTimeout(function () { if (token === tourToken) fn(); }, ms);
  }
  function tourSettled(token, fn) {
    var t0 = Date.now();
    (function poll() {
      if (token !== tourToken) return;
      var d = Math.abs(cam.tx - cam.x) + Math.abs(cam.tz - cam.z) + Math.abs(cam.tyaw - cam.yaw);
      if (d < 0.03 || Date.now() - t0 > 4500) fn(); else window.setTimeout(poll, 100);
    })();
  }
  function ghostTo(el) {
    if (!el) return;
    var r = el.getBoundingClientRect();
    var s = stage.getBoundingClientRect();
    if (!r.width) return;
    ghost.style.transform = 'translate(' + Math.round(r.left + r.width * 0.5 - s.left) + 'px,' + Math.round(r.top + r.height * 0.5 - s.top) + 'px)';
    if (tourHover) tourHover.classList.remove('is-ghost-hover');
    tourHover = el;
    el.classList.add('is-ghost-hover');
  }
  function ghostClick() {
    ghost.classList.remove('is-click');
    void ghost.offsetWidth;
    ghost.classList.add('is-click');
  }

  // One station: walk there, point at Play, press it (cases with a video), point at the media
  function tourStation(idx, token, done) {
    var st = stations[idx];
    focusStation(idx, {});
    tourSettled(token, function () {
      tourWait(token, 350, function () {
        ghostTo(st.card.querySelector('.vr-play'));
        tourWait(token, 1100, function () {
          var media = st.card.querySelector('.vr-card-media');
          if (st.video) {
            ghostClick();
            startCinema(idx);
            tourCinema = true;
            tourSettled(token, function () {
              ghostTo(st.card.querySelector('.vr-card-media'));
              tourWait(token, 3600, function () {
                stopCinema(true);
                tourCinema = false;
                tourWait(token, 500, done);
              });
            });
          } else {
            ghostTo(media);
            tourWait(token, 2200, done);
          }
        });
      });
    });
  }

  function endTour() {
    tourToken += 1;
    tourOn = false;
    if (tourCinema) { stopCinema(true); tourCinema = false; }
    if (tourHover) { tourHover.classList.remove('is-ghost-hover'); tourHover = null; }
    ghost.classList.remove('is-on');
    setTourLabel();
  }
  function scheduleResume() {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(function () {
      if (tourAuto && !tourPlayedHere && visible && !tourOn && !document.hidden) startTour();
    }, 12000);
  }
  function stopTour(resumeLater) {
    window.clearTimeout(startTimer);
    if (!tourOn) return;
    endTour();
    live.textContent = 'Tour stopped. You are in control.';
    if (resumeLater && tourAuto) scheduleResume();
  }
  function startTour() {
    if (tourOn) return;
    window.clearTimeout(idleTimer);
    window.clearTimeout(startTimer);
    tourOn = true;
    tourStarted = true;
    tourPlayedHere = false;
    setTourLabel();
    var token = (tourToken += 1);
    ghost.style.transform = 'translate(' + Math.round(stage.clientWidth * 0.5) + 'px,' + Math.round(stage.clientHeight * 0.6) + 'px)';
    ghost.classList.add('is-on');
    live.textContent = 'Guided tour started. Press a key, drag, or swipe sideways to take over.';
    var order = [];
    var i;
    for (i = 0; i < stations.length; i++) order.push(i);
    var n = 0;
    (function next() {
      if (token !== tourToken) return;
      if (n >= order.length) {
        focusStation(0, {});
        endTour();
        tourPlayedHere = true;    // played through; it plays again on the next arrival
        return;
      }
      tourStation(order[n], token, next);
      n += 1;
    })();
  }

  // Any real input from the visitor hands control back (and resumes after 12s idle)
  function onUserInput(e) {
    if (e && e.target && tourBtn.contains(e.target)) return;
    window.clearTimeout(startTimer);
    if (tourOn) stopTour(true);
    else if (tourAuto) scheduleResume();
  }
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (type) {
    stage.addEventListener(type, onUserInput, { passive: true, capture: true });
  });
  stage.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || walkMode) onUserInput(e);
  }, { passive: true, capture: true });

  tourBtn.addEventListener('click', function () {
    if (tourOn) { tourAuto = false; stopTour(false); }
    else { tourAuto = true; startTour(); }
  });

  // Starts by itself each time you arrive at the room (unless you paused it, or reduced motion is on)
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var en = entries[0];
      if (en.intersectionRatio >= 0.4) {
        if (!inRoom) {
          inRoom = true;
          var flying = startIntro();    // first arrival: drop in from above
          if (tourAuto && !tourOn && !tourPlayedHere) {
            window.clearTimeout(startTimer);
            startTimer = window.setTimeout(function () {
              if (visible && inRoom && tourAuto && !tourOn && !tourPlayedHere) startTour();
            }, flying ? INTRO_MS + 600 : 800);
          }
        }
      } else if (en.intersectionRatio < 0.15) {
        inRoom = false;
        tourPlayedHere = false;
        window.clearTimeout(idleTimer);
        window.clearTimeout(startTimer);
        stopTour(false);
      }
    }, { threshold: [0, 0.15, 0.4] }).observe(stage);
  }
  setTourLabel();

  /* ---------- Requests from elsewhere on the page (hero drawer links) ---------- */
  window.addEventListener('showroom:focus', function (e) {
    introPlayed = true;       // a specific case was asked for: skip the entry
    stopTour(false);
    window.clearTimeout(startTimer);
    tourPlayedHere = true;    // you asked for a specific case: don't start the tour over it
    var id = e.detail && e.detail.id;
    for (var i = 0; i < stations.length; i++) {
      if (stations[i].id === id) { focusStation(i, { announce: true }); return; }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || stage.contains(document.activeElement)) return;
    if (cinemaIdx >= 0) stopCinema(false);
    else if (walkMode) setWalk(false);
  });

  // start in front of the first case
  setActive(0);
  live.textContent = '';
})();
