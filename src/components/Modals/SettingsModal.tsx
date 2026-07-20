import React, { useState, useEffect } from 'react';
import {
  X, Save, Globe, Wifi, Settings2, Shield,
  BookOpen, GitBranch, KeyRound, Check, Loader2,
  Swords, Scroll, User, Plug, Palette
} from 'lucide-react';
import { getWikiConfig, updateWikiConfig } from '../../store';
import { useRulesEngine } from '../../hooks/useRulesEngine';
import { useTheme } from '../../hooks/useTheme';
import { THEMES } from '../../themes';
import type { ThemeDefinition } from '../../themes';

interface SettingsModalProps {
  onClose: () => void;
  initialTab?: Tab;
}

type Tab = 'geral' | 'aparencia' | 'wiki' | 'integracoes';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'geral', label: 'Geral',  icon: <Settings2 size={15} /> },
  { id: 'aparencia', label: 'Aparência', icon: <Palette size={15} /> },
  { id: 'wiki',  label: 'Wiki',   icon: <Globe size={15} /> },
  { id: 'integracoes', label: 'Integrações', icon: <Plug size={15} /> },
];

// ── Reusable field wrapper ──────────────────────────────────────────────────
const Field: React.FC<{
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, hint, icon, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {icon && <span style={{ color: 'var(--accent-primary)', opacity: 0.8 }}>{icon}</span>}
      <label style={{
        fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: 'var(--text-secondary)',
        fontFamily: 'var(--font-display)',
      }}>
        {label}
      </label>
    </div>
    {children}
    {hint && (
      <p style={{ margin: 0, fontSize: '0.67rem', color: 'var(--text-secondary)', opacity: 0.6, lineHeight: 1.5 }}>
        {hint}
      </p>
    )}
  </div>
);

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: '10px',
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid var(--glass-border)',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  outline: 'none',
  width: '100%',
  fontFamily: 'var(--font-body)',
  transition: 'border-color 0.2s',
};

