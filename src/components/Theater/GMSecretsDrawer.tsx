// src/components/Theater/GMSecretsDrawer.tsx
import React, { useState, useEffect } from 'react';
import { 
  Lock, EyeOff, ShieldAlert, Sparkles, X, 
  Key, Flame, Save, Check
} from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import { toast } from '../UI/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GMSecretsDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  const { currentScene, patchCurrentScene } = useSceneState();
  const [secrets, setSecrets] = useState(currentScene?.gmSecrets || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSecrets(currentScene?.gmSecrets || '');
  }, [currentScene?.id, currentScene?.gmSecrets]);

  if (!isOpen) return null;

  const handleSave = () => {
    patchCurrentScene({ gmSecrets: secrets });
    setSaved(true);
    toast.success('Segredos da cena salvos!');
    setTimeout(() => setSaved(false), 1500);
  };

  const insertSnippet = (snippet: string) => {
    setSecrets(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n\n${snippet}` : snippet;
    });
  };

  return (
    <div className="theater-secrets-overlay" onClick={onClose}>
      <div 
        className="theater-secrets-modal" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="theater-secrets-header">
          <div className="theater-secrets-title-group">
            <Lock size={16} color="#ef4444" />
            <div>
              <h3>Segredos do Mestre (Confidencial)</h3>
              <span>{currentScene?.title ? `Cena: ${currentScene.title}` : 'Sem cena ativa'}</span>
            </div>
          </div>

          <div className="theater-secrets-actions">
            <button 
              onClick={handleSave}
              className={`theater-secret-save-btn ${saved ? 'saved' : ''}`}
            >
              {saved ? <Check size={14} /> : <Save size={14} />}
              <span>{saved ? 'Salvo!' : 'Salvar'}</span>
            </button>
            <button onClick={onClose} className="theater-secrets-close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Quick Snippet Chips */}
        <div className="theater-secrets-chips">
          <span className="theater-chips-label">Atalhos:</span>
          <button 
            className="theater-chip-btn"
            onClick={() => insertSnippet('👁️ Percepção CD 14: ')}
          >
            👁️ Percepção CD
          </button>
          <button 
            className="theater-chip-btn"
            onClick={() => insertSnippet('⚡ Armadilha: Gatilho: [descreva], Efeito: [dano/condição]')}
          >
            ⚡ Armadilha
          </button>
          <button 
            className="theater-chip-btn"
            onClick={() => insertSnippet('💎 Tesouro Oculto: ')}
          >
            💎 Tesouro Oculto
          </button>
          <button 
            className="theater-chip-btn"
            onClick={() => insertSnippet('🩸 Fraqueza Secreta: ')}
          >
            🩸 Fraqueza de Monstro
          </button>
        </div>

        {/* Editor Area */}
        <div className="theater-secrets-body">
          <textarea 
            className="theater-secrets-textarea"
            placeholder="Escreva aqui segredos, táticas de combate, testes de perícia e pistas ocultas que apenas você, como Mestre, deve saber..."
            value={secrets}
            onChange={e => setSecrets(e.target.value)}
            rows={12}
          />
        </div>

        <div className="theater-secrets-footer">
          <EyeOff size={13} color="#94a3b8" />
          <small>Estas anotações são confidenciais e nunca são exibidas aos jogadores.</small>
        </div>
      </div>
    </div>
  );
};
