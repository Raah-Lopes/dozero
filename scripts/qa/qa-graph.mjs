import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  console.log("Iniciando Puppeteer para testar tela do Cérebro...");
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => consoleLogs.push({ type: 'error', text: err.toString() }));

  try {
    console.log("Navegando para http://localhost:5174/?room=qa-test-graph");
    await page.goto('http://localhost:5174/?room=qa-test-graph', { waitUntil: 'networkidle2', timeout: 30000 });

    // Espera carregar e clica para abrir o Cérebro
    await new Promise(r => setTimeout(r, 2000));

    console.log("Abrindo o Cérebro via evento open-wiki-graph...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-wiki-graph'));
    });

    await new Promise(r => setTimeout(r, 2500));

    // Verifica se os nós do Arcanum foram renderizados
    const nodeCount = await page.evaluate(() => {
      return document.querySelectorAll('.react-flow__node').length;
    });
    console.log("Nós renderizados no canvas:", nodeCount);

    const hasArcanumSky = await page.evaluate(() => {
      return !!document.querySelector('.arcanum-sky');
    });
    console.log("Classe arcanum-sky presente:", hasArcanumSky);

    const topBarTitle = await page.evaluate(() => {
      const el = document.querySelector('header');
      return el ? el.innerText : 'null';
    });
    console.log("Conteúdo do Header:", topBarTitle.replace(/\n/g, ' '));

    const screenshotPath = 'd:/DOZERO/graph-screenshot.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log("Screenshot salva em:", screenshotPath);

    console.log("Logs de erro no console:", consoleLogs.filter(l => l.type === 'error'));

  } catch (err) {
    console.error("Erro no teste:", err);
  } finally {
    await browser.close();
  }
})();
