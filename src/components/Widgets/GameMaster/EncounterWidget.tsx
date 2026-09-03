import React, { useState, useEffect, useCallback } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { Swords, Users, Skull, Flame, Cloud, Plus, Play, Trash2, Shield, Save } from 'lucide-react';
import { pushChatMessage, state } from '../../../store';
import type { CombatParticipant } from '../../../store';
import {
  saveCombatEncounter,
  getCombatEncounters,
  deleteCombatEncounter,
  spawnEncounterToTable,
  CombatEncounterRecord
} from '../../../services/encounterCloudService';
import { toast } from '../../UI/Toast';
import { LoadingState } from '../../UI/LoadingState';

interface EncounterWidgetProps {
  onClose?: () => void;
  embedded?: boolean;
}

const faccoes = [
  "Bandidos e Mercenários",
  "Mortos-Vivos (Undead)",
  "Cultistas do Abismo",
  "Monstros Selvagens",
  "Guarda Real / Milícia",
  "Invasores Alienígenas / Mutantes"
];

const modificadores = [
  "Nenhum (Combate Padrão)",
  "Terreno Escorregadio (Lama/Gelo)",
  "Ventos Uivantes (Penalidade em projéteis)",
  "Neblina Densa (Visibilidade limitada)",
  "Zona de Magia Instável",
  "Chamas se espalhando (Risco ambiental)",
  "Ameaça Neutra (Barril de pólvora, armadilha, reféns)"
];

