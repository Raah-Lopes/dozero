const fs = require('fs');
let code = fs.readFileSync('src/components/Widgets/PlayerTools/TradeShopWidget.tsx', 'utf-8');

// 1. Add forceUpdate state
code = code.replace(
  "const merchantNpc = personagens.find(p => p.caminhoArquivo === selectedNpcMerchantPath);",
  "const merchantNpc = personagens.find(p => p.caminhoArquivo === selectedNpcMerchantPath);\n  const [, forceUpdate] = useState(0);"
);

// 2. handleDoar Optimistic Update
code = code.replace(
  "await salvarFichaFisica(sender.caminhoArquivo, updatedSender);",
  "if(sender) { sender.ouro = updatedSender.ouro; sender.riquezas = updatedSender.riquezas; sender.inventario = updatedSender.inventario; }\n    if(receiver) { receiver.ouro = updatedReceiver.ouro; receiver.riquezas = updatedReceiver.riquezas; receiver.inventario = updatedReceiver.inventario; }\n    forceUpdate(p => p+1);\n    await salvarFichaFisica(sender.caminhoArquivo, updatedSender);"
);

// 3. Update both ouro and po for handleDoar
code = code.replace(
  "state.tokens.set(id, { ...token, ouro: updatedSender.ouro });",
  "state.tokens.set(id, { ...token, ouro: updatedSender.ouro, po: updatedSender.ouro });"
);
code = code.replace(
  "state.tokens.set(id, { ...token, ouro: updatedReceiver.ouro });",
  "state.tokens.set(id, { ...token, ouro: updatedReceiver.ouro, po: updatedReceiver.ouro });"
);

// 4. handleAceitarTroca
code = code.replace(
  "await salvarFichaFisica(trade.senderPath, {",
  "if(pSender) { pSender.ouro = sOuroFinal; pSender.inventario = senderInv; }\n    if(pReceiver) { pReceiver.ouro = rOuroFinal; pReceiver.inventario = receiverInv; }\n    forceUpdate(p => p+1);\n    await salvarFichaFisica(trade.senderPath, {"
);
code = code.replace(
  "state.tokens.set(id, { ...token, ouro: sOuroFinal });",
  "state.tokens.set(id, { ...token, ouro: sOuroFinal, po: sOuroFinal });"
);
code = code.replace(
  "state.tokens.set(id, { ...token, ouro: rOuroFinal });",
  "state.tokens.set(id, { ...token, ouro: rOuroFinal, po: rOuroFinal });"
);

// 5. handleComprarDoNpc
code = code.replace(
  "await salvarFichaFisica(sender.caminhoArquivo, updatedComprador);",
  "if(sender) { sender.ouro = updatedComprador.ouro; sender.inventario = updatedComprador.inventario; }\n    if(merchantNpc) { merchantNpc.ouro = updatedMercador.ouro; merchantNpc.loja = updatedMercador.loja; }\n    forceUpdate(p => p+1);\n    await salvarFichaFisica(sender.caminhoArquivo, updatedComprador);"
);
code = code.replace(
  "state.tokens.set(id, { ...token, ouro: updatedComprador.ouro });",
  "state.tokens.set(id, { ...token, ouro: updatedComprador.ouro, po: updatedComprador.ouro });"
);
code = code.replace(
  "state.tokens.set(id, { ...token, ouro: updatedMercador.ouro });",
  "state.tokens.set(id, { ...token, ouro: updatedMercador.ouro, po: updatedMercador.ouro });"
);

// 6. handleVenderParaNpc
code = code.replace(
  "await salvarFichaFisica(sender.caminhoArquivo, updatedComprador);",
  "if(sender) { sender.ouro = updatedComprador.ouro; sender.inventario = updatedComprador.inventario; }\n    if(merchantNpc) { merchantNpc.ouro = npco; merchantNpc.loja = { itens: updatedItensLoja }; }\n    forceUpdate(p => p+1);\n    await salvarFichaFisica(sender.caminhoArquivo, updatedComprador);"
);

// 7. handlePagarRapido
code = code.replace(
  "await salvarFichaFisica(sender.caminhoArquivo, { ouro: updatedOuro });",
  "if(sender) { sender.ouro = updatedOuro; } forceUpdate(p => p+1); await salvarFichaFisica(sender.caminhoArquivo, { ouro: updatedOuro });"
);

fs.writeFileSync('src/components/Widgets/PlayerTools/TradeShopWidget.tsx', code);
