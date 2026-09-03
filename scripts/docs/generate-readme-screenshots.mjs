import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '../docs/screenshots');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function main() {
  let server = null;
  let baseUrl = 'http://localhost:5174';

  let alreadyRunning = false;
  try {
    const res = await fetch('http://localhost:5174/', { method: 'HEAD' });
    if (res.ok || res.status === 200 || res.status === 304) {
      alreadyRunning = true;
      console.log('⚡ Servidor Vite já rodando em http://localhost:5174');
    }
  } catch (e) {
    alreadyRunning = false;
  }

  if (!alreadyRunning) {
    console.log('🚀 Iniciando novo servidor Vite...');
    server = await createServer({
      server: { port: 5175, strictPort: false },
      logLevel: 'error',
    });
    await server.listen();
    const address = server.httpServer?.address();
    const port = address && typeof address === 'object' ? address.port : 5175;
    baseUrl = `http://localhost:${port}`;
  }

  console.log(`📡 Conectando ao app em ${baseUrl}`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1.5 });

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // 1. Landing / Lobby
  console.log('📸 1. Capturando Landing Lobby...');
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.body.style.overflow = 'auto';
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(outputDir, '01_landing_lobby.png'), type: 'png' });
  console.log('✅ 01_landing_lobby.png salvo!');

  // 2. Mesa Tática PixiJS (Canvas) com Tokens, HUD, Grid e Combat Tracker
  console.log('📸 2. Capturando Mesa Tática (Canvas)...');
  await page.goto(`${baseUrl}/?room=dozero-mesa-principal-v2&view=canvas`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('dozero_theme', 'arcanum');
    localStorage.setItem('aiBotEnabled', 'true');
    localStorage.setItem('dozero_openWindows', JSON.stringify({ combatLog: true, combatTracker: true }));
  });
  await sleep(4500);
  await page.screenshot({ path: path.join(outputDir, '02_tactical_canvas.png'), type: 'png' });
  console.log('✅ 02_tactical_canvas.png salvo!');

  // 3. Códice Arcanum (Wiki & Worldbuilding)
  console.log('📸 3. Capturando Códice Arcanum (Wiki)...');
  await page.goto(`${baseUrl}/?room=dozero-mesa-principal-v2&view=wiki`, { waitUntil: 'domcontentloaded' });
  await sleep(4000);
  await page.screenshot({ path: path.join(outputDir, '03_codex_wiki.png'), type: 'png' });
  console.log('✅ 03_codex_wiki.png salvo!');

  // 4. Teatro da Mente
  console.log('📸 4. Capturando Teatro da Mente...');
  await page.goto(`${baseUrl}/?room=dozero-mesa-principal-v2&view=theater`, { waitUntil: 'domcontentloaded' });
  await sleep(4500);
  await page.screenshot({ path: path.join(outputDir, '04_theater_mind.png'), type: 'png' });
  console.log('✅ 04_theater_mind.png salvo!');

  // 5. Cérebro-Grafo RPG (Living Brain)
  console.log('📸 5. Capturando Cérebro-Grafo RPG...');
  await page.goto(`${baseUrl}/?room=dozero-mesa-principal-v2&view=brain`, { waitUntil: 'domcontentloaded' });
  await sleep(5000);
  await page.screenshot({ path: path.join(outputDir, '05_living_brain_graph.png'), type: 'png' });
  console.log('✅ 05_living_brain_graph.png salvo!');

  // 6. Forja de Fichas Arcanum
  console.log('📸 6. Capturando Forja de Fichas Arcanum...');
  await page.goto(`${baseUrl}/?room=dozero-mesa-principal-v2&view=sheets`, { waitUntil: 'domcontentloaded' });
  await sleep(4500);
  await page.screenshot({ path: path.join(outputDir, '06_arcanum_sheets.png'), type: 'png' });
  console.log('✅ 06_arcanum_sheets.png salvo!');

  // 7. Zye AI Assistant aberto
  console.log('📸 7. Capturando Zye AI Assistant...');
  await page.goto(`${baseUrl}/?room=dozero-mesa-principal-v2&view=canvas`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('aiBotEnabled', 'true');
  });
  await sleep(2500);
  await page.evaluate(() => {
    const botBtn = document.querySelector('button[title*="Zye"]');
    if (botBtn && typeof botBtn.click === 'function') botBtn.click();
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(outputDir, '07_zye_assistant.png'), type: 'png' });
  console.log('✅ 07_zye_assistant.png salvo!');

  await browser.close();
  if (server) await server.close();
  console.log('🎉 Todas as screenshots foram capturadas e salvas com sucesso em docs/screenshots/!');
}

main().catch(err => {
  console.error('❌ Erro durante a geração:', err);
  process.exit(1);
});
