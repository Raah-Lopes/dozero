import puppeteer from 'puppeteer';

(async () => {
  console.log("Iniciando teste de movimentação, zoom e navegação do menu...");
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on('pageerror', err => errors.push(err.toString()));

  try {
    await page.goto('http://localhost:5174/?room=qa-motion-test', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // 1. Verificar menu lateral (GMToolbar ou MainToolbar) com Cérebro Grafo abaixo da Wiki
    console.log("Verificando botão no menu...");
    const hasBrainBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
      return buttons.some(b => b.innerText.includes('Cérebro') || b.getAttribute('title')?.includes('Cérebro') || b.getAttribute('aria-label')?.includes('Cérebro'));
    });
    console.log("Botão Cérebro Grafo presente no menu:", hasBrainBtn);

    // 2. Abrir o Cérebro Grafo
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-wiki-graph'));
    });
    await new Promise(r => setTimeout(r, 2000));

    // 3. Testar movimentação de nó (Drag and Drop)
    console.log("Testando arrasto de nó...");
    const nodeHandle = await page.$('.react-flow__node');
    if (nodeHandle) {
      const box = await nodeHandle.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2 + 100, { steps: 5 });
        await page.mouse.up();
        console.log("Nó arrastado com sucesso!");
      }
    }
    await new Promise(r => setTimeout(r, 800));

    // 4. Testar Zoom In via scroll do mouse
    console.log("Testando zoom via scroll...");
    await page.mouse.move(700, 450);
    await page.mouse.wheel({ deltaY: -300 });
    await new Promise(r => setTimeout(r, 600));

    // 5. Testar botão de Enquadrar (Fit View) nos controles
    console.log("Testando botão de Fit View...");
    await page.evaluate(() => {
      const btn = document.querySelector('.react-flow__controls-fitview');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    await page.screenshot({ path: 'd:/DOZERO/test-motion-final.png' });
    console.log("Screenshot salva em d:/DOZERO/test-motion-final.png");
    console.log("Erros encontrados:", errors);

  } catch (err) {
    console.error("Erro no teste de movimentação:", err);
  } finally {
    await browser.close();
  }
})();
