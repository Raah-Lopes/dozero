import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  console.log("[Audit] Iniciando navegador Chrome...");
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  let fileCount = 1;
  page.on('dialog', async dialog => {
    const msg = dialog.message();
    console.log("[Audit] Dialog interceptado: " + msg);
    if (msg.includes("Nome do novo pergaminho")) {
      await dialog.accept(`Auditoria_${fileCount}`);
      fileCount++;
    } else {
      await dialog.accept();
    }
  });

  await page.setViewport({ width: 1280, height: 800 });
  
  console.log("[Audit] Acessando a aplicação...");
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
  
  console.log("[Audit] Esperando carregamento da Sidebar...");
  await page.waitForSelector('.wiki-sidebar', { timeout: 10000 });

  // 1. Criar primeiro arquivo
  console.log("[Audit] Criando Auditoria_1...");
  const buttons = await page.$$('.btn-icon');
  let createBtn = null;
  for (let btn of buttons) {
    const title = await page.evaluate(el => el.getAttribute('title'), btn);
    if (title === 'Novo Pergaminho') {
      createBtn = btn;
      break;
    }
  }
  
  if (createBtn) {
    await createBtn.click();
    await new Promise(r => setTimeout(r, 1000)); // Esperar criar
  } else {
    console.log("[Audit] Botão Novo Pergaminho não encontrado! Falha visual.");
    await browser.close();
    process.exit(1);
  }

  // 2. Digitar no MDXEditor
  console.log("[Audit] Inserindo link [[Auditoria_2]] no editor...");
  await page.waitForSelector('[contenteditable="true"]', { timeout: 5000 });
  await page.click('[contenteditable="true"]');
  await page.keyboard.type('Este é um teste de auditoria exaustivo. Link para o [[Auditoria_2]] gerado!');
  
  // 3. Salvar
  console.log("[Audit] Salvando Auditoria_1...");
  const saveBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Salvar Local'));
  });
  if (saveBtn) {
    await saveBtn.click();
    await new Promise(r => setTimeout(r, 1500)); // wait for save
  }

  // 4. Criar segundo arquivo
  console.log("[Audit] Criando Auditoria_2...");
  if (createBtn) await createBtn.click();
  await new Promise(r => setTimeout(r, 1000));

  // 5. Abrir o Cérebro
  console.log("[Audit] Abrindo o Cérebro (Graph View)...");
  const graphBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Abrir Cérebro'));
  });
  if (graphBtn) {
    await graphBtn.click();
    await new Promise(r => setTimeout(r, 4000)); // Esperar física do grafo estabilizar
  }

  // 6. Verificar API
  console.log("[Audit] Verificando integridade dos dados no Backend (/api/wiki/graph)...");
  const apiRes = await page.evaluate(async () => {
    const r = await fetch('/api/wiki/graph?repoPath=d:/DOZERO');
    return await r.json();
  });
  
  const linkFound = apiRes.links.find(l => l.source === 'Auditoria_1.md' && l.target === 'Auditoria_2');
  if (linkFound) {
    console.log("[Audit] SUCESSO! Link localizado no backend: ", linkFound);
  } else {
    console.log("[Audit] FALHA! O link não foi registrado. Links encontrados:", apiRes.links);
  }

  // 7. Tirar screenshot
  console.log("[Audit] Capturando tela do Grafo em 'audit_screenshot.png'...");
  await page.screenshot({ path: 'audit_screenshot.png' });

  await browser.close();
  console.log("[Audit] Auditoria concluída.");
})();
