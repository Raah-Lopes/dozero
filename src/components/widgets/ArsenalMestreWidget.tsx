// src/components/HUD/ArsenalMestreWidget.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { DraggableWindow } from '../HUD/DraggableWindow';
import { useWiki } from '../../hooks/useWiki';
import { saveMarkdownContent, loadMarkdownFile } from '../../utils/githubApi';
import { pushChatMessage } from '../../store';
import * as yaml from 'js-yaml';
import { 
  Sword, Plus, Trash2, UserMinus, UserCheck, 
     X 
} from 'lucide-react';

interface FichaPersonagem {
  nome: string;
  pv: number;
  pv_max: number;
  xp: number;
  nivel: number;
  mana: number;
  mana_max: number;
  energia: number;
  energia_max: number;
  sanidade: number;
  sanidade_max: number;
  fome: number;
  fome_max: number;
  sede: number;
  sede_max: number;
  cansaco: number;
  cansaco_max: number;
  armadura: number;
  defesa: number;
  velocidade: number;
  ataque: number;
  status: 'jogador' | 'npc' | 'inimigo';
  avatar?: string;
  caminhoArquivo: string;
  ouro: number;
  riquezas: number;
  usos_cura: number;
  status_efeitos: string[];
  saqueado: boolean;
  ativo: boolean;
  // Atributos 4DET
  forca: number;
  destreza: number;
  constituicao: number;
  inteligencia: number;
  sabedoria: number;
  carisma: number;
  // Atributos 3D&T
  habilidade: number;
  armadura_3dt: number;
  forca_3dt: number;
  resistencia: number;
  pdf: number;
  // Inventários específicos
  armas: any[];
  poderes: any[];
  pocoes: any[];
  maldicoes: any[];
  objetos_campanha: any[];
  inventario: any[];
}

interface ItemCatalogo {
  nome: string;
  tipo: 'arma' | 'poder' | 'pocao' | 'maldicao' | 'objeto_campanha';
  descricao: string;
  efeito: string;
  custo?: string; // para poderes
  dano?: string;  // para armas
  quantidade?: number; // para poções
  isCustom?: boolean;
}

const CATALOGO_ITEMS: ItemCatalogo[] = [
  // ARMAS
  { nome: "Espada Longa", tipo: "arma", descricao: "Uma clássica espada de aço temperado.", efeito: "ataque_8", dano: "1d8" },
  { nome: "Arco Curto de Caça", tipo: "arma", descricao: "Arco leve e flexível para disparo rápido.", efeito: "ataque_6", dano: "1d6" },
  { nome: "Adaga Rúnica", tipo: "arma", descricao: "Lâmina ágil com entalhes rúnicos mágicos.", efeito: "ataque_4", dano: "1d4" },
  { nome: "Machado de Batalha", tipo: "arma", descricao: "Machado pesado capaz de fender escudos.", efeito: "ataque_10", dano: "1d10" },
  { nome: "Cajado do Conjurador", tipo: "arma", descricao: "Canaliza poderes arcanos (+1 em feitiços).", efeito: "ataque_6", dano: "1d6" },
  
  // PODERES
  { nome: "Bola de Fogo", tipo: "poder", descricao: "Causa dano de fogo em área a múltiplos alvos.", efeito: "dano_4d6", custo: "3 PM" },
  { nome: "Mísseis Mágicos", tipo: "poder", descricao: "Dardos de luz que acertam infalivelmente.", efeito: "dano_1d4+1", custo: "1 PM" },
  { nome: "Sopro Congelante", tipo: "poder", descricao: "Sopra uma rajada fria retardando os alvos.", efeito: "dano_2d6", custo: "2 PM" },
  { nome: "Cura Divina", tipo: "poder", descricao: "Restaura vida através de oração sagrada.", efeito: "cura_2d8", custo: "2 PM" },
  { nome: "Escudo de Mana", tipo: "poder", descricao: "Converte mana em barreira física temporária.", efeito: "defesa_4", custo: "1 PM" },

  // POÇÕES
  { nome: "Elixir de Vida P", tipo: "pocao", descricao: "Cura ferimentos superficiais instantaneamente.", efeito: "heal_15", quantidade: 1 },
  { nome: "Elixir de Vida G", tipo: "pocao", descricao: "Restaura grande parte da integridade física.", efeito: "heal_40", quantidade: 1 },
  { nome: "Poção de Mana", tipo: "pocao", descricao: "Recarrega baterias core e mana vital.", efeito: "mana_15", quantidade: 1 },
  { nome: "Tônico de Vigor", tipo: "pocao", descricao: "Restaura energia e remove status de exaustão.", efeito: "energia_50", quantidade: 1 },
  { nome: "Essência Mental", tipo: "pocao", descricao: "Acalma a mente e recupera pontos de sanidade.", efeito: "sanidade_25", quantidade: 1 },

  // MALDIÇÕES
  { nome: "Marca do Abismo", tipo: "maldicao", descricao: "Reduz a sanidade máxima e causa alucinações.", efeito: "penalidade_sanidade" },
  { nome: "Sangue Envenenado", tipo: "maldicao", descricao: "Sofrimento físico constante a cada rodada.", efeito: "dano_veneno" },
  { nome: "Olhar do Fracasso", tipo: "maldicao", descricao: "Todas as jogadas de ataque sofrem desvantagem.", efeito: "penalidade_ataque" },
  { nome: "Fome Devoradora", tipo: "maldicao", descricao: "Necessidade incontrolável de comer constantemente.", efeito: "fome_dobrada" },

  // OBJETOS DE CAMPANHA
  { nome: "Chave do Portal Celestial", tipo: "objeto_campanha", descricao: "Abre fechaduras mágicas ancestrais.", efeito: "chave_portal" },
  { nome: "Orbe Rastejante", tipo: "objeto_campanha", descricao: "Flutua e mapeia passagens ocultas na masmorra.", efeito: "revela_segredos" },
  { nome: "Amuleto Antigo de Ametista", tipo: "objeto_campanha", descricao: "Garante proteção contra efeitos mentais.", efeito: "imunidade_mente" },
  { nome: "Mapa Antigo do Reino", tipo: "objeto_campanha", descricao: "Delineia atalhos e rotas secretas terrestres.", efeito: "vantagem_sobrevivência" }
];

