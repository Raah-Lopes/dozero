import React, { useState } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { Swords, Users, Skull, Flame, ShieldAlert } from 'lucide-react';
import { pushChatMessage, state } from '../../store';
import type { CombatParticipant } from '../../store';

interface EncounterWidgetProps {
  onClose?: () => void;
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

export const EncounterWidget: React.FC<EncounterWidgetProps> = ({ onClose }) => {
  const [dificuldade, setDificuldade] = useState('Médio');
  const [faccao, setFaccao] = useState(faccoes[0]);
  const [modificador, setModificador] = useState('Aleatório');
  const [isGenerating, setIsGenerating] = useState(false);

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
      finalMod = modificadores[Math.floor(Math.random() * (modificadores.length - 1)) + 1]; // ignora o "Nenhum" no aleatório para ficar divertido
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

    // Injetar Inimigos no Tracker de Iniciativa
    const currentParticipants = (state.combat.get('participants') as CombatParticipant[]) || [];
    
    const newEnemies: CombatParticipant[] = enemiesToSpawn.map(e => ({
      tokenId: `enc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: e.name,
      initiative: Math.floor(Math.random() * 20) + 1 + e.level, // 1d20 + nível
      imageUrl: imageMap[faccao] || '/enemy_bandit.png'
    }));

    const combinedParticipants = [...currentParticipants, ...newEnemies];
    combinedParticipants.sort((a, b) => b.initiative - a.initiative);
    
    state.combat.set('participants', combinedParticipants);
    // Se o combate já estiver rolando, pode zoar o turno, mas o GM pode arrumar.

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

  return (
    <DraggableWindow 
      id="encounter-generator"
      title="Forja de Encontros" 
      onClose={onClose} 
      width={360}
      height={400}
      initialX={window.innerWidth / 2 + 150} 
      initialY={100}
      dragAnywhere={false}
    >
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', position: 'relative' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f97316', fontWeight: 'bold', fontSize: '1.1rem', borderBottom: '1px solid rgba(249,115,22,0.2)', paddingBottom: '10px' }}>
          <ShieldAlert size={22} /> Montar Combate Rápido
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
          
          {/* Facção */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={12} /> Tipo de Inimigo / Facção
            </label>
            <select value={faccao} onChange={e => setFaccao(e.target.value)} style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '6px', cursor: 'pointer' }}>
              {faccoes.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Dificuldade */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Skull size={12} /> Dificuldade
            </label>
            <select value={dificuldade} onChange={e => setDificuldade(e.target.value)} style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '6px', cursor: 'pointer' }}>
              <option value="Fácil">Fácil (Só Capangas)</option>
              <option value="Médio">Médio (Grupo Padrão)</option>
              <option value="Difícil">Difícil (Bando de Elite)</option>
              <option value="Mortal (Boss)">Mortal (Chefe Absoluto)</option>
            </select>
          </div>

          {/* Modificador */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Flame size={12} /> Modificador de Cenário
            </label>
            <select value={modificador} onChange={e => setModificador(e.target.value)} style={{ padding: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '6px', cursor: 'pointer' }}>
              <option value="Aleatório">🎲 Sortear Aleatório</option>
              {modificadores.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

        </div>

        <button 
          onClick={gerarEncontro}
          disabled={isGenerating}
          style={{ 
            marginTop: 'auto', padding: '16px', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
            color: 'white', border: '1px solid #fb923c', borderRadius: '8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(249, 115, 22, 0.4)', transition: 'all 0.2s',
            opacity: isGenerating ? 0.7 : 1
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {isGenerating ? <Flame className="animate-spin" size={20} /> : <Swords size={20} />}
          Forjar & Injetar no Tracker
        </button>
      </div>
    </DraggableWindow>
  );
};
