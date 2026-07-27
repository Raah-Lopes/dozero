import sys

with open('d:\\DOZERO\\src\\components\\HUD\\NPCPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '<span>Exibir Tag de Nome</span>\n                          </label>\n                          <button'

replacement = """<span>Tag Nome</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                            <input
                              type="checkbox"
                              checked={t.inCombat !== false}
                              onChange={(e) => handleUpdateTokenProp(t, 'inCombat', e.target.checked)}
                              style={{ accentColor: 'var(--accent-primary)' }}
                            />
                            <span>Ativo Iniciativa</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                            <input
                              type="checkbox"
                              checked={t.hasVision === true}
                              onChange={(e) => {
                                handleUpdateTokenProp(t, 'hasVision', e.target.checked);
                                if (e.target.checked && !t.visionRadius) handleUpdateTokenProp(t, 'visionRadius', 200);
                              }}
                              style={{ accentColor: 'var(--accent-primary)' }}
                            />
                            <span>Visão (Névoa)</span>
                          </label>
                        </div>
                        
                        {/* Status/Conditions */}
                        <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <label style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Condições</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {CONDITIONS.map(cond => {
                              const isActive = (t.status_efeitos || []).includes(cond.id);
                              return (
                                <button
                                  key={cond.id}
                                  title={cond.title}
                                  onClick={(e) => { e.stopPropagation(); Tokens.toggleEffect(t.id, cond.id); }}
                                  style={{
                                    background: isActive ? cond.color : 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${isActive ? cond.color : 'var(--glass-border)'}`,
                                    borderRadius: '4px', padding: '2px 4px', fontSize: '0.65rem',
                                    color: isActive ? '#000' : 'var(--text-secondary)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px'
                                  }}
                                >
                                  {cond.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Close Button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                          <button"""

new_content = content.replace(target, replacement)
if new_content != content:
    with open('d:\\DOZERO\\src\\components\\HUD\\NPCPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Replaced successfully')
else:
    print('Target not found')