export const ArsenalMestreWidget: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { index, refresh } = useWiki();
  const [personagens, setPersonagens] = useState<FichaPersonagem[]>([]);
  const [selectedChar, setSelectedChar] = useState<FichaPersonagem | null>(null);
  const [activeTab, setActiveTab] = useState<'pools' | 'atributos' | 'catalogo'>('pools');
  const [catalogoFilter, setCatalogoFilter] = useState<'todos' | 'arma' | 'poder' | 'pocao' | 'maldicao' | 'objeto_campanha'>('todos');

  const [customItems, setCustomItems] = useState<ItemCatalogo[]>(() => {
    try {
      const stored = localStorage.getItem('dozero_custom_items');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [showCreateItem, setShowCreateItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'arma' | 'poder' | 'pocao' | 'maldicao' | 'objeto_campanha'>('arma');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemEffect, setNewItemEffect] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemDamage, setNewItemDamage] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);

  const handleCreateItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      alert("O nome do item é obrigatório.");
      return;
    }
    const item: ItemCatalogo = {
      nome: newItemName.trim(),
      tipo: newItemType,
      descricao: newItemDesc.trim(),
      efeito: newItemEffect.trim(),
      isCustom: true
    };
    if (newItemType === 'arma') {
      item.dano = newItemDamage.trim() || '1d6';
    } else if (newItemType === 'poder') {
      item.custo = newItemCost.trim() || '1 PM';
    } else if (newItemType === 'pocao') {
      item.quantidade = newItemQty;
    }

    const updated = [...customItems, item];
    setCustomItems(updated);
    localStorage.setItem('dozero_custom_items', JSON.stringify(updated));

    // Reset fields
    setNewItemName('');
    setNewItemDesc('');
    setNewItemEffect('');
    setNewItemCost('');
    setNewItemDamage('');
    setNewItemQty(1);
    setShowCreateItem(false);
  };

  const handleDeleteCustomItem = (name: string, tipo: string) => {
    if (confirm(`Deseja realmente deletar o item customizado "${name}" do catálogo?`)) {
      const updated = customItems.filter(i => !(i.nome === name && i.tipo === tipo));
      setCustomItems(updated);
      localStorage.setItem('dozero_custom_items', JSON.stringify(updated));
    }
  };

  // Carregar personagens reativos
  const carregarPersonagens = useCallback(() => {
    if (!index || index.length === 0) return;

    const entidades = index.filter(e => {
      const tipo = String(e.metadata?.tipo || '').toLowerCase();
      const status = String(e.metadata?.status || '').toLowerCase();
      const path = e.path.toLowerCase();
      if (path.includes('_modelo')) return false;

      return ['pc', 'npc', 'monstro', 'personagem', 'jogador', 'inimigo'].includes(tipo) ||
             ['jogador', 'npc', 'inimigo'].includes(status) ||
             path.includes('/fichas/') ||
             path.includes('/personagens/');
    });

    const carregadas: FichaPersonagem[] = entidades.map(e => {
      const tipo = e.metadata?.tipo;
      let status: 'jogador' | 'npc' | 'inimigo' = 'npc';
      if (tipo === 'PC' || tipo === 'Personagem' || e.metadata?.status === 'jogador') status = 'jogador';
      else if (tipo === 'Monstro' || e.metadata?.status === 'inimigo' || e.metadata?.status === 'Hostil') status = 'inimigo';

      return {
        nome: e.metadata?.nome || e.metadata?.titulo || e.slug || 'Sem nome',
        pv: Number(e.metadata?.pv) || Number(e.metadata?.HP) || 0,
        pv_max: Number(e.metadata?.pv_max) || Number(e.metadata?.HP_max) || Number(e.metadata?.pv) || Number(e.metadata?.HP) || 0,
        xp: Number(e.metadata?.xp) || Number(e.metadata?.XP) || 0,
        nivel: Number(e.metadata?.nivel) || Number(e.metadata?.Nivel) || 1,
        mana: Number(e.metadata?.mana) || Number(e.metadata?.PM) || 0,
        mana_max: Number(e.metadata?.mana_max) || Number(e.metadata?.PM_max) || 0,
        energia: Number(e.metadata?.energia) !== undefined && e.metadata?.energia !== null ? Number(e.metadata?.energia) : 100,
        energia_max: Number(e.metadata?.energia_max) !== undefined && e.metadata?.energia_max !== null ? Number(e.metadata?.energia_max) : 100,
        sanidade: Number(e.metadata?.sanidade) !== undefined && e.metadata?.sanidade !== null ? Number(e.metadata?.sanidade) : 100,
        sanidade_max: Number(e.metadata?.sanidade_max) !== undefined && e.metadata?.sanidade_max !== null ? Number(e.metadata?.sanidade_max) : 100,
        fome: Number(e.metadata?.fome) !== undefined && e.metadata?.fome !== null ? Number(e.metadata?.fome) : 0,
        fome_max: Number(e.metadata?.fome_max) !== undefined && e.metadata?.fome_max !== null ? Number(e.metadata?.fome_max) : 100,
        sede: Number(e.metadata?.sede) !== undefined && e.metadata?.sede !== null ? Number(e.metadata?.sede) : 0,
        sede_max: Number(e.metadata?.sede_max) !== undefined && e.metadata?.sede_max !== null ? Number(e.metadata?.sede_max) : 100,
        cansaco: Number(e.metadata?.cansaco) !== undefined && e.metadata?.cansaco !== null ? Number(e.metadata?.cansaco) : 0,
        cansaco_max: Number(e.metadata?.cansaco_max) !== undefined && e.metadata?.cansaco_max !== null ? Number(e.metadata?.cansaco_max) : 100,
        armadura: Number(e.metadata?.armadura) || Number(e.metadata?.Armadura) || 0,
        defesa: Number(e.metadata?.defesa) || Number(e.metadata?.Defesa) || 10,
        velocidade: Number(e.metadata?.velocidade) || 10,
        ataque: Number(e.metadata?.ataque) || 10,
        status,
        avatar: e.metadata?.avatar || e.metadata?.imagem,
        caminhoArquivo: e.path,
        ouro: Number(e.metadata?.ouro) || Number(e.metadata?.Ouro) || 0,
        riquezas: Number(e.metadata?.riquezas) || Number(e.metadata?.Riquezas) || 0,
        usos_cura: e.metadata?.usos_cura_atual !== undefined ? Number(e.metadata?.usos_cura_atual) : 3,
        status_efeitos: Array.isArray(e.metadata?.status_efeitos) ? e.metadata?.status_efeitos : [],
        saqueado: e.metadata?.saqueado === 'true' || e.metadata?.saqueado === true,
        ativo: e.metadata?.ativo !== false,

        // Atributos 4DET
        forca: Number(e.metadata?.forca || e.metadata?.FOR || e.metadata?.força) || 10,
        destreza: Number(e.metadata?.destreza || e.metadata?.DES) || 10,
        constituicao: Number(e.metadata?.constituicao || e.metadata?.CON || e.metadata?.constituição) || 10,
        inteligencia: Number(e.metadata?.inteligencia || e.metadata?.INT || e.metadata?.inteligência) || 10,
        sabedoria: Number(e.metadata?.sabedoria || e.metadata?.SAB) || 10,
        carisma: Number(e.metadata?.carisma || e.metadata?.CAR) || 10,

        // Atributos 3D&T
        habilidade: Number(e.metadata?.habilidade || e.metadata?.H) || 0,
        armadura_3dt: Number(e.metadata?.armadura_3dt || e.metadata?.A) || 0,
        forca_3dt: Number(e.metadata?.forca_3dt || e.metadata?.F) || 0,
        resistencia: Number(e.metadata?.resistencia || e.metadata?.R) || 0,
        pdf: Number(e.metadata?.pdf || e.metadata?.PdF) || 0,

        // Inventários específicos
        armas: Array.isArray(e.metadata?.armas) ? e.metadata.armas : [],
        poderes: Array.isArray(e.metadata?.poderes) ? e.metadata.poderes : [],
        pocoes: Array.isArray(e.metadata?.pocoes) ? e.metadata.pocoes : [],
        maldicoes: Array.isArray(e.metadata?.maldicoes) ? e.metadata.maldicoes : [],
        objetos_campanha: Array.isArray(e.metadata?.objetos_campanha) ? e.metadata.objetos_campanha : [],
        inventario: Array.isArray(e.metadata?.inventario) ? e.metadata.inventario : [],
      };
    });

    setPersonagens(carregadas);
    if (selectedChar) {
      const updated = carregadas.find(p => p.caminhoArquivo === selectedChar.caminhoArquivo);
      if (updated) setSelectedChar(updated);
    }
  }, [index]);

  useEffect(() => {
    carregarPersonagens();
  }, [index, carregarPersonagens]);

  // Função geral de salvamento no cofre local
  const salvarFichaProperties = async (ficha: FichaPersonagem, overrides: any) => {
    try {
      const originalMd = await loadMarkdownFile(ficha.caminhoArquivo);
      if (!originalMd) return;

      const textParts = originalMd.split('---');
      if (textParts.length >= 3) {
        const frontmatterStr = textParts[1];
        const data = yaml.load(frontmatterStr) as any || {};

        // Mesclar dados
        Object.entries(overrides).forEach(([key, val]) => {
          data[key] = val;
        });

        // Garantir integridade de chaves duplicadas no frontmatter (caso do HP/PV legados)
        if (overrides.pv !== undefined) {
          data.HP = overrides.pv;
          data.pv = overrides.pv;
        }
        if (overrides.pv_max !== undefined) {
          data.HP_max = overrides.pv_max;
          data.pv_max = overrides.pv_max;
        }
        if (overrides.mana !== undefined) {
          data.PM = overrides.mana;
          data.mana = overrides.mana;
        }
        if (overrides.mana_max !== undefined) {
          data.PM_max = overrides.mana_max;
          data.mana_max = overrides.mana_max;
        }
        if (overrides.ouro !== undefined) {
          data.Ouro = overrides.ouro;
          data.ouro = overrides.ouro;
        }
        if (overrides.riquezas !== undefined) {
          data.Riquezas = overrides.riquezas;
          data.riquezas = overrides.riquezas;
        }

        const novaFront = '---\n' + yaml.dump(data) + '---\n';
        const body = textParts.slice(2).join('---');

        await saveMarkdownContent(ficha.caminhoArquivo, novaFront + body);
        refresh?.();
      }
    } catch (e) {
      console.error("Falha ao salvar propriedades:", e);
    }
  };

  // Alteração direta
  const handlePropChange = async (key: string, value: any) => {
    if (!selectedChar) return;
    const keyMap: Record<string, string> = {
      pv: 'pv', pv_max: 'pv_max', mana: 'mana', mana_max: 'mana_max',
      energia: 'energia', energia_max: 'energia_max', sanidade: 'sanidade',
      sanidade_max: 'sanidade_max', fome: 'fome', fome_max: 'fome_max',
      sede: 'sede', sede_max: 'sede_max', cansaco: 'cansaco',
      cansaco_max: 'cansaco_max', ouro: 'ouro', riquezas: 'riquezas',
      defesa: 'defesa', ativo: 'ativo'
    };

    const targetKey = keyMap[key] || key;
    const updatedChar = { ...selectedChar, [key]: value };
    setSelectedChar(updatedChar);
    await salvarFichaProperties(selectedChar, { [targetKey]: value });
  };

  // Controles rápidos
  const handleRestaurarHP = async () => {
    if (!selectedChar) return;
    await handlePropChange('pv', selectedChar.pv_max);
    pushChatMessage(`💚 <b>Mestre</b> restaurou por completo o HP de <b>${selectedChar.nome}</b>.`, false, false);
  };

  const handleZerarHP = async () => {
    if (!selectedChar) return;
    const status = [...selectedChar.status_efeitos];
    if (!status.includes('Morto')) status.push('Morto');
    
    const overrides = { pv: 0, status_efeitos: status };
    setSelectedChar({ ...selectedChar, pv: 0, status_efeitos: status });
    await salvarFichaProperties(selectedChar, overrides);
    pushChatMessage(`💀 <b>Mestre</b> derrotou / zerou o HP de <b>${selectedChar.nome}</b>.`, false, false);
  };

  const handleLimparCondicoes = async () => {
    if (!selectedChar) return;
    setSelectedChar({ ...selectedChar, status_efeitos: [] });
    await salvarFichaProperties(selectedChar, { status_efeitos: [] });
    pushChatMessage(`✨ <b>Mestre</b> purificou e removeu todas as condições de <b>${selectedChar.nome}</b>.`, false, false);
  };

  // Alternar Condições Visuais
  const toggleCondicao = async (cond: string) => {
    if (!selectedChar) return;
    const jaTem = selectedChar.status_efeitos.includes(cond);
    const novasConds = jaTem 
      ? selectedChar.status_efeitos.filter(c => c !== cond) 
      : [...selectedChar.status_efeitos, cond];
    
    setSelectedChar({ ...selectedChar, status_efeitos: novasConds });
    await salvarFichaProperties(selectedChar, { status_efeitos: novasConds });
  };

  // Distribuir item do catálogo
  const handleDistribuirItem = async (item: ItemCatalogo) => {
    if (!selectedChar) {
      alert("Selecione um personagem primeiro!");
      return;
    }

    const path = selectedChar.caminhoArquivo;
    try {
      const originalMd = await loadMarkdownFile(path);
      if (!originalMd) return;
      const textParts = originalMd.split('---');
      if (textParts.length < 3) return;

      const frontmatterStr = textParts[1];
      const body = textParts.slice(2).join('---');
      const data = yaml.load(frontmatterStr) as any || {};

      // Mapear de acordo com a categoria
      if (item.tipo === 'arma') {
        const arr = Array.isArray(data.armas) ? data.armas : [];
        arr.push({
          nome: item.nome,
          tipo: 'equipamento',
          efeito: item.efeito,
          dano: item.dano,
          descricao: item.descricao,
          equipado: false
        });
        data.armas = arr;
      } else if (item.tipo === 'poder') {
        const arr = Array.isArray(data.poderes) ? data.poderes : [];
        arr.push({
          nome: item.nome,
          tipo: 'poder',
          custo: item.custo,
          efeito: item.efeito,
          descricao: item.descricao
        });
        data.poderes = arr;
      } else if (item.tipo === 'pocao') {
        const arr = Array.isArray(data.pocoes) ? data.pocoes : [];
        arr.push({
          nome: item.nome,
          tipo: 'consumivel',
          efeito: item.efeito,
          quantidade: item.quantidade || 1,
          descricao: item.descricao
        });
        data.pocoes = arr;
      } else if (item.tipo === 'maldicao') {
        const arr = Array.isArray(data.maldicoes) ? data.maldicoes : [];
        arr.push({
          nome: item.nome,
          tipo: 'maldicao',
          efeito: item.efeito,
          descricao: item.descricao
        });
        data.maldicoes = arr;
      } else if (item.tipo === 'objeto_campanha') {
        const arr = Array.isArray(data.objetos_campanha) ? data.objetos_campanha : [];
        arr.push({
          nome: item.nome,
          tipo: 'objeto_campanha',
          efeito: item.efeito,
          descricao: item.descricao
        });
        data.objetos_campanha = arr;
      }

      // Sincronizar também no inventário principal para legados
      const inv = Array.isArray(data.inventario) ? data.inventario : [];
      inv.push({
        nome: item.nome,
        tipo: item.tipo === 'pocao' ? 'consumivel' : item.tipo === 'arma' ? 'equipamento' : item.tipo,
        efeito: item.efeito,
        quantidade: item.quantidade || 1,
        descricao: item.descricao,
        equipado: false
      });
      data.inventario = inv;

      const novaFront = '---\n' + yaml.dump(data) + '---\n';
      await saveMarkdownContent(path, novaFront + body);

      pushChatMessage(`📦 <b>Mestre</b> concedeu o item/poder <b>${item.nome}</b> para <b>${selectedChar.nome}</b>.`, false, false);
      refresh?.();
      alert(`Item "${item.nome}" distribuído com sucesso para ${selectedChar.nome}!`);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar item na ficha.");
    }
  };

  // Filtrar itens do catálogo (incluindo customizados)
  const filteredCatalogo = [...CATALOGO_ITEMS, ...customItems].filter(item => {
    if (catalogoFilter === 'todos') return true;
    return item.tipo === catalogoFilter;
  });

  return (
    <DraggableWindow 
      id="master-arsenal" 
      title="Hub - Arsenal do Mestre" 
      initialX={150} 
      initialY={100} 
      width={850} 
      height={650} 
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#f1f5f9', fontFamily: 'var(--font-body)' }}>
        
        {/* CABEÇALHO DO ARSENAL */}
        <div style={{ padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,41,59,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sword size={22} style={{ color: '#fbbf24' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Arsenal de Mesa do Narrador</h3>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Edite status, distribua maldições, poderes e itens diretamente</span>
            </div>
          </div>
          
          {/* Seletor de Ficha do Personagem */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fbbf24' }}>FICHA ATIVA:</span>
            <select
              value={selectedChar?.caminhoArquivo || ''}
              onChange={(e) => {
                const found = personagens.find(p => p.caminhoArquivo === e.target.value);
                setSelectedChar(found || null);
              }}
              style={{
                background: 'rgba(15,23,42,0.9)',
                color: '#fff',
                border: '1px solid rgba(251,191,36,0.4)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                outline: 'none',
                minWidth: '220px'
              }}
            >
              <option value="">-- Escolha um Personagem --</option>
              {personagens.map(p => (
                <option key={p.caminhoArquivo} value={p.caminhoArquivo}>
                  {p.status === 'jogador' ? '🧙‍♂️' : p.status === 'inimigo' ? '👾' : '👤'} {p.nome} (Nv.{p.nivel})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* CONTAINER DO WIDGET */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* PAINEL ESQUERDO: SELEÇÃO & CONTROLE RÁPIDO */}
          <div style={{ width: '380px', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '15px' }}>
            {selectedChar ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* Nome & Ativação */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                      <img src={selectedChar.avatar || '/vite.svg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#fff' }}>{selectedChar.nome}</h4>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: selectedChar.status === 'jogador' ? '#38bdf8' : '#f87171' }}>{selectedChar.status}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePropChange('ativo', !selectedChar.ativo)}
                    style={{
                      background: selectedChar.ativo ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: selectedChar.ativo ? '#34d399' : '#f87171',
                      border: `1px solid ${selectedChar.ativo ? '#10b981' : '#ef4444'}`,
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {selectedChar.ativo ? <UserCheck size={12} /> : <UserMinus size={12} />}
                    {selectedChar.ativo ? 'Mesa: Ativo' : 'Mesa: Inativo'}
                  </button>
                </div>

                {/* Ações Rápidas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <button onClick={handleRestaurarHP} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', borderRadius: '6px', padding: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}>Restaurar HP</button>
                  <button onClick={handleZerarHP} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}>Matar (0 HP)</button>
                  <button onClick={handleLimparCondicoes} style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', borderRadius: '6px', padding: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}>Limpar Conds</button>
                </div>

                {/* Seletor de Abas Internas */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <button onClick={() => setActiveTab('pools')} style={{ flex: 1, padding: '8px', border: 'none', borderBottom: activeTab === 'pools' ? '2px solid #fbbf24' : 'none', background: 'transparent', color: activeTab === 'pools' ? '#fbbf24' : '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>Pools Vitais</button>
                  <button onClick={() => setActiveTab('atributos')} style={{ flex: 1, padding: '8px', border: 'none', borderBottom: activeTab === 'atributos' ? '2px solid #fbbf24' : 'none', background: 'transparent', color: activeTab === 'atributos' ? '#fbbf24' : '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>Atributos</button>
                </div>

                {/* Pools Vitais & Parâmetros */}
                {activeTab === 'pools' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    
                    {/* Vida (HP) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span style={{ color: '#f87171', fontWeight: 'bold' }}>❤️ HP / Integridade</span>
                        <span>{selectedChar.pv} / {selectedChar.pv_max}</span>
                      </div>
                      <input type="range" min={0} max={selectedChar.pv_max} value={selectedChar.pv} onChange={e => handlePropChange('pv', parseInt(e.target.value))} style={{ accentColor: '#ef4444', width: '100%' }} />
                    </div>

                    {/* Mana (PM) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>⚡ Mana Core</span>
                        <span>{selectedChar.mana} / {selectedChar.mana_max}</span>
                      </div>
                      <input type="range" min={0} max={selectedChar.mana_max || 100} value={selectedChar.mana} onChange={e => handlePropChange('mana', parseInt(e.target.value))} style={{ accentColor: '#3b82f6', width: '100%' }} />
                    </div>

                    {/* Energia */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span style={{ color: '#34d399', fontWeight: 'bold' }}>🏃‍♂️ Vigor / Energia</span>
                        <span>{selectedChar.energia} / {selectedChar.energia_max}</span>
                      </div>
                      <input type="range" min={0} max={selectedChar.energia_max} value={selectedChar.energia} onChange={e => handlePropChange('energia', parseInt(e.target.value))} style={{ accentColor: '#10b981', width: '100%' }} />
                    </div>

                    {/* Sanidade */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span style={{ color: '#c084fc', fontWeight: 'bold' }}>👁️ Sanidade Mental</span>
                        <span>{selectedChar.sanidade} / {selectedChar.sanidade_max}</span>
                      </div>
                      <input type="range" min={0} max={selectedChar.sanidade_max} value={selectedChar.sanidade} onChange={e => handlePropChange('sanidade', parseInt(e.target.value))} style={{ accentColor: '#a855f7', width: '100%' }} />
                    </div>

                    {/* Fome, Sede, Cansaço, Defesa */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '5px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#eab308' }}>🍖 Fome (0-100)</span>
                        <input type="number" value={selectedChar.fome} onChange={e => handlePropChange('fome', Math.max(0, parseInt(e.target.value) || 0))} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', padding: '4px 6px', fontSize: '0.75rem' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#60a5fa' }}>💧 Sede (0-100)</span>
                        <input type="number" value={selectedChar.sede} onChange={e => handlePropChange('sede', Math.max(0, parseInt(e.target.value) || 0))} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', padding: '4px 6px', fontSize: '0.75rem' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#f87171' }}>💤 Cansaço (0-100)</span>
                        <input type="number" value={selectedChar.cansaco} onChange={e => handlePropChange('cansaco', Math.max(0, parseInt(e.target.value) || 0))} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', padding: '4px 6px', fontSize: '0.75rem' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#fbbf24' }}>🛡️ Classe Armadura</span>
                        <input type="number" value={selectedChar.defesa} onChange={e => handlePropChange('defesa', Math.max(0, parseInt(e.target.value) || 0))} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', padding: '4px 6px', fontSize: '0.75rem' }} />
                      </div>
                    </div>

                    {/* Finanças */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '5px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#fbbf24' }}>🪙 Ouro</span>
                        <input type="number" value={selectedChar.ouro} onChange={e => handlePropChange('ouro', Math.max(0, parseInt(e.target.value) || 0))} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', padding: '4px 6px', fontSize: '0.75rem' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#a855f7' }}>💎 Riquezas</span>
                        <input type="number" value={selectedChar.riquezas} onChange={e => handlePropChange('riquezas', Math.max(0, parseInt(e.target.value) || 0))} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', padding: '4px 6px', fontSize: '0.75rem' }} />
                      </div>
                    </div>

                    {/* Grade de Condições/Efeitos Negativos & Positivos */}
                    <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Condições e Efeitos</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {[
                          { name: '🔥 Fogo', key: 'Fogo' },
                          { name: '❄️ Gelo', key: 'Gelo' },
                          { name: '🤕 Queda', key: 'Queda' },
                          { name: '🤢 Veneno', key: 'Veneno' },
                          { name: '👁️ Cego', key: 'Cego' },
                          { name: '💤 Sono', key: 'Sono' },
                          { name: '🩸 Sangrando', key: 'Sangrando' },
                          { name: '😵 Confuso', key: 'Confuso' },
                          { name: '💀 Amedrontado', key: 'Amedrontado' },
                          { name: '🛡️ Protegido', key: 'Protegido' },
                          { name: '⚔️ Inspirado', key: 'Inspirado' },
                          { name: '✨ Acelerado', key: 'Acelerado' },
                          { name: '💪 Fortalecido', key: 'Fortalecido' }
                        ].map(c => {
                          const active = selectedChar.status_efeitos.includes(c.key);
                          return (
                            <button
                              key={c.key}
                              onClick={() => toggleCondicao(c.key)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: active ? 'rgba(168,85,247,0.3)' : 'rgba(0,0,0,0.3)',
                                color: active ? '#fff' : '#94a3b8',
                                fontSize: '0.65rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}

                {/* Atributos da Ficha */}
                {activeTab === 'atributos' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* Atributos 4DET */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#c084fc', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Sistema 4DET</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {[
                          { label: 'FOR (Força)', val: selectedChar.forca, key: 'forca' },
                          { label: 'CON (Constituição)', val: selectedChar.constituicao, key: 'constituicao' },
                          { label: 'SAB (Sabedoria)', val: selectedChar.sabedoria, key: 'sabedoria' },
                          { label: 'DES (Destreza)', val: selectedChar.destreza, key: 'destreza' },
                          { label: 'INT (Inteligência)', val: selectedChar.inteligencia, key: 'inteligencia' },
                          { label: 'CAR (Carisma)', val: selectedChar.carisma, key: 'carisma' },
                        ].map(a => (
                          <div key={a.key} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>{a.label}</span>
                            <input
                              type="number"
                              value={a.val}
                              onChange={e => handlePropChange(a.key, Math.max(0, parseInt(e.target.value) || 0))}
                              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', padding: '4px 6px', fontSize: '0.75rem' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Atributos 3D&T */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#f97316', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Sistema 3D&T</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                        {[
                          { label: 'H', val: selectedChar.habilidade, key: 'habilidade' },
                          { label: 'A', val: selectedChar.armadura_3dt, key: 'armadura_3dt' },
                          { label: 'F', val: selectedChar.forca_3dt, key: 'forca_3dt' },
                          { label: 'R', val: selectedChar.resistencia, key: 'resistencia' },
                          { label: 'PdF', val: selectedChar.pdf, key: 'pdf' },
                        ].map(a => (
                          <div key={a.key} style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.65rem', color: '#ffedd5', fontWeight: 'bold' }}>{a.label}</span>
                            <input
                              type="number"
                              value={a.val}
                              onChange={e => handlePropChange(a.key, Math.max(0, parseInt(e.target.value) || 0))}
                              style={{ width: '40px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', padding: '4px 2px', fontSize: '0.75rem', textAlign: 'center' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                Selecione uma ficha no topo para carregar os controles de status e atributos.
              </div>
            )}
          </div>

          {/* PAINEL DIREITO: CATÁLOGO VISUAL DE ITENS E DISTRIBUIDOR */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(15,23,42,0.15)', position: 'relative' }}>
            
            {/* Navegação de Categorias do Catálogo */}
            <div style={{ display: 'flex', padding: '10px 15px', borderBottom: '1px solid rgba(255,255,255,0.08)', gap: '6px', background: 'rgba(0,0,0,0.2)', alignItems: 'center' }}>
              {[
                { label: 'Todos', val: 'todos' },
                { label: '⚔️ Armas', val: 'arma' },
                { label: '✨ Poderes', val: 'poder' },
                { label: '🧪 Poções', val: 'pocao' },
                { label: '💀 Maldições', val: 'maldicao' },
                { label: '📦 Campanha', val: 'objeto_campanha' }
              ].map(cat => (
                <button
                  key={cat.val}
                  onClick={() => setCatalogoFilter(cat.val as any)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: catalogoFilter === cat.val ? 'rgba(251,191,36,0.2)' : 'transparent',
                    color: catalogoFilter === cat.val ? '#fbbf24' : '#cbd5e1',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderBottom: catalogoFilter === cat.val ? '2px solid #fbbf24' : '2px solid transparent'
                  }}
                >
                  {cat.label}
                </button>
              ))}

              <button
                onClick={() => setShowCreateItem(true)}
                style={{
                  marginLeft: 'auto',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'rgba(16,185,129,0.2)',
                  color: '#10b981',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(16,185,129,0.3)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
              >
                <Plus size={12} /> Criar Item
              </button>
            </div>

            {/* Lista Grid de Cards do Catálogo */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {filteredCatalogo.map((item, idx) => {
                // Determina visualização baseado no tipo
                const borderColors = {
                  arma: 'rgba(239,68,68,0.3)',
                  poder: 'rgba(168,85,247,0.3)',
                  pocao: 'rgba(16,185,129,0.3)',
                  maldicao: 'rgba(244,63,94,0.3)',
                  objeto_campanha: 'rgba(56,189,248,0.3)'
                };
                const tagColors = {
                  arma: '#fca5a5',
                  poder: '#f0abfc',
                  pocao: '#6ee7b7',
                  maldicao: '#f43f5e',
                  objeto_campanha: '#93c5fd'
                };
                
                return (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${borderColors[item.tipo]}`,
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px',
                      transition: 'transform 0.2s, background 0.2s',
                      cursor: 'default'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#fff' }}>{item.nome}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {item.isCustom && (
                            <button
                              onClick={() => handleDeleteCustomItem(item.nome, item.tipo)}
                              style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                              title="Excluir Item Customizado"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                          <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', background: borderColors[item.tipo], color: tagColors[item.tipo], fontWeight: 'bold', textTransform: 'uppercase' }}>
                            {item.tipo}
                          </span>
                        </div>
                      </div>
                      
                      <p style={{ margin: '6px 0', fontSize: '0.7rem', color: '#cbd5e1', lineHeight: '1.3' }}>
                        {item.descricao}
                      </p>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.65rem', color: '#94a3b8' }}>
                        {item.custo && <span style={{ color: '#c084fc' }}>🔮 Custo: {item.custo}</span>}
                        {item.dano && <span style={{ color: '#f87171' }}>⚔️ Dano: {item.dano}</span>}
                        {item.efeito && <span style={{ color: '#fbbf24' }}>⚙️ Efeito: {item.efeito}</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDistribuirItem(item)}
                      disabled={!selectedChar}
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '6px',
                        border: 'none',
                        background: selectedChar ? 'linear-gradient(135deg, #fbbf24, #d97706)' : 'rgba(255,255,255,0.03)',
                        color: selectedChar ? '#000' : '#64748b',
                        fontWeight: 'bold',
                        fontSize: '0.7rem',
                        cursor: selectedChar ? 'pointer' : 'not-allowed',
                        transition: 'opacity 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={12} />
                      Conceder a {selectedChar ? selectedChar.nome : 'Ficha'}
                    </button>

                  </div>
                );
              })}
            </div>

            {/* FORMULÁRIO DE CRIAÇÃO DE ITEM */}
            {showCreateItem && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15,23,42,0.95)',
                zIndex: 10,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                overflowY: 'auto',
                backdropFilter: 'blur(8px)',
                fontFamily: 'var(--font-body)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                  <h4 style={{ margin: 0, color: '#fbbf24', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Criar Item Customizado</h4>
                  <button onClick={() => setShowCreateItem(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreateItemSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ color: '#cbd5e1', fontWeight: 'bold' }}>Nome do Item *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Espada Flamejante, Poção de Invisibilidade..."
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '6px 10px', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ color: '#cbd5e1', fontWeight: 'bold' }}>Tipo de Item</label>
                    <select
                      value={newItemType}
                      onChange={e => setNewItemType(e.target.value as any)}
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '6px 10px', outline: 'none' }}
                    >
                      <option value="arma">⚔️ Arma / Equipamento</option>
                      <option value="poder">✨ Poder / Magia</option>
                      <option value="pocao">🧪 Poção / Consumível</option>
                      <option value="maldicao">💀 Maldição / Condição</option>
                      <option value="objeto_campanha">📦 Objeto de Campanha</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ color: '#cbd5e1', fontWeight: 'bold' }}>Descrição</label>
                    <textarea
                      placeholder="Ex: Uma lâmina antiga que emana calor..."
                      value={newItemDesc}
                      onChange={e => setNewItemDesc(e.target.value)}
                      rows={2}
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '6px 10px', outline: 'none', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ color: '#cbd5e1', fontWeight: 'bold' }}>
                      Fórmula de Efeito / Ação
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: ataque_4, heal_20, mana_15, dano_2d6..."
                      value={newItemEffect}
                      onChange={e => setNewItemEffect(e.target.value)}
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '6px 10px', outline: 'none' }}
                    />
                    <small style={{ color: '#64748b', fontSize: '0.65rem' }}>
                      Formatos: <strong>ataque_X</strong> (bônus de ataque), <strong>defesa_X</strong> (bônus de defesa), <strong>heal_X</strong> (cura), <strong>mana_X</strong> (recupera mana), <strong>energia_X</strong> (recupera vigor), <strong>dano_X</strong> (expressão de dano).
                    </small>
                  </div>

                  {newItemType === 'arma' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ color: '#cbd5e1', fontWeight: 'bold' }}>Dano (Expressão de Dados)</label>
                      <input
                        type="text"
                        placeholder="Ex: 1d8, 2d6+2..."
                        value={newItemDamage}
                        onChange={e => setNewItemDamage(e.target.value)}
                        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '6px 10px', outline: 'none' }}
                      />
                    </div>
                  )}

                  {newItemType === 'poder' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ color: '#cbd5e1', fontWeight: 'bold' }}>Custo (Texto)</label>
                      <input
                        type="text"
                        placeholder="Ex: 2 PM, 5 Energia..."
                        value={newItemCost}
                        onChange={e => setNewItemCost(e.target.value)}
                        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '6px 10px', outline: 'none' }}
                      />
                    </div>
                  )}

                  {newItemType === 'pocao' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ color: '#cbd5e1', fontWeight: 'bold' }}>Quantidade Inicial</label>
                      <input
                        type="number"
                        min={1}
                        value={newItemQty}
                        onChange={e => setNewItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '6px 10px', outline: 'none' }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Salvar Item
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateItem(false)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

        </div>

      </div>
    </DraggableWindow>
  );
};
