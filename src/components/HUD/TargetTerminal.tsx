// src/components/HUD/TargetTerminal.tsx
import React, { useEffect, useState, useRef } from 'react';
import { HealthBar } from './HealthBar';
import { 
    Dices, Trash2, Plus, Swords, 
    Backpack, Zap, Sword, HeartPulse, 
    ShieldAlert, Sparkles, Settings, Activity, 
    FileText, Heart, Skull, Cpu, User
} from 'lucide-react';
import { loadMarkdownFile, saveMarkdownContent } from '../../utils/githubApi';
import { WoDParser } from '../../rules/WoDParser';
import { state, applyDamageToToken, pushChatMessage, updateTokenProps, getTargets, addCombatParticipant } from '../../store';
import { useWiki } from '../../hooks/useWiki';
import * as yaml from 'js-yaml';
import { syncTokenFieldToWiki } from '../../services/wiki/syncWiki';
import { WikiIndexer } from '../../services/wiki/WikiIndexer';

interface Macro {
  id: string;
  name: string;
  formula: string;
  system: 'WoD';
  pool: number;
  hunger: number;
  damage: number;
}

const attributeBlacklist = [
  'tags', 'avatar', 'imagem', 'imageurl', 'status_efeitos', 'inventario', 
  'armas', 'poderes', 'pocoes', 'maldicoes', 'objetos_campanha', 'ativo', 
  'nome', 'titulo', 'title', 'pv', 'pv_max', 'hp', 'hp_max', 'pm', 'pm_max', 
  'mana', 'mana_max', 'energia', 'energiamax', 'thirst', 'hunger', 'sanity', 
  'cansaco', 'cansacomax', 'ouro', 'riquezas', 'status', 'tipo', 'usos_cura', 
  'usos_cura_atual', 'saqueado', 'macros', 'fome', 'fome_max', 'sede', 'sede_max', 
  'sanidade', 'sanidade_max', 'fichas', 'personagens'
];

