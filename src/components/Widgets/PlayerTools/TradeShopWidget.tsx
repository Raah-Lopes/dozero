import React, { useState, useEffect } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { usePersonagens, FichaPersonagem } from '../../../hooks/usePersonagens';
import { state, pushChatMessage } from '../../../store';
import { saveMarkdownContent, loadMarkdownFile } from '../../../utils/githubApi';
import * as yaml from 'js-yaml';
import { toast } from '../../UI/Toast';
import { 
  Coins, ArrowLeftRight, Store, Gift, Send, 
  Trash2, ShoppingBag, DollarSign
} from 'lucide-react';

interface TradeShopWidgetProps {
  onClose: () => void;
}

interface TradeProposal {
  id: string;
  senderPath: string;
  receiverPath: string;
  senderGold: number;
  receiverGold: number;
  senderItems: any[];
  receiverItems: any[];
  senderAccepted: boolean;
  receiverAccepted: boolean;
  status: 'pending' | 'completed' | 'declined';
  timestamp: number;
}

export const TradeShopWidget: React.FC<TradeShopWidgetProps> = ({ onClose }) => {
  const { personagens, recarregar } = usePersonagens(false);
  const [activeTab, setActiveTab] = useState<'doar' | 'trocar' | 'loja' | 'pagar'>('doar');

  // Seletores de personagens
  const [senderPath, setSenderPath] = useState<string>('');
  const [receiverPath, setReceiverPath] = useState<string>('');

  // Estados de Doação
  const [donateGold, setDonateGold] = useState<number>(0);
  const [donateRiquezas, setDonateRiquezas] = useState<number>(0);
  const [selectedDonateItems, setSelectedDonateItems] = useState<string[]>([]); // nomes dos itens

  // Estados de Troca Ativa
  const [tradeOfferGold, setTradeOfferGold] = useState<number>(0);
  const [tradeDemandGold, setTradeDemandGold] = useState<number>(0);
  const [tradeOfferItems, setTradeOfferItems] = useState<string[]>([]);
  const [tradeDemandItems, setTradeDemandItems] = useState<string[]>([]);

  // Estados de Pagamento Rápido
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payReason, setPayReason] = useState<string>('');
  const [incomingTrades, setIncomingTrades] = useState<TradeProposal[]>([]);

  // Estados de Loja
  const [selectedNpcMerchantPath, setSelectedNpcMerchantPath] = useState<string>('');
  const [showShopConfig, setShowShopConfig] = useState(false);
  const [newShopItem, setNewShopItem] = useState({ nome: '', custo: 0, quantidade: 1, descricao: '' });

  // Carregar dados dos envolvidos
  const sender = personagens.find(p => p.caminhoArquivo === senderPath);
  const receiver = personagens.find(p => p.caminhoArquivo === receiverPath);
  const merchantNpc = personagens.find(p => p.caminhoArquivo === selectedNpcMerchantPath);
  const [, forceUpdate] = useState(0);

  // Autoset inicial
  useEffect(() => {
    if (personagens.length > 0) {
      if (!senderPath) {
        const player = personagens.find(p => p.status === 'jogador');
        if (player) setSenderPath(player.caminhoArquivo);
        else setSenderPath(personagens[0].caminhoArquivo);
      }
      if (!receiverPath && personagens.length > 1) {
        const firstOther = personagens.find(p => p.caminhoArquivo !== senderPath);
        if (firstOther) setReceiverPath(firstOther.caminhoArquivo);
      }
    }
  }, [personagens, senderPath, receiverPath]);

  // Sincronizar trocas do Yjs
  useEffect(() => {
    const handleTradesSync = () => {
      const allTrades: TradeProposal[] = [];
      state.trades.forEach((v: any) => {
        if (v && v.id) allTrades.push(v);
      });

      // Filtrar propostas destinadas a mim
      const incoming = allTrades.filter(t => t.receiverPath === senderPath && t.status === 'pending');
      setIncomingTrades(incoming);
    };

    state.trades.observe(handleTradesSync);
    handleTradesSync();
    return () => state.trades.unobserve(handleTradesSync);
  }, [senderPath]);

  // Auxiliares de salvamento no Markdown
  const salvarFichaFisica = async (caminho: string, updates: Partial<FichaPersonagem>) => {
    try {
      const originalMd = await loadMarkdownFile(caminho);
      if (!originalMd) return;
      
      const parts = originalMd.split('---');
      if (parts.length >= 3) {
        const frontmatterStr = parts[1];
        const data = yaml.load(frontmatterStr) as any || {};
        
        // Aplicar as atualizações nos campos corretos do YAML
        if (updates.ouro !== undefined) {
          if (data.tipo === 'Monstro') data.Ouro_recompensa = updates.ouro;
          else data.Ouro = updates.ouro;
        }
        if (updates.riquezas !== undefined) data.riquezas = updates.riquezas;
        if (updates.inventario !== undefined) data.inventario = updates.inventario;
        if (updates.loja !== undefined) data.loja = updates.loja;

        const newFront = '---\n' + yaml.dump(data, { indent: 2, lineWidth: -1 }) + '---\n';
        const body = parts.slice(2).join('---');
        await saveMarkdownContent(caminho, newFront + body);
      }
    } catch (e) {
      console.error("Erro ao salvar atualizações de comércio na wiki:", e);
    }
  };

  // DOAR RECURSOS
  const handleDoar = async () => {
    if (!sender || !receiver) return;
    if (donateGold < 0 || donateRiquezas < 0) return;

    if (sender.ouro < donateGold) {
      toast.warn('Você não tem moedas de ouro suficientes.');
      return;
    }
    if (sender.riquezas < donateRiquezas) {
      toast.warn('Você não tem riquezas suficientes.');
      return;
    }

    // Processar itens selecionados
    let senderInv = [...sender.inventario];
    let receiverInv = [...receiver.inventario];
    const donatedItemsList: string[] = [];

    for (const itemName of selectedDonateItems) {
      // Remover do doador (trata objeto ou string)
      const indexObj = senderInv.findIndex(i => (typeof i === 'string' ? i : i.nome) === itemName);
      if (indexObj !== -1) {
        const item = senderInv[indexObj];
        senderInv.splice(indexObj, 1);

        // Adicionar ao receptor
        receiverInv.push(item);
        donatedItemsList.push(itemName);
      }
    }

    // Atualizar valores doadores e receptores
    const updatedSender = {
      ouro: sender.ouro - donateGold,
      riquezas: sender.riquezas - donateRiquezas,
      inventario: senderInv
    };

    const updatedReceiver = {
      ouro: receiver.ouro + donateGold,
      riquezas: receiver.riquezas + donateRiquezas,
      inventario: receiverInv
    };

    if(sender) { sender.ouro = updatedSender.ouro; sender.riquezas = updatedSender.riquezas; sender.inventario = updatedSender.inventario; }
    if(receiver) { receiver.ouro = updatedReceiver.ouro; receiver.riquezas = updatedReceiver.riquezas; receiver.inventario = updatedReceiver.inventario; }
    forceUpdate(p => p+1);
    await salvarFichaFisica(sender.caminhoArquivo, updatedSender);
    await salvarFichaFisica(receiver.caminhoArquivo, updatedReceiver);
    
    // Sincronizar moedas com tokens do tabuleiro
    for (const [id, t] of Array.from(state.tokens.entries())) {
      const token = t as any;
      if (token.caminhoArquivo === sender.caminhoArquivo) {
        state.tokens.set(id, { ...token, ouro: updatedSender.ouro, po: updatedSender.ouro });
      }
      if (token.caminhoArquivo === receiver.caminhoArquivo) {
        state.tokens.set(id, { ...token, ouro: updatedReceiver.ouro, po: updatedReceiver.ouro });
      }
    }
    
    // Mapeamento e mensagem no chat
    let desc = `💰 **${sender.nome}** doou recursos para **${receiver.nome}**:<br/>`;
    if (donateGold > 0) desc += `• **${donateGold} moedas de ouro**<br/>`;
    if (donateRiquezas > 0) desc += `• **${donateRiquezas} Riqueza(s)**<br/>`;
    if (donatedItemsList.length > 0) desc += `• **Itens:** ${donatedItemsList.join(', ')}`;

    pushChatMessage(desc, false, false);
    
    // Resetar campos
    setDonateGold(0);
    setDonateRiquezas(0);
    setSelectedDonateItems([]);
    recarregar();
  };

  // PROPOR TROCA
  const handleProporTroca = () => {
    if (!sender || !receiver) return;
    if (tradeOfferGold < 0 || tradeDemandGold < 0) return;

    if (sender.ouro < tradeOfferGold) {
      toast.warn('Você não tem moedas de ouro suficientes para propor.');
      return;
    }

    const tradeId = `trade_${Date.now()}`;
    const newProposal: TradeProposal = {
      id: tradeId,
      senderPath: sender.caminhoArquivo,
      receiverPath: receiver.caminhoArquivo,
      senderGold: tradeOfferGold,
      receiverGold: tradeDemandGold,
      senderItems: tradeOfferItems,
      receiverItems: tradeDemandItems,
      senderAccepted: true,
      receiverAccepted: false,
      status: 'pending',
      timestamp: Date.now()
    };

    state.trades.set(tradeId, newProposal);
    pushChatMessage(`🔄 **${sender.nome}** propôs uma troca de itens com **${receiver.nome}**! Abra o Sistema Comercial para responder.`, false, false);
    
    // Resetar
    setTradeOfferGold(0);
    setTradeDemandGold(0);
    setTradeOfferItems([]);
    setTradeDemandItems([]);
  };

  // ACEITAR E EXECUTAR TROCA
  const handleAceitarTroca = async (trade: TradeProposal) => {
    const pSender = personagens.find(p => p.caminhoArquivo === trade.senderPath);
    const pReceiver = personagens.find(p => p.caminhoArquivo === trade.receiverPath);

    if (!pSender || !pReceiver) {
      toast.info('Personagens envolvidos não foram localizados na Wiki.');
      return;
    }

    // Verificar se ambos têm as quantias exigidas
    if (pSender.ouro < trade.senderGold || pReceiver.ouro < trade.receiverGold) {
      toast.warn('Um dos personagens não possui o ouro suficiente para concluir a troca.');
      return;
    }

    // Processar itens do Sender -> Receiver
    let senderInv = [...pSender.inventario];
    let receiverInv = [...pReceiver.inventario];

    for (const itemName of trade.senderItems) {
      const idx = senderInv.findIndex(i => (typeof i === 'string' ? i : i.nome) === itemName);
      if (idx !== -1) {
        const item = senderInv[idx];
        senderInv.splice(idx, 1);
        receiverInv.push(item);
      }
    }

    // Processar itens do Receiver -> Sender
    for (const itemName of trade.receiverItems) {
      const idx = receiverInv.findIndex(i => (typeof i === 'string' ? i : i.nome) === itemName);
      if (idx !== -1) {
        const item = receiverInv[idx];
        receiverInv.splice(idx, 1);
        senderInv.push(item);
      }
    }

    // Salvar novos inventários e dinheiro
    const sOuroFinal = pSender.ouro - trade.senderGold + trade.receiverGold;
    const rOuroFinal = pReceiver.ouro - trade.receiverGold + trade.senderGold;

    if(pSender) { pSender.ouro = sOuroFinal; pSender.inventario = senderInv; }
    if(pReceiver) { pReceiver.ouro = rOuroFinal; pReceiver.inventario = receiverInv; }
    forceUpdate(p => p+1);
    await salvarFichaFisica(trade.senderPath, {
      ouro: sOuroFinal,
      inventario: senderInv
    });

    await salvarFichaFisica(trade.receiverPath, {
      ouro: rOuroFinal,
      inventario: receiverInv
    });

    // Sincronizar moedas com tokens do tabuleiro
    for (const [id, t] of Array.from(state.tokens.entries())) {
      const token = t as any;
      if (token.caminhoArquivo === trade.senderPath) {
        state.tokens.set(id, { ...token, ouro: sOuroFinal, po: sOuroFinal });
      }
      if (token.caminhoArquivo === trade.receiverPath) {
        state.tokens.set(id, { ...token, ouro: rOuroFinal, po: rOuroFinal });
      }
    }

    // Finalizar no Yjs
    state.trades.set(trade.id, {
      ...trade,
      receiverAccepted: true,
      status: 'completed'
    });

    pushChatMessage(`🤝 **Troca Concluída com sucesso** entre **${pSender.nome}** e **${pReceiver.nome}**!`, true, false);
    recarregar();
  };

  const handleRecusarTroca = (trade: TradeProposal) => {
    state.trades.set(trade.id, {
      ...trade,
      status: 'declined'
    });
    pushChatMessage(`❌ Troca recusada/cancelada entre personagens.`, false, false);
  };

  // CONFIGURAR/EDITAR LOJA DO NPC
  const handleAddShopItem = async () => {
    if (!merchantNpc || !newShopItem.nome) return;

    const currentShop = merchantNpc.loja || { itens: [] };
    const updatedItens = [...(currentShop.itens || [])];

    updatedItens.push({
      nome: newShopItem.nome,
      custo: newShopItem.custo,
      quantidade: newShopItem.quantidade,
      descricao: newShopItem.descricao
    });

    await salvarFichaFisica(merchantNpc.caminhoArquivo, {
      loja: { itens: updatedItens }
    });

    setNewShopItem({ nome: '', custo: 0, quantidade: 1, descricao: '' });
    recarregar();
  };

  const handleRemoveShopItem = async (idx: number) => {
    if (!merchantNpc || !merchantNpc.loja) return;

    const updatedItens = [...(merchantNpc.loja.itens || [])];
    updatedItens.splice(idx, 1);

    await salvarFichaFisica(merchantNpc.caminhoArquivo, {
      loja: { itens: updatedItens }
    });
    recarregar();
  };

  // JOGADOR COMPRA DO NPC
  const handleComprarDoNpc = async (itemLoja: any, indexItem: number) => {
    if (!sender || !merchantNpc) return;
    if (sender.ouro < itemLoja.custo) {
      toast.warn('Você não possui ouro suficiente.');
      return;
    }
    if (itemLoja.quantidade <= 0) {
      toast.info('Item fora de estoque.');
      return;
    }

    // 1. Deduz ouro do comprador e insere item no inventário
    const updatedComprador = {
      ouro: sender.ouro - itemLoja.custo,
      inventario: [...sender.inventario, {
        nome: itemLoja.nome,
        custo: itemLoja.custo,
        descricao: itemLoja.descricao
      }]
    };

    // 2. Adiciona ouro ao NPC e deduz estoque
    const updatedItensLoja = [...(merchantNpc.loja.itens || [])];
    updatedItensLoja[indexItem] = {
      ...itemLoja,
      quantidade: itemLoja.quantidade - 1
    };

    const updatedMercador = {
      ouro: merchantNpc.ouro + itemLoja.custo,
      loja: { itens: updatedItensLoja }
    };

    if(sender) { sender.ouro = updatedComprador.ouro; sender.inventario = updatedComprador.inventario; }
    if(merchantNpc) { merchantNpc.ouro = updatedMercador.ouro; merchantNpc.loja = updatedMercador.loja; }
    forceUpdate(p => p+1);
    if(sender) { sender.ouro = updatedComprador.ouro; sender.inventario = updatedComprador.inventario; }
    if(merchantNpc) { merchantNpc.ouro = npco; merchantNpc.loja = { itens: updatedItensLoja }; }
    forceUpdate(p => p+1);
    await salvarFichaFisica(sender.caminhoArquivo, updatedComprador);
    await salvarFichaFisica(merchantNpc.caminhoArquivo, updatedMercador);

    // Sincronizar moedas com tokens do tabuleiro
    for (const [id, t] of Array.from(state.tokens.entries())) {
      const token = t as any;
      if (token.caminhoArquivo === sender.caminhoArquivo) {
        state.tokens.set(id, { ...token, ouro: updatedComprador.ouro, po: updatedComprador.ouro });
      }
      if (token.caminhoArquivo === merchantNpc.caminhoArquivo) {
        state.tokens.set(id, { ...token, ouro: updatedMercador.ouro, po: updatedMercador.ouro });
      }
    }

    pushChatMessage(`🛒 **${sender.nome}** comprou **1x ${itemLoja.nome}** de **${merchantNpc.nome}** por **${itemLoja.custo} PO**!`, false, false);
    recarregar();
  };

  // JOGADOR VENDE AO NPC
  const handleVenderParaNpc = async (itemInventario: any, idxInventario: number) => {
    if (!sender || !merchantNpc) return;

    const itemName = typeof itemInventario === 'string' ? itemInventario : itemInventario.nome;
    const value = typeof itemInventario === 'string' ? 5 : (itemInventario.custo || 10);
    const sellPrice = Math.max(1, Math.floor(value * 0.5)); // 50% de venda padrão

    // 1. Adiciona ouro ao jogador e remove do inventário
    const playerInv = [...sender.inventario];
    playerInv.splice(idxInventario, 1);

    const updatedComprador = {
      ouro: sender.ouro + sellPrice,
      inventario: playerInv
    };

    // 2. Deduz ouro do NPC comerciante (se o NPC tiver ouro, ou do "cofre infinito" da loja se ouro for 0)
    let npco = merchantNpc.ouro;
    if (npco > 0) {
      npco = Math.max(0, npco - sellPrice);
    }

    const updatedItensLoja = [...(merchantNpc.loja?.itens || [])];
    const existingIdx = updatedItensLoja.findIndex(i => i.nome === itemName);
    if (existingIdx !== -1) {
      updatedItensLoja[existingIdx] = {
        ...updatedItensLoja[existingIdx],
        quantidade: updatedItensLoja[existingIdx].quantidade + 1
      };
    } else {
      updatedItensLoja.push({
        nome: itemName,
        custo: value,
        quantidade: 1,
        descricao: typeof itemInventario === 'string' ? 'Item vendido por jogador' : (itemInventario.descricao || '')
      });
    }

    await salvarFichaFisica(sender.caminhoArquivo, updatedComprador);
    await salvarFichaFisica(merchantNpc.caminhoArquivo, {
      ouro: npco,
      loja: { itens: updatedItensLoja }
    });

    // Sincronizar moedas com tokens do tabuleiro
    for (const [id, t] of Array.from(state.tokens.entries())) {
      const token = t as any;
      if (token.caminhoArquivo === sender.caminhoArquivo) {
        state.tokens.set(id, { ...token, ouro: updatedComprador.ouro, po: updatedComprador.ouro });
      }
      if (token.caminhoArquivo === merchantNpc.caminhoArquivo) {
        state.tokens.set(id, { ...token, ouro: npco, po: npco });
      }
    }

    pushChatMessage(`💰 **${sender.nome}** vendeu **1x ${itemName}** para **${merchantNpc.nome}** por **${sellPrice} PO**!`, true, false);
    recarregar();
  };

  // PAGAMENTO RÁPIDO
  const handlePagarRapido = async () => {
    if (!sender) return;
    if (payAmount <= 0) {
      toast.warn("Insira um valor válido.");
      return;
    }
    if (sender.ouro < payAmount) {
      toast.warn("Você não possui ouro suficiente.");
      return;
    }

    const updatedOuro = sender.ouro - payAmount;
    if(sender) { sender.ouro = updatedOuro; } forceUpdate(p => p+1); await salvarFichaFisica(sender.caminhoArquivo, { ouro: updatedOuro });
    
    for (const [id, t] of Array.from(state.tokens.entries())) {
      const token = t as any;
      if (token.caminhoArquivo === sender.caminhoArquivo) {
        state.tokens.set(id, { ...token, ouro: updatedOuro, po: updatedOuro });
      }
    }

    pushChatMessage(`💸 **${sender.nome}** pagou **${payAmount} PO**. ${payReason ? `Motivo: ${payReason}` : ''}`, false, false);
    setPayAmount(0);
    setPayReason('');
    toast.success(`Pago ${payAmount} PO com sucesso!`);
    recarregar();
  };

  // UI Helpers
  const toggleItemSelection = (itemName: string, selectedList: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (selectedList.includes(itemName)) {
      setter(selectedList.filter(n => n !== itemName));
    } else {
      setter([...selectedList, itemName]);
    }
  };

  const getStyleTab = (tab: typeof activeTab) => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: activeTab === tab ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontWeight: 'bold',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    transition: 'all 0.2s'
  });

  return (
    <DraggableWindow
      id="tradeShop"
      title="Sistema Comercial & Lojas"
      initialX={250}
      initialY={100}
      width={640}
      height={520}
      onClose={onClose}
      variant="glass"
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0914', color: '#e2e8f0', fontFamily: 'var(--font-main)' }}>
        
        {/* TOP TABS */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--glass-border)' }}>
          <button style={getStyleTab('doar')} onClick={() => setActiveTab('doar')}>
            <Gift size={15} /> Doações
          </button>
          <button style={getStyleTab('trocar')} onClick={() => setActiveTab('trocar')}>
            <ArrowLeftRight size={15} /> Trocas P2P
          </button>
          <button style={getStyleTab('loja')} onClick={() => setActiveTab('loja')}>
            <Store size={15} /> Lojas de NPCs
          </button>
          <button style={getStyleTab('pagar')} onClick={() => setActiveTab('pagar')}>
            <Coins size={15} /> Pagar
          </button>
        </div>

        {/* CONTROLLER: Seleção dos Envolvidos */}
        <div className="grid-responsive-2" style={{ gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
          <div>
            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Seu Personagem (Doador / Comprador):</label>
            <select 
              value={senderPath} 
              onChange={e => setSenderPath(e.target.value)} 
              style={{ width: '100%', background: '#12111d', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', outline: 'none' }}
            >
              {personagens.map(p => (
                <option key={p.caminhoArquivo} value={p.caminhoArquivo}>
                  {p.nome} (PO: {p.ouro} | 💎 Gemas: {p.riquezas})
                </option>
              ))}
            </select>
          </div>
          
          {activeTab !== 'loja' && activeTab !== 'pagar' && (
            <div>
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Recebedor da Doação/Troca:</label>
              <select 
                value={receiverPath} 
                onChange={e => setReceiverPath(e.target.value)}
                style={{ width: '100%', background: '#12111d', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', outline: 'none' }}
              >
                {personagens.filter(p => p.caminhoArquivo !== senderPath).map(p => (
                  <option key={p.caminhoArquivo} value={p.caminhoArquivo}>
                    {p.nome} (PO: {p.ouro})
                  </option>
                ))}
              </select>
            </div>
          )}
          {activeTab === 'loja' && (
            <div>
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>NPC Mercador:</label>
              <select 
                value={selectedNpcMerchantPath} 
                onChange={e => setSelectedNpcMerchantPath(e.target.value)}
                style={{ width: '100%', background: '#12111d', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', outline: 'none' }}
              >
                <option value="">-- Escolha um NPC Mercador --</option>
                {personagens.filter(p => p.status === 'npc').map(p => (
                  <option key={p.caminhoArquivo} value={p.caminhoArquivo}>
                    🏢 {p.nome} {p.loja ? '(Comercial)' : '(Comum)'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* TAB CONTENTS */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          
          {/* TAB 1: DOAR */}
          {activeTab === 'doar' && sender && receiver && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="grid-responsive-2" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.3rem' }}>Doar Moedas (PO):</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#12111d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px 8px' }}>
                    <Coins size={14} color="var(--warning)" />
                    <input 
                      type="number" 
                      value={donateGold}
                      onChange={e => setDonateGold(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{ border: 'none', background: 'transparent', width: '100%', color: '#fff', padding: '0.4rem', outline: 'none', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.3rem', color: 'var(--accent-primary)' }}>💎 Doar Gemas Astrais:</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#12111d', border: '1px solid rgba(192,132,252,0.3)', borderRadius: '6px', padding: '2px 8px', boxShadow: 'inset 0 0 5px rgba(192,132,252,0.1)' }}>
                    <span style={{ fontSize: '12px' }}>💎</span>
                    <input 
                      type="number" 
                      value={donateRiquezas}
                      onChange={e => setDonateRiquezas(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{ border: 'none', background: 'transparent', width: '100%', color: '#f3e8ff', padding: '0.4rem', outline: 'none', fontSize: '0.8rem', fontWeight: 'bold' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Selecionar Itens para Doação:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', maxHeight: '180px', overflowY: 'auto' }}>
                  {sender.inventario.length === 0 ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Inventário Vazio.</span>
                  ) : (
                    sender.inventario.map((item, idx) => {
                      const name = typeof item === 'string' ? item : item.nome;
                      const selected = selectedDonateItems.includes(name);
                      return (
                        <div 
                          key={idx}
                          onClick={() => toggleItemSelection(name, selectedDonateItems, setSelectedDonateItems)}
                          style={{
                            display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', borderRadius: '4px',
                            background: selected ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${selected ? 'rgba(16,185,129,0.3)' : 'transparent'}`,
                            cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.15s'
                          }}
                        >
                          <span>{name}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{typeof item !== 'string' && item.custo ? `${item.custo} PO` : ''}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <button 
                onClick={handleDoar}
                style={{
                  width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                  border: 'none', padding: '0.6rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                }}
              >
                <Send size={15} /> Confirmar Doação
              </button>
            </div>
          )}

          {/* TAB 2: TROCAR */}
          {activeTab === 'trocar' && sender && receiver && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Propostas Pendentes que recebi */}
              {incomingTrades.length > 0 && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#f59e0b', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Trocas Pendentes:</span>
                  {incomingTrades.map(trade => {
                    const fromChar = personagens.find(p => p.caminhoArquivo === trade.senderPath);
                    return (
                      <div key={trade.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#100f1c', border: '1px solid rgba(255,255,255,0.08)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                        <div>
                          <span>Proposta de <b>{fromChar?.nome || 'Alguém'}</b>:</span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Oferece: {trade.senderGold} PO e [{trade.senderItems.join(', ') || 'Nenhum item'}] <br/>
                            Pede em troca: {trade.receiverGold} PO e [{trade.receiverItems.join(', ') || 'Nenhum item'}]
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => handleAceitarTroca(trade)} style={{ background: '#10b981', border: 'none', color: '#fff', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>
                            Aceitar
                          </button>
                          <button onClick={() => handleRecusarTroca(trade)} style={{ background: '#ef4444', border: 'none', color: '#fff', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>
                            Recusar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Formular nova proposta */}
              <div className="grid-responsive-2" style={{ gap: '1rem' }}>
                {/* O que eu ofereço */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>O que você OFERECE:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#12111d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px 8px', margin: '0.5rem 0' }}>
                    <Coins size={12} color="var(--warning)" />
                    <input 
                      type="number" 
                      placeholder="Moedas de ouro..."
                      value={tradeOfferGold}
                      onChange={e => setTradeOfferGold(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{ border: 'none', background: 'transparent', width: '100%', color: '#fff', padding: '0.3rem', outline: 'none', fontSize: '0.75rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '120px', overflowY: 'auto' }}>
                    {sender.inventario.map((item, idx) => {
                      const name = typeof item === 'string' ? item : item.nome;
                      const selected = tradeOfferItems.includes(name);
                      return (
                        <div 
                          key={idx}
                          onClick={() => toggleItemSelection(name, tradeOfferItems, setTradeOfferItems)}
                          style={{
                            padding: '3px 6px', borderRadius: '3px', fontSize: '0.7rem', cursor: 'pointer',
                            background: selected ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.02)'
                          }}
                        >
                          {name}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* O que eu peço */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>O que você PEDE:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#12111d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px 8px', margin: '0.5rem 0' }}>
                    <Coins size={12} color="var(--warning)" />
                    <input 
                      type="number" 
                      placeholder="Moedas de ouro..."
                      value={tradeDemandGold}
                      onChange={e => setTradeDemandGold(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{ border: 'none', background: 'transparent', width: '100%', color: '#fff', padding: '0.3rem', outline: 'none', fontSize: '0.75rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '120px', overflowY: 'auto' }}>
                    {receiver.inventario.map((item, idx) => {
                      const name = typeof item === 'string' ? item : item.nome;
                      const selected = tradeDemandItems.includes(name);
                      return (
                        <div 
                          key={idx}
                          onClick={() => toggleItemSelection(name, tradeDemandItems, setTradeDemandItems)}
                          style={{
                            padding: '3px 6px', borderRadius: '3px', fontSize: '0.7rem', cursor: 'pointer',
                            background: selected ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.02)'
                          }}
                        >
                          {name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleProporTroca}
                style={{
                  width: '100%', background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff',
                  border: 'none', padding: '0.6rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                }}
              >
                <ArrowLeftRight size={15} /> Propor Troca
              </button>
            </div>
          )}

          {/* TAB 3: LOJA DE NPC */}
          {activeTab === 'loja' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!selectedNpcMerchantPath ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Por favor, escolha um NPC Mercador no menu acima para interagir ou configurar a loja.
                </div>
              ) : merchantNpc ? (
                <div>
                  
                  {/* Toggle para Modo Configuração GM */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.75rem' }}>Mercador: <b>{merchantNpc.nome}</b> (PO: {merchantNpc.ouro})</span>
                    <button 
                      onClick={() => setShowShopConfig(!showShopConfig)}
                      style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '4px', padding: '3px 8px', fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                      {showShopConfig ? 'Fechar Editor da Loja' : '⚙️ Editar Itens da Loja (Mestre)'}
                    </button>
                  </div>

                  {/* FORMULÁRIO DO GM PARA ADICIONAR ITEM */}
                  {showShopConfig && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>Novo Item na Vitrine:</span>
                      <div className="grid-responsive-3" style={{ gap: '0.5rem' }}>
                        <input 
                          type="text" placeholder="Nome do Item" 
                          value={newShopItem.nome} onChange={e => setNewShopItem({...newShopItem, nome: e.target.value})}
                          style={{ background: '#12111d', border: '1px solid rgba(255,255,255,0.1)', padding: '0.3rem', borderRadius: '4px', color: '#fff', fontSize: '0.75rem' }}
                        />
                        <input 
                          type="number" placeholder="Preço (PO)" 
                          value={newShopItem.custo} onChange={e => setNewShopItem({...newShopItem, custo: Math.max(0, parseInt(e.target.value) || 0)})}
                          style={{ background: '#12111d', border: '1px solid rgba(255,255,255,0.1)', padding: '0.3rem', borderRadius: '4px', color: '#fff', fontSize: '0.75rem' }}
                        />
                        <input 
                          type="number" placeholder="Estoque" 
                          value={newShopItem.quantidade} onChange={e => setNewShopItem({...newShopItem, quantidade: Math.max(1, parseInt(e.target.value) || 0)})}
                          style={{ background: '#12111d', border: '1px solid rgba(255,255,255,0.1)', padding: '0.3rem', borderRadius: '4px', color: '#fff', fontSize: '0.75rem' }}
                        />
                      </div>
                      <input 
                        type="text" placeholder="Descrição rápida (opcional)" 
                        value={newShopItem.descricao} onChange={e => setNewShopItem({...newShopItem, descricao: e.target.value})}
                        style={{ background: '#12111d', border: '1px solid rgba(255,255,255,0.1)', padding: '0.3rem', borderRadius: '4px', color: '#fff', fontSize: '0.75rem' }}
                      />
                      <button onClick={handleAddShopItem} style={{ background: 'var(--accent-primary)', border: 'none', color: '#fff', padding: '0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>
                        Adicionar Item à Loja
                      </button>
                    </div>
                  )}

                  {/* VITRINE DA LOJA */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '3px' }}>Itens à Venda (Comprar):</span>
                    {(!merchantNpc.loja || !merchantNpc.loja.itens || merchantNpc.loja.itens.length === 0) ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.5rem' }}>Este mercador não tem itens cadastrados na loja.</div>
                    ) : (
                      merchantNpc.loja.itens.map((item: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <b style={{ color: '#fff' }}>{item.nome}</b>
                              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>x{item.quantidade}</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.descricao || 'Sem descrição'}</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }}><Coins size={13} /> {item.custo} PO</span>
                            <button 
                              onClick={() => handleComprarDoNpc(item, idx)}
                              disabled={item.quantidade <= 0}
                              style={{
                                background: item.quantidade > 0 ? '#10b981' : '#334155', border: 'none', color: '#fff',
                                borderRadius: '4px', padding: '4px 10px', fontSize: '0.75rem', cursor: item.quantidade > 0 ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', gap: '3px'
                              }}
                            >
                              <ShoppingBag size={12} /> Comprar
                            </button>
                            {showShopConfig && (
                              <button onClick={() => handleRemoveShopItem(idx)} style={{ background: '#ef4444', border: 'none', color: '#fff', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}>
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* INVENTÁRIO DO COMPRADOR PARA VENDA */}
                  {sender && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Seus Itens (Vender ao NPC):</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                        {sender.inventario.length === 0 ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Você não possui itens no inventário para vender.</span>
                        ) : (
                          sender.inventario.map((item, idx) => {
                            const name = typeof item === 'string' ? item : item.nome;
                            const value = typeof item === 'string' ? 10 : (item.custo || 10);
                            const sellPrice = Math.max(1, Math.floor(value * 0.5));
                            
                            return (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '0.4rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                                <span>{name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ color: '#f59e0b', fontSize: '0.7rem' }}>Venda: {sellPrice} PO</span>
                                  <button 
                                    onClick={() => handleVenderParaNpc(item, idx)}
                                    style={{ background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '3px', padding: '3px 8px', cursor: 'pointer', fontSize: '0.7rem' }}
                                  >
                                    Vender
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                </div>
              ) : null}
            </div>
          )}

          {/* TAB 4: PAGAR RÁPIDO */}
          {activeTab === 'pagar' && sender && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#100f1c', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#f87171' }}>Despesas, Tavernas e Subornos</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Deduza o ouro diretamente da sua ficha sem precisar de um recebedor para interpretar gastos na cidade.</span>
                
                <label style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Valor a Pagar (PO):</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#12111d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '4px 8px' }}>
                  <Coins size={16} color="#f87171" />
                  <input 
                    type="number" 
                    value={payAmount}
                    onChange={e => setPayAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{ border: 'none', background: 'transparent', width: '100%', color: '#fff', outline: 'none' }}
                  />
                </div>

                <label style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Motivo (Opcional):</label>
                <input 
                  type="text" 
                  value={payReason}
                  onChange={e => setPayReason(e.target.value)}
                  placeholder="Ex: Pernoite na taverna, Gorjeta..."
                  style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#12111d', color: '#fff', padding: '0.5rem', borderRadius: '6px', outline: 'none' }}
                />

                <button 
                  onClick={handlePagarRapido}
                  style={{ background: '#ef4444', border: 'none', color: '#fff', fontWeight: 'bold', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Coins size={16} /> Pagar {payAmount > 0 ? `${payAmount} PO` : ''}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </DraggableWindow>
  );
};
