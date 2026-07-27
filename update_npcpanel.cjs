const fs = require('fs');
const content = fs.readFileSync('d:\\DOZERO\\src\\components\\HUD\\NPCPanel.tsx', 'utf8');

const target = `                              style={{ accentColor: 'var(--accent-primary)' }}
                            />
                            <span>Exibir Tag de Nome</span>
                          </label>
                          <button
                            onClick={() => setExpandedTokenId(null)}`;

const replacement = `                              style={{ accentColor: 'var(--accent-primary)' }}
                            />
                            <span>Tag Nome</span>
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
                                    border: \`1px solid \${isActive ? cond.color : 'var(--glass-border)'}\`,
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
                          <button
                            onClick={() => setExpandedTokenId(null)}`;

const newContent = content.split(target).join(replacement);
if (newContent !== content) {
    fs.writeFileSync('d:\\DOZERO\\src\\components\\HUD\\NPCPanel.tsx', newContent, 'utf8');
    console.log('Replaced successfully');
} else {
    console.log('Target not found');
}
