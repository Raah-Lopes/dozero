import React from 'react';

interface HealthBarProps {
  current: number;
  max: number;
  color?: string;
  label?: string;
  showLabel?: boolean;
}

export const HealthBar: React.FC<HealthBarProps> = ({ current, max, color = 'var(--danger)', label = 'HP', showLabel = true }) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));

  return (
    <div style={{ width: '100%', marginBottom: showLabel ? '8px' : '2px' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px', fontWeight: '600', color: 'var(--text-primary)' }}>
          <span>{label}</span>
          <span style={{ color: 'var(--text-secondary)' }}>{current} / {max}</span>
        </div>
      )}
      <div style={{ width: '100%', height: '8px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '4px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
        <div 
          style={{ 
            width: `${percentage}%`, 
            height: '100%', 
            background: color, 
            boxShadow: `0 0 10px ${color}`,
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
          }} 
        />
      </div>
    </div>
  );
};
