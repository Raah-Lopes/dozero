import React from 'react';
import { Dices } from 'lucide-react';
import { WoDParser } from '../../rules/WoDParser';
import { applyDamageToToken, pushChatMessage } from '../../store';

interface Macro {
  id: string;
  name: string;
  formula: string; // Used visually
  system: 'WoD';
  pool: number;
  hunger: number;
  damage: number; // mock base damage
}

export const MacroPanel: React.FC = () => {
  // Mock data representing Character Sheet stats
  const macros: Macro[] = [
    { id: '1', name: 'Rifle de Plasma', formula: 'Destreza + Armas de Fogo', system: 'WoD', pool: 8, hunger: 1, damage: 25 },
    { id: '2', name: 'Sobrecarga Cibernética', formula: 'Inteligência + Tecnologia', system: 'WoD', pool: 6, hunger: 2, damage: 40 },
  ];

  const handleRoll = (macro: Macro) => {
    if (macro.system === 'WoD') {
      const result = WoDParser.rollV5(macro.pool, macro.hunger, 3);
      
      let messageHtml = `<b>${macro.name}</b><br/>
        Sucessos: <b>${result.successes}</b> <br/>
        <span style="color:var(--text-secondary); font-size: 0.75rem">Dados: [${result.diceResult.normal.join(', ')}] | Estresse: [${result.diceResult.hunger.join(', ')}]</span>`;
        
      if (result.isMessyCritical) {
        messageHtml += `<br/><b style="color: var(--danger)">CRÍTICO CAÓTICO!</b> (Seus implantes sofrem curto-circuito)`;
      } else if (result.isBestialFailure) {
        messageHtml += `<br/><b style="color: var(--danger)">FALHA CRÍTICA!</b> (O recuo da arma te derruba)`;
      } else if (result.successes >= 3) {
        messageHtml += `<br/><b style="color: var(--success)">Acerto Crítico!</b> Causou ${macro.damage} de dano ao Sentinela Ômega.`;
        applyDamageToToken('omega_sentinel', macro.damage);
      } else {
        messageHtml += `<br/><b>Falhou!</b> Os escudos do Sentinela absorveram o impacto.`;
      }

      pushChatMessage(messageHtml, result.successes >= 3 && !result.isMessyCritical, result.isBestialFailure || result.isMessyCritical);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
        <Dices size={20} />
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Ações Rápidas</h3>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {macros.map((macro) => (
          <button
            key={macro.id}
            onClick={() => handleRoll(macro)}
            style={{
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)';
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'var(--glass-border)';
            }}
          >
            <span style={{ fontWeight: 500 }}>{macro.name}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', background: 'rgba(168, 85, 247, 0.15)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
              {macro.formula}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

