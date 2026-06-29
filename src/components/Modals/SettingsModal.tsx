import React, { useState, useEffect } from 'react';
import {
  X, Save, Globe, Wifi, Settings2, Shield,
  BookOpen, GitBranch, KeyRound, Check, Loader2,
  Swords, Scroll, User, Plug
} from 'lucide-react';
import { getWikiConfig, updateWikiConfig } from '../../store';
import { useRulesEngine } from '../../hooks/useRulesEngine';

interface SettingsModalProps {
  onClose: () => void;
}

type Tab = 'geral' | 'rede' | 'wiki' | 'integracoes';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'geral', label: 'Geral',  icon: <Settings2 size={15} /> },
  { id: 'rede',  label: 'Rede',   icon: <Wifi size={15} /> },
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

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('geral');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── State ──
  const { currentEngineId, setEngine, engines } = useRulesEngine();
  const [livekitUrl,   setLivekitUrl]   = useState(localStorage.getItem('livekitUrl')   || '');
  const [livekitToken, setLivekitToken] = useState(localStorage.getItem('livekitToken') || '');
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
    localStorage.setItem('livekitUrl',   livekitUrl);
    localStorage.setItem('livekitToken', livekitToken);
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

  const renderRede = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        padding: '12px 14px', borderRadius: '10px',
        background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)',
        display: 'flex', alignItems: 'flex-start', gap: '10px',
      }}>
        <Wifi size={14} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(125,211,252,0.8)', lineHeight: 1.6 }}>
          Configure o servidor LiveKit para habilitar voz e vídeo P2P durante as sessões.
        </p>
      </div>

      <Field label="WebSocket URL" icon={<Wifi size={13} />} hint="URL do servidor SFU no formato wss://...">
        <form onSubmit={e => e.preventDefault()}>
          <input
            type="text"
            placeholder="wss://seu-projeto.livekit.cloud"
            value={livekitUrl}
            onChange={e => setLivekitUrl(e.target.value)}
            style={inputStyle}
          />
        </form>
      </Field>

      <Field label="Access Token" icon={<KeyRound size={13} />} hint="Token JWT de acesso gerado pelo seu servidor LiveKit.">
        <form onSubmit={e => e.preventDefault()}>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="eyJh..."
            value={livekitToken}
            onChange={e => setLivekitToken(e.target.value)}
            style={inputStyle}
          />
        </form>
      </Field>
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
        <Plug size={14} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
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
      }}
    >
      {/* ── Panel ── */}
      <div style={{
        width: 'min(560px, 96vw)',
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
          {activeTab === 'rede'  && renderRede()}
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
              color: 'white', fontWeight: 800, fontSize: '0.85rem',
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
