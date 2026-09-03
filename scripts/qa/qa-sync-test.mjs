import puppeteer from 'puppeteer';

(async () => {
  console.log("Iniciando teste de visibilidade do badge de sincronia...");
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    await page.goto('http://localhost:5174/?room=qa-sync-badge-test', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // 1. Na mesa (canvas), o badge existe
    const badgeOnCanvas = await page.evaluate(() => {
      const el = document.querySelector('.sync-badge, button:has(svg)');
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.innerText.includes('Sincronizado') || b.innerText.includes('Offline'));
    });
    console.log("Badge visível no canvas:", badgeOnCanvas);

    // 2. No Grafo (brain), o badge DEVE estar oculto
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-wiki-graph'));
    });
    await new Promise(r => setTimeout(r, 1500));

    const badgeOnBrain = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.innerText.includes('Sincronizado') || b.innerText.includes('Offline'));
    });
    console.log("Badge presente no Grafo (deve ser false):", badgeOnBrain);

    await page.screenshot({ path: 'd:/DOZERO/test-sync-badge.png' });
    console.log("Screenshot salva em d:/DOZERO/test-sync-badge.png");

  } catch (err) {
    console.error("Erro no teste:", err);
  } finally {
    await browser.close();
  }
})();
