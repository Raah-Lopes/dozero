import React, { useState, useEffect } from 'react';
import { X, TrendingUp, ShieldAlert, HeartPulse, Swords, Eye, Brain, Target, Crosshair, Zap } from 'lucide-react';

interface LevelUpWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  tokenData: any;
  onSave: (updates: Record<string, any>) => Promise<void>;
}

export const LevelUpWidget: React.FC<LevelUpWidgetProps> = ({ isOpen, onClose, tokenData, onSave }) => {
  if (!isOpen) return null;

  const [localData, setLocalData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tokenData) {
      setLocalData({
        nivel: Number(tokenData.nivel) || 1,
        hp: Number(tokenData.maxHp || tokenData.hp) || 20,
        FOR: Number(tokenData.forca || tokenData.FOR) || 10,
        DES: Number(tokenData.destreza || tokenData.DES) || 10,
        CON: Number(tokenData.constituicao || tokenData.CON) || 10,
        INT: Number(tokenData.inteligencia || tokenData.INT) || 10,
        SAB: Number(tokenData.sabedoria || tokenData.SAB) || 10,
        CAR: Number(tokenData.carisma || tokenData.CAR) || 10,
        Acrobacia: Number(tokenData.Acrobacia) || 0,
        Atletismo: Number(tokenData.Atletismo) || 0,
        Furtividade: Number(tokenData.Furtividade) || 0,
        Medicina: Number(tokenData.Medicina) || 0,
        Percepcao: Number(tokenData.Percepcao) || 0,
      });
    }
  }, [tokenData, isOpen]);

  // Regra Híbrida/Livre:
  // Base é 10 para todos (60 no total). No nível 1, personagem recebe +18 pontos livres (78 total).
  // A cada nível após o 1, recebe +2 pontos de atributo para customização contínua.
  const targetTotalAttributes = 78 + (localData.nivel - 1) * 2;
  const currentTotalAttributes = ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'].reduce((acc, attr) => acc + (localData[attr] || 10), 0);
  const availableAttrPoints = Math.max(0, targetTotalAttributes - currentTotalAttributes);

  // HP Esperado (Considerando Dado de Vida médio 8 + Modificador de CON)
  const conMod = Math.floor(((localData.CON || 10) - 10) / 2);
  const expectedHp = (8 + conMod) * localData.nivel;
  const hpMissing = Math.max(0, expectedHp - localData.hp);

  const applyArchetype = (archetype: string) => {
    let pts = availableAttrPoints;
    if (pts <= 0 && hpMissing <= 0) return;

    let newStats = { ...localData };

    // Correção de Vida Automática
    if (hpMissing > 0) {
      newStats.hp = expectedHp;
    }

    // Distribuição de Atributos
    const distribute = (primary: string, secondary: string, tertiary: string) => {
      while (pts > 0) {
        if (pts > 0) { newStats[primary] += 1; pts--; }
        if (pts > 0 && Math.random() > 0.3) { newStats[secondary] += 1; pts--; }
        if (pts > 0 && Math.random() > 0.6) { newStats[tertiary] += 1; pts--; }
      }
    };

    switch (archetype) {
      case 'Tanque': distribute('CON', 'FOR', 'SAB'); break;
      case 'Ladino': distribute('DES', 'INT', 'CAR'); break;
      case 'Arqueiro': distribute('DES', 'SAB', 'CON'); break;
      case 'Médico': distribute('SAB', 'INT', 'CAR'); break;
      case 'Bárbaro': distribute('FOR', 'CON', 'DES'); break;
      case 'Mago': distribute('INT', 'SAB', 'DES'); break;
      case 'Equilibrado':
        while (pts > 0) {
          // Acha o atributo mais baixo
          const attrs = ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'];
          let lowest = attrs[0];
          for (const a of attrs) {
             if (newStats[a] < newStats[lowest]) lowest = a;
          }
          newStats[lowest] += 1;
          pts--;
        }
        break;
    }

    setLocalData(newStats);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({
      HP_max: localData.hp,
      pv_max: localData.hp, // Atualiza os dois para retrocompatibilidade
      FOR: localData.FOR,
      DES: localData.DES,
      CON: localData.CON,
      INT: localData.INT,
      SAB: localData.SAB,
      CAR: localData.CAR,
    });
    setIsSaving(false);
    onClose();
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.95)', zIndex: 100, display: 'flex', flexDirection: 'column',
      padding: '1rem', color: '#e2e8f0', backdropFilter: 'blur(10px)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8' }}>
          <TrendingUp size={16} /> Auditoria de Nível {localData.nivel}
        </h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* DIAGNÓSTICO */}
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Diagnóstico Atual</h4>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
            <span>Pontos de Atributo Pendentes:</span>
            <span style={{ color: availableAttrPoints > 0 ? '#fbbf24' : '#10b981', fontWeight: 'bold' }}>
              {availableAttrPoints > 0 ? `${availableAttrPoints} disponíveis` : 'Balanceado'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span>Saúde (HP) vs Esperado:</span>
            <span style={{ color: hpMissing > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
              {localData.hp} / {expectedHp} {hpMissing > 0 ? '(Defasado)' : '(Saudável)'}
            </span>
          </div>
        </div>

        {/* DISTRIBUIÇÃO AUTOMÁTICA (ARQUÉTIPOS) */}
        {(availableAttrPoints > 0 || hpMissing > 0) && (
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#c084fc', textTransform: 'uppercase' }}>Distribuição Inteligente (Arquétipos)</h4>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0 0 0.75rem 0' }}>Escolha um caminho para distribuir os pontos e Vida que faltam de forma otimizada para a classe:</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              <button onClick={() => applyArchetype('Tanque')} style={archetypeBtnStyle}><ShieldAlert size={14}/> Tanque (CON/FOR)</button>
              <button onClick={() => applyArchetype('Ladino')} style={archetypeBtnStyle}><Eye size={14}/> Ladino (DES/INT)</button>
              <button onClick={() => applyArchetype('Arqueiro')} style={archetypeBtnStyle}><Crosshair size={14}/> Arqueiro (DES/SAB)</button>
              <button onClick={() => applyArchetype('Bárbaro')} style={archetypeBtnStyle}><Swords size={14}/> Bárbaro (FOR/CON)</button>
              <button onClick={() => applyArchetype('Médico')} style={archetypeBtnStyle}><HeartPulse size={14}/> Médico (SAB/CAR)</button>
              <button onClick={() => applyArchetype('Mago')} style={archetypeBtnStyle}><Brain size={14}/> Mago (INT/SAB)</button>
              <button onClick={() => applyArchetype('Equilibrado')} style={{...archetypeBtnStyle, gridColumn: 'span 2'}}><Target size={14}/> Equilibrado (Corrigir defasagem)</button>
            </div>
          </div>
        )}

        {/* REVIEW DA DISTRIBUIÇÃO */}
        <div>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#10b981', textTransform: 'uppercase' }}>Atributos Finais</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
            <div style={statBoxStyle}><span style={statLabelStyle}>FOR</span>{localData.FOR}</div>
            <div style={statBoxStyle}><span style={statLabelStyle}>DES</span>{localData.DES}</div>
            <div style={statBoxStyle}><span style={statLabelStyle}>CON</span>{localData.CON}</div>
            <div style={statBoxStyle}><span style={statLabelStyle}>INT</span>{localData.INT}</div>
            <div style={statBoxStyle}><span style={statLabelStyle}>SAB</span>{localData.SAB}</div>
            <div style={statBoxStyle}><span style={statLabelStyle}>CAR</span>{localData.CAR}</div>
          </div>
        </div>

      </div>

      <button 
        onClick={handleSave} 
        disabled={isSaving || (availableAttrPoints > 0 && hpMissing > 0)}
        style={{
          marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', border: 'none',
          background: isSaving ? '#475569' : ((availableAttrPoints === 0 && hpMissing === 0) ? '#10b981' : '#38bdf8'),
          color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center'
        }}
      >
        <Zap size={16} />
        {isSaving ? 'Salvando Ficha...' : ((availableAttrPoints > 0 || hpMissing > 0) ? 'Preencha para Salvar' : 'Consolidar Nível no Arquivo')}
      </button>

    </div>
  );
};

const archetypeBtnStyle: React.CSSProperties = {
  background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)',
  color: '#bae6fd', padding: '0.5rem', borderRadius: '6px', fontSize: '0.7rem',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center'
};

const statBoxStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold'
};

const statLabelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase'
};
