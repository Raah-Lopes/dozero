import React, { useEffect, useState, useRef } from 'react';
import { HealthBar } from './HealthBar';
import { Dices, Crosshair, Trash2 } from 'lucide-react';
import { state, applyDamageToToken, pushChatMessage, updateTokenProps } from '../../store';
import { WoDParser } from '../../rules/WoDParser';

interface Macro {
  id: string;
  name: string;
  formula: string;
  system: 'WoD';
  pool: number;
  hunger: number;
  damage: number;
}

export const TargetTerminal: React.FC<{ tokenId: string; isGM?: boolean }> = ({ tokenId, isGM = true }) => {
  const [tokenData, setTokenData] = useState<any>(null);

  useEffect(() => {
    const observer = () => {
      const token = state.tokens.get(tokenId) as any;
      if (token) setTokenData({ ...token }); // Create new object reference to trigger re-render
    };

    state.tokens.observe(observer);
    observer(); // initial load

    return () => {
      state.tokens.unobserve(observer);
    };
  }, [tokenId]);

  const handlePropChange = (field: string, value: any) => {
    updateTokenProps(tokenId, { [field]: value });
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja deletar este personagem permanentemente?')) {
      state.tokens.delete(tokenId);
      // Ficha will unmount automatically if it's reading state or openSheets handles it.
      // But we should dispatch an event to close it in App.tsx
      window.dispatchEvent(new CustomEvent('close-sheet', { detail: { tokenId } }));
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    if (isGM && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200; // Small size for token avatars
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        } else if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const webpDataUrl = canvas.toDataURL('image/webp', 0.8);
        handlePropChange('imageUrl', webpDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!tokenData) return <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Ficha não encontrada ou deletada.</div>;

  const macros: Macro[] = [
    { id: '1', name: 'Rifle de Plasma', formula: 'Destreza + Armas de Fogo', system: 'WoD', pool: 8, hunger: 1, damage: 25 },
    { id: '2', name: 'Sobrecarga Cibernética', formula: 'Inteligência + Tecnologia', system: 'WoD', pool: 6, hunger: 2, damage: 40 },
  ];

  const handleRoll = (macro: Macro) => {
    if (macro.system === 'WoD') {
      const result = WoDParser.rollV5(macro.pool, macro.hunger, 3);
      
      let messageHtml = `<b>${macro.name}</b><br/>
        Sucessos: <b>${result.successes}</b> <br/>
        <span style="color:var(--text-secondary); font-size: 0.75rem">Dados: [${result.diceResult.normal.join(', ')}] | Estresse: [${result.diceResult.hunger.join(', ')}]</span>`;
        
      if (result.isMessyCritical) {
        messageHtml += `<br/><b style="color: var(--danger)">CRÍTICO CAÓTICO!</b> (Seus implantes sofrem curto-circuito)`;
      } else if (result.isBestialFailure) {
        messageHtml += `<br/><b style="color: var(--danger)">FALHA CRÍTICA!</b> (O recuo da arma te derruba)`;
      } else if (result.successes >= 3) {
        messageHtml += `<br/><b style="color: var(--success)">Acerto Crítico!</b> Causou ${macro.damage} de dano ao alvo.`;
        applyDamageToToken(tokenId, macro.damage);
      } else {
        messageHtml += `<br/><b>Falhou!</b> Os escudos do Sentinela absorveram o impacto.`;
      }

      pushChatMessage(messageHtml, result.successes >= 3 && !result.isMessyCritical, result.isBestialFailure || result.isMessyCritical);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Target Avatar and Glitch Styling */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div 
          onClick={handleAvatarClick}
          style={{
            width: '80px', height: '80px', borderRadius: 'var(--radius-sm)', overflow: 'hidden',
            border: '2px solid var(--danger)', boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)',
            position: 'relative', cursor: isGM ? 'pointer' : 'default'
          }}
          title={isGM ? "Clique para trocar a imagem" : ""}
        >
          {/* Scanline overlay */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
            backgroundSize: '100% 4px, 3px 100%',
            pointerEvents: 'none',
            zIndex: 2
          }} />
          <img 
            src={tokenData.imageUrl || (tokenId === 'omega_sentinel' ? '/omega_sentinel.png' : '/vite.svg')} 
            alt="Avatar" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          
          {isGM && (
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*"
              onChange={handleImageUpload}
            />
          )}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>
            <Crosshair size={18} />
            {isGM ? (
              <input 
                type="text" 
                value={tokenData.name || ''} 
                onChange={e => handlePropChange('name', e.target.value)}
                style={{ 
                  background: 'rgba(0,0,0,0.2)', border: '1px dashed var(--glass-border)', color: 'var(--text-primary)', 
                  textTransform: 'uppercase', letterSpacing: '1px', fontSize: '1rem', fontWeight: 'bold', width: '100%', padding: '2px' 
                }}
              />
            ) : (
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{tokenData.name}</h3>
            )}
          </div>
          
          <HealthBar current={tokenData.hp ?? 0} max={tokenData.maxHp ?? 1} label="Integridade" color="var(--danger)" />
          {isGM && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              HP: <input type="number" value={tokenData.hp ?? 0} onChange={e => handlePropChange('hp', parseInt(e.target.value) || 0)} style={{ width: '40px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white' }} />
              Max: <input type="number" value={tokenData.maxHp ?? 1} onChange={e => handlePropChange('maxHp', parseInt(e.target.value) || 0)} style={{ width: '40px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white' }} />
            </div>
          )}

          <div style={{ marginTop: '0.5rem' }}>
            <HealthBar current={tokenData.mana ?? 0} max={tokenData.maxMana ?? 1} color="var(--accent-primary)" label="Bateria Core" />
            {isGM && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Mana: <input type="number" value={tokenData.mana ?? 0} onChange={e => handlePropChange('mana', parseInt(e.target.value) || 0)} style={{ width: '40px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white' }} />
                Max: <input type="number" value={tokenData.maxMana ?? 1} onChange={e => handlePropChange('maxMana', parseInt(e.target.value) || 0)} style={{ width: '40px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white' }} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--glass-border)', width: '100%' }} />

      {/* Attack Protocols */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
          <Dices size={16} />
          <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Protocolos de Combate</h4>
        </div>

        {macros.map((macro) => (
          <button
            key={macro.id}
            onClick={() => handleRoll(macro)}
            style={{
              padding: '0.75rem',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--glass-border)',
              borderLeft: '3px solid var(--accent-primary)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.2s ease',
              fontFamily: 'monospace'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)';
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
              e.currentTarget.style.borderColor = 'var(--glass-border)';
            }}
          >
            <span style={{ fontWeight: 600 }}>&gt; {macro.name}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', background: 'rgba(168, 85, 247, 0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
              [{macro.formula}]
            </span>
          </button>
        ))}
      </div>

      <div style={{ height: '1px', background: 'var(--glass-border)', width: '100%', marginTop: 'auto' }} />
      
      {isGM && (
        <button 
          onClick={handleDelete}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center',
            padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
            border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            transition: 'background 0.2s', marginTop: 'auto'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
        >
          <Trash2 size={16} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Deletar Personagem</span>
        </button>
      )}
    </div>
  );
};
