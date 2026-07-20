import React, { useState } from 'react';
import { Copy, RefreshCw, Key, Link as LinkIcon, QrCode, Network } from 'lucide-react';

export const RoomManagerWidget: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const currentRoom = urlParams.get('room') || 'dozero-mesa-principal-v2';
  const currentPass = urlParams.get('pass') || '';

  const [newRoom, setNewRoom] = useState('');
  const [newPass, setNewPass] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Generate current invite link
  // Se estamos no localhost, substituímos para o link da Vercel para que o QR Code e o convite funcionem no celular dos jogadores.
  const baseUrl = window.location.origin.includes('localhost') ? 'https://dozero-vert.vercel.app' : window.location.origin;
  const inviteLink = `${baseUrl}/?room=${currentRoom}${currentPass ? `&pass=${currentPass}` : ''}`;
  
  // Ponytail lazy dependency-free QR Code!
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.trim()) return;
    
    const params = new URLSearchParams();
    params.set('room', newRoom.trim());
    if (newPass.trim()) {
      params.set('pass', newPass.trim());
    }
    
    // Redirect to new room
    window.location.href = `${window.location.pathname}?${params.toString()}`;
  };

  const handleRandomRoom = () => {
    const adjs = ['escura', 'sangrenta', 'eterna', 'perdida', 'sombria', 'profunda'];
    const nouns = ['taverna', 'masmorra', 'torre', 'caverna', 'fortaleza', 'tumba'];
    const rnd = () => Math.floor(Math.random() * 6);
    const randId = Math.floor(Math.random() * 9999);
    setNewRoom(`${nouns[rnd()]}-${adjs[rnd()]}-${randId}`);
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto' }}>
      
      {/* Current Room Info */}
      <div className="glass-panel" style={{ padding: '16px', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Network size={20} className="theme-indigo" />
          Sala Atual
        </h3>
        
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
          <div style={{ marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>ID da Sala:</div>
          <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-primary)', wordBreak: 'break-all' }}>
            {currentRoom}
          </div>
          {currentPass && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--warning)' }}>
              <Key size={14} /> Sala protegida com senha
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button 
            className="btn-primary" 
            onClick={handleCopy}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
          >
            <Copy size={16} />
            {copied ? 'Copiado!' : 'Copiar Convite'}
          </button>
          <button 
            className="btn-icon" 
            onClick={() => setShowQR(!showQR)}
            title="Mostrar QR Code"
            style={{ padding: '10px' }}
          >
            <QrCode size={18} />
          </button>
        </div>

        {showQR && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'white', padding: '16px', borderRadius: '8px' }}>
            <img src={qrUrl} alt="QR Code Convite" style={{ width: '200px', height: '200px' }} />
            <span style={{ fontSize: '0.8rem', color: '#333' }}>Escaneie para entrar na mesa</span>
          </div>
        )}
      </div>

      {/* Create New Room */}
      <div className="glass-panel" style={{ padding: '16px', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LinkIcon size={20} className="theme-green" />
          Criar Nova Sala (Resetar)
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Mudar de sala cria uma instância vazia (ideal se a sala antiga corrompeu ou ficou pesada).
        </p>

        <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Nome da Nova Sala:</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                value={newRoom}
                onChange={e => setNewRoom(e.target.value)}
                placeholder="Ex: dnd-campanha-2"
                style={{ flex: 1, padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '4px' }}
              />
              <button 
                type="button" 
                onClick={handleRandomRoom}
                className="btn-icon theme-blue"
                title="Gerar Nome Aleatório"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Senha (Opcional):</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '4px', paddingLeft: '8px' }}>
              <Key size={16} color="var(--text-secondary)" />
              <input 
                type="text" 
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Senha de acesso..."
                style={{ flex: 1, padding: '8px', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={!newRoom.trim()}
            style={{ padding: '10px', marginTop: '4px' }}
          >
            Criar & Entrar na Sala
          </button>
        </form>
      </div>

    </div>
  );
};
