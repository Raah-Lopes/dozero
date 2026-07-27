import React, { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, X } from 'lucide-react';
import { hashPassword } from '../../utils/crypto';
import { state } from '../../services/yjs';
import { useUserStore } from '../../store/user';

interface GMPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GMPasswordModal: React.FC<GMPasswordModalProps> = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { setIsGM } = useUserStore();

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      // Check if there's already a password set in Yjs
      const currentHash = state.roomSettings.get('gmPasswordHash');
      setIsCreating(!currentHash);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('A senha não pode ser vazia.');
      return;
    }

    try {
      const hash = await hashPassword(password);
      
      if (isCreating) {
        // Create new password
        state.roomSettings.set('gmPasswordHash', hash);
        setIsGM(true);
        onClose();
      } else {
        // Validate existing password
        const currentHash = state.roomSettings.get('gmPasswordHash');
        if (hash === currentHash) {
          setIsGM(true);
          onClose();
        } else {
          setError('Senha incorreta! Você não é o Mestre desta mesa.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao processar a senha.');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 99999, padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '400px',
        padding: '2rem',
        display: 'flex', flexDirection: 'column', gap: '1.5rem',
        position: 'relative',
        border: '1px solid rgba(239,68,68,0.3)'
      }}>
        
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '50%', color: '#f87171' }}>
            {isCreating ? <Lock size={32} /> : <Shield size={32} />}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: '#fca5a5', fontSize: '1.5rem', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {isCreating ? 'Proteger Mesa' : 'Acesso Restrito'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            {isCreating 
              ? 'Esta mesa ainda não tem um Mestre. Defina uma senha para reivindicar esta mesa.' 
              : 'Digite a senha do Mestre para assumir o controle total da mesa.'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              autoFocus
              placeholder="Sua senha secreta..."
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'white',
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                outline: 'none',
                textAlign: 'center',
                letterSpacing: '2px'
              }} 
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ background: 'var(--danger)', width: '100%', padding: '1rem', fontSize: '1rem' }}>
            {isCreating ? 'Definir Senha e Assumir' : 'Destrancar Painel do Mestre'}
          </button>
        </form>

      </div>
    </div>
  );
};
