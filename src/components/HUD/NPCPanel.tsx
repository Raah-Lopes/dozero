import React, { useEffect, useState } from 'react';
import { HealthBar } from './HealthBar';
import { state } from '../../store';

export const NPCPanel: React.FC = () => {
  const [enemyHp, setEnemyHp] = useState(150);

  useEffect(() => {
    const observer = () => {
      const sentinel = state.tokens.get('omega_sentinel') as any;
      if (sentinel) setEnemyHp(sentinel.hp);
    };

    state.tokens.observe(observer);
    observer(); // initial load

    return () => {
      state.tokens.unobserve(observer);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Alvo: Sentinela Ômega</h3>
      </div>
      <HealthBar current={enemyHp} max={150} label="Integridade" color="var(--danger)" />
      <HealthBar current={50} max={50} color="var(--accent-primary)" label="Bateria Core" />
    </div>
  );
};