// ── Animated Toggle Switch ──────────────────────────────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; id: string }> = ({ checked, onChange, id }) => (
  <label htmlFor={id} style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
    <div style={{ position: 'relative', width: '42px', height: '24px' }}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '999px', transition: 'background 0.25s',
        background: checked ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
        border: checked ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.12)',
      }} />
      <div style={{
        position: 'absolute', top: '3px', left: checked ? '21px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: 'white', transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
      }} />
    </div>
  </label>
);

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
      <div style={{
        height: '100px',
        background: theme.bgPrimary,
        position: 'relative',
        overflow: 'hidden',
      }}>
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
        <div style={{
          position: 'absolute', bottom: '8px', left: '14px',
          width: '10px', height: '10px', borderRadius: '50%',
          background: theme.accentPrimary,
          boxShadow: `0 0 8px ${theme.accentGlow}`,
        }} />
      </div>

      <div style={{ padding: '12px 14px 14px', background: theme.bgSecondary }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{
            fontSize: '0.85rem', fontWeight: 800, color: theme.id.includes('chronicles') ? '#3e2723' : theme.textPrimary,
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
        <p style={{ margin: 0, fontSize: '0.67rem', color: theme.id.includes('chronicles') ? '#5d4037' : theme.textSecondary, lineHeight: 1.5 }}>
          {theme.description}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
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

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, initialTab = 'geral' }) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── State ──
  const { currentThemeId, setTheme, themeOverrides, updateOverrides, clearOverrides } = useTheme();
  const { currentEngineId, setEngine, engines } = useRulesEngine();
  const [isGM,         setIsGM]         = useState(localStorage.getItem('isGM') === 'true');
  const [wikiRepo,     setWikiRepo]     = useState('');
  const [wikiBranch,   setWikiBranch]   = useState('main');
  const [wikiToken,    setWikiToken]    = useState('');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState(localStorage.getItem('n8nWebhookUrl') || '');

  useEffect(() => {
    const config = getWikiConfig();
    setWikiRepo(config.repoUrl   || '');
    setWikiBranch(config.branch  || 'main');
    setWikiToken(config.token    || '');
  }, []);

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem('isGM',         isGM ? 'true' : 'false');
    localStorage.setItem('n8nWebhookUrl', n8nWebhookUrl);
    updateWikiConfig({ repoUrl: wikiRepo, branch: wikiBranch, token: wikiToken });
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    setSaved(true);
    await new Promise(r => setTimeout(r, 900));
    window.location.reload();
  };

  // ── Tab Content ────────────────────────────────────────────────────────────
  const renderGeral = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* GM Mode */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: '12px',
        background: isGM ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isGM ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 0.25s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isGM ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
            border: isGM ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
          }}>
            <Shield size={16} color={isGM ? '#f87171' : 'var(--text-secondary)'} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: isGM ? '#fca5a5' : 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Modo Mestre (GM)
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
              Ativa ferramentas exclusivas do narrador
            </p>
          </div>
        </div>
        <Toggle id="gm-toggle" checked={isGM} onChange={setIsGM} />
      </div>

      {/* Rules Engine */}
      <Field label="Motor de Regras" icon={<Swords size={13} />} hint="Determina os tipos de dados e mecânicas de combate.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {engines.map(eng => {
            const active = currentEngineId === eng.id;
            return (
              <div
                key={eng.id}
                onClick={() => setEngine(eng.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                  background: active ? 'rgba(168,85,247,0.1)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${active ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.18s',
                  boxShadow: active ? '0 0 12px rgba(168,85,247,0.15)' : 'none',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{eng.icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{
                    fontSize: '0.82rem', fontWeight: active ? 700 : 400,
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-display)',
                  }}>
                    {eng.name}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                    {eng.description}
                  </span>
                </div>
                {active && (
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'var(--accent-primary)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Check size={10} color="white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Field>
    </div>
  );

  const renderAparencia = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Palette size={16} color="var(--accent-primary)" />
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Temas Visuais</h3>
      </div>
      <p style={{ margin: '-16px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        Selecione uma temática para personalizar toda a interface.
      </p>

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
            onSelect={() => setTheme(theme.id)}
          />
        ))}
      </div>

      <div style={{
        marginTop: '8px', padding: '16px', borderRadius: '10px',
        background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)',
        display: 'flex', flexDirection: 'column', gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings2 size={16} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Ajuste Fino</h3>
          </div>
          <button 
            className="btn-icon"
            onClick={clearOverrides}
            title="Restaurar Padrões do Tema"
          >
            <X size={14} />
          </button>
        </div>
        
        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          Substitua as cores principais do tema atual para o seu próprio gosto.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '8px' }}>
          {[
            { key: 'textPrimary', label: 'Texto Principal' },
            { key: 'textSecondary', label: 'Texto Secundário' },
            { key: 'bgPrimary', label: 'Fundo Principal' },
            { key: 'bgSecondary', label: 'Fundo Secundário' },
            { key: 'accentPrimary', label: 'Cor de Destaque' },
            { key: 'glassBg', label: 'Fundo Translúcido' },
          ].map(f => (
            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{f.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input 
                  type="color" 
                  value={(themeOverrides as any)[f.key] || THEMES.find(t => t.id === currentThemeId)?.[f.key as keyof ThemeDefinition] || '#000000'} 
                  onChange={e => updateOverrides({ [f.key]: e.target.value })}
                  style={{ width: '28px', height: '28px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '4px' }}
                />
                <input 
                  type="text" 
                  value={(themeOverrides as any)[f.key] || ''} 
                  placeholder="Padrão"
                  onChange={e => updateOverrides({ [f.key]: e.target.value })}
                  style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', padding: '4px 6px', fontSize: '0.7rem', borderRadius: '4px' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderWiki = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        padding: '12px 14px', borderRadius: '10px',
        background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)',
        display: 'flex', alignItems: 'flex-start', gap: '10px',
      }}>
        <BookOpen size={14} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(192,132,252,0.8)', lineHeight: 1.6 }}>
          Aponte para a pasta local da sua Wiki. O caminho é lido diretamente pelo servidor de desenvolvimento Vite.
        </p>
      </div>

      <Field label="Caminho / Repositório" icon={<BookOpen size={13} />} hint="Caminho absoluto local (ex: D:/DOZERO/wikidozero) ou Autor/Repo GitHub.">
        <form onSubmit={e => e.preventDefault()}>
          <input
            type="text"
            placeholder="Ex: D:/DOZERO/wikidozero"
            value={wikiRepo}
            onChange={e => setWikiRepo(e.target.value)}
            style={inputStyle}
          />
        </form>
      </Field>

      <div style={{ display: 'flex', gap: '12px' }}>
        <Field label="Branch" icon={<GitBranch size={13} />}>
          <form onSubmit={e => e.preventDefault()}>
            <input
              type="text"
              placeholder="main"
              value={wikiBranch}
              onChange={e => setWikiBranch(e.target.value)}
              style={inputStyle}
            />
          </form>
        </Field>
        <Field label="Token Privado" icon={<KeyRound size={13} />}>
          <form onSubmit={e => e.preventDefault()}>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="github_pat_..."
              value={wikiToken}
              onChange={e => setWikiToken(e.target.value)}
              style={inputStyle}
            />
          </form>
        </Field>
      </div>
    </div>
  );

  const renderIntegracoes = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        padding: '12px 14px', borderRadius: '10px',
        background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)',
        display: 'flex', alignItems: 'flex-start', gap: '10px',
      }}>
        <Plug size={14} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(110,231,183,0.8)', lineHeight: 1.6 }}>
          Conecte o DOZERO a ferramentas de automação como <b>n8n</b>, Zapier ou Make via Webhooks. Eventos do chat e rolagens serão enviados automaticamente.
        </p>
      </div>

      <Field label="URL do Webhook (n8n, Zapier)" icon={<Globe size={13} />} hint="URL que receberá o payload JSON dos eventos via POST.">
        <form onSubmit={e => e.preventDefault()}>
          <input
            type="text"
            placeholder="https://seu-n8n.com/webhook/123-abc..."
            value={n8nWebhookUrl}
            onChange={e => setN8nWebhookUrl(e.target.value)}
            style={inputStyle}
          />
        </form>
      </Field>
    </div>
  );

  return (
    // ── Backdrop ──
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99990,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-out',
        pointerEvents: 'auto',
      }}
    >
      {/* ── Panel ── */}
      <div style={{
        width: '100%',
        maxWidth: '560px',
        margin: '0 16px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--glass-border)',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)',
        animation: 'fadeIn 0.22s ease-out',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, transparent 100%)',
          borderBottom: '1px solid var(--glass-border)',
          flexShrink: 0,
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Settings2 size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Configurações do Ecossistema
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
              Ajustes de sistema, rede e wiki
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px', cursor: 'pointer', padding: '7px',
              color: 'var(--text-secondary)', display: 'flex', transition: 'all 0.15s',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Tab Bar ── */}
        <div style={{
          display: 'flex', gap: '4px', padding: '12px 20px 0',
          borderBottom: '1px solid var(--glass-border)', flexShrink: 0,
          background: 'rgba(0,0,0,0.1)',
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px 8px 0 0',
                  border: 'none', cursor: 'pointer',
                  background: active ? 'var(--bg-secondary)' : 'transparent',
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.78rem', fontFamily: 'var(--font-display)',
                  borderBottom: active ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  transition: 'all 0.18s', marginBottom: '-1px',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'geral' && renderGeral()}
          {activeTab === 'aparencia' && renderAparencia()}
          {activeTab === 'wiki'  && renderWiki()}
          {activeTab === 'integracoes' && renderIntegracoes()}
        </div>

        {/* ── Footer / Save button ── */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--glass-border)',
          background: 'rgba(0,0,0,0.15)',
          flexShrink: 0,
        }}>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', padding: '12px', borderRadius: '12px', border: 'none', cursor: saving || saved ? 'not-allowed' : 'pointer',
              background: saved
                ? 'linear-gradient(135deg, #16a34a, #15803d)'
                : 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
              color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.85rem',
              fontFamily: 'var(--font-display)', letterSpacing: '0.04em',
              transition: 'all 0.3s', opacity: saving ? 0.8 : 1,
              boxShadow: saved ? '0 0 20px rgba(34,197,94,0.3)' : '0 0 20px var(--accent-glow)',
            }}
          >
            {saving
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</>
              : saved
              ? <><Check size={16} /> Salvo! Recarregando...</>
              : <><Save size={16} /> Salvar e Aplicar</>}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
