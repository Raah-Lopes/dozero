import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check } from 'lucide-react';

interface InviteModalProps {
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  
  // Use VITE_LOCAL_IP se existir, caso contrário o host atual (fallback)
  const localIp = import.meta.env.VITE_LOCAL_IP || window.location.hostname;
  const port = window.location.port || '5173';
  
  const inviteLink = `http://${localIp}:${port}/`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        position: 'relative',
        width: '450px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <h2 style={{ margin: 0, color: 'var(--text-primary)', textAlign: 'center' }}>Convidar Jogadores</h2>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* LAN SECTION */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-secondary)', fontSize: '1.1rem' }}>🌐 Presencial (Mesmo Wi-Fi)</h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Peça para seus jogadores escanearem o código ou acessarem o link abaixo. 
              <br/><br/><b>Atenção:</b> Se não carregar, permita o "Node.js" no <b>Firewall do Windows</b> (ou desative-o temporariamente para redes privadas).
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', background: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <QRCodeSVG value={inviteLink} size={150} />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input readOnly value={inviteLink} style={{ flex: 1, padding: '0.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }} />
              <button onClick={handleCopy} style={{ padding: '0.5rem 1rem', background: 'var(--accent-primary)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* INTERNET SECTION */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-primary)', fontSize: '1.1rem' }}>🌍 Pela Internet (Distantes)</h3>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              O link acima <b>NÃO</b> funciona fora da sua casa. Para jogar pela internet:
            </p>
            <ol style={{ margin: '0', paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Mantenha o servidor rodando aqui.</li>
              <li>Abra um <b>novo terminal</b> na pasta do projeto.</li>
              <li>Execute o comando abaixo para criar um túnel:</li>
              <code style={{ background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '4px', display: 'block', color: '#a855f7' }}>npx ngrok http 5174</code>
              <li>Copie o link gerado (<i>https://...ngrok-free.app</i>) e mande pros jogadores!</li>
            </ol>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#ff9800' }}>
              * Os jogadores verão uma tela azul de segurança. **Eles DEVEM clicar no botão azul "Visit Site"**, senão a mesa não vai conectar!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
