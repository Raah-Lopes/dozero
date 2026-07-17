import React, { useState } from 'react';
import { Shield, Heart, Zap, Crosshair, Brain, Feather, Flame, Snowflake, Moon, Sun, Activity, Dice5, Eye, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  parsedMeta: Record<string, string>;
}

export const FrontmatterSheetViewer: React.FC<Props> = ({ parsedMeta }) => {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('dozero_wiki_sheet_open');
      return saved !== null ? JSON.parse(saved) : true;
    } catch(e) {
      return true;
    }
  });

  const toggleOpen = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    try {
      localStorage.setItem('dozero_wiki_sheet_open', JSON.stringify(newState));
    } catch(e) {}
  };

  // Hidden fields handled by the header itself
  const hiddenKeys = ['nome', 'name', 'avatar', 'imagem', 'image'];
  
  const entries = Object.entries(parsedMeta).filter(([k]) => !hiddenKeys.includes(k.toLowerCase()));
  
  if (entries.length === 0) return null;

  // Categories mapping (flexible regex or exact matches)
  const isVital = (k: string) => /^(hp|hp_max|vida|mana|pm|pm_max|mp|ca|ac|defesa|sanidade|sanidade_max|vigor|stamina|deslocamento|speed|sorte|luck|fortitude|fort|reflexos|ref|vontade|will|iniciativa|init|cmb|cmd)$/i.test(k);
  const isAttribute = (k: string) => /^(str|for|for(ç|c)a|dex|des|destreza|con|constitui(ç|c)(ã|a)o|int|intelig(ê|e)ncia|wis|sab|sabedoria|cha|car|carisma)$/i.test(k);
  const isTag = (k: string) => /^(classe|ra(ç|c)a|alinhamento|alignment|n(í|i)vel|level|xp|fac(ç|c)(ã|a)o|origem)$/i.test(k);
  
  const vitals = entries.filter(([k]) => isVital(k));
  const attributes = entries.filter(([k]) => isAttribute(k));
  const tags = entries.filter(([k]) => isTag(k));
  
  const usedKeys = [...vitals, ...attributes, ...tags].map(([k]) => k);
  const generics = entries.filter(([k]) => !usedKeys.includes(k));

  const getVitalIconAndColor = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('hp') || k.includes('vida')) return { icon: <Heart size={16} />, color: '#ef4444' }; // Red
    if (k.includes('mana') || k.includes('mp')) return { icon: <Zap size={16} />, color: '#3b82f6' }; // Blue
    if (k.includes('ca') || k.includes('ac') || k.includes('defesa')) return { icon: <Shield size={16} />, color: '#94a3b8' }; // Silver
    if (k.includes('sanidade')) return { icon: <Brain size={16} />, color: '#a855f7' }; // Purple
    if (k.includes('vigor') || k.includes('stamina')) return { icon: <Activity size={16} />, color: '#22c55e' }; // Green
    if (k.includes('deslocamento') || k.includes('speed')) return { icon: <Feather size={16} />, color: '#eab308' }; // Yellow
    if (k.includes('sorte') || k.includes('luck')) return { icon: <Sun size={16} />, color: '#f59e0b' }; // Orange/Gold
    if (k.includes('fort') || k.includes('ref') || k.includes('vont') || k.includes('will') || k.includes('cmb') || k.includes('cmd') || k.includes('init') || k.includes('iniciativa')) return { icon: <Crosshair size={16} />, color: '#f43f5e' }; // Rose
    return { icon: <Dice5 size={16} />, color: 'var(--text-secondary)' };
  };

  const getShortAttrName = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('for') || k.includes('str')) return 'STR';
    if (k.includes('des') || k.includes('dex')) return 'DEX';
    if (k.includes('con')) return 'CON';
    if (k.includes('int')) return 'INT';
    if (k.includes('sab') || k.includes('wis')) return 'WIS';
    if (k.includes('car') || k.includes('cha')) return 'CHA';
    return k.substring(0, 3).toUpperCase();
  };

  return (
    <div style={{
      margin: '0 auto 2rem auto',
      width: '100%',
      background: 'rgba(15, 23, 42, 0.4)',
      border: '1px solid var(--glass-border)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      backdropFilter: 'blur(12px)'
    }}>
      {/* Header Toggle */}
      <div 
        onClick={toggleOpen}
        style={{
          padding: '0.8rem 1.2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: isOpen ? '1px solid var(--glass-border)' : 'none',
          userSelect: 'none'
        }}
        className="hover-glow"
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Eye size={16} /> Auditor de Ficha (Propriedades)
        </span>
        {isOpen ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
      </div>

      {isOpen && (
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', boxSizing: 'border-box' }} className="animate-fade-in">
          
          {/* Tags / Pills */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
              {tags.map(([k, v]) => (
                <div key={k} style={{
                  padding: '0.2rem 0.6rem',
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  color: '#e9d5ff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: 600,
                  boxShadow: '0 0 10px rgba(168, 85, 247, 0.1)',
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ opacity: 0.6, marginRight: '4px' }}>{k}:</span> {v}
                </div>
              ))}
            </div>
          )}

          {/* Vitals Row */}
          {vitals.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', 
              gap: '0.6rem', 
              justifyContent: 'center' 
            }}>
              {vitals.map(([k, v]) => {
                const { icon, color } = getVitalIconAndColor(k);
                return (
                  <div key={k} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '6px',
                    border: `1px solid ${color}40`,
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: '28px', height: '28px', 
                      borderRadius: '50%', 
                      background: `${color}20`, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: color,
                      boxShadow: `0 0 8px ${color}30`,
                      flexShrink: 0
                    }}>
                      {icon}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k}</span>
                      <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Attributes Row */}
          {attributes.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', 
              gap: '0.6rem', 
              justifyContent: 'center',
              marginTop: '0.2rem'
            }}>
              {attributes.map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  padding: '0.6rem 0.4rem',
                  position: 'relative',
                  overflow: 'hidden',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)' }} />
                  
                  <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 600, letterSpacing: '1px', marginBottom: '0.2rem' }}>
                    {getShortAttrName(k)}
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                    {v}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '0.1rem', opacity: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                    {k}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Generic Key-Value Grid */}
          {generics.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '0.6rem',
              marginTop: '0.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--glass-border)'
            }}>
              {generics.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{v}</span>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
};
