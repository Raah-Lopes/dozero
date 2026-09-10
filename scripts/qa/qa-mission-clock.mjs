import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.log(error.message); });
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = request.url();
    if (url.startsWith('http') && !url.startsWith('http://127.0.0.1:5174')) request.abort();
    else request.continue();
  });
  await page.goto(`http://127.0.0.1:5174/?room=qa-mission-${Date.now()}`, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.evaluate(async () => {
    const { default: React } = await import(performance.getEntriesByType('resource').find(r => /\/react\.js\?/.test(r.name)).name);
    const { default: { createRoot } } = await import(performance.getEntriesByType('resource').find(r => /\/react-dom_client\.js\?/.test(r.name)).name);
    const { ClockConfigModal } = await import('/src/components/Modals/ClockConfigModal.tsx');
    const { TensionClockManager } = await import('/src/components/HUD/TensionClockManager.tsx');
    const { useUserStore } = await import('/src/store/user.ts');
    const { state } = await import('/src/services/yjs.ts');
    useUserStore.getState().setIsGM(true);
    state.clocks.clear();
    const fixture = document.createElement('div');
    document.body.append(fixture);
    function Harness() {
      const [open, setOpen] = React.useState(true);
      return React.createElement(React.Fragment, null,
        open && React.createElement(ClockConfigModal, { onClose: () => setOpen(false), onConfirm: () => {} }),
        React.createElement(TensionClockManager, { onEditClock: () => {} }));
    }
    createRoot(fixture).render(React.createElement(Harness));
  });
  await page.waitForSelector('select');
  await page.select('select', 'mission');
  const clickText = async text => {
    const handle = await page.waitForSelector(`::-p-text(${text})`);
    await handle.click();
  };
  await clickText('Usar exemplo: salvar a rainha');
  assert.equal(await page.$$eval('.mission-editor fieldset', els => els.length), 5);
  await page.screenshot({ path: join(tmpdir(), 'dozero-mission-editor-qa.png') });
  await clickText('Criar missão pausada');
  await page.waitForSelector('section[aria-label="Missão: A queda da coroa"]');
  if (!(await page.evaluate(() => document.body.dataset.missionCaptured))) {
    const panel = await page.waitForSelector('.mission-dashboard');
    await panel.screenshot({ path: join(tmpdir(), 'dozero-mission-desktop-qa.png') });
    await page.evaluate(() => { document.body.dataset.missionCaptured = 'true'; });
  }
  await clickText('Iniciar / retomar etapa');
  await page.waitForFunction(() => document.querySelector('.mission-clock')?.textContent.includes('Tempo correndo'));
  await clickText('Pausar');
  await clickText('Objetivo cumprido');
  await page.waitForFunction(() => document.body.innerText.includes('Etapa 2 de 5'));
  for (let i = 0; i < 5; i++) await clickText('Avançar 1 min');
  await page.waitForFunction(() => document.body.innerText.includes('Etapa 3 de 5'));
  for (let i = 0; i < 5; i++) await clickText('Avançar 1 min');
  await page.waitForFunction(() => document.body.innerText.includes('Aconteceu: A rainha morre envenenada.'));
  await page.select('.mission-clock select', 'journey');
  assert.equal(await page.$eval('progress', el => el.value), 60);
  await page.evaluate(async () => {
    const { state } = await import('/src/services/yjs.ts');
    const clock = [...state.clocks.values()][0];
    state.clocks.set(clock.id, { ...clock, pausedRemainingMs: 500 });
  });
  if (!(await page.evaluate(() => document.body.dataset.missionCaptured))) {
    const panel = await page.waitForSelector('.mission-dashboard');
    await panel.screenshot({ path: join(tmpdir(), 'dozero-mission-desktop-qa.png') });
    await page.evaluate(() => { document.body.dataset.missionCaptured = 'true'; });
  }
  await clickText('Iniciar / retomar etapa');
  await page.waitForFunction(() => document.body.innerText.includes('Etapa 5 de 5'));
  await page.setViewport({ width: 390, height: 844 });
  await page.keyboard.press('Tab');
  const bounds = await page.$eval('.mission-clock', el => { const r = el.getBoundingClientRect(); return { x: r.x, right: r.right }; });
  assert(bounds.x >= 0 && bounds.right <= 391, JSON.stringify(bounds));
  await page.evaluate(async () => {
    const { useUserStore } = await import('/src/store/user.ts');
    useUserStore.getState().setIsGM(false);
  });
  await page.waitForFunction(() => !document.body.innerText.includes('Iniciar / retomar etapa'));
  assert.equal(await page.$$eval('.mission-actions button', els => els.length), 0);
  await page.screenshot({ path: join(tmpdir(), 'dozero-mission-qa.png') });
  const saved = await page.evaluate(async () => {
    const { state } = await import('/src/services/yjs.ts');
    return JSON.stringify([...state.clocks.values()]);
  });
  await page.reload({ waitUntil: 'networkidle2' });
  const restored = await page.evaluate(async () => {
    const { state, indexeddbProvider } = await import('/src/services/yjs.ts');
    await indexeddbProvider.whenSynced;
    return JSON.stringify([...state.clocks.values()]);
  });
  assert.equal(restored, saved);
  console.log(JSON.stringify({ result: 'passed', flow: 'create example, start, pause, complete, expire queen stage, journey 60%, automatic deadline, mobile bounds, player read-only, IndexedDB reload', pageErrors: errors }));
  assert.deepEqual(errors, []);
} finally { await browser.close(); }






