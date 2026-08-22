import React, { useState, useEffect } from 'react';
import {
  X, Save, Settings2, Shield,
  Check, Loader2, Swords, User, Plug, Palette, Bot, ToyBrick
} from 'lucide-react';
import { useUserStore } from '../../store';
import { useRulesEngine } from '../../hooks/useRulesEngine';
import { useTheme } from '../../hooks/useTheme';
import { THEMES } from '../../themes';
import type { ThemeDefinition } from '../../themes';
import { DLCManagerTab } from './DLCManagerTab';
import { GMPasswordModal } from '../Auth/GMPasswordModal';
import { useAuthStore } from '../../store/authStore';

interface SettingsModalProps {
  onClose: () => void;
  initialTab?: Tab;
}

type Tab = 'geral' | 'aparencia' | 'modulos' | 'ia' | 'integracoes';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'geral', label: 'Geral', icon: <Settings2 size={15} /> },
  { id: 'aparencia', label: 'Aparência', icon: <Palette size={15} /> },
  { id: 'modulos', label: 'Módulos', icon: <ToyBrick size={15} /> },
  { id: 'ia', label: 'Robô IA', icon: <Bot size={15} /> },
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
  background: 'var(--bg-tertiary)',
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
        background: checked ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
        border: checked ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
      }} />
      <div style={{
        position: 'absolute', top: '3px', left: checked ? '21px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#ffffff', transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
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
          : `2px solid ${hovered ? theme.accentPrimary + '80' : 'var(--glass-border)'}`,
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
              border: '1px solid var(--glass-border)',
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
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // ── State ──
  const { user, setAuthModalOpen, signOut } = useAuthStore();
  const { currentThemeId, setTheme, themeOverrides, updateOverrides, clearOverrides } = useTheme();
  const { currentEngineId, setEngine, engines } = useRulesEngine();
  const { isGM, setIsGM } = useUserStore();
  const [aiEnabled, setAiEnabled] = useState(localStorage.getItem('aiBotEnabled') === 'true');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState(localStorage.getItem('n8nWebhookUrl') || '');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    localStorage.setItem('isGM', isGM ? 'true' : 'false');
    localStorage.setItem('aiBotEnabled', aiEnabled ? 'true' : 'false');
    localStorage.setItem('n8nWebhookUrl', n8nWebhookUrl);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    await new Promise(r => setTimeout(r, 700));
    window.location.reload();
  };

  // ── Tab Content ────────────────────────────────────────────────────────────
  const renderGeral = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Conta / Supabase */}
      <Field label="Conta & Sincronização em Nuvem" icon={<User size={13} />} hint="Conecte-se com sua conta Supabase para salvar e sincronizar campanhas.">
        <div style={{
          padding: '12px 14px', borderRadius: '12px',
          background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {user ? user.email : 'Não conectado'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
              {user ? 'Sessão ativa no Supabase' : 'Faça login para habilitar nuvem'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (user) {
                if (window.confirm('Deseja sair da sua conta?')) signOut();
              } else {
                setAuthModalOpen(true);
              }
            }}
            style={{
              padding: '8px 14px', borderRadius: '8px', border: 'none',
              background: user ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #9333ea, #6366f1)',
              color: user ? 'var(--danger)' : '#ffffff',
              fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            {user ? 'Desconectar' : 'Entrar / Cadastrar'}
          </button>
        </div>
      </Field>

      {/* GM Mode */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: '12px',
        background: isGM ? 'rgba(239,68,68,0.12)' : 'var(--bg-tertiary)',
        border: `1px solid ${isGM ? 'rgba(239,68,68,0.3)' : 'var(--glass-border)'}`,
        transition: 'all 0.25s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isGM ? 'rgba(239,68,68,0.15)' : 'var(--bg-secondary)',
            border: isGM ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--glass-border)',
          }}>
            <Shield size={16} color={isGM ? 'var(--danger)' : 'var(--text-secondary)'} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: isGM ? 'var(--danger)' : 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Modo Mestre (GM)
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
              Ativa ferramentas exclusivas do narrador
            </p>
          </div>
        </div>
        <Toggle id="gm-toggle" checked={isGM} onChange={(v) => {
          if (v) {
            setShowPasswordModal(true);
          } else {
            setIsGM(false);
          }
        }} />
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
                  background: active ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                  border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                  transition: 'all 0.18s',
                  boxShadow: active ? '0 0 12px var(--accent-glow)' : 'none',
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

      {/* Desktop Bottom Nav Toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: '12px',
        background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)'
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Exibir Barra de Atalhos Inferior no PC (Modo Atalhos)
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
            Ativa a barra inferior e botão flutuante (FAB) também em telas de computador
          </p>
        </div>
        <Toggle 
          id="desktop-nav-toggle" 
          checked={localStorage.getItem('showDesktopNav') === 'true'} 
          onChange={val => {
            localStorage.setItem('showDesktopNav', String(val));
            if (val) document.body.classList.add('show-desktop-nav');
            else document.body.classList.remove('show-desktop-nav');
          }} 
        />
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

  const renderModulos = () => (
    <div style={{ height: '100%', minHeight: '500px' }}>
      <DLCManagerTab />
    </div>
  );

  const renderIA = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        padding: '12px 14px', borderRadius: '10px',
        background: 'var(--accent-glow)', border: '1px solid var(--glass-border)',
        display: 'flex', alignItems: 'flex-start', gap: '10px',
      }}>
        <Bot size={14} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          O Robô Assistente analisa o chat e ajuda o mestre a narrar, sugerindo descrições, criando imagens e interagindo com os jogadores via "/bot".
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Bot size={20} color="var(--accent-primary)" />
          <div>
            <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Robô Assistente</span>
            <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Ativar interação automática no chat</span>
          </div>
        </div>
        <Toggle id="ai-toggle" checked={aiEnabled} onChange={(v) => {
          setAiEnabled(v);
          if (v) window.dispatchEvent(new CustomEvent('toggle-ai-bot', { detail: { forceState: true } }));
          else window.dispatchEvent(new CustomEvent('toggle-ai-bot', { detail: { forceState: false } }));
        }} />
      </div>

      <div style={{ marginTop: '10px' }}>
        <p style={{ margin: '0 0 10px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Deseja configurar a personalidade ou dar comandos específicos para a Inteligência Artificial?</p>
        <button 
          onClick={() => {
            onClose();
            window.dispatchEvent(new CustomEvent('toggle-window', { detail: 'aiStudio' }));
          }}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--glass-border)',
            borderRadius: '8px', padding: '12px 16px', color: 'var(--accent-primary)',
            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          <Bot size={16} /> Abrir AI Studio Completo
        </button>
      </div>
    </div>
  );

  const renderIntegracoes = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        padding: '12px 14px', borderRadius: '10px',
        background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)',
        display: 'flex', alignItems: 'flex-start', gap: '10px',
      }}>
        <Plug size={14} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Conecte o DOZERO a ferramentas de automação como <b>n8n</b>, Zapier ou Make via Webhooks. Eventos do chat e rolagens serão enviados automaticamente.
        </p>
      </div>

      <Field label="URL do Webhook (n8n, Zapier)" icon={<Plug size={13} />} hint="URL que receberá o payload JSON dos eventos via POST.">
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
        background: 'rgba(0,0,0,0.65)', 
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', 
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
        pointerEvents: 'auto',
      }}
    >
      {/* ── Panel ── */}
      <div style={{
        width: '100%',
        maxWidth: '580px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--glass-border)',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px var(--glass-border)',
        animation: 'fadeIn 0.22s ease-out',
        pointerEvents: 'auto',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, var(--accent-glow) 0%, transparent 100%)',
          borderBottom: '1px solid var(--glass-border)',
          flexShrink: 0,
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'var(--accent-glow)', border: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Settings2 size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Configurações do Sistema
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Preferências de tema, módulos, regras e inteligência artificial
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)',
              borderRadius: '8px', cursor: 'pointer', padding: '7px',
              color: 'var(--text-secondary)', display: 'flex', transition: 'all 0.15s',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Tab Bar ── */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '12px 20px 0',
          borderBottom: '1px solid var(--glass-border)', flexShrink: 0,
          background: 'var(--bg-tertiary)',
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
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, minHeight: '300px' }}>
          {activeTab === 'geral' && renderGeral()}
          {activeTab === 'aparencia' && renderAparencia()}
          {activeTab === 'modulos' && renderModulos()}
          {activeTab === 'ia' && renderIA()}
          {activeTab === 'integracoes' && renderIntegracoes()}
        </div>

        {/* ── Footer / Save button ── */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--glass-border)',
          background: 'var(--bg-tertiary)',
          flexShrink: 0,
        }}>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', padding: '12px', borderRadius: '12px', border: 'none', cursor: saving || saved ? 'not-allowed' : 'pointer',
              background: saved
                ? 'var(--success)'
                : 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
              color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.85rem',
              fontFamily: 'var(--font-display)', letterSpacing: '0.04em',
              transition: 'all 0.3s', opacity: saving ? 0.8 : 1,
              boxShadow: saved ? '0 0 20px var(--success)' : '0 0 20px var(--accent-glow)',
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

      <GMPasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
