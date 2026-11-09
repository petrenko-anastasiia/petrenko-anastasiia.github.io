/* Recent works — spatial 3D showroom (upgrade v1)
 * WebGLRenderer (room, pedestals, light cones) + CSS3DRenderer (real DOM case cards)
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

  /* ---------- Scene ---------- */
  var W = stage.clientWidth || window.innerWidth;
  var H = stage.clientHeight || window.innerHeight;
  var ROOM_R = 11.8;
  var EYE_Y = 2.35;
  var WALK_R = 8.2;
  var CARD_SCALE = 0.009;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(W, H);
  renderer.setClearColor(0x05070b, 1);
  webglHost.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  var cssRenderer = new THREE.CSS3DRenderer();
  cssRenderer.setSize(W, H);
  cssHost.appendChild(cssRenderer.domElement);

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070b, 0.035);
  var cssScene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 100);
  camera.rotation.order = 'YXZ';

  var wall = new THREE.Mesh(
    new THREE.CylinderGeometry(ROOM_R + 1.2, ROOM_R + 1.2, 9, 72, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x0b0f1a, side: THREE.BackSide, roughness: 0.85 })
  );
  wall.position.y = 3.5;
  scene.add(wall);

  var floor = new THREE.Mesh(
    new THREE.CircleGeometry(ROOM_R + 1.2, 72),
    new THREE.MeshStandardMaterial({ color: 0x070a12, roughness: 0.4, metalness: 0.3 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  var grid = new THREE.PolarGridHelper(ROOM_R + 1.2, 24, 10, 72, 0x1e293b, 0x111827);
  grid.position.y = 0.01;
  scene.add(grid);

  // skirting light where wall meets floor
  var skirt = new THREE.Mesh(
    new THREE.TorusGeometry(ROOM_R + 1.15, 0.02, 6, 120),
    new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.6 })
  );
  skirt.rotation.x = Math.PI / 2;
  skirt.position.y = 0.05;
  scene.add(skirt);

  var ambient = new THREE.AmbientLight(0x94a3b8, 0.45);
  scene.add(ambient);

  /* ---------- Stations ---------- */
  var ACCENT = { blue: 0x3b82f6, violet: 0x8b5cf6, emerald: 0x10b981 };
  var dock = document.getElementById('vr-dock');
  var live = document.getElementById('vr-live');
  var stations = [];
  var pickables = [];

  cardEls.forEach(function (card, idx) {
    var deg = Number(card.getAttribute('data-angle'));
    var rad = THREE.MathUtils.degToRad(deg);
    var sx = Math.sin(rad) * ROOM_R;
    var sz = -Math.cos(rad) * ROOM_R;
    var center = deg === 0;
    var color = ACCENT[card.getAttribute('data-accent')] || ACCENT.violet;

    var ped = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.2, 0.36, 40),
      new THREE.MeshStandardMaterial({ color: 0x131a2b, metalness: 0.5, roughness: 0.35 })
    );
    ped.position.set(sx, 0.18, sz);
    ped.userData.station = idx;
    scene.add(ped);
    pickables.push(ped);

    var ring = new THREE.Mesh(
      new THREE.RingGeometry(1.22, 1.3, 48),
      new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(sx, 0.02, sz);
    ring.userData.station = idx;
    scene.add(ring);
    pickables.push(ring);

    var cone = new THREE.Mesh(
      new THREE.ConeGeometry(2.5, 6.2, 40, 1, true),
      new THREE.MeshBasicMaterial({
        color: center ? 0x8b5cf6 : 0x60a5fa,
        transparent: true,
        opacity: center ? 0.09 : 0.04,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    cone.position.set(sx, 3.3, sz);
    scene.add(cone);

    var spot = new THREE.PointLight(0x8b5cf6, center ? 2.4 : 0.9, 10);
    spot.position.set(sx, 4.6, sz + 0.8);
    scene.add(spot);

    var obj = new THREE.CSS3DObject(card);
    obj.scale.setScalar(CARD_SCALE);
    obj.position.set(sx, 2.55, sz);
    obj.lookAt(0, 2.55, 0);
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

    stations.push({ id: card.getAttribute('data-id'), label: card.getAttribute('data-label'), rad: rad, sx: sx, sz: sz,
      cone: cone, spot: spot, ring: ring, card: card, obj: obj, pill: pill, video: card.querySelector('video'), center: center });
  });

  /* ---------- Camera state ---------- */
  var cam = { x: 0, z: 3.8, yaw: 0, pitch: 0, tx: 0, tz: 3.8, tyaw: 0, tpitch: 0 };
  var activeIdx = -1;
  var cinemaIdx = -1;

  function setActive(idx) {
    activeIdx = idx;
    stations.forEach(function (st, i) {
      var on = i === idx;
      st.card.classList.toggle('is-focused', on);
      if (on) st.pill.setAttribute('aria-current', 'true'); else st.pill.removeAttribute('aria-current');
      var playing = i === cinemaIdx;
      st.cone.material.opacity = playing ? 0.16 : on ? 0.1 : (cinemaIdx >= 0 ? 0.015 : st.center ? 0.06 : 0.035);
      st.spot.intensity = playing ? 3.2 : on ? 2.8 : (cinemaIdx >= 0 ? 0.25 : st.center ? 1.6 : 0.8);
    });
    ambient.intensity = cinemaIdx >= 0 ? 0.18 : 0.45;
    dirty = true;
  }

  function shortestYaw(from, to) {
    var d = to - from;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return from + d;
  }

  function focusStation(idx, opts) {
    var st = stations[idx];
    if (!st) return;
    if (cinemaIdx >= 0 && cinemaIdx !== idx) stopCinema(true);
    cam.tx = Math.sin(st.rad) * 2.2;
    cam.tz = 3.2 - Math.cos(st.rad) * 1.2;
    cam.tyaw = shortestYaw(cam.yaw, -st.rad);
    cam.tpitch = 0;
    setActive(idx);
    if (opts && opts.announce) live.textContent = st.label;
  }

  function startCinema(idx) {
    var st = stations[idx];
    if (cinemaIdx >= 0) stopCinema(true);
    cinemaIdx = idx;
    var dist = 5.6;
    cam.tx = st.sx - Math.sin(st.rad) * dist;
    cam.tz = st.sz + Math.cos(st.rad) * dist;
    cam.tyaw = shortestYaw(cam.yaw, -st.rad);
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
    cinemaIdx = -1;
    section.classList.remove('is-cinema');
    st.card.classList.remove('is-playing');
    var btn = st.card.querySelector('.vr-play');
    if (btn) { btn.setAttribute('aria-pressed', 'false'); btn.textContent = 'Play'; }
    if (st.video) st.video.pause();
    if (!keepPosition) {
      var dist = 7.6;
      cam.tx = st.sx - Math.sin(st.rad) * dist;
      cam.tz = st.sz + Math.cos(st.rad) * dist;
    }
    setActive(stations.indexOf(st));
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
      stage.classList.add('is-dragging');
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (cinemaIdx >= 0) stopCinema(true);
    }
    if (!drag.moved) return;
    cam.tyaw += dx * 0.004;
    if (drag.type === 'mouse') cam.tpitch = THREE.MathUtils.clamp(cam.tpitch + dy * 0.0025, -0.3, 0.3);
    dirty = true;
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var wasClick = !drag.moved;
    suppressClick = drag.moved;
    stage.classList.remove('is-dragging');
    drag = null;
    if (wasClick && e && e.type === 'pointerup' && !e.target.closest('.vr-card, .vr-hud-top, .vr-dock')) clickPick(e);
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
    keys[e.code] = true;
    if (cinemaIdx >= 0) stopCinema(true);
  });
  stage.addEventListener('keyup', function (e) { delete keys[e.code]; });
  stage.addEventListener('focusout', function (e) { if (!stage.contains(e.relatedTarget)) keys = {}; });

  /* ---------- Pedestal picking ---------- */
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
      var over = !e.target.closest('.vr-card, .vr-hud-top, .vr-dock') && pickAt(e) >= 0;
      stage.classList.toggle('is-over-pedestal', over);
    });
  }
  function clickPick(e) {
    var idx = pickAt(e);
    if (idx >= 0) focusStation(idx, { announce: true });
  }

  /* ---------- Radar ---------- */
  var radar = document.getElementById('vr-radar');
  var rctx = radar.getContext('2d');
  var RW = 120, RH = 92;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  radar.width = RW * dpr; radar.height = RH * dpr;
  function drawRadar() {
    rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rctx.clearRect(0, 0, RW, RH);
    var cx = RW / 2, cy = 58, s = 3.4;
    rctx.strokeStyle = 'rgba(148,163,184,0.3)';
    rctx.lineWidth = 1.5;
    rctx.beginPath();
    rctx.arc(cx, cy, ROOM_R * s, Math.PI * 1.08, Math.PI * 1.92);
    rctx.stroke();
    rctx.strokeStyle = 'rgba(148,163,184,0.12)';
    rctx.beginPath();
    rctx.arc(cx, cy, WALK_R * s, 0, Math.PI * 2);
    rctx.stroke();

    var px = cx + cam.x * s, py = cy + cam.z * s;
    var hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
    var look = -Math.PI / 2 - cam.yaw;
    var grad = rctx.createRadialGradient(px, py, 0, px, py, 30);
    grad.addColorStop(0, 'rgba(139,92,246,0.4)');
    grad.addColorStop(1, 'rgba(139,92,246,0)');
    rctx.fillStyle = grad;
    rctx.beginPath();
    rctx.moveTo(px, py);
    rctx.arc(px, py, 30, look - hfov / 2, look + hfov / 2);
    rctx.closePath();
    rctx.fill();

    stations.forEach(function (st, i) {
      rctx.fillStyle = i === cinemaIdx ? '#fcd34d' : i === activeIdx ? '#a78bfa' : '#60a5fa';
      rctx.beginPath();
      rctx.arc(cx + st.sx * s, cy + st.sz * s, i === activeIdx ? 3.6 : 2.8, 0, Math.PI * 2);
      rctx.fill();
    });
    rctx.fillStyle = '#34d399';
    rctx.beginPath();
    rctx.arc(px, py, 3.4, 0, Math.PI * 2);
    rctx.fill();
  }

  /* ---------- Loop (runs only while the room is on screen) ---------- */
  var dirty = true;
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

    var r = Math.hypot(cam.tx, cam.tz);
    if (r > WALK_R) { cam.tx = cam.tx / r * WALK_R; cam.tz = cam.tz / r * WALK_R; }

    var k = reduced() ? 1 : 1 - Math.pow(1 - 0.08, dt);
    var ex = cam.tx - cam.x, ez = cam.tz - cam.z, ey = cam.tyaw - cam.yaw, ep = cam.tpitch - cam.pitch;
    var settling = Math.abs(ex) + Math.abs(ez) + Math.abs(ey) + Math.abs(ep) > 0.0005;
    if (!settling && !moving && !dirty) return;
    cam.x += ex * k; cam.z += ez * k; cam.yaw += ey * k; cam.pitch += ep * k;

    camera.position.set(cam.x, EYE_Y, cam.z);
    camera.rotation.y = cam.yaw;
    camera.rotation.x = cam.pitch;
    camera.updateMatrixWorld();

    // hide cards that are behind or far to the side of the camera (CSS3D has no clipping)
    camera.getWorldDirection(fwd);
    stations.forEach(function (st) {
      toCard.set(st.sx - cam.x, 0, st.sz - cam.z).normalize();
      st.obj.visible = fwd.x * toCard.x + fwd.z * toCard.z > 0.05;
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

  /* ---------- Requests from elsewhere on the page (hero drawer links) ---------- */
  window.addEventListener('showroom:focus', function (e) {
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

  // start framed on the centre spotlight
  var centre = 0;
  stations.forEach(function (st, i) { if (st.center) centre = i; });
  setActive(centre);
  live.textContent = '';
})();
