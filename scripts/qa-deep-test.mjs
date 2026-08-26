import puppeteer from 'puppeteer';

(async () => {
  console.log("Iniciando bateria de testes funcionais e visuais no Arcanum Grafo...");
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on('pageerror', err => errors.push(err.toString()));

  try {
    await page.goto('http://localhost:5174/?room=qa-deep-graph', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // 1. Abrir Cérebro
    console.log("Abrindo Cérebro...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('open-wiki-graph'));
    });
    await new Promise(r => setTimeout(r, 2000));

    // 2. Clicar em Constelações
    console.log("Testando botão Constelações...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Constelações'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'd:/DOZERO/test-1-constelacoes.png' });

    // 3. Clicar em um nó para abrir o Inspector
    console.log("Testando clique em nó (Inspector)...");
    await page.evaluate(() => {
      const node = document.querySelector('.react-flow__node');
      if (node) {
        node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: 'd:/DOZERO/test-2-inspector.png' });

    // 4. Testar Duplo Clique em um nó para abrir a Ficha Completa RPG
    console.log("Testando duplo clique em nó (Ficha RPG)...");
    await page.evaluate(() => {
      const node = document.querySelector('.react-flow__node');
      if (node) {
        node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'd:/DOZERO/test-3-ficha-modal.png' });

    // Fechar Ficha Modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.fixed button[title="Fechar"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // 5. Testar Modal de Criação de Nó
    console.log("Testando botão Novo Nó...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText.includes('Novo Nó'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: 'd:/DOZERO/test-4-novo-no.png' });

    // 6. Testar Radiografia
    console.log("Testando botão Radiografia...");
    await page.evaluate(() => {
      const btn = document.querySelector('button[title*="Radiografia"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: 'd:/DOZERO/test-5-radiografia.png' });

    console.log("Bateria de testes concluída com sucesso! Erros encontrados:", errors);

  } catch (err) {
    console.error("Erro durante os testes:", err);
  } finally {
    await browser.close();
  }
})();
