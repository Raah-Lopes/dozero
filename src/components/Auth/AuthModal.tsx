import React, { useState } from 'react';
import { pb } from '../../services/pb';

export const AuthModal: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await pb.collection('users').authWithPassword(email, password);
      } else {
        await pb.collection('users').create({
          email,
          password,
          passwordConfirm: password,
          name
        });
        // Auto-login after registration
        await pb.collection('users').authWithPassword(email, password);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro na autenticação. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: '20px'
  };

  const modalStyle: React.CSSProperties = {
    width: '100%', maxWidth: '400px',
    padding: '2rem',
    display: 'flex', flexDirection: 'column', gap: '1.5rem'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '1rem',
    marginBottom: '1rem',
    outline: 'none'
  };

  return (
    <div style={overlayStyle}>
      <div className="glass-panel" style={modalStyle}>
        
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '1.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
            {isLogin ? 'Conectar-se' : 'Criar Conta'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {isLogin ? 'Bem-vindo de volta ao Dozero' : 'Registre-se para começar suas aventuras'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          {!isLogin && (
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', display: 'block' }}>Nome de Jogador</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required={!isLogin} style={inputStyle} placeholder="Ex: Gandalf" />
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', display: 'block' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} placeholder="seu@email.com" />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', display: 'block' }}>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={inputStyle} placeholder="Mínimo 8 caracteres" />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '1rem', fontSize: '1rem' }}>
            {loading ? 'Aguarde...' : (isLogin ? 'Entrar na Mesa' : 'Registrar')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }} onMouseOver={e => e.currentTarget.style.color = 'white'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
            {isLogin ? 'Não tem uma conta? Registre-se.' : 'Já tem uma conta? Entre.'}
          </button>
        </div>

      </div>
    </div>
  );
};
