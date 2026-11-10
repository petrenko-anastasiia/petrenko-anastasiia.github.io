/*
 * Checks for the v1 upgrade (hero, stack matrix, showroom).
 *   SITE_URL=http://127.0.0.1:8766/index.html node tests/upgrade.test.js
 * Needs Playwright (npm i -D playwright && npx playwright install chromium).
 */
const { chromium } = require('playwright');

const URL = process.env.SITE_URL || 'http://127.0.0.1:8766/index.html';
let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || !detail ? '' : '  -> ' + detail));
  if (!ok) failures += 1;
}

async function open(browser, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 900 } }, opts || {}));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && !process.env.ALLOW_404) errors.push(r.status() + ' ' + r.url()); });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  return { ctx, page, errors };
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

  /* ---------- Desktop ---------- */
  {
    const { ctx, page, errors } = await open(browser, { permissions: ['clipboard-read', 'clipboard-write'] });

    const dupIds = await page.evaluate(() => {
      const seen = {}; const d = [];
      document.querySelectorAll('[id]').forEach((el) => { if (seen[el.id]) d.push(el.id); seen[el.id] = 1; });
      return d;
    });
    check('no duplicate ids', dupIds.length === 0, dupIds.join(','));

    const fit = await page.evaluate(() => {
      const hero = document.querySelector('.ph-hero').getBoundingClientRect();
      const header = document.querySelector('header.top');
      const hh = header ? header.getBoundingClientRect().height : 0;
      return { bottom: hero.bottom, vh: innerHeight, hh, h: hero.height };
    });
    check('hero fits one screen at 1440x900', fit.bottom <= fit.vh + 1 && fit.h <= fit.vh - fit.hh + 1, JSON.stringify(fit));

    const layout = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      return { left: r('.ph-monitor--hook').right, centreL: r('.ph-top').left, centreR: r('.ph-top').right, right: r('.ph-monitor--pipe').left,
        ratio: r('.ph-monitor--hook').height / r('.ph-monitor--hook').width };
    });
    check('monitors flank the centre column', layout.left <= layout.centreL && layout.right >= layout.centreR, JSON.stringify(layout));
    check('monitors are 9:16', Math.abs(layout.ratio - 16 / 9) < 0.06, String(layout.ratio));

    await page.waitForTimeout(1100);
    const kpiText = await page.$$eval('.ph-kpi-value', (els) => els.map((e) => e.textContent));
    const titleStyle = await page.evaluate(() => { const h = document.getElementById('ph-title'); const cs = getComputedStyle(h); return { family: cs.fontFamily, weight: cs.fontWeight, stretch: cs.fontStretch, upper: cs.textTransform, glow: !!document.getElementById('ph-title-glow') }; });
    check('title: condensed bold uppercase, like the contact heading', /Instrument Sans/.test(titleStyle.family) && titleStyle.weight === '700' && titleStyle.stretch === '78%' && titleStyle.upper === 'uppercase' && titleStyle.glow, JSON.stringify(titleStyle));
    const glowX = () => page.evaluate(() => parseFloat(document.getElementById('ph-title-glow').style.getPropertyValue('--gx')));
    const gA = await glowX();
    await page.waitForTimeout(1200);
    const gB = await glowX();
    check('title: the light drifts on its own', Math.abs(gB - gA) > 0.5, gA + ' -> ' + gB);
    const tPos = await page.evaluate(() => { const r = document.getElementById('ph-title').getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; });
    await page.mouse.move(tPos.x, tPos.y);
    await page.waitForTimeout(900);
    const gC = await glowX();
    check('title: the light follows the pointer', gC < 20, String(gC));
    check('KPI count-up lands on final values', kpiText.join('|') === '−54%|$471K|~75%', kpiText.join('|'));

    await page.click('.ph-kpi[data-kpi="rev"]');
    const drawer = await page.evaluate(() => ({ hidden: document.getElementById('ph-drawer').hidden,
      exp: document.querySelector('.ph-kpi[data-kpi="rev"]').getAttribute('aria-expanded'),
      href: document.getElementById('ph-drawer-case').getAttribute('href') }));
    check('KPI opens the case drawer', !drawer.hidden && drawer.exp === 'true' && drawer.href === '#ap-growth-case-study', JSON.stringify(drawer));
    await page.keyboard.press('Escape');
    check('Escape closes the drawer', await page.evaluate(() => document.getElementById('ph-drawer').hidden));

    const before = await page.textContent('#ph-hook-piece');
    await page.click('#ph-hook-next');
    await page.click('.ph-step[data-step="2"]');
    const after = await page.evaluate(() => ({ piece: document.getElementById('ph-hook-piece').textContent,
      detail: document.getElementById('ph-step-detail').textContent,
      pressed: document.querySelector('.ph-step[data-step="2"]').getAttribute('aria-pressed') }));
    check('Hook decoder cycles and shows anatomy', after.piece !== before && after.detail.length > 10 && after.pressed === 'true', JSON.stringify(after));

    await page.click('#ph-run-batch');
    await page.waitForTimeout(4200);
    const done = await page.$$eval('.ph-node.is-done', (n) => n.length);
    check('batch simulation completes', done === 5, String(done));

    await page.click('#ph-copy');
    await page.waitForTimeout(150);
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    check('copy button copies the email', copied === 'apetrenko597@gmail.com', copied);

    const portrait = await page.evaluate(() => {
      const el = document.getElementById('ph-scan');
      const img = el.querySelector('img');
      const cs = getComputedStyle(el);
      return {
        overlays: el.querySelectorAll('.ph-scan-label, .ph-scan-chip, .ph-scan-line, .ph-scan-tint, .ph-scan-ring').length,
        text: el.textContent.trim(),
        radius: cs.borderRadius,
        alt: img ? img.alt : '',
      };
    });
    check('portrait is a clean circle', portrait.overlays === 0 && portrait.text === '' && portrait.radius === '50%' && portrait.alt === 'Anastasiia Petrenko', JSON.stringify(portrait));

    /* Stack matrix */
    await page.evaluate(() => document.getElementById('stack').scrollIntoView({ behavior: 'instant' }));
    // a first touch cancels the automatic cursor demo so the checks below start from a known state
    await page.evaluate(() => document.getElementById('stack').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await page.waitForTimeout(300);
    const counts = await page.evaluate(() => ({ tiles: document.querySelectorAll('.sm-tile').length, caps: [...document.querySelectorAll('.sm-cap')].map((c) => c.textContent),
      progress: document.getElementById('sm-progress').textContent }));
    check('15x7 grid, only HIGGSFIELD shown at start', counts.tiles === 105 && counts.caps.join() === 'HIGGSFIELD' && counts.progress === '1 of 10 found', JSON.stringify(counts));

    const aligned = await page.evaluate(() => {
      const tiles = document.querySelectorAll('.sm-tile');
      const cap = document.querySelector('.sm-cap');
      const a = tiles[0].getBoundingClientRect(), z = tiles[9].getBoundingClientRect(), c = cap.getBoundingClientRect();
      return Math.abs(c.left - a.left) < 4 && Math.abs(c.right - z.right) < 4 && Math.abs(c.top - a.top) < 4;
    });
    check('capsule wraps HIGGSFIELD tiles', aligned);

    const lettersLookSame = await page.evaluate(() => {
      const t = document.querySelectorAll('.sm-tile');
      return getComputedStyle(t[15]).color === getComputedStyle(t[25]).color; // P of PRODUCTION vs a filler
    });
    check('unfound words look like filler letters', lettersLookSame);

    const cap = await page.$('.sm-cap');
    const box = await cap.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(250);
    const card = await page.evaluate(() => {
      const c = document.getElementById('sm-card'); const r = c.getBoundingClientRect();
      return { hidden: c.hidden, inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, name: document.getElementById('sm-card-name').textContent };
    });
    check('hover shows a proof card inside the viewport', !card.hidden && card.inView && card.name === 'HIGGSFIELD', JSON.stringify(card));
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    check('click pins the card', await page.evaluate(() => document.getElementById('sm-card').classList.contains('is-pinned')));
    await page.keyboard.press('Escape');
    check('Escape unpins the card', await page.evaluate(() => document.getElementById('sm-card').hidden));

    const centre = (r, c) => page.evaluate(([r, c]) => { const b = document.querySelectorAll('.sm-tile')[r * 15 + c].getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }, [r, c]);
    async function dragCells(a, b) {
      const p1 = await centre(a[0], a[1]); const p2 = await centre(b[0], b[1]);
      await page.mouse.move(p1[0], p1[1]); await page.mouse.down();
      await page.mouse.move(p2[0], p2[1], { steps: 8 }); await page.mouse.up();
      await page.waitForTimeout(150);
    }
    const capNames = () => page.$$eval('.sm-cap', (els) => els.map((e) => e.textContent));

    await dragCells([2, 8], [2, 10]);
    check('a wrong drag finds nothing', (await capNames()).length === 1);
    await page.keyboard.press('Escape');

    await dragCells([0, 11], [0, 14]);
    check('dragging across META finds it', (await capNames()).includes('META'));
    await page.keyboard.press('Escape');

    await dragCells([4, 14], [4, 9]);
    check('dragging a word backwards also works (TIKTOK)', (await capNames()).includes('TIKTOK'));
    await page.keyboard.press('Escape');

    const g1 = await centre(1, 12); const g2 = await centre(3, 12);
    await page.mouse.click(g1[0], g1[1]); await page.mouse.click(g2[0], g2[1]);
    await page.waitForTimeout(150);
    check('tapping first and last letter finds GA4', (await capNames()).includes('GA4'));
    await page.keyboard.press('Escape');
    check('progress counts finds', (await page.textContent('#sm-progress')) === '4 of 10 found', await page.textContent('#sm-progress'));

    await page.focus('#sm-board');
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    for (let k = 0; k < 7; k++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    check('keyboard (arrows + Enter) finds STRATEGY', (await capNames()).includes('STRATEGY'));
    await page.keyboard.press('Escape');

    // Hint walks through the next unfound word (PRODUCTION) in three steps
    const hintTiles = (n) => page.evaluate((n) => [...document.querySelectorAll('.sm-tile')].slice(15, 15 + n).filter((t) => t.classList.contains('is-hinted')).length, n);
    await page.click('#sm-hint');
    const h1 = { first: await hintTiles(1), rest: await hintTiles(10), text: await page.textContent('#sm-hint-text'), label: await page.textContent('#sm-hint') };
    check('Hint 1: pulses the first letter and gives a clue', h1.first === 1 && h1.rest === 1 && /10 letters/.test(h1.text) && /across/.test(h1.text) && /starting with P/.test(h1.text) && h1.label === 'More', JSON.stringify(h1));
    await page.click('#sm-hint');
    check('Hint 2: pulses every letter of the word', (await hintTiles(10)) === 10 && (await page.textContent('#sm-hint')) === 'Reveal');
    await page.click('#sm-hint');
    await page.waitForTimeout(150);
    const h3 = { found: (await capNames()).includes('PRODUCTION'), text: await page.textContent('#sm-hint-text'), pulsing: await hintTiles(10), label: await page.textContent('#sm-hint') };
    check('Hint 3: reveals the word and resets the hint', h3.found && h3.text === '' && h3.pulsing === 0 && h3.label === 'Hint', JSON.stringify(h3));
    await page.keyboard.press('Escape');

    await dragCells([3, 8], [6, 8]);
    check('dragging R-O-A-S unlocks the gold capsule', await page.evaluate(() => !!document.querySelector('.sm-cap[data-pillar="egg"]')));
    await page.keyboard.press('Escape');

    await page.click('#sm-reveal');
    const shown = await page.evaluate(() => ({ n: document.querySelectorAll('.sm-cap').length, p: document.getElementById('sm-progress').textContent }));
    check('Show all reveals every word', shown.n === 11 && shown.p === 'All 10 found', JSON.stringify(shown));

    /* Showroom */
    await page.evaluate(() => document.getElementById('work').scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(600);
    const hasThree = await page.evaluate(() => !!window.THREE);
    if (hasThree) {
      const vr = await page.evaluate(() => ({ canvas: !!document.querySelector('#vr-webgl canvas'), pills: document.querySelectorAll('.vr-pill').length,
        cards3d: document.querySelectorAll('#vr-css .vr-card').length }));
      check('showroom renders WebGL + 5 CSS3D cards', vr.canvas && vr.pills === 5 && vr.cards3d === 5, JSON.stringify(vr));
      await page.click('.vr-pill >> nth=2');
      await page.waitForTimeout(400);
      const foot = await page.evaluate(() => ({ count: document.getElementById('vr-count').textContent, href: document.getElementById('vr-view').getAttribute('href'),
        want: document.querySelector('#vr-css .vr-card[data-id="growth"] .vr-open').getAttribute('href') }));
      check('counter and [ VIEW CASE ] follow the focused case', foot.count === '3/5' && foot.href === foot.want, JSON.stringify(foot));
      const wheel = await page.evaluate(() => {
        const s = document.getElementById('vr-stage');
        const v = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
        const h = new WheelEvent('wheel', { deltaX: 120, bubbles: true, cancelable: true });
        s.dispatchEvent(v); s.dispatchEvent(h);
        return { vertical: v.defaultPrevented, horizontal: h.defaultPrevented };
      });
      check('vertical scroll passes through, horizontal pans', !wheel.vertical && wheel.horizontal, JSON.stringify(wheel));
      await page.click('#vr-walk');
      const walk = await page.evaluate(() => {
        const v = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
        document.getElementById('vr-stage').dispatchEvent(v);
        return v.defaultPrevented;
      });
      check('Walk mode takes vertical scroll', walk);
      await page.click('#vr-walk');
      await page.click('.vr-pill >> nth=0');
      await page.waitForTimeout(1600);
      const play = await page.$('#vr-css .vr-card[data-id="paid"] .vr-play');
      await play.click();
      await page.waitForTimeout(400);
      check('Play enters cinema mode', await page.evaluate(() => document.getElementById('work').classList.contains('is-cinema')));
      await page.keyboard.press('Escape');
      check('Escape leaves cinema mode', await page.evaluate(() => !document.getElementById('work').classList.contains('is-cinema')));

      // guided tour: a ghost cursor runs on its own, and any key hands control back
      if ((await page.textContent('#vr-tour')) === 'Pause tour') await page.click('#vr-tour');
      await page.click('#vr-tour');
      await page.waitForTimeout(800);
      const tour = await page.evaluate(() => ({ on: document.getElementById('vr-ghost').classList.contains('is-on'), label: document.getElementById('vr-tour').textContent }));
      check('guided tour shows a ghost cursor', tour.on && tour.label === 'Pause tour', JSON.stringify(tour));
      await page.focus('#vr-stage');
      await page.keyboard.press('KeyD');
      await page.waitForTimeout(300);
      const taken = await page.evaluate(() => ({ on: document.getElementById('vr-ghost').classList.contains('is-on'), label: document.getElementById('vr-tour').textContent }));
      check('any key takes over from the tour', !taken.on && taken.label !== 'Pause tour', JSON.stringify(taken));
    } else {
      check('showroom falls back to a flat card row without three.js', await page.evaluate(() => document.getElementById('work').classList.contains('is-flat')));
    }

    check('no console errors (desktop)', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  /* ---------- Tablet and phone ---------- */
  for (const vp of [{ width: 1024, height: 768 }, { width: 375, height: 812 }]) {
    const { ctx, page, errors } = await open(browser, { viewport: vp, hasTouch: vp.width < 500, isMobile: vp.width < 500 });
    const m = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth - innerWidth, kpis: r('.ph-kpis').bottom, mon: r('.ph-monitor--hook').top, portrait: r('.ph-scan').top, monEnd: r('.ph-monitor--pipe').bottom };
    });
    check(vp.width + 'px: no sideways scroll', m.overflow <= 0, String(m.overflow));
    if (vp.width < 681) {
      const t = await page.evaluate(() => {
        const r = (s) => document.querySelector(s).getBoundingClientRect();
        const sc = r('.ph-scan');
        return { title: r('.ph-title').bottom, scan: sc.top, scanEnd: sc.bottom, eyebrow: r('.ph-eyebrow').top, centred: Math.abs((sc.left + sc.right) / 2 - innerWidth / 2) < 2 };
      });
      check(vp.width + 'px: photo sits right under the title, centred', t.scan >= t.title && t.scan - t.title < 30 && t.eyebrow > t.scanEnd && t.centred, JSON.stringify(t));
      check(vp.width + 'px: monitors sit below the KPIs', m.mon > m.kpis, JSON.stringify(m));
    } else {
      check(vp.width + 'px: monitors sit below the KPIs, above the portrait', m.mon > m.kpis && m.portrait > m.monEnd, JSON.stringify(m));
    }
    check(vp.width + 'px: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  /* ---------- Stack demo: a cursor selects a word, then points at the next ---------- */
  {
    const waitOk = (page, fn, ms) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true, () => false);
    const { ctx, page, errors } = await open(browser);
    await page.evaluate(() => document.getElementById('stack').scrollIntoView({ behavior: 'instant' }));
    check('demo: a ghost cursor appears when the word search is in view', await waitOk(page, () => document.getElementById('sm-ghost').classList.contains('is-on'), 5000));
    check('demo: the cursor selects PRODUCTION', await waitOk(page, () => [...document.querySelectorAll('.sm-cap')].some((c) => c.textContent === 'PRODUCTION'), 10000));
    check('demo: then the next word is hinted', await waitOk(page, () => /starting with M/.test(document.getElementById('sm-hint-text').textContent), 5000));
    const pulsing = await page.evaluate(() => document.querySelectorAll('.sm-tile.is-hinted').length);
    check('demo: only its first letter pulses', pulsing === 1, String(pulsing));
    check('demo: the cursor leaves afterwards', await waitOk(page, () => !document.getElementById('sm-ghost').classList.contains('is-on'), 8000));
    check('no console errors (demo)', errors.length === 0, errors.join(' | '));
    await ctx.close();

    const second = await open(browser);
    await second.page.evaluate(() => document.getElementById('stack').scrollIntoView({ behavior: 'instant' }));
    await waitOk(second.page, () => document.getElementById('sm-ghost').classList.contains('is-on'), 5000);
    await second.page.waitForTimeout(1700);
    await second.page.evaluate(() => document.getElementById('stack').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await second.page.waitForTimeout(300);
    const cut = await second.page.evaluate(() => ({ ghost: document.getElementById('sm-ghost').classList.contains('is-on'), selecting: document.querySelectorAll('.sm-tile.is-selecting').length,
      caps: [...document.querySelectorAll('.sm-cap')].map((c) => c.textContent).join() }));
    check('demo: touching anything stops it and clears the selection', !cut.ghost && cut.selecting === 0 && cut.caps === 'HIGGSFIELD', JSON.stringify(cut));
    await second.ctx.close();
  }

  /* ---------- Tour: starts by itself on every arrival ---------- */
  {
    const waitOk = (page, fn, ms) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true, () => false);
    const { ctx, page, errors } = await open(browser);
    const hasRoom = await page.evaluate(() => !!window.THREE && !!document.querySelector('#vr-webgl canvas'));
    if (hasRoom) {
      await page.evaluate(() => document.getElementById('work').scrollIntoView({ behavior: 'instant' }));
      check('tour: starts by itself when the room comes into view', await waitOk(page, () => document.getElementById('vr-ghost').classList.contains('is-on'), 6000));
      await page.evaluate(() => window.scrollTo(0, 0));
      check('tour: stops when you leave the room', await waitOk(page, () => !document.getElementById('vr-ghost').classList.contains('is-on'), 3000));
      await page.evaluate(() => document.getElementById('work').scrollIntoView({ behavior: 'instant' }));
      check('tour: starts again on the next arrival', await waitOk(page, () => document.getElementById('vr-ghost').classList.contains('is-on'), 6000));
    }
    check('no console errors (tour autostart)', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  /* ---------- Reduced motion ---------- */
  {
    const { ctx, page, errors } = await open(browser, { reducedMotion: 'reduce' });
    const t = await page.$$eval('.ph-kpi-value', (els) => els.map((e) => e.textContent).join('|'));
    check('reduced motion: KPIs show final values at once', t === '−54%|$471K|~75%', t);
    const tr = await page.evaluate(() => getComputedStyle(document.querySelector('.ph-monitor')).transitionDuration);
    check('reduced motion: monitor transitions off', /^0s/.test(tr), tr);
    await page.evaluate(() => document.getElementById('stack').scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(2800);
    check('reduced motion: no automatic cursor demo', await page.evaluate(() => !document.getElementById('sm-ghost').classList.contains('is-on') && document.querySelectorAll('.sm-cap').length === 1));
    check('no console errors (reduced motion)', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  /* ---------- Cache: asset links carry a current version tag ---------- */
  {
    const fs = require('fs');
    const path = require('path');
    const root = path.resolve(__dirname, '..');
    const { stamp } = require(path.join(root, 'tools', 'stamp-versions.js'));
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const stamped = stamp(html, (p) => fs.readFileSync(path.join(root, p)));
    check('asset links carry current version tags (fix: node tools/stamp-versions.js)', stamped === html);
  }

  await browser.close();
  console.log(failures ? '\n' + failures + ' check(s) failed' : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
