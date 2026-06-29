import React, { useState } from 'react';
import { Palette, Check, X } from 'lucide-react';
import { THEMES } from '../../themes';
import type { ThemeDefinition } from '../../themes';

interface ThemePickerModalProps {
  currentThemeId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const ThemeCard: React.FC<{
  theme: ThemeDefinition;
  isActive: boolean;
  onSelect: () => void;
}> = ({ theme, isActive, onSelect }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: '14px',
        overflow: 'hidden',
        cursor: 'pointer',
        border: isActive
          ? `2px solid ${theme.accentPrimary}`
          : `2px solid ${hovered ? theme.accentPrimary + '80' : 'rgba(255,255,255,0.07)'}`,
        background: theme.bgSecondary,
        transform: hovered || isActive ? 'translateY(-3px)' : 'none',
        transition: 'all 0.22s ease',
        boxShadow: isActive
          ? `0 0 24px ${theme.accentGlow}, 0 8px 24px rgba(0,0,0,0.5)`
          : hovered
            ? `0 8px 24px rgba(0,0,0,0.5)`
            : '0 4px 12px rgba(0,0,0,0.4)',
        position: 'relative',
      }}
    >
      {/* ── Theme Preview Mockup ── */}
      <div style={{
        height: '100px',
        background: theme.bgPrimary,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Fake glass panel */}
        <div style={{
          position: 'absolute', left: '10px', top: '10px',
          width: '55%', height: '70px', borderRadius: '8px',
          background: theme.glassBg,
          border: `1px solid ${theme.glassBorder}`,
          backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', gap: '5px', padding: '8px',
        }}>
          <div style={{ height: '8px', width: '60%', borderRadius: '4px', background: theme.accentPrimary, opacity: 0.9 }} />
          <div style={{ height: '5px', width: '80%', borderRadius: '3px', background: theme.textSecondary, opacity: 0.5 }} />
          <div style={{ height: '5px', width: '50%', borderRadius: '3px', background: theme.textSecondary, opacity: 0.3 }} />
        </div>
        {/* Fake sidebar */}
        <div style={{
          position: 'absolute', right: '10px', top: '10px',
          width: '32%', height: '70px', borderRadius: '8px',
          background: theme.glassBg,
          border: `1px solid ${theme.glassBorder}`,
          display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px',
        }}>
          {[0.8, 0.5, 0.3].map((op, i) => (
            <div key={i} style={{ height: '14px', borderRadius: '4px', background: theme.bgTertiary, opacity: op }} />
          ))}
        </div>
        {/* Accent dot */}
        <div style={{
          position: 'absolute', bottom: '8px', left: '14px',
          width: '10px', height: '10px', borderRadius: '50%',
          background: theme.accentPrimary,
          boxShadow: `0 0 8px ${theme.accentGlow}`,
        }} />
      </div>

      {/* ── Theme Info ── */}
      <div style={{ padding: '12px 14px 14px', background: theme.bgSecondary }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{
            fontSize: '0.85rem', fontWeight: 800, color: theme.textPrimary,
            fontFamily: theme.fontDisplay,
          }}>
            {theme.name}
          </span>
          {isActive && (
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: theme.accentPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Check size={12} color="white" />
            </div>
          )}
        </div>
        <p style={{ margin: 0, fontSize: '0.67rem', color: theme.textSecondary, lineHeight: 1.5 }}>
          {theme.description}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
          {/* Colour swatches */}
          {[theme.accentPrimary, theme.bgTertiary, theme.textSecondary, theme.success, theme.warning].map((c, i) => (
            <div key={i} style={{
              width: '14px', height: '14px', borderRadius: '50%', background: c, flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.15)',
            }} />
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: theme.textSecondary, opacity: 0.7 }}>
            por {theme.author}
          </span>
        </div>
      </div>
    </div>
  );
};

export const ThemePickerModal: React.FC<ThemePickerModalProps> = ({
  currentThemeId, onSelect, onClose,
}) => {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 'min(720px, 95vw)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--glass-border)',
        borderRadius: '20px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        overflow: 'hidden',
        animation: 'fadeIn 0.25s ease-out',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(168,85,247,0.1) 0%, transparent 100%)',
          borderBottom: '1px solid var(--glass-border)',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
            background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Palette size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Temas Visuais
            </h2>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Selecione uma temática para personalizar toda a interface
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', padding: '6px', borderRadius: '8px',
              display: 'flex', transition: 'all 0.15s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Theme Grid */}
        <div style={{ padding: '24px', overflowY: 'auto', maxHeight: '70vh' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
          }}>
            {THEMES.map(theme => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isActive={theme.id === currentThemeId}
                onSelect={() => onSelect(theme.id)}
              />
            ))}
          </div>

          {/* Community hint */}
          <div style={{
            marginTop: '20px', padding: '14px 16px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--glass-border)',
            display: 'flex', alignItems: 'flex-start', gap: '10px',
          }}>
            <Palette size={14} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                Crie o seu tema
              </p>
              <p style={{ margin: '3px 0 0', fontSize: '0.67rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Adicione um arquivo <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: '3px', color: 'var(--accent-primary)' }}>src/themes/seu-tema.ts</code> implementando <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: '3px', color: 'var(--accent-primary)' }}>ThemeDefinition</code> e registre em <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: '3px', color: 'var(--accent-primary)' }}>themes/index.ts</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
