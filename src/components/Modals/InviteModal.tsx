import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Users, Database } from 'lucide-react';
import { RoomManagerWidget } from '../Widgets/System/RoomManagerWidget';

interface InviteModalProps {
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ onClose }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedNgrok, setCopiedNgrok] = useState(false);
  const [activeTab, setActiveTab] = useState<'invite' | 'rooms'>('invite');
  
  // Use VITE_LOCAL_IP se existir, caso contrário o host atual (fallback)
  const localIp = (import.meta as any).env.VITE_LOCAL_IP || window.location.hostname;
  const port = window.location.port || '5173';
  
  const inviteLink = `http://${localIp}:${port}/`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyNgrok = () => {
    navigator.clipboard.writeText('npx ngrok http 5174');
    setCopiedNgrok(true);
    setTimeout(() => setCopiedNgrok(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100000,
      backdropFilter: 'blur(8px)',
      pointerEvents: 'auto'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        width: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        borderRadius: '12px'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 10 }}
        >
          <X size={20} />
        </button>

        <h2 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', textAlign: 'center', fontSize: '1.4rem' }}>
          Menu de Mesas
        </h2>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
          <button 
            onClick={() => setActiveTab('invite')}
            className={activeTab === 'invite' ? 'btn-primary' : 'btn-secondary'}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px' }}
          >
            <Users size={18} /> Convidar Jogadores
          </button>
          <button 
            onClick={() => setActiveTab('rooms')}
            className={activeTab === 'rooms' ? 'btn-primary' : 'btn-secondary'}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px' }}
          >
            <Database size={18} /> Gestor de Salas
          </button>
        </div>

        {/* TAB CONTENT: INVITE */}
        {activeTab === 'invite' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* LAN SECTION */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-secondary)', fontSize: '1.1rem' }}>🌐 Presencial (Mesmo Wi-Fi)</h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Peça para seus jogadores escanearem o código ou acessarem o link abaixo. 
                <br/><br/><b>Atenção:</b> Se não carregar, permita o "Node.js" no <b>Firewall do Windows</b>.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', background: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <QRCodeSVG value={inviteLink} size={150} />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input readOnly value={inviteLink} style={{ flex: 1, padding: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '4px', fontSize: '0.85rem' }} />
                <button onClick={handleCopyLink} style={{ padding: '0.5rem 1rem', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* INTERNET SECTION */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-primary)', fontSize: '1.1rem' }}>🌍 Pela Internet (Ngrok)</h3>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Abra um <b>novo terminal</b> na pasta do projeto e execute o comando abaixo para criar um túnel público:
              </p>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <code style={{ flex: 1, background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '4px', color: '#a855f7', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
                  npx ngrok http 5174
                </code>
                <button 
                  onClick={handleCopyNgrok} 
                  className="btn-icon theme-purple"
                  title="Copiar Código Ngrok"
                  style={{ padding: '0.5rem' }}
                >
                  {copiedNgrok ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              <ol style={{ margin: '0', paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <li>Copie o link gerado (<i>https://...ngrok-free.app</i>) e mande pros jogadores.</li>
                <li style={{ color: '#ff9800' }}>Os jogadores verão uma tela azul de segurança. Eles <b>DEVEM</b> clicar no botão azul "Visit Site", senão a mesa não conecta!</li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB CONTENT: ROOM MANAGER */}
        {activeTab === 'rooms' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <RoomManagerWidget />
          </div>
        )}
      </div>
    </div>
  );
};
