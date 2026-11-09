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

    /* Stack matrix */
    await page.evaluate(() => document.getElementById('stack').scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(300);
    const counts = await page.evaluate(() => ({ tiles: document.querySelectorAll('.sm-tile').length, caps: document.querySelectorAll('.sm-cap').length }));
    check('15x7 grid with 10 capsules', counts.tiles === 105 && counts.caps === 10, JSON.stringify(counts));

    const aligned = await page.evaluate(() => {
      const tiles = document.querySelectorAll('.sm-tile');
      const cap = document.querySelector('.sm-cap');
      const a = tiles[0].getBoundingClientRect(), z = tiles[9].getBoundingClientRect(), c = cap.getBoundingClientRect();
      return Math.abs(c.left - a.left) < 4 && Math.abs(c.right - z.right) < 4 && Math.abs(c.top - a.top) < 4;
    });
    check('capsule wraps HIGGSFIELD tiles', aligned);

    const cap = await page.$('.sm-cap[data-pillar="paid"]');
    const box = await cap.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(250);
    const card = await page.evaluate(() => {
      const c = document.getElementById('sm-card'); const r = c.getBoundingClientRect();
      return { hidden: c.hidden, inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, name: document.getElementById('sm-card-name').textContent };
    });
    check('hover shows a proof card inside the viewport', !card.hidden && card.inView && card.name === 'META', JSON.stringify(card));
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    check('click pins the card', await page.evaluate(() => document.getElementById('sm-card').classList.contains('is-pinned')));
    await page.keyboard.press('Escape');
    check('Escape unpins the card', await page.evaluate(() => document.getElementById('sm-card').hidden));

    await page.click('.sm-pill[data-filter="data"]');
    const dim = await page.evaluate(() => ({ dimmed: document.querySelectorAll('.sm-cap.is-dimmed').length, lit: document.querySelectorAll('.sm-cap:not(.is-dimmed)').length }));
    check('Data filter leaves only GA4 lit', dim.lit === 1 && dim.dimmed === 9, JSON.stringify(dim));
    await page.click('.sm-pill[data-filter="all"]');

    // ROAS by dragging R -> S
    const egg = await page.$$eval('.sm-tile.is-egg', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }));
    await page.mouse.move(egg[0][0], egg[0][1]);
    await page.mouse.down();
    for (const p of egg.slice(1)) await page.mouse.move(p[0], p[1], { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const roas = await page.evaluate(() => !!document.querySelector('.sm-cap[data-pillar="egg"]'));
    check('dragging R-O-A-S unlocks the gold capsule', roas);

    /* Showroom */
    await page.evaluate(() => document.getElementById('work').scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(600);
    const hasThree = await page.evaluate(() => !!window.THREE);
    if (hasThree) {
      const vr = await page.evaluate(() => ({ canvas: !!document.querySelector('#vr-webgl canvas'), pills: document.querySelectorAll('.vr-pill').length,
        cards3d: document.querySelectorAll('#vr-css .vr-card').length }));
      check('showroom renders WebGL + 5 CSS3D cards', vr.canvas && vr.pills === 5 && vr.cards3d === 5, JSON.stringify(vr));
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
      return { overflow: document.documentElement.scrollWidth - innerWidth, kpis: r('.ph-kpis').bottom, mon: r('.ph-monitor--hook').top, portrait: r('.ph-portrait').top, monEnd: r('.ph-monitor--pipe').bottom };
    });
    check(vp.width + 'px: no sideways scroll', m.overflow <= 0, String(m.overflow));
    check(vp.width + 'px: monitors sit below the KPIs, above the portrait', m.mon > m.kpis && m.portrait > m.monEnd, JSON.stringify(m));
    check(vp.width + 'px: no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  /* ---------- Reduced motion ---------- */
  {
    const { ctx, page, errors } = await open(browser, { reducedMotion: 'reduce' });
    const t = await page.$$eval('.ph-kpi-value', (els) => els.map((e) => e.textContent).join('|'));
    check('reduced motion: KPIs show final values at once', t === '−54%|$471K|~75%', t);
    const tr = await page.evaluate(() => getComputedStyle(document.querySelector('.ph-monitor')).transitionDuration);
    check('reduced motion: monitor transitions off', /^0s/.test(tr), tr);
    check('no console errors (reduced motion)', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  await browser.close();
  console.log(failures ? '\n' + failures + ' check(s) failed' : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})();
