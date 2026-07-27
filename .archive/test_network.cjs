const puppeteer = require('puppeteer');

(async () => {
  console.log('Iniciando Teste de Rede Automatizado (Localhost/Yjs BroadcastChannel)...');
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  try {
    // USE THE SAME CONTEXT SO BROADCAST CHANNEL WORKS
    const context = await browser.createBrowserContext();
    
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    console.log('Navegando para o DOZERO em ambas as abas (http://localhost:5174)...');
    await Promise.all([
      page1.goto('http://localhost:5174', { waitUntil: 'networkidle2', timeout: 30000 }),
      page2.goto('http://localhost:5174', { waitUntil: 'networkidle2', timeout: 30000 })
    ]);
    
    console.log('DOZERO carregado nas duas abas. Tentando abrir o Chat...');
    
    const openChat = async (page) => {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const chatBtn = buttons.find(b => b.title && b.title.toLowerCase().includes('chat'));
        if (chatBtn) chatBtn.click();
      });
      await page.waitForFunction(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.some(i => i.placeholder && i.placeholder.includes('Mensagem'));
      }, { timeout: 5000 }).catch(() => {});
    };
    
    await openChat(page1);
    await openChat(page2);

    console.log('Enviando mensagem da Aba 1 para a Aba 2 via Yjs BroadcastChannel...');
    
    const testMessage = `[NETWORK_TEST_${Date.now()}] Sincronização Local!`;
    
    await page1.evaluate((msg) => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const chatInput = inputs.find(i => i.placeholder && i.placeholder.includes('Mensagem'));
                      
      if (!chatInput) throw new Error("Chat input não encontrado.");
      
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      nativeInputValueSetter.call(chatInput, msg);
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      chatInput.dispatchEvent(new Event('change', { bubbles: true }));
      chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    }, testMessage);
    
    console.log('Mensagem enviada! Aguardando a Aba 2 receber a mensagem...');
    
    await page2.waitForFunction((msg) => {
      return document.body.innerText.includes(msg);
    }, { timeout: 10000 }, testMessage);
    
    console.log('=====================================================');
    console.log('✅ SUCESSO! A Aba 2 recebeu a mensagem da Aba 1 em tempo real.');
    console.log('A sincronização de rede Yjs (BroadcastChannel) está funcionando!');
    console.log('=====================================================');

  } catch (error) {
    console.error('❌ FALHA NO TESTE DE REDE:');
    console.error(error.message);
  } finally {
    await browser.close();
  }
})();
