// src/components/Theater/HeroBadge.tsx
import React from 'react';
import type { CastMember } from './hooks/useCastData';

interface Props {
  member: CastMember;
}

export const HeroBadge: React.FC<Props> = ({ member }) => {
  const hpPct = member.pv_max > 0 ? Math.max(0, Math.min(100, (member.pv / member.pv_max) * 100)) : 0;
  const hpColor = hpPct > 60 ? '#10b981' : hpPct > 30 ? '#f59e0b' : '#ef4444';
  const initial = (member.nome || '?')[0].toUpperCase();

  return (
    <div className="theater-hero-badge" title={`${member.nome} — ${member.pv}/${member.pv_max} PV`}>
      <div className="theater-hero-badge-avatar">
        {member.avatar ? (
          <img loading="lazy" decoding="async" src={member.avatar} alt={member.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem' }}>{initial}</span>
        )}
        {/* HP bar at bottom of avatar */}
        <div
          className="theater-hero-badge-hp"
          style={{ background: `linear-gradient(to right, ${hpColor} ${hpPct}%, rgba(0,0,0,0.5) ${hpPct}%)` }}
        />
      </div>
      <div className="theater-hero-badge-name">{member.nome.split(' ')[0]}</div>
    </div>
  );
};