export const EncounterWidget: React.FC<EncounterWidgetProps> = ({ onClose, embedded }) => {
  const currentRoom = typeof window !== 'undefined'
    ? (new URLSearchParams(window.location.search).get('room') || 'dozero-mesa-principal-v2')
    : 'dozero-mesa-principal-v2';

  const [activeTab, setActiveTab] = useState<'generator' | 'saved'>('generator');
  const [dificuldade, setDificuldade] = useState('Médio');
  const [faccao, setFaccao] = useState(faccoes[0]);
  const [modificador, setModificador] = useState('Aleatório');
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveToCloudAfterGen, setSaveToCloudAfterGen] = useState(true);

  // Encontros salvos na nuvem
  const [savedEncounters, setSavedEncounters] = useState<CombatEncounterRecord[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const loadSaved = useCallback(async () => {
    setLoadingSaved(true);
    const list = await getCombatEncounters(currentRoom);
    setSavedEncounters(list);
    setLoadingSaved(false);
  }, [currentRoom]);

  useEffect(() => {
    if (activeTab === 'saved') {
      loadSaved();
    }
  }, [activeTab, loadSaved]);

  const gerarEncontro = () => {
    setIsGenerating(true);
    
    // Configura a composição de inimigos
    let enemiesToSpawn: { name: string, level: number }[] = [];
    
    if (dificuldade === 'Fácil') {
      enemiesToSpawn = [
        { name: `Capanga (${faccao}) A`, level: 1 },
        { name: `Capanga (${faccao}) B`, level: 1 },
        { name: `Capanga (${faccao}) C`, level: 1 }
      ];
    } else if (dificuldade === 'Médio') {
      enemiesToSpawn = [
        { name: `Veterano (${faccao})`, level: 3 },
        { name: `Bucha (${faccao}) A`, level: 1 },
        { name: `Bucha (${faccao}) B`, level: 1 },
        { name: `Bucha (${faccao}) C`, level: 1 },
        { name: `Bucha (${faccao}) D`, level: 1 }
      ];
    } else if (dificuldade === 'Difícil') {
      enemiesToSpawn = [
        { name: `Líder Menor (${faccao})`, level: 4 },
        { name: `Elite (${faccao}) A`, level: 3 },
        { name: `Elite (${faccao}) B`, level: 3 },
        { name: `Brutamontes (${faccao}) A`, level: 2 },
        { name: `Brutamontes (${faccao}) B`, level: 2 },
        { name: `Brutamontes (${faccao}) C`, level: 2 }
      ];
    } else if (dificuldade === 'Mortal (Boss)') {
      enemiesToSpawn = [
        { name: `CHEFE ABSOLUTO (${faccao})`, level: 5 },
        { name: `Guarda-Costas Elite A`, level: 4 },
        { name: `Guarda-Costas Elite B`, level: 4 }
      ];
    }

    // Sortear modificador se estiver aleatório
    let finalMod = modificador;
    if (modificador === 'Aleatório') {
      finalMod = modificadores[Math.floor(Math.random() * (modificadores.length - 1)) + 1];
    }

    // Mapeamento de Imagens Geradas
    const imageMap: Record<string, string> = {
      "Bandidos e Mercenários": "/enemy_bandit.png",
      "Mortos-Vivos (Undead)": "/enemy_undead.png",
      "Cultistas do Abismo": "/enemy_cultist.png",
      "Monstros Selvagens": "/enemy_monster.png",
      "Guarda Real / Milícia": "/enemy_guard.png",
      "Invasores Alienígenas / Mutantes": "/enemy_alien.png"
    };

    // Injetar Inimigos no Tabuleiro (Canvas) e no Tracker de Iniciativa
    const currentParticipants = (state.combat.get('participants') as CombatParticipant[]) || [];
    
    const newEnemies: CombatParticipant[] = enemiesToSpawn.map((e, index) => {
      const tokenId = `enc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const imageUrl = imageMap[faccao] || '/enemy_bandit.png';
      
      // Calcular atributos baseados no Nível
      const hp = 10 + (e.level * 12);
      const defense = 10 + e.level;
      const attack = 2 + e.level;
      
      // Espalhar tokens próximos ao centro da mesa
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const offsetX = (Math.random() - 0.5) * 200 + (index * 20);
      const offsetY = (Math.random() - 0.5) * 200 + (index * 20);

      // Gerar armas e poderes baseados na facção
      let weaponName = "Ataque Corporal";
      let weaponDamage = `1d${4 + Math.ceil(e.level/2)}+${e.level}`;
      let powerName = "Golpe Devastador";
      let powerEffect = `dano_2d6+${e.level}`;
      
      if (faccao === "Bandidos e Mercenários") {
        weaponName = "Lâmina Suja / Clava";
        weaponDamage = `1d6+${e.level}`;
        powerName = "Ataque Traiçoeiro";
      } else if (faccao === "Mortos-Vivos (Undead)") {
        weaponName = "Garras Pútridas";
        weaponDamage = `1d4+${e.level}`;
        powerName = "Miasma Pútrido";
      } else if (faccao === "Cultistas do Abismo") {
        weaponName = "Adaga Sacrificial";
        weaponDamage = `1d8+${e.level}`;
        powerName = "Raio Sombrio";
        powerEffect = `dano_1d8+${e.level}`;
      } else if (faccao === "Monstros Selvagens") {
        weaponName = "Mordida Selvagem";
        weaponDamage = `1d8+${e.level}`;
        powerName = "Fúria Bestial";
      } else if (faccao === "Guarda Real / Milícia") {
        weaponName = "Espada / Lança Longa";
        weaponDamage = `1d8+${e.level}`;
        powerName = "Investida com Escudo";
      } else if (faccao === "Invasores Alienígenas / Mutantes") {
        weaponName = "Apêndice Ácido / Feixe";
        weaponDamage = `2d4+${e.level}`;
        powerName = "Explosão Plasmática";
        powerEffect = `dano_3d4+${e.level}`;
      }

      const armas = [
        { nome: weaponName, dano: weaponDamage, equipado: true, descricao: `Ataque básico (Nível ${e.level})` }
      ];

      const poderes = e.level >= 3 ? [
        { nome: powerName, efeito: powerEffect, custo: "0 PM", descricao: "Habilidade poderosa de Elite/Chefe." }
      ] : [];

      // 1. Criar o Token Físico na Mesa
      state.tokens.set(tokenId, {
        id: tokenId,
        x: cx + offsetX,
        y: cy + offsetY,
        name: e.name,
        hp: hp,
        maxHp: hp,
        nivel: e.level,
        defesa: defense,
        ataque: attack,
        imageUrl: imageUrl,
        tokenShape: 'circle',
        sizeScale: 1,
        borderColor: '#ef4444',
        showName: true,
        hpBarMode: 'always',
        status: 'npc',
        ativo: true,
        armas: armas,
        poderes: poderes
      });

      // 2. Retornar dados para o Tracker de Iniciativa
      return {
        tokenId,
        name: e.name,
        initiative: Math.floor(Math.random() * 20) + 1 + e.level,
        imageUrl: imageUrl
      };
    });

    const combinedParticipants = [...currentParticipants, ...newEnemies];
    combinedParticipants.sort((a, b) => b.initiative - a.initiative);
    
    state.combat.set('participants', combinedParticipants);

    // Salvar na nuvem opcionalmente
    if (saveToCloudAfterGen) {
      saveCombatEncounter({
        campaign_id: currentRoom,
        name: `${faccao} (${dificuldade})`,
        outcome: 'active',
        combatants: enemiesToSpawn.map(e => ({
          name: e.name,
          level: e.level,
          hp: 10 + (e.level * 12),
          maxHp: 10 + (e.level * 12),
          defense: 10 + e.level,
          attack: 2 + e.level,
          imageUrl: imageMap[faccao] || '/enemy_bandit.png'
        }))
      });
    }

    // Imprimir Chat Log
    const html = `
      <div style="background: rgba(0,0,0,0.5); border: 2px solid #f97316; border-radius: 12px; padding: 16px; margin-top: 12px; font-family: monospace; position: relative; overflow: hidden; box-shadow: 0 0 20px rgba(249,115,22,0.2);">
        <div style="position: absolute; top: -20px; right: -20px; opacity: 0.1;">
          <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"></path><path d="M7.07 14.86 3 18.93a2.85 2.85 0 0 0 4.03 4.03l4.07-4.07"></path><path d="m13.1 10.9-4-4.02"></path><path d="m11 13 4 4"></path></svg>
        </div>
        
        <div style="color: #f97316; font-size: 1.2em; border-bottom: 1px solid rgba(249,115,22,0.3); padding-bottom: 8px; margin-bottom: 12px; display:flex; align-items:center; gap: 8px; text-transform: uppercase;">
          ⚔️ <b>Emboscada Forjada</b> <span style="font-size: 0.7em; color: var(--text-secondary); background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">(${dificuldade})</span>
        </div>
        
        <div style="font-size: 0.95em; line-height: 1.6; color: #cbd5e1; z-index: 2; position: relative;">
          <p style="margin: 0 0 8px 0;"><b style="color: white;">🛡️ Facção:</b> ${faccao}</p>
          <p style="margin: 0 0 12px 0;"><b style="color: #fca5a5;">🌪️ Modificador Local:</b> ${finalMod}</p>
          
          <div style="background: rgba(249,115,22,0.1); border-left: 3px solid #f97316; padding: 8px 12px; border-radius: 0 4px 4px 0;">
            <p style="margin: 0; color: #fdba74; font-size: 0.85em; text-transform: uppercase;">Ameaças Adicionadas ao Tracker:</p>
            <ul style="margin: 4px 0 0 0; padding-left: 20px; color: white; font-weight: bold;">
              ${enemiesToSpawn.map(e => `<li>${e.name} <span style="color: #94a3b8; font-weight: normal;">(Nv ${e.level})</span></li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;

    pushChatMessage(html);
    setTimeout(() => setIsGenerating(false), 400);
  };

  const bodyContent = (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', position: 'relative', boxSizing: 'border-box' }}>
      
      {/* Abas */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
        <button
          onClick={() => setActiveTab('generator')}
          style={{
            flex: 1, padding: '6px', fontSize: '0.75rem', fontWeight: 'bold',
            background: activeTab === 'generator' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'generator' ? '#fff' : 'var(--text-secondary)',
            border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
          }}
        >
          <Flame size={13} /> Gerador
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          style={{
            flex: 1, padding: '6px', fontSize: '0.75rem', fontWeight: 'bold',
            background: activeTab === 'saved' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'saved' ? '#fff' : 'var(--text-secondary)',
            border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
          }}
        >
          <Cloud size={13} /> Salvos na Nuvem
        </button>
      </div>

      {activeTab === 'generator' ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {/* Facção */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={12} /> Tipo de Inimigo / Facção
              </label>
              <select value={faccao} onChange={e => setFaccao(e.target.value)} style={{ padding: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: '6px', cursor: 'pointer', outline: 'none', fontSize: '0.8rem' }}>
                {faccoes.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Dificuldade */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Skull size={12} /> Nível de Desafio
              </label>
              <select value={dificuldade} onChange={e => setDificuldade(e.target.value)} style={{ padding: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: '6px', cursor: 'pointer', outline: 'none', fontSize: '0.8rem' }}>
                <option value="Fácil">Fácil (Só Capangas)</option>
                <option value="Médio">Médio (Grupo Padrão)</option>
                <option value="Difícil">Difícil (Bando de Elite)</option>
                <option value="Mortal (Boss)">Mortal (Chefe Absoluto)</option>
              </select>
            </div>

            {/* Modificador */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flame size={12} /> Modificador de Cenário
              </label>
              <select value={modificador} onChange={e => setModificador(e.target.value)} style={{ padding: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: '6px', cursor: 'pointer', outline: 'none', fontSize: '0.8rem' }}>
                <option value="Aleatório">🎲 Sortear Aleatório</option>
                {modificadores.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Checkbox Salvar na Nuvem */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#fde047', cursor: 'pointer', marginTop: '2px' }}>
              <input
                type="checkbox"
                checked={saveToCloudAfterGen}
                onChange={e => setSaveToCloudAfterGen(e.target.checked)}
              />
              Salvar cópia na nuvem da campanha
            </label>
          </div>

          <button 
            onClick={gerarEncontro}
            disabled={isGenerating}
            style={{ 
              marginTop: 'auto', padding: '12px', background: 'var(--accent-primary)', 
              color: '#ffffff', border: '1px solid var(--glass-border-highlight)', borderRadius: '8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold',
              boxShadow: '0 4px 15px var(--accent-glow)', transition: 'all 0.2s',
              opacity: isGenerating ? 0.7 : 1
            }}
          >
            {isGenerating ? <Flame className="animate-spin" size={18} /> : <Swords size={18} />}
            Forjar & Injetar na Mesa
          </button>
        </>
      ) : (
        /* Aba de Encontros Salvos */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
          {loadingSaved ? (
            <LoadingState compact label="Carregando encontros da nuvem…" />
          ) : savedEncounters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '1px dashed var(--glass-border)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Nenhum encontro salvo na nuvem para esta mesa.
            </div>
          ) : (
            savedEncounters.map(enc => (
              <div
                key={enc.id}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.82rem', color: '#fdfaf5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {enc.name}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                    {enc.combatants?.length || 0} combatente(s) • {enc.outcome === 'victory' ? '✅ Vitória' : enc.outcome === 'defeat' ? '💀 Derrota' : 'Ativo'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => spawnEncounterToTable(enc)}
                    title="Invocar Encontro na Mesa"
                    style={{ padding: '5px 8px', background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', borderRadius: '6px', color: '#4ade80', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Play size={11} /> Invocar
                  </button>
                  <button
                    onClick={async () => {
                      if (enc.id && confirm(`Excluir encontro "${enc.name}" da nuvem?`)) {
                        await deleteCombatEncounter(enc.id);
                        loadSaved();
                      }
                    }}
                    title="Excluir"
                    style={{ padding: '5px 7px', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: '6px', color: '#f87171', cursor: 'pointer' }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return bodyContent;
  }

  return (
    <DraggableWindow 
      id="encounter-generator"
      title="Forja de Encontros" 
      onClose={onClose} 
      width={380}
      height={420}
      initialX={window.innerWidth / 2 + 150} 
      initialY={100}
      dragAnywhere={false}
    >
      {bodyContent}
    </DraggableWindow>
  );
};
