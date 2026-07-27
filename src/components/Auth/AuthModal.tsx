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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="glass-panel max-w-md w-full p-8 relative flex flex-col gap-6 rounded-2xl shadow-2xl border border-white/10">
        
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white font-display uppercase tracking-wider">
            {isLogin ? 'Conectar-se' : 'Criar Conta'}
          </h2>
          <p className="text-white/60 text-sm">
            {isLogin ? 'Bem-vindo de volta ao Dozero' : 'Registre-se para começar suas aventuras'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/50 uppercase tracking-widest ml-1">Nome de Jogador</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500/50 transition-colors"
                placeholder="Ex: Gandalf"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/50 uppercase tracking-widest ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500/50 transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/50 uppercase tracking-widest ml-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500/50 transition-colors"
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-lg mt-2 transition-colors disabled:opacity-50"
          >
            {loading ? 'Aguarde...' : (isLogin ? 'Entrar na Mesa' : 'Registrar')}
          </button>
        </form>

        <div className="text-center mt-2">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-white/40 hover:text-white/80 text-sm transition-colors"
          >
            {isLogin ? 'Não tem uma conta? Registre-se.' : 'Já tem uma conta? Entre.'}
          </button>
        </div>

      </div>
    </div>
  );
};
