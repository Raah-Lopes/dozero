const fs = require('fs');

const path = 'd:\\DOZERO\\src\\components\\Widgets\\PlayerTools\\TargetTerminal.tsx';
let content = fs.readFileSync(path, 'utf8');

// The start is `{/* HIGHLIGHTED HEADER AREA */}`
// The end is `{/* ACTIVE TAB CONTENT */}` but we want to replace up to the start of the `<div style={{ maxHeight: '260px'` block, or we can just replace everything up to `      {/* ACTIVE TAB CONTENT */}` and then re-append it.
const startIndex = content.indexOf('{/* HIGHLIGHTED HEADER AREA */}');
const endIndex = content.indexOf('{/* ACTIVE TAB CONTENT */}');

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find boundaries');
  process.exit(1);
}

const before = content.substring(0, startIndex);
const after = content.substring(endIndex); // starts with {/* ACTIVE TAB CONTENT */}

const newContent = `
      {/* ===== HEADER PREMIUM ===== */}
      <div style={{ 
        display: 'flex', gap: '12px', alignItems: 'center', 
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))', 
        padding: '12px', borderRadius: '10px', 
        border: '1px solid rgba(255, 255, 255, 0.08)', 
        boxShadow: '0 8px 16px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.05)',
        flexShrink: 0 
      }}>
        
        {/* AVATAR COM GLOW */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={handleAvatarClick}
            style={{
              width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden',
              border: \`3px solid \${getStatusColor(tokenData.status || 'npc').replace('0.2', '0.9')}\`,
              boxShadow: \`0 0 15px \${getStatusColor(tokenData.status || 'npc').replace('0.2', '0.4')}\`,
              position: 'relative', cursor: 'pointer', padding: 0, background: 'rgba(0,0,0,0.5)',
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Clique para trocar a imagem"
          >
            <img loading="lazy" decoding="async" 
              src={tokenData.imageUrl || (tokenId === 'omega_sentinel' ? '/omega_sentinel.png' : '/vite.svg')} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </button>
          
          {/* Quick Wiki View Button - Flutuante */}
          {wikiEntry && (
            <div style={{ position: 'absolute', bottom: '-4px', right: '-12px', display: 'flex', gap: '4px', zIndex: 5 }}>
              <button 
                onClick={() => {
                   if (tokenId) {
                     toggleTarget(tokenId);
                     window.dispatchEvent(new Event('targets-updated'));
                   }
                }}
                title="Mirar (Definir como Alvo)"
                style={{
                  background: isTargeted ? 'rgba(239, 68, 68, 0.9)' : 'rgba(30, 41, 59, 0.9)',
                  border: \`1px solid \${isTargeted ? '#fca5a5' : 'rgba(255,255,255,0.2)'}\`,
                  color: isTargeted ? '#fff' : '#cbd5e1',
                  width: '24px', height: '24px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
                }}
              >
                <Crosshair size={14} />
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-wiki-doc', { detail: wikiEntry.path }))}
                style={{
                  background: 'linear-gradient(to bottom, #c084fc, #9333ea)', border: '1px solid #d8b4fe',
                  color: '#fff', width: '24px', height: '24px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
                }}
                title="Abrir Ficha MD"
              >
                <FileText size={12} />
              </button>
            </div>
          )}
        </div>
        
        {/* NAME & BADGES */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {getStatusIcon(tokenData.status)}
            {isGM ? (
              <input 
                type="text" 
                value={tokenData.name || ''} 
                onChange={e => handlePropChange('name', e.target.value)}
                onBlur={e => handlePropChangeEnd('name', e.target.value)}
                style={{ 
                  background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(255,255,255,0.2)', color: '#f8fafc', 
                  fontSize: '1rem', fontWeight: '800', width: '100%', padding: '2px 6px',
                  borderRadius: '4px', letterSpacing: '0.5px', textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                }}
              />
            ) : (
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '0.5px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{tokenData.name}</h3>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            
            {/* Badge Nível */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <span style={{ background: 'rgba(56, 189, 248, 0.2)', padding: '2px 4px', fontSize: '0.55rem', color: '#7dd3fc', fontWeight: 'bold', textTransform: 'uppercase' }}>NV</span>
              {isGM ? (
                <input type="number" value={tokenData.nivel ?? 1} onChange={e => handlePropChange('nivel', parseInt(e.target.value) || 1)} onBlur={async (e) => { const val = parseInt(e.target.value) || 1; const path = tokenId ? wikiEntry?.path : wikiPath; if (path) { await syncTokenFieldToWiki(path, 'nivel', val); WikiIndexer.clearCache(); window.dispatchEvent(new Event('wiki-updated')); } }} style={{ background: 'transparent', border: 'none', color: '#fff', width: '28px', fontSize: '0.75rem', textAlign: 'center', fontWeight: 'bold' }} />
              ) : (
                <span style={{ padding: '0 6px', fontSize: '0.75rem', fontWeight: 'bold' }}>{tokenData.nivel ?? 1}</span>
              )}
              <button onClick={() => setIsLevelUpOpen(true)} title="Auditar Progressão" style={{ background: 'rgba(56, 189, 248, 0.1)', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}><TrendingUp size={10} /></button>
            </div>

            {/* Badge CA */}
            <div title={computedCA.breakdown} style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', cursor: 'help' }}>
              <span style={{ background: 'rgba(148, 163, 184, 0.2)', padding: '2px 4px', fontSize: '0.55rem', color: '#cbd5e1', fontWeight: 'bold', textTransform: 'uppercase' }}>CA</span>
              <span style={{ padding: '0 6px', fontSize: '0.75rem', fontWeight: 'bold', color: '#fff' }}>{computedCA.total}</span>
            </div>

            {/* Badge Velocidade */}
            <div title={computedVel.breakdown + (isGM ? " (Clique para editar a Base)" : "")} onClick={async () => { if (!isGM) return; const nova = parseFloat(prompt('Velocidade Base (em metros):', (tokenData.velocidade_base ?? 7.5).toString()) || ''); if (!isNaN(nova)) { handlePropChange('velocidade_base', nova); const path = tokenId ? wikiEntry?.path : wikiPath; if (path) { const { syncMultipleFieldsToWiki } = await import('../../../services/wiki/syncWiki'); await syncMultipleFieldsToWiki(path, { velocidade_base: nova }); } } }} style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', cursor: isGM ? 'pointer' : 'help' }}>
              <span style={{ background: 'rgba(52, 211, 153, 0.2)', padding: '2px 4px', fontSize: '0.55rem', color: '#6ee7b7', fontWeight: 'bold', textTransform: 'uppercase' }}>VEL</span>
              <span style={{ padding: '0 6px', fontSize: '0.75rem', fontWeight: 'bold', color: '#fff' }}>{computedVel.total}m</span>
            </div>
            
            {/* Status Picker (GM) */}
            {isGM ? (
              <select value={tokenData.status || 'npc'} onChange={async (e) => { const statusVal = e.target.value; let tipoVal = 'NPC'; if (statusVal === 'jogador') tipoVal = 'Personagem'; else if (statusVal === 'inimigo') tipoVal = 'Monstro'; handlePropChange('status', statusVal); const path = tokenId ? wikiEntry?.path : wikiPath; if (path) { await syncTokenFieldToWiki(path, 'status', statusVal); await syncTokenFieldToWiki(path, 'tipo', tipoVal); WikiIndexer.clearCache(); window.dispatchEvent(new Event('wiki-updated')); } }} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', borderRadius: '4px', padding: '1px 4px', fontSize: '0.6rem', textTransform: 'uppercase' }}>
                <option value="jogador">Jogador</option>
                <option value="npc">NPC</option>
                <option value="inimigo">Inimigo</option>
              </select>
            ) : (
              <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '1px 4px' }}>{tokenData.status}</span>
            )}
          </div>
        </div>
      </div>
      
      {/* ===== POOLS & COMBAT HEADER ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        
        {/* HP Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', fontWeight: 'bold', color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.5px' }} title="Pontos de Vida"><Heart size={10} fill="#fca5a5" /> Integridade</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
              {isGM ? (
                <>
                  <input type="number" value={tokenData.hp ?? 0} onChange={e => handlePropChange('hp', parseInt(e.target.value) || 0)} onBlur={e => handlePropChangeEnd('hp', parseInt(e.target.value) || 0)} style={{ width: '35px', background: 'transparent', border: 'none', borderBottom: '1px dashed #ef4444', color: '#fff', fontSize: '0.8rem', textAlign: 'right', fontWeight: 'bold' }} />
                  <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>/</span>
                  <input type="number" value={tokenData.maxHp ?? 100} onChange={e => handlePropChange('maxHp', parseInt(e.target.value) || 0)} onBlur={e => handlePropChangeEnd('maxHp', parseInt(e.target.value) || 0)} style={{ width: '35px', background: 'transparent', border: 'none', borderBottom: '1px dashed rgba(255,255,255,0.2)', color: '#cbd5e1', fontSize: '0.7rem' }} />
                </>
              ) : (
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>{tokenData.hp ?? 0} <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'normal' }}>/ {tokenData.maxHp ?? 100}</span></span>
              )}
            </div>
          </div>
          <HealthBar current={tokenData.hp ?? 0} max={tokenData.maxHp ?? 1} color="#ef4444" showLabel={false} />
        </div>

        {/* Mana Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', fontWeight: 'bold', color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.5px' }} title="Pontos de Mana"><Zap size={10} fill="#7dd3fc" /> Bateria Core</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
              {isGM ? (
                <>
                  <input type="number" value={tokenData.mana ?? 0} onChange={e => handlePropChange('mana', parseInt(e.target.value) || 0)} onBlur={e => handlePropChangeEnd('mana', parseInt(e.target.value) || 0)} style={{ width: '35px', background: 'transparent', border: 'none', borderBottom: '1px dashed #3b82f6', color: '#fff', fontSize: '0.8rem', textAlign: 'right', fontWeight: 'bold' }} />
                  <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>/</span>
                  <input type="number" value={tokenData.maxMana ?? 100} onChange={e => handlePropChange('maxMana', parseInt(e.target.value) || 0)} onBlur={e => handlePropChangeEnd('maxMana', parseInt(e.target.value) || 0)} style={{ width: '35px', background: 'transparent', border: 'none', borderBottom: '1px dashed rgba(255,255,255,0.2)', color: '#cbd5e1', fontSize: '0.7rem' }} />
                </>
              ) : (
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>{tokenData.mana ?? 0} <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'normal' }}>/ {tokenData.maxMana ?? 100}</span></span>
              )}
            </div>
          </div>
          <HealthBar current={tokenData.mana ?? 0} max={tokenData.maxMana ?? 1} color="#3b82f6" showLabel={false} />
        </div>

        {/* Vigor / Energia Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', fontWeight: 'bold', color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.5px' }} title="Vigor ou Energia"><Activity size={10} color="#6ee7b7" /> Vigor</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
              {isGM ? (
                <>
                  <input type="number" value={tokenData.energia ?? 100} onChange={e => handlePropChange('energia', parseInt(e.target.value) || 0)} onBlur={e => handlePropChangeEnd('energia', parseInt(e.target.value) || 0)} style={{ width: '35px', background: 'transparent', border: 'none', borderBottom: '1px dashed #10b981', color: '#fff', fontSize: '0.8rem', textAlign: 'right', fontWeight: 'bold' }} />
                  <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>/</span>
                  <input type="number" value={tokenData.energiaMax ?? 100} onChange={e => handlePropChange('energiaMax', parseInt(e.target.value) || 0)} onBlur={e => handlePropChangeEnd('energiaMax', parseInt(e.target.value) || 0)} style={{ width: '35px', background: 'transparent', border: 'none', borderBottom: '1px dashed rgba(255,255,255,0.2)', color: '#cbd5e1', fontSize: '0.7rem' }} />
                </>
              ) : (
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>{tokenData.energia ?? 100} <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'normal' }}>/ {tokenData.energiaMax ?? 100}</span></span>
              )}
            </div>
          </div>
          <HealthBar current={tokenData.energia ?? 100} max={tokenData.energiaMax ?? 100} color="#10b981" showLabel={false} />
        </div>

        {/* Buttons Row (Initiative + Riches) */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button 
            onClick={handleRollInitiative}
            style={{ 
              flex: 1, padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              background: 'linear-gradient(to right, rgba(234, 179, 8, 0.15), rgba(202, 138, 4, 0.15))', 
              color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.4)',
              borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.65rem',
              textTransform: 'uppercase', letterSpacing: '0.5px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }}
          >
            <Swords size={12} /> Iniciativa
          </button>
          
          {/* Quick Riches Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '0 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>💰</span>
            {isGM ? (
               <input type="number" value={tokenData.po ?? 0} onChange={e => handlePropChange('po', parseInt(e.target.value) || 0)} onBlur={async (e) => { const val = parseInt(e.target.value) || 0; const path = tokenId ? wikiEntry?.path : wikiPath; if (path) { await syncTokenFieldToWiki(path, 'po', val); } }} style={{ width: '35px', background: 'transparent', border: 'none', borderBottom: '1px dashed rgba(234, 179, 8, 0.5)', color: '#fde047', padding: 0, fontWeight: 'bold', fontSize: '0.75rem', textAlign: 'center' }} title="Peças de Ouro (PO)" />
            ) : (
               <span style={{ color: '#fde047', fontWeight: 'bold', fontSize: '0.75rem' }} title="Peças de Ouro">{tokenData.po ?? 0}</span>
            )}
          </div>
        </div>
      </div>

      {/* ===== TABS MENU PREMIUM ===== */}
      <div style={{ 
        display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '4px', 
        borderRadius: '8px', flexShrink: 0, border: '1px solid rgba(255,255,255,0.05)'
      }}>
        {[
          { id: 'roll', label: 'Testes', icon: Dices, color: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)' },
          { id: 'attacks', label: 'Ação', icon: Sword, color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
          { id: 'items', label: 'Bolsa', icon: Backpack, color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
          { id: 'config', label: 'Status', icon: Settings, color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' },
          { id: 'ficha', label: 'Ficha', icon: FileText, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)} 
            style={{
              flex: 1, padding: '6px 2px', fontSize: '0.6rem', fontWeight: 'bold', cursor: 'pointer',
              background: activeTab === tab.id ? tab.bg : 'transparent',
              border: 'none', borderRadius: '4px',
              color: activeTab === tab.id ? tab.color : 'var(--text-secondary)',
              transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              boxShadow: activeTab === tab.id ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
            }}
          >
            <tab.icon size={12} /> {tab.label}
          </button>
        ))}
      </div>

`;

const finalContent = before + newContent + after;
fs.writeFileSync(path, finalContent);
console.log('Successfully updated TargetTerminal via Node script.');
