#!/usr/bin/env node
/**
 * Browser check for one or more chapters, run against the built site straight from disk.
 *
 *   node tools/check_chapter.js simple-harmonic-motion waves-and-sound [--shots DIR] [--light] [--width 390]
 *
 * For every lesson of each chapter it:
 *   · opens the lesson and fails on any page error, console error or KaTeX error;
 *   · checks that every interactive lab mounted and actually drew something on its canvas;
 *   · answers every question with the key stored in the lesson (options clicked, numbers typed) and
 *     checks the app marks it correct, then resets it;
 *   · with --shots, saves a screenshot of every lab and every figure for a visual review.
 * Needs Playwright (preinstalled here; otherwise `npm i -D playwright`). Exit code 1 on any failure.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); if (i < 0) return dflt; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const shots = opt('--shots', null), width = +opt('--width', 1280), light = flag('--light');
const ids = args;
if (!ids.length) { console.log('usage: node tools/check_chapter.js <chapter-id>… [--shots DIR] [--light] [--width N]'); process.exit(2); }
const site = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, colorScheme: light ? 'light' : 'dark' });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push('page error: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  await page.goto(site);
  if (shots) { fs.mkdirSync(shots, { recursive: true }); await page.addStyleTag({ content: '.topbar, .fx-canvas, .toast { visibility: hidden !important; }' }); }
  let total = 0, labs = 0;

  for (const id of ids) {
    const n = await page.evaluate((cid) => { const m = JSON.parse(document.getElementById('manifest').textContent); const c = m.chapters.find((x) => x.id === cid); return c ? c.lessons.length : 0; }, id);
    if (!n) { problems.push(id + ': not in the manifest'); continue; }
    for (let l = 1; l <= n; l++) {
      const where = id + ' lesson ' + l;
      await page.evaluate((h) => { location.hash = h; }, '#/c/' + id + '/' + l);
      const art = page.locator('.lesson[data-chapter="' + id + '"][data-lesson="' + l + '"]');
      await art.waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForTimeout(300);
      if (await art.locator('.katex-error').count()) problems.push(where + ': KaTeX error');

      // labs: scroll each into view, let it draw, and look for ink on the canvas
      const sims = art.locator('.sim');
      for (let i = 0; i < await sims.count(); i++) {
        const sim = sims.nth(i), name = await sim.getAttribute('data-sim');
        await sim.scrollIntoViewIfNeeded(); await page.waitForTimeout(700);
        const res = await sim.evaluate((el) => {
          const c = el.querySelector('canvas'); if (!c) return { ok: false, why: 'no canvas (' + el.querySelector('.sim__mount').textContent.trim() + ')' };
          const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let ink = 0;
          for (let k = 3; k < d.length; k += 16) if (d[k] > 0) ink++;
          return { ok: ink > 200, why: 'blank canvas', ink };
        });
        if (!res.ok) problems.push(where + ': lab ' + name + ' — ' + res.why);
        labs++;
        if (shots) await sim.screenshot({ path: path.join(shots, id + '-L' + l + '-lab' + (i + 1) + '-' + name + '.png') });
      }
      if (shots) {
        const figs = art.locator('figure.fig-wrap');
        for (let i = 0; i < await figs.count(); i++) { await figs.nth(i).scrollIntoViewIfNeeded(); await figs.nth(i).screenshot({ path: path.join(shots, id + '-L' + l + '-fig' + (i + 1) + '.png') }); }
      }

      // questions: answer each with its own key and expect the app to mark it correct
      const qs = art.locator('section.q');
      for (let i = 0; i < await qs.count(); i++) {
        const q = qs.nth(i), type = await q.getAttribute('data-type'), ans = await q.getAttribute('data-answer'), qid = await q.getAttribute('data-qid');
        total++;
        if (await q.evaluate((el) => el.classList.contains('is-locked'))) { await q.locator('.q__retry').click(); }
        if (type === 'single' || type === 'multi') {
          const keys = ans.split(','), nopt = await q.locator('.opt').count();
          if (keys.some((k) => k.charCodeAt(0) - 65 >= nopt)) { problems.push(qid + ': answer ' + ans + ' but only ' + nopt + ' options'); continue; }
          for (const k of keys) await q.locator('.opt[data-key="' + k + '"]').click();
          await q.locator('.q__check').click();
        } else if (type === 'integer' || type === 'numeric') {
          await q.locator('.q__num input').fill(ans); await q.locator('.q__check').click();
        } else { await q.locator('.q__reveal').click(); await q.locator('.q__selfbtn[data-s="c"]').click(); }
        const ok = await q.evaluate((el) => el.classList.contains('is-correct'));
        if (!ok) problems.push(qid + ': the app did not accept its own answer ' + ans);
        if (!(await q.locator('.q__solution').isVisible())) problems.push(qid + ': solution not shown after answering');
        await q.locator('.q__retry').click();
      }
      console.log('✓ ' + where + ': ' + (await qs.count()) + ' questions, ' + (await sims.count()) + ' labs');
    }
  }
  await page.evaluate(() => localStorage.clear());
  await browser.close();
  console.log('\n' + total + ' questions and ' + labs + ' labs checked.');
  if (problems.length) { console.log('\n' + problems.length + ' problem(s):\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log('No problems found.');
})();