export const TargetTerminal: React.FC<{ tokenId?: string; wikiPath?: string; isGM?: boolean }> = ({ tokenId, wikiPath, isGM = true }) => {
  const [tokenData, setTokenData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'roll' | 'attacks' | 'items' | 'config'>('roll');
    const { index, isLoading: isWikiLoading } = useWiki();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const parseNum = (val: any, fallback: number): number => {
      if (val === undefined || val === null || val === '') return fallback;
      const n = Number(val);
      return isNaN(n) ? fallback : n;
    };

    if (tokenId) {
      const observer = () => {
        const token = state.tokens.get(tokenId) as any;
        if (token) {
          const entry = index.find(e => {
            if (token.wikiSlug && e.slug === token.wikiSlug) return true;
            const nameRaw = (token.name || '').trim().toLowerCase();
            return (e.metadata?.titulo || '').toLowerCase().trim() === nameRaw || e.slug.toLowerCase().trim() === nameRaw;
          });
          const metadata = entry?.metadata || {};
          
          setTokenData({
            ...token,
            hp: parseNum(token.hp, parseNum(metadata.HP ?? metadata.pv, 0)),
            maxHp: parseNum(token.maxHp, parseNum(metadata.HP_max ?? metadata.pv_max ?? metadata.HP ?? metadata.pv, 100)),
            mana: parseNum(token.mana, parseNum(metadata.PM ?? metadata.mana, 0)),
            maxMana: parseNum(token.maxMana, parseNum(metadata.PM_max ?? metadata.mana_max ?? metadata.PM ?? metadata.mana, 100)),
            hunger: parseNum(token.hunger, parseNum(metadata.fome ?? metadata.Fome, 0)),
            thirst: parseNum(token.thirst, parseNum(metadata.sede ?? metadata.Sede, 0)),
            sanity: parseNum(token.sanity, parseNum(metadata.sanidade ?? metadata.Sanidade, 100)),
            energia: parseNum(token.energia, parseNum(metadata.energia, 100)),
            energiaMax: parseNum(token.energiaMax, parseNum(metadata.energia_max, 100)),
            cansaco: parseNum(token.cansaco, parseNum(metadata.cansaco, 0)),
            cansacoMax: parseNum(token.cansacoMax, parseNum(metadata.cansaco_max, 100)),
            defesa: parseNum(token.defesa, parseNum(metadata.defesa, 10)),
            ouro: parseNum(token.ouro, parseNum(metadata.ouro ?? metadata.Ouro, 0)),
            riquezas: parseNum(token.riquezas, parseNum(metadata.riquezas ?? metadata.Riquezas, 0)),
            status: token.status ?? metadata.status ?? 'npc',
            ativo: token.ativo ?? (metadata.ativo !== false),
            nivel: parseNum(token.nivel, parseNum(metadata.nivel ?? metadata.Nivel, 1)),
            ataque: parseNum(token.ataque, parseNum(metadata.ataque ?? metadata.Ataque, 10)),
            imageUrl: token.imageUrl ?? metadata.avatar ?? metadata.imagem ?? metadata.imageUrl ?? '/vite.svg',
            tokenShape: token.tokenShape ?? metadata.tokenShape ?? 'circle',
            sizeScale: parseNum(token.sizeScale, parseNum(metadata.sizeScale, 1)),
            borderColor: token.borderColor ?? metadata.borderColor ?? '#06b6d4',
            showName: token.showName ?? (metadata.showName === true),
            hpBarMode: token.hpBarMode ?? metadata.hpBarMode ?? 'always'
          });
        }
      };

      observer();
      state.tokens.observe(observer);
      return () => {
        state.tokens.unobserve(observer);
      };
    } else if (wikiPath) {
      const entry = index.find(e => e.path === wikiPath);
      if (entry) {
        const metadata = entry.metadata || {};
        setTokenData({
          name: metadata.nome || metadata.titulo || entry.slug,
          hp: parseNum(metadata.HP ?? metadata.pv, 0),
          maxHp: parseNum(metadata.HP_max ?? metadata.pv_max ?? metadata.HP ?? metadata.pv, 100),
          mana: parseNum(metadata.PM ?? metadata.mana, 0),
          maxMana: parseNum(metadata.PM_max ?? metadata.mana_max ?? metadata.PM ?? metadata.mana, 100),
          hunger: parseNum(metadata.fome ?? metadata.Fome, 0),
          thirst: parseNum(metadata.sede ?? metadata.Sede, 0),
          sanity: parseNum(metadata.sanidade ?? metadata.Sanidade, 100),
          energia: parseNum(metadata.energia, 100),
          energiaMax: parseNum(metadata.energia_max, 100),
          cansaco: parseNum(metadata.cansaco, 0),
          cansacoMax: parseNum(metadata.cansaco_max, 100),
          defesa: parseNum(metadata.defesa, 10),
          ouro: parseNum(metadata.ouro ?? metadata.Ouro, 0),
          riquezas: parseNum(metadata.riquezas ?? metadata.Riquezas, 0),
          status: metadata.status || 'npc',
          ativo: metadata.ativo !== false,
          nivel: parseNum(metadata.nivel ?? metadata.Nivel, 1),
          ataque: parseNum(metadata.ataque ?? metadata.Ataque, 10),
          imageUrl: metadata.avatar ?? metadata.imagem ?? metadata.imageUrl ?? '/vite.svg',
          tokenShape: metadata.tokenShape ?? 'circle',
          sizeScale: parseNum(metadata.sizeScale, 1),
          borderColor: metadata.borderColor ?? '#06b6d4',
          showName: metadata.showName === true,
          hpBarMode: metadata.hpBarMode ?? 'always'
        });
      }
    }
  }, [tokenId, wikiPath, index]);

  const handlePropChange = (field: string, value: any) => {
    if (tokenId) {
      updateTokenProps(tokenId, { [field]: value });
    } else {
      setTokenData((prev: any) => prev ? { ...prev, [field]: value } : null);
    }
  };

  const handlePropChangeEnd = async (field: string, value: any) => {
    const path = tokenId ? wikiEntry?.path : wikiPath;
    if (!path) return;
    
    let frontmatterField = field;
    if (field === 'name') frontmatterField = 'nome';
    
    const success = await syncTokenFieldToWiki(path, frontmatterField, value);
    if (success) {
      WikiIndexer.clearCache();
      window.dispatchEvent(new Event('wiki-updated'));
    }
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja deletar este personagem permanentemente?')) {
            state.tokens.delete(tokenId);
      window.dispatchEvent(new CustomEvent('close-sheet', { detail: { tokenId } }));
    }
  };

  const handleAvatarClick = () => {
    if (isGM && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200; 
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        } else if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const webpDataUrl = canvas.toDataURL('image/webp', 0.8);
        handlePropChange('imageUrl', webpDataUrl);
        handlePropChangeEnd('imageUrl', webpDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleItemAction = async (listName: string, itemIdx: number, action: 'usar' | 'equipar' | 'conjurar') => {
    if (!wikiEntry) return;

    try {
      const rawMd = await loadMarkdownFile(wikiEntry.path);
      if (!rawMd) return;
      const parts = rawMd.split('---');
      if (parts.length < 3) return;

      const body = parts.slice(2).join('---');
      const data = yaml.load(parts[1]) as any;
      if (!data) return;

      const list = data[listName];
      if (!list || !list[itemIdx]) return;
      const item = list[itemIdx];

      if (action === 'usar') {
        const qty = item.quantidade !== undefined ? Number(item.quantidade) : 1;
        if (qty > 0) {
          if (item.quantidade !== undefined) {
            item.quantidade -= 1;
          } else {
            list.splice(itemIdx, 1);
          }

          const efeito = String(item.efeito || '').toLowerCase();
          
          if (efeito.startsWith('heal_') || efeito.startsWith('cura_')) {
            const val = parseInt(efeito.split('_')[1], 10) || 10;
            const newHp = Math.min((tokenData.maxHp || 100), (tokenData.hp || 0) + val);
            handlePropChange('hp', newHp);
            pushChatMessage(`🧪 <b>${tokenData.name}</b> consumiu ${item.nome} e curou ${val} PV.`, false, false);
          } else if (efeito.startsWith('mana_') || efeito.startsWith('pm_')) {
            const val = parseInt(efeito.split('_')[1], 10) || 10;
            const newMana = Math.min((tokenData.maxMana || 100), (tokenData.mana || 0) + val);
            handlePropChange('mana', newMana);
            pushChatMessage(`🧪 <b>${tokenData.name}</b> consumiu ${item.nome} e recuperou ${val} Mana.`, false, false);
          } else if (efeito.startsWith('energia_') || efeito.startsWith('vigor_')) {
            const val = parseInt(efeito.split('_')[1], 10) || 10;
            const newEnergia = Math.min((tokenData.energiaMax || 100), (tokenData.energia || 0) + val);
            handlePropChange('energia', newEnergia);
            pushChatMessage(`🏃‍♂️ <b>${tokenData.name}</b> consumiu ${item.nome} e recuperou ${val} Energia.`, false, false);
          } else if (efeito.startsWith('sanidade_') || efeito.startsWith('mente_')) {
            const val = parseInt(efeito.split('_')[1], 10) || 10;
            const newSanity = Math.min((tokenData.sanityMax || 100), (tokenData.sanity || 0) + val);
            handlePropChange('sanity', newSanity);
            pushChatMessage(`👁️ <b>${tokenData.name}</b> consumiu ${item.nome} e recuperou ${val} Sanidade.`, false, false);
          }

          if (item.quantidade <= 0) {
            list.splice(itemIdx, 1);
          }
        }
      } else if (action === 'equipar') {
        item.equipado = !item.equipado;
        const efeito = String(item.efeito || '').toLowerCase();
        
        if (efeito.startsWith('defesa_') || efeito.startsWith('armadura_')) {
          const defVal = parseInt(efeito.split('_')[1], 10) || 2;
          const newDef = item.equipado ? (tokenData.defesa || 10) + defVal : (tokenData.defesa || 10) - defVal;
          handlePropChange('defesa', newDef);
          pushChatMessage(`🛡️ <b>${tokenData.name}</b> ${item.equipado ? 'equipou' : 'desequipou'} ${item.nome} (+${defVal} Defesa).`, false, false);
        } else if (efeito.startsWith('ataque_')) {
          const atkVal = parseInt(efeito.split('_')[1], 10) || 2;
          const newAtk = item.equipado ? (tokenData.ataque || 10) + atkVal : (tokenData.ataque || 10) - atkVal;
          handlePropChange('ataque', newAtk);
          pushChatMessage(`⚔️ <b>${tokenData.name}</b> ${item.equipado ? 'empunhou' : 'guardou'} ${item.nome} (+${atkVal} Ataque).`, false, false);
        }
      } else if (action === 'conjurar') {
        const custoMatch = String(item.custo || '').match(/(\d+)/);
        const custoVal = custoMatch ? parseInt(custoMatch[0], 10) : 0;
        
        if (custoVal > 0 && (tokenData.mana || 0) < custoVal) {
          alert("Mana/Bateria insuficiente para conjurar!");
          return;
        }

        if (custoVal > 0) {
          const newMana = Math.max(0, (tokenData.mana || 0) - custoVal);
          handlePropChange('mana', newMana);
        }

        const danoMatch = String(item.efeito || '').match(/dano_(\w+)/);
        const danoExpr = danoMatch ? danoMatch[1] : '1d6';
        
        pushChatMessage(`✨ <b>${tokenData.name}</b> conjurou <b>${item.nome}</b>! (Gasto: ${item.custo || '0 PM'})<br/><i>${item.descricao}</i><br/>🎲 Dano sugerido: <b>${danoExpr}</b>`, false, false);
      }

      if (data.inventario && Array.isArray(data.inventario)) {
        const invIndex = data.inventario.findIndex((i: any) => i.nome === item.nome);
        if (invIndex !== -1) {
          data.inventario[invIndex].quantidade = item.quantidade;
          data.inventario[invIndex].equipado = item.equipado;
          if (item.quantidade <= 0) {
            data.inventario.splice(invIndex, 1);
          }
        }
      }

      const newFrontStr = yaml.dump(data);
      const newContent = `---\n${newFrontStr}---\n${body}`;
      
      await saveMarkdownContent(wikiEntry.path, newContent);
      wikiEntry.metadata[listName] = data[listName];
      wikiEntry.metadata.inventario = data.inventario;
      setTokenData({ ...tokenData });
    } catch (err) {
      console.error("Erro ao processar item:", err);
    }
  };

  const handleRollAttribute = (key: string, value: any) => {
    const val = Number(value);
    if (isNaN(val)) return;

    let formula = '';
    let mod = 0;
    let rollType = 'Flat';

    const attrKeys4det = ['for', 'des', 'con', 'int', 'sab', 'car', 'forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma'];
    const attrKeys3dt = ['h', 'a', 'f', 'r', 'pdf', 'habilidade', 'armadura', 'resistencia', 'poder de fogo'];

    let dieRoll = Math.floor(Math.random() * 20) + 1;
    let total = 0;

    if (attrKeys4det.includes(key.toLowerCase())) {
      mod = Math.floor((val - 10) / 2);
      total = dieRoll + mod;
      formula = `1d20 + ${mod >= 0 ? '+' : ''}${mod}`;
      rollType = '4DET / D&D (d20 + Modificador)';
    } else if (attrKeys3dt.includes(key.toLowerCase())) {
      dieRoll = Math.floor(Math.random() * 6) + 1;
      total = dieRoll + val;
      formula = `1d6 + ${val}`;
      rollType = '3D&T (1d6 + Atributo)';
    } else {
      total = dieRoll + val;
      formula = `1d20 + ${val}`;
      rollType = 'd20 + Valor Inteiro';
    }

    const messageHtml = `🎲 <b>${tokenData.name}</b> realizou um teste de <b>${key.toUpperCase()}</b> (${rollType})<br/>
      Fórmula: <b>${formula}</b><br/>
      Rolagem: <b>${total}</b> (Dado: ${dieRoll} + Bônus: ${attrKeys4det.includes(key.toLowerCase()) ? mod : val})`;

    pushChatMessage(messageHtml, total >= 15, total < 8);

    window.dispatchEvent(new CustomEvent('dice-roll', {
      detail: {
        title: `Teste: ${key.toUpperCase()}`,
        result: total.toString(),
        type: 'utility'
      }
    }));
  };

  const handleToggleCondition = async (conditionName: string) => {
    if (!wikiEntry) return;
    try {
      const rawMd = await loadMarkdownFile(wikiEntry.path);
      if (!rawMd) return;
      const parts = rawMd.split('---');
      if (parts.length < 3) return;

      const body = parts.slice(2).join('---');
      const data = yaml.load(parts[1]) as any;
      if (!data) return;

      let list = data.status_efeitos || [];
      if (!Array.isArray(list)) list = [];

      const idx = list.indexOf(conditionName);
      if (idx !== -1) {
        list.splice(idx, 1);
        pushChatMessage(`✨ <b>${tokenData.name}</b> não está mais sob a condição <b>${conditionName}</b>.`, false, false);
      } else {
        list.push(conditionName);
        pushChatMessage(`⚠️ <b>${tokenData.name}</b> agora está sob a condição <b>${conditionName}</b>!`, false, false);
      }

      data.status_efeitos = list;
      
      const newFrontStr = yaml.dump(data);
      const newContent = `---\n${newFrontStr}---\n${body}`;
      await saveMarkdownContent(wikiEntry.path, newContent);

      wikiEntry.metadata.status_efeitos = list;
      if (tokenId) {
        updateTokenProps(tokenId, { status_efeitos: list });
      }
      setTokenData({ ...tokenData, status_efeitos: list });
      
      WikiIndexer.clearCache();
      window.dispatchEvent(new Event('wiki-updated'));
    } catch (err) {
      console.error("Erro ao alterar condições:", err);
    }
  };

  if (!tokenData) {
    return <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Ficha não encontrada ou deletada.</div>;
  }

  const wikiEntry = wikiPath 
    ? (index.find(e => e.path === wikiPath) || null)
    : (tokenData 
        ? (index.find(e => {
            if (tokenData.wikiSlug && e.slug === tokenData.wikiSlug) return true;
            const tokenNameRaw = (tokenData.name || '').trim().toLowerCase();
            const titleMatch = (e.metadata.titulo || '').toLowerCase().trim() === tokenNameRaw;
            const slugMatch = e.slug.toLowerCase().trim() === tokenNameRaw;
            return titleMatch || slugMatch;
          }) || null)
        : null);

  const macros: Macro[] = tokenData.macros || [];

  const handleAddMacro = () => {
    const newMacro: Macro = {
      id: 'm_' + Date.now().toString(),
      name: 'Novo Ataque',
      formula: 'Atributo + Habilidade',
      system: 'WoD',
      pool: 5,
      hunger: 0,
      damage: 10
    };
        updateTokenProps(tokenId, { macros: [...macros, newMacro] });
  };

  const handleEditMacro = (macroId: string, updates: Partial<Macro>) => {
    const updatedMacros = macros.map(m => m.id === macroId ? { ...m, ...updates } : m);
        updateTokenProps(tokenId, { macros: updatedMacros });
  };

  const handleDeleteMacro = (macroId: string) => {
    const updatedMacros = macros.filter(m => m.id !== macroId);
        updateTokenProps(tokenId, { macros: updatedMacros });
  };

  const handleRoll = (macro: Macro) => {
    if (macro.system === 'WoD') {
      const result = WoDParser.rollV5(macro.pool, macro.hunger, 3);
      const targetsIds = getTargets();
      
      let targetNames = "ninguém (Nenhum alvo selecionado)";
      if (targetsIds.length > 0) {
        targetNames = targetsIds.map(id => (state.tokens.get(id) as any)?.name || 'Desconhecido').join(', ');
      }

      let messageHtml = `<b>${tokenData.name}</b> ataca <b>${targetNames}</b> com <b>${macro.name}</b><br/>
        Sucessos: <b>${result.successes}</b> <br/>
        <span style="color:var(--text-secondary); font-size: 0.75rem">Dados: [${result.diceResult.normal.join(', ')}] | Estresse: [${result.diceResult.hunger.join(', ')}]</span>`;
        
      if (result.isMessyCritical) {
        messageHtml += `<br/><b style="color: var(--danger)">CRÍTICO CAÓTICO!</b> (Perdeu o controle do ataque)`;
      } else if (result.isBestialFailure) {
        messageHtml += `<br/><b style="color: var(--danger)">FALHA CRÍTICA!</b> (Desastre iminente)`;
      } else if (result.successes >= 3) {
        if (targetsIds.length > 0) {
          messageHtml += `<br/><b style="color: var(--success)">Acerto Crítico!</b> Causou ${macro.damage} de dano!`;
          targetsIds.forEach(targetId => applyDamageToToken(targetId, macro.damage));
        } else {
          messageHtml += `<br/><b style="color: var(--warning)">Acerto Crítico!</b> (Mas nenhum alvo estava na mira para receber os ${macro.damage} de dano).`;
        }
      } else {
        messageHtml += `<br/><b>Falhou!</b> O ataque não penetrou as defesas.`;
      }

      pushChatMessage(messageHtml, result.successes >= 3 && !result.isMessyCritical, result.isBestialFailure || result.isMessyCritical);

      window.dispatchEvent(new CustomEvent('dice-roll', {
        detail: {
          title: macro.name,
          result: result.isBestialFailure ? 'FALHA CRÍTICA' : result.isMessyCritical ? 'CRÍTICO CAÓTICO' : `${result.successes} SUCESSOS`,
          type: result.isBestialFailure || result.isMessyCritical ? 'attack' : result.successes >= 3 ? 'success' : 'utility'
        }
      }));
    }
  };

  const handleRollInitiative = () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const finalValue = parseInt(prompt(`Iniciativa para ${tokenData.name}:`, roll.toString()) || '0');
    if (!isNaN(finalValue)) {
            addCombatParticipant(tokenId, tokenData.name, finalValue, tokenData.imageUrl);
      pushChatMessage(`<b>${tokenData.name}</b> rolou Iniciativa: <b>${finalValue}</b>`, false, false);
      
      window.dispatchEvent(new CustomEvent('dice-roll', {
        detail: {
          title: 'Iniciativa',
          result: finalValue.toString(),
          type: 'utility'
        }
      }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'jogador': return 'rgba(16, 185, 129, 0.2)';
      case 'npc': return 'rgba(59, 130, 246, 0.2)';
      case 'inimigo': return 'rgba(225, 29, 72, 0.2)';
      default: return 'transparent';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'jogador': return <User size={16} color="#6ee7b7" />;
      case 'npc': return <Cpu size={16} color="#93c5fd" />;
      case 'inimigo': return <Skull size={16} color="#fda4af" />;
      default: return <User size={16} />;
    }
  };

  // Render Tabs
  const renderRollTab = () => {
    if (!wikiEntry) {
      return (
        <div style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.75rem' }}>
          Nenhuma propriedade de ficha encontrada no arquivo MD.
        </div>
      );
    }

    const metadata = wikiEntry.metadata || {};
    const standardAttrs: [string, any][] = [];
    const otherProperties: [string, any][] = [];

    const attrKeys4det = ['for', 'des', 'con', 'int', 'sab', 'car', 'forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma'];
    const attrKeys3dt = ['h', 'a', 'f', 'r', 'pdf', 'habilidade', 'armadura', 'resistencia', 'poder de fogo'];

    Object.entries(metadata).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (attributeBlacklist.includes(lowerKey) || typeof value === 'object') return;

      if (attrKeys4det.includes(lowerKey) || attrKeys3dt.includes(lowerKey)) {
        standardAttrs.push([key, value]);
      } else {
        otherProperties.push([key, value]);
      }
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Atributos (4DET / 3D&T)</h5>
          {standardAttrs.length === 0 ? (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sem atributos na ficha.</span>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
              {standardAttrs.map(([key, value]) => {
                const valNum = Number(value);
                const isNumeric = !isNaN(valNum);
                const is4det = attrKeys4det.includes(key.toLowerCase());
                const mod = is4det ? Math.floor((valNum - 10) / 2) : 0;
                
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', padding: '0.4rem', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{key}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white' }}>
                        {String(value)} {is4det && isNumeric && <span style={{ fontSize: '0.7rem', color: mod >= 0 ? '#6ee7b7' : '#f87171' }}>({mod >= 0 ? '+' : ''}{mod})</span>}
                      </span>
                    </div>
                    {isNumeric && (
                      <button
                        onClick={() => handleRollAttribute(key, value)}
                        style={{
                          padding: '2px 6px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)',
                          color: '#f0abfc', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '2px'
                        }}
                      >
                        <Dices size={10} /> d20
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Perícias & Status Gerais</h5>
          {otherProperties.length === 0 ? (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sem perícias listadas.</span>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
              {otherProperties.map(([key, value]) => {
                const valNum = Number(value);
                const isNumeric = !isNaN(valNum);
                
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)', padding: '0.35rem 0.45rem', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{key}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1' }}>{String(value)}</span>
                    </div>
                    {isNumeric && (
                      <button
                        onClick={() => handleRollAttribute(key, value)}
                        style={{
                          padding: '2px 6px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.08)',
                          color: '#cbd5e1', borderRadius: '4px', fontSize: '0.65rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '2px'
                        }}
                      >
                        <Dices size={10} /> Rol
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAttacksTab = () => {
    const showArmas = wikiEntry && wikiEntry.metadata.armas && Array.isArray(wikiEntry.metadata.armas) && wikiEntry.metadata.armas.length > 0;
    const showPoderes = wikiEntry && wikiEntry.metadata.poderes && Array.isArray(wikiEntry.metadata.poderes) && wikiEntry.metadata.poderes.length > 0;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {showArmas && (
          <div>
            <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.7rem', color: '#f87171', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}><Sword size={12} /> Armas Equipadas</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {wikiEntry.metadata.armas.map((item: any, idx: number) => {
                const danoExpr = item.dano || '1d6';
                
                const handleRollWeapon = () => {
                  const dieRoll = Math.floor(Math.random() * 20) + 1;
                  const atkBonus = Number(tokenData.ataque) || 0;
                  const totalAtk = dieRoll + atkBonus;
                  const targetsIds = getTargets();
                  
                  let targetNames = "ninguém (Nenhum alvo selecionado)";
                  if (targetsIds.length > 0) {
                    targetNames = targetsIds.map(id => (state.tokens.get(id) as any)?.name || 'Desconhecido').join(', ');
                  }

                  let msg = `⚔️ <b>${tokenData.name}</b> ataca <b>${targetNames}</b> com <b>${item.nome}</b>!<br/>
                    Ataque: <b>${totalAtk}</b> (Dado: ${dieRoll} + Bônus: ${atkBonus})<br/>`;
                  
                  if (dieRoll === 20) {
                    msg += `<b style="color:var(--success)">SUCESSO CRÍTICO!</b>`;
                  }

                  let dmgTotal = 0;
                  const dmgMatch = danoExpr.match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/i);
                  if (dmgMatch) {
                    const numDice = parseInt(dmgMatch[1]) || 1;
                    const diceFaces = parseInt(dmgMatch[2]) || 6;
                    const flatDmg = parseInt(dmgMatch[3]) || 0;
                    
                    let rolls: number[] = [];
                    for(let i=0; i<numDice; i++) {
                      rolls.push(Math.floor(Math.random() * diceFaces) + 1);
                    }
                    dmgTotal = rolls.reduce((a,b) => a+b, 0) + flatDmg;
                    msg += `<br/>🎲 Rolo de Dano [${rolls.join(', ')}]${flatDmg ? ` + ${flatDmg}` : ''}: <b>${dmgTotal} de Dano Letal</b>!`;
                  } else {
                    dmgTotal = 5;
                    msg += `<br/>🎲 Causa <b>${dmgTotal} de Dano</b>!`;
                  }

                  if (targetsIds.length > 0) {
                    targetsIds.forEach(tId => applyDamageToToken(tId, dmgTotal));
                  }

                  pushChatMessage(msg, totalAtk >= 14, dieRoll === 1);

                  window.dispatchEvent(new CustomEvent('dice-roll', {
                    detail: {
                      title: `Ataque: ${item.nome}`,
                      result: totalAtk.toString(),
                      type: 'attack'
                    }
                  }));
                };

                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.4rem', borderRadius: '6px', borderLeft: item.equipado ? '3px solid #ef4444' : '3px solid var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.75rem', color: item.equipado ? 'white' : '#cbd5e1', fontWeight: item.equipado ? 'bold' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.nome}
                      </span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Dano: {danoExpr} | {item.descricao || 'Sem descrição'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
                      <button
                        onClick={handleRollWeapon}
                        style={{ padding: '2px 6px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        ATK
                      </button>
                      <button 
                        style={{ padding: '2px 4px', background: item.equipado ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', border: item.equipado ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(59,130,246,0.2)', color: item.equipado ? '#fca5a5' : '#93c5fd', borderRadius: '4px', fontSize: '0.6rem', cursor: 'pointer' }}
                        onClick={() => handleItemAction('armas', idx, 'equipar')}
                      >
                        {item.equipado ? 'Guardar' : 'Equipar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showPoderes && (
          <div>
            <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.7rem', color: '#c084fc', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={12} /> Habilidades & Poderes</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {wikiEntry.metadata.poderes.map((item: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.4rem', borderRadius: '6px', borderLeft: '3px solid #a855f7' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.nome} <span style={{ fontSize: '0.65rem', color: '#c084fc' }}>({item.custo || '0 PM'})</span>
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.descricao || 'Sem descrição'}
                    </span>
                  </div>
                  <button 
                    style={{ padding: '2px 6px', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', color: '#d8b4fe', borderRadius: '4px', fontSize: '0.6rem', cursor: 'pointer', marginLeft: '4px' }}
                    onClick={() => handleItemAction('poderes', idx, 'conjurar')}
                  >
                    USAR
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <h5 style={{ margin: 0, fontSize: '0.7rem', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>Ataques e Macros</h5>
            {isGM && (
              <button onClick={handleAddMacro} className="btn-icon" style={{ padding: '1px', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', background: 'transparent', borderRadius: '4px' }}>
                <Plus size={10} />
              </button>
            )}
          </div>

          {macros.length === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Nenhum ataque customizado.</span>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {macros.map((macro) => (
              <div key={macro.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--glass-border)', borderLeft: '3px solid var(--accent-primary)', borderRadius: '6px', padding: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {isGM ? (
                    <input 
                      type="text" 
                      value={macro.name} 
                      onChange={e => handleEditMacro(macro.id, { name: e.target.value })}
                      style={{ background: 'transparent', border: 'none', borderBottom: '1px dashed var(--text-secondary)', color: 'white', fontWeight: 600, width: '120px', fontSize: '0.75rem', padding: 0 }} 
                    />
                  ) : (
                    <span style={{ fontWeight: 600, color: 'white', fontSize: '0.75rem' }}>{macro.name}</span>
                  )}
                  
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleRoll(macro)}
                      style={{ padding: '2px 6px', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '0.6rem', fontWeight: 'bold' }}
                    >
                      ROLAR
                    </button>
                    {isGM && (
                      <button onClick={() => handleDeleteMacro(macro.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {isGM && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                      Dados:
                      <input type="number" value={macro.pool} onChange={e => handleEditMacro(macro.id, { pool: parseInt(e.target.value) || 0 })} style={{ width: '22px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.6rem', borderRadius: '3px', padding: '1px', textAlign: 'center' }} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                      Fome:
                      <input type="number" value={macro.hunger} onChange={e => handleEditMacro(macro.id, { hunger: parseInt(e.target.value) || 0 })} style={{ width: '22px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.6rem', borderRadius: '3px', padding: '1px', textAlign: 'center' }} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                      Dano:
                      <input type="number" value={macro.damage} onChange={e => handleEditMacro(macro.id, { damage: parseInt(e.target.value) || 0 })} style={{ width: '22px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.6rem', borderRadius: '3px', padding: '1px', textAlign: 'center' }} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '2px', gridColumn: 'span 3' }}>
                      Fórm:
                      <input type="text" value={macro.formula || ''} onChange={e => handleEditMacro(macro.id, { formula: e.target.value })} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.6rem', borderRadius: '3px', padding: '1px 3px' }} />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderItemsTab = () => {
    const showPocoes = wikiEntry && wikiEntry.metadata.pocoes && Array.isArray(wikiEntry.metadata.pocoes) && wikiEntry.metadata.pocoes.length > 0;
    const showObjetos = wikiEntry && wikiEntry.metadata.objetos_campanha && Array.isArray(wikiEntry.metadata.objetos_campanha) && wikiEntry.metadata.objetos_campanha.length > 0;
    const showGeral = wikiEntry && wikiEntry.metadata.inventario && Array.isArray(wikiEntry.metadata.inventario) && wikiEntry.metadata.inventario.length > 0;
    
    if (!showPocoes && !showObjetos && !showGeral) {
      return (
        <div style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.75rem' }}>
          Mochila vazia.
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {showPocoes && (
          <div>
            <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.7rem', color: '#10b981', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}><HeartPulse size={12} /> Poções & Elixires</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {wikiEntry.metadata.pocoes.map((item: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.4rem', borderRadius: '6px', borderLeft: '3px solid #10b981' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.nome} {item.quantidade > 1 ? `(x${item.quantidade})` : ''}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.descricao || 'Sem descrição'}
                    </span>
                  </div>
                  <button 
                    style={{ padding: '2px 6px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7', borderRadius: '4px', fontSize: '0.6rem', cursor: 'pointer', marginLeft: '4px' }}
                    onClick={() => handleItemAction('pocoes', idx, 'usar')}
                  >
                    USAR
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showObjetos && (
          <div>
            <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.7rem', color: '#38bdf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}><Backpack size={12} /> Relíquias de Campanha</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {wikiEntry.metadata.objetos_campanha.map((item: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.3)', padding: '0.4rem', borderRadius: '6px', borderLeft: '3px solid #38bdf8' }}>
                  <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 'bold' }}>{item.nome}</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{item.descricao || 'Sem descrição'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showGeral && (!showPocoes && !showObjetos) && (
          <div>
            <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Outros Itens</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {wikiEntry.metadata.inventario.map((item: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.4rem', borderRadius: '6px', borderLeft: item.equipado ? '3px solid var(--accent-primary)' : '3px solid var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.75rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.nome} {item.quantidade > 1 ? `(x${item.quantidade})` : ''}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      {item.tipo || 'item'} | {item.efeito || 'nenhum'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderConfigTab = () => {
    const activeConditions: string[] = wikiEntry?.metadata.status_efeitos || [];
    
    const conditionsList = [
      { id: 'fogo', label: '🔥 Fogo', color: '#f97316' },
      { id: 'gelo', label: '❄️ Gelo', color: '#38bdf8' },
      { id: 'queda', label: '🤕 Queda', color: '#f87171' },
      { id: 'envenenado', label: '🤢 Veneno', color: '#34d399' },
      { id: 'cego', label: '👁️ Cego', color: '#94a3b8' },
      { id: 'sono', label: '💤 Sono', color: '#c084fc' },
      { id: 'sangrando', label: '🩸 Sangrando', color: '#f43f5e' },
      { id: 'confuso', label: '😵 Confuso', color: '#eab308' },
      { id: 'morto', label: '💀 Morto', color: '#ef4444' }
    ];

    const showMaldicoes = wikiEntry && wikiEntry.metadata.maldicoes && Array.isArray(wikiEntry.metadata.maldicoes) && wikiEntry.metadata.maldicoes.length > 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        
        {/* Parâmetros de Sobrevivência */}
        <div>
          <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sobrevivência</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            
            {/* Fome */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#cbd5e1', marginBottom: '2px' }}>
                <span>Fome</span>
                <span>{tokenData.hunger ?? 0}/100</span>
              </div>
              <input 
                type="range" min="0" max="100" 
                value={tokenData.hunger ?? 0} 
                onChange={e => handlePropChange('hunger', parseInt(e.target.value) || 0)}
                onMouseUp={async (e: any) => {
                  const val = parseInt(e.target.value) || 0;
                  const path = tokenId ? wikiEntry?.path : wikiPath;
                  if (path) {
                    await syncTokenFieldToWiki(path, 'fome', val);
                    WikiIndexer.clearCache();
                    window.dispatchEvent(new Event('wiki-updated'));
                  }
                }}
                style={{ width: '100%', accentColor: '#eab308', height: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Sede */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#cbd5e1', marginBottom: '2px' }}>
                <span>Sede</span>
                <span>{tokenData.thirst ?? 0}/100</span>
              </div>
              <input 
                type="range" min="0" max="100" 
                value={tokenData.thirst ?? 0} 
                onChange={e => handlePropChange('thirst', parseInt(e.target.value) || 0)}
                onMouseUp={async (e: any) => {
                  const val = parseInt(e.target.value) || 0;
                  const path = tokenId ? wikiEntry?.path : wikiPath;
                  if (path) {
                    await syncTokenFieldToWiki(path, 'sede', val);
                    WikiIndexer.clearCache();
                    window.dispatchEvent(new Event('wiki-updated'));
                  }
                }}
                style={{ width: '100%', accentColor: '#3b82f6', height: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Sanidade */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#cbd5e1', marginBottom: '2px' }}>
                <span>Sanidade</span>
                <span>{tokenData.sanity ?? 100}/100</span>
              </div>
              <input 
                type="range" min="0" max="100" 
                value={tokenData.sanity ?? 100} 
                onChange={e => handlePropChange('sanity', parseInt(e.target.value) || 0)}
                onMouseUp={async (e: any) => {
                  const val = parseInt(e.target.value) || 0;
                  const path = tokenId ? wikiEntry?.path : wikiPath;
                  if (path) {
                    await syncTokenFieldToWiki(path, 'sanidade', val);
                    WikiIndexer.clearCache();
                    window.dispatchEvent(new Event('wiki-updated'));
                  }
                }}
                style={{ width: '100%', accentColor: '#a855f7', height: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Cansaço */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#cbd5e1', marginBottom: '2px' }}>
                <span>Cansaço</span>
                <span>{tokenData.cansaco ?? 0}/{tokenData.cansacoMax ?? 100}</span>
              </div>
              <input 
                type="range" min="0" max={tokenData.cansacoMax ?? 100} 
                value={tokenData.cansaco ?? 0} 
                onChange={e => handlePropChange('cansaco', parseInt(e.target.value) || 0)}
                onMouseUp={async (e: any) => {
                  const val = parseInt(e.target.value) || 0;
                  const path = tokenId ? wikiEntry?.path : wikiPath;
                  if (path) {
                    await syncTokenFieldToWiki(path, 'cansaco', val);
                    WikiIndexer.clearCache();
                    window.dispatchEvent(new Event('wiki-updated'));
                  }
                }}
                style={{ width: '100%', accentColor: '#f87171', height: '4px', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* Condições / Status Efeitos */}
        <div>
          <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Condições do Alvo</h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            {conditionsList.map(cond => {
              const active = activeConditions.includes(cond.id);
              return (
                <button
                  key={cond.id}
                  onClick={() => handleToggleCondition(cond.id)}
                  style={{
                    padding: '4px 2px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer',
                    background: active ? `${cond.color}25` : 'rgba(0,0,0,0.3)',
                    border: active ? `1px solid ${cond.color}` : '1px solid rgba(255,255,255,0.05)',
                    color: active ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cond.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Maldições */}
        {showMaldicoes && (
          <div>
            <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.7rem', color: '#f43f5e', textTransform: 'uppercase' }}><ShieldAlert size={12} /> Maldições Ativas</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {wikiEntry.metadata.maldicoes.map((item: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.2)', padding: '0.4rem', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#fda4af', fontWeight: 'bold' }}>💀 {item.nome}</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{item.descricao}</span>
                </div>
              ))}
            </div>
          </div>
        )}



        {/* Ativação na Mesa e Exclusão */}
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
          {isGM && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
              <span title="Se desativado, o token não emite luz/visão para afastar a Névoa de Guerra">Gera Visão (Ilumina a Névoa):</span>
              <button
                onClick={async () => {
                  const newVal = !(tokenData.hasVision ?? true);
                  handlePropChange('hasVision', newVal);
                  const path = tokenId ? wikiEntry?.path : wikiPath;
                  if (path) {
                    await syncTokenFieldToWiki(path, 'hasVision', newVal);
                    WikiIndexer.clearCache();
                    window.dispatchEvent(new Event('wiki-updated'));
                  }
                }}
                style={{
                  padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer',
                  background: (tokenData.hasVision ?? true) ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  border: (tokenData.hasVision ?? true) ? '1px solid #34d399' : '1px solid #f87171',
                  color: (tokenData.hasVision ?? true) ? '#34d399' : '#f87171'
                }}
              >
                {(tokenData.hasVision ?? true) ? 'SIM' : 'NÃO'}
              </button>
            </div>
          )}

          {isGM && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
              <span>Ativo no Tabuleiro:</span>
              <button
                onClick={async () => {
                  const newVal = !tokenData.ativo;
                  handlePropChange('ativo', newVal);
                  const path = tokenId ? wikiEntry?.path : wikiPath;
                  if (path) {
                    await syncTokenFieldToWiki(path, 'ativo', newVal);
                    WikiIndexer.clearCache();
                    window.dispatchEvent(new Event('wiki-updated'));
                  }
                }}
                style={{
                  padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer',
                  background: tokenData.ativo ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  border: tokenData.ativo ? '1px solid #34d399' : '1px solid #f87171',
                  color: tokenData.ativo ? '#34d399' : '#f87171'
                }}
              >
                {tokenData.ativo ? 'ATIVADO' : 'DESATIVADO'}
              </button>
            </div>
          )}

          {isGM && tokenId && (
            <button 
              onClick={handleDelete}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center',
                padding: '4px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
                border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', cursor: 'pointer',
                transition: 'background 0.2s', marginTop: '2px'
              }}
            >
              <Trash2 size={12} />
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Deletar Token</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const isCriticalSurvival = (tokenData.hunger >= 80) || (tokenData.thirst >= 80) || (tokenData.sanity <= 20);

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
      position: 'relative',
      filter: isCriticalSurvival ? 'sepia(0.5) hue-rotate(-30deg) saturate(1.5)' : 'none',
      transition: 'filter 0.5s ease',
      color: '#f1f5f9',
      fontFamily: 'var(--font-body)'
    }}>
      
      {isCriticalSurvival && (
        <div style={{ position: 'absolute', top: '-0.5rem', left: '-0.5rem', right: '-0.5rem', bottom: '-0.5rem', pointerEvents: 'none', border: '2px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', animation: 'pulse-danger 2s infinite', zIndex: 10 }} />
      )}
      
      {/* HIGHLIGHTED HEADER AREA */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', background: 'rgba(15, 23, 42, 0.4)', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)', flexShrink: 0 }}>
        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
          <div 
            onClick={handleAvatarClick}
            style={{
              width: '68px', height: '68px', borderRadius: '6px', overflow: 'hidden',
              border: `2px solid ${getStatusColor(tokenData.status || 'npc').replace('0.2', '0.8')}`,
              boxShadow: '0 0 10px rgba(0,0,0,0.5)',
              position: 'relative', cursor: isGM ? 'pointer' : 'default'
            }}
            title={isGM ? "Clique para trocar a imagem" : ""}
          >
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
              pointerEvents: 'none', zIndex: 2
            }} />
            <img 
              src={tokenData.imageUrl || (tokenId === 'omega_sentinel' ? '/omega_sentinel.png' : '/vite.svg')} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
          
          {/* Quick Wiki View Button */}
          {wikiEntry && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-wiki-doc', { detail: wikiEntry.path }))}
              style={{
                display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 4px',
                background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '4px', color: '#d8b4fe', cursor: 'pointer', fontSize: '0.6rem', fontWeight: 'bold'
              }}
              title="Abrir Ficha MD"
            >
              <FileText size={10} /> Consultar
            </button>
          )}
        </div>
        
        {/* Name and Stats Inputs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {getStatusIcon(tokenData.status)}
            {isGM ? (
              <input 
                type="text" 
                value={tokenData.name || ''} 
                onChange={e => handlePropChange('name', e.target.value)}
                onBlur={e => handlePropChangeEnd('name', e.target.value)}
                style={{ 
                  background: 'rgba(0,0,0,0.3)', border: '1px dashed var(--glass-border)', color: 'white', 
                  fontSize: '0.85rem', fontWeight: 'bold', width: '100%', padding: '2px 4px',
                  borderRadius: '4px'
                }}
              />
            ) : (
              <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'white' }}>{tokenData.name}</h3>
            )}
          </div>
          
          {/* Subheader parameters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', fontSize: '0.7rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ficha</span>
              {isGM ? (
                <select
                  value={tokenData.status || 'npc'}
                  onChange={async (e) => {
                    const statusVal = e.target.value;
                    let tipoVal = 'NPC';
                    if (statusVal === 'jogador') tipoVal = 'Personagem';
                    else if (statusVal === 'inimigo') tipoVal = 'Monstro';

                    handlePropChange('status', statusVal);
                    
                    const path = tokenId ? wikiEntry?.path : wikiPath;
                    if (path) {
                      await syncTokenFieldToWiki(path, 'status', statusVal);
                      await syncTokenFieldToWiki(path, 'tipo', tipoVal);
                      WikiIndexer.clearCache();
                      window.dispatchEvent(new Event('wiki-updated'));
                    }
                  }}
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px', padding: '1px 2px', fontSize: '0.65rem' }}
                >
                  <option value="jogador">Jogador</option>
                  <option value="npc">NPC</option>
                  <option value="inimigo">Inimigo</option>
                </select>
              ) : (
                <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{tokenData.status}</span>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Nível</span>
              {isGM ? (
                <input 
                  type="number" 
                  value={tokenData.nivel ?? 1} 
                  onChange={e => handlePropChange('nivel', parseInt(e.target.value) || 1)}
                  onBlur={async (e) => {
                    const val = parseInt(e.target.value) || 1;
                    const path = tokenId ? wikiEntry?.path : wikiPath;
                    if (path) {
                      await syncTokenFieldToWiki(path, 'nivel', val);
                      WikiIndexer.clearCache();
                      window.dispatchEvent(new Event('wiki-updated'));
                    }
                  }}
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px', padding: '1px 2px', width: '100%', fontSize: '0.65rem', textAlign: 'center' }} 
                />
              ) : (
                <span style={{ fontWeight: 'bold' }}>{tokenData.nivel ?? 1}</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Defesa</span>
              {isGM ? (
                <input 
                  type="number" 
                  value={tokenData.defesa ?? 10} 
                  onChange={e => handlePropChange('defesa', parseInt(e.target.value) || 0)}
                  onBlur={async (e) => {
                    const val = parseInt(e.target.value) || 0;
                    const path = tokenId ? wikiEntry?.path : wikiPath;
                    if (path) {
                      await syncTokenFieldToWiki(path, 'defesa', val);
                      WikiIndexer.clearCache();
                      window.dispatchEvent(new Event('wiki-updated'));
                    }
                  }}
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px', padding: '1px 2px', width: '100%', fontSize: '0.65rem', textAlign: 'center' }} 
                />
              ) : (
                <span style={{ fontWeight: 'bold' }}>{tokenData.defesa ?? 10}</span>
              )}
            </div>
          </div>
          
          {/* Riches */}
          <div style={{ display: 'flex', gap: '10px', fontSize: '0.7rem', marginTop: '2px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              🪙 Ouro: 
              {isGM ? (
                <input 
                  type="number" 
                  value={tokenData.ouro ?? 0}
                  onChange={e => handlePropChange('ouro', parseInt(e.target.value) || 0)}
                  onBlur={async (e) => {
                    const val = parseInt(e.target.value) || 0;
                    const path = tokenId ? wikiEntry?.path : wikiPath;
                    if (path) {
                      await syncTokenFieldToWiki(path, 'ouro', val);
                      WikiIndexer.clearCache();
                      window.dispatchEvent(new Event('wiki-updated'));
                    }
                  }}
                  style={{ width: '36px', background: 'transparent', border: 'none', borderBottom: '1px dashed rgba(255,255,255,0.2)', color: '#fbbf24', padding: 0, fontWeight: 'bold', fontSize: '0.7rem' }}
                />
              ) : (
                <b style={{ color: '#fbbf24' }}>{tokenData.ouro ?? 0}</b>
              )}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              💎 Riq: 
              {isGM ? (
                <input 
                  type="number" 
                  value={tokenData.riquezas ?? 0}
                  onChange={e => handlePropChange('riquezas', parseInt(e.target.value) || 0)}
                  onBlur={async (e) => {
                    const val = parseInt(e.target.value) || 0;
                    const path = tokenId ? wikiEntry?.path : wikiPath;
                    if (path) {
                      await syncTokenFieldToWiki(path, 'riquezas', val);
                      WikiIndexer.clearCache();
                      window.dispatchEvent(new Event('wiki-updated'));
                    }
                  }}
                  style={{ width: '36px', background: 'transparent', border: 'none', borderBottom: '1px dashed rgba(255,255,255,0.2)', color: '#c084fc', padding: 0, fontWeight: 'bold', fontSize: '0.7rem' }}
                />
              ) : (
                <b style={{ color: '#c084fc' }}>{tokenData.riquezas ?? 0}</b>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Vital Pools */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(15, 23, 42, 0.4)', padding: '8px', borderRadius: '8px', border: '1px solid var(--glass-border)', flexShrink: 0 }}>
        {/* HP */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', marginBottom: '1px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', color: '#f87171' }}><Heart size={10} /> Integridade (HP / PV)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              {isGM ? (
                <>
                  <input type="number" value={tokenData.hp ?? 0} onChange={e => handlePropChange('hp', parseInt(e.target.value) || 0)} onBlur={e => handlePropChangeEnd('hp', parseInt(e.target.value) || 0)} style={{ width: '30px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', color: 'white', fontSize: '0.7rem', textAlign: 'right' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>/</span>
                  <input type="number" value={tokenData.maxHp ?? 100} onChange={e => handlePropChange('maxHp', parseInt(e.target.value) || 0)} onBlur={e => handlePropChangeEnd('maxHp', parseInt(e.target.value) || 0)} style={{ width: '30px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', color: 'white', fontSize: '0.7rem' }} />
                </>
              ) : (
                <span>{tokenData.hp ?? 0}/{tokenData.maxHp ?? 100}</span>
              )}
            </div>
          </div>
          <HealthBar current={tokenData.hp ?? 0} max={tokenData.maxHp ?? 1} color="#f87171" showLabel={false} />
        </div>

        {/* Mana */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', marginBottom: '1px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', color: '#38bdf8' }}><Zap size={10} /> Bateria Core (Mana / PM)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              {isGM ? (
                <>
                  <input type="number" value={tokenData.mana ?? 0} onChange={e => handlePropChange('mana', parseInt(e.target.value) || 0)} onBlur={e => handlePropChangeEnd('mana', parseInt(e.target.value) || 0)} style={{ width: '30px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', color: 'white', fontSize: '0.7rem', textAlign: 'right' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>/</span>
                  <input type="number" value={tokenData.maxMana ?? 100} onChange={e => handlePropChange('maxMana', parseInt(e.target.value) || 0)} onBlur={e => handlePropChangeEnd('maxMana', parseInt(e.target.value) || 0)} style={{ width: '30px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', color: 'white', fontSize: '0.7rem' }} />
                </>
              ) : (
                <span>{tokenData.mana ?? 0}/{tokenData.maxMana ?? 100}</span>
              )}
            </div>
          </div>
          <HealthBar current={tokenData.mana ?? 0} max={tokenData.maxMana ?? 1} color="#38bdf8" showLabel={false} />
        </div>

        {/* Vigor / Energia */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', marginBottom: '1px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 'bold', color: '#34d399' }}><Activity size={10} /> Vigor / Energia</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              {isGM ? (
                <>
                  <input type="number" value={tokenData.energia ?? 100} onChange={e => handlePropChange('energia', parseInt(e.target.value) || 0)} onBlur={e => handlePropChangeEnd('energia', parseInt(e.target.value) || 0)} style={{ width: '30px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', color: 'white', fontSize: '0.7rem', textAlign: 'right' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>/</span>
                  <input type="number" value={tokenData.energiaMax ?? 100} onChange={e => handlePropChange('energiaMax', parseInt(e.target.value) || 0)} onBlur={e => handlePropChangeEnd('energiaMax', parseInt(e.target.value) || 0)} style={{ width: '30px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', color: 'white', fontSize: '0.7rem' }} />
                </>
              ) : (
                <span>{tokenData.energia ?? 100}/{tokenData.energiaMax ?? 100}</span>
              )}
            </div>
          </div>
          <HealthBar current={tokenData.energia ?? 100} max={tokenData.energiaMax ?? 100} color="#34d399" showLabel={false} />
        </div>

        {/* Initiative button */}
        <button 
          onClick={handleRollInitiative}
          style={{ 
            marginTop: '2px', width: '100%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
            background: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning)', border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.65rem'
          }}
        >
          <Swords size={12} /> Rolar Iniciativa
        </button>
      </div>

      {/* TABS MENU */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '2px', flexShrink: 0 }}>
        <button 
          onClick={() => setActiveTab('roll')} 
          style={{
            flex: 1, padding: '4px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer',
            background: activeTab === 'roll' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
            border: 'none', borderBottom: activeTab === 'roll' ? '2px solid var(--accent-primary)' : 'none',
            color: activeTab === 'roll' ? '#f0abfc' : 'var(--text-secondary)', borderRadius: '4px 4px 0 0',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px'
          }}
        >
          <Dices size={12} /> Testes
        </button>
        <button 
          onClick={() => setActiveTab('attacks')} 
          style={{
            flex: 1, padding: '4px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer',
            background: activeTab === 'attacks' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
            border: 'none', borderBottom: activeTab === 'attacks' ? '2px solid var(--accent-primary)' : 'none',
            color: activeTab === 'attacks' ? '#f0abfc' : 'var(--text-secondary)', borderRadius: '4px 4px 0 0',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px'
          }}
        >
          <Sword size={12} /> Combate
        </button>
        <button 
          onClick={() => setActiveTab('items')} 
          style={{
            flex: 1, padding: '4px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer',
            background: activeTab === 'items' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
            border: 'none', borderBottom: activeTab === 'items' ? '2px solid var(--accent-primary)' : 'none',
            color: activeTab === 'items' ? '#f0abfc' : 'var(--text-secondary)', borderRadius: '4px 4px 0 0',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px'
          }}
        >
          <Backpack size={12} /> Bolsa
        </button>
        <button 
          onClick={() => setActiveTab('config')} 
          style={{
            flex: 1, padding: '4px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer',
            background: activeTab === 'config' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
            border: 'none', borderBottom: activeTab === 'config' ? '2px solid var(--accent-primary)' : 'none',
            color: activeTab === 'config' ? '#f0abfc' : 'var(--text-secondary)', borderRadius: '4px 4px 0 0',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px'
          }}
        >
          <Settings size={12} /> Status
        </button>
      </div>

      {/* ACTIVE TAB CONTENT */}
      <div style={{ 
        maxHeight: '260px', 
        overflowY: 'auto', 
        paddingRight: '2px',
        paddingTop: '2px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        flex: 1
      }}>
        {activeTab === 'roll' && renderRollTab()}
        {activeTab === 'attacks' && renderAttacksTab()}
        {activeTab === 'items' && renderItemsTab()}
        {activeTab === 'config' && renderConfigTab()}
      </div>
      {isGM && (
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*"
          onChange={handleImageUpload}
        />
      )}
    </div>
  );
};
