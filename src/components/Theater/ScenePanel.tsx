// src/components/Theater/ScenePanel.tsx
import React, { useState, useRef } from 'react';
import { Edit2, Check, X, Plus, CheckSquare, Square, Lock, Eye, EyeOff, Sun, Moon, Sunset, Sunrise, Image, Trash2, Link as LinkIcon, ExternalLink, Wand2, Target, CheckCircle2, XCircle } from 'lucide-react';
import { useSceneState } from './hooks/useSceneState';
import { useWiki } from '../../hooks/useWiki';
import { setTheaterMood, setTheaterWeather, type MoodType, type WeatherType, type TimeOfDay, type SceneAsset } from '../../store';
import { generateAI } from '../../services/ai/AIProvider';

const MOODS: { value: MoodType; label: string; icon: string }[] = [
  { value: 'neutral', label: 'Neutro', icon: '⬜' },
  { value: 'suspense', label: 'Suspense', icon: '🟣' },
  { value: 'horror', label: 'Horror', icon: '🔴' },
  { value: 'adventure', label: 'Aventura', icon: '🟡' },
  { value: 'victory', label: 'Vitória', icon: '🟢' },
  { value: 'sadness', label: 'Tristeza', icon: '🔵' },
  { value: 'mystery', label: 'Mistério', icon: '🟤' },
  { value: 'combat', label: 'Combate', icon: '🔥' },
];

const WEATHERS: { value: WeatherType; label: string }[] = [
  { value: 'clear', label: '☀️' },
  { value: 'rain', label: '🌧' },
  { value: 'storm', label: '⛈' },
  { value: 'fog', label: '🌫' },
  { value: 'snow', label: '❄️' },
  { value: 'fire', label: '🔥' },
  { value: 'darkness', label: '🌑' },
];

const TIME_ICONS: Record<TimeOfDay, React.ReactNode> = {
  dawn:  <Sunrise size={14} />,
  day:   <Sun size={14} />,
  dusk:  <Sunset size={14} />,
  night: <Moon size={14} />,
};

export const ScenePanel: React.FC = () => {
  const { currentScene, patchCurrentScene, setObjectiveStatus, toggleObjectiveSecret, addObjective, removeObjective, mood, weather, theaterData } = useSceneState();
  const { index: wikiIndex } = useWiki();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingSubtitle, setEditingSubtitle] = useState(false);
  const [subtitleDraft, setSubtitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [showObjectives, setShowObjectives] = useState(true);
  const [newObjText, setNewObjText] = useState('');
  const [addingObj, setAddingObj] = useState(false);
  const [showSecretObjs, setShowSecretObjs] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // AI Copilot state
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingAssetImage, setIsGeneratingAssetImage] = useState(false);

  // States for visual elements (assets)
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<SceneAsset | null>(null);
  const [assetTitle, setAssetTitle] = useState('');
  const [assetUrl, setAssetUrl] = useState('');
  const [assetDesc, setAssetDesc] = useState('');
  const [assetLink, setAssetLink] = useState('');
  const [assetType, setAssetType] = useState<SceneAsset['type']>('npc');
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const assetImageInputRef = useRef<HTMLInputElement>(null);

  const handleAssetImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAssetUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAsset = () => {
    if (!assetTitle.trim() || !assetUrl.trim() || !currentScene) return;
    const assets = currentScene.assets || [];
    if (editingAsset) {
      const updated = assets.map(a =>
        a.id === editingAsset.id
          ? { ...a, title: assetTitle.trim(), url: assetUrl.trim(), description: assetDesc.trim(), link: assetLink.trim(), type: assetType }
          : a
      );
      patchCurrentScene({ assets: updated });
    } else {
      const newAsset: SceneAsset = {
        id: `asset_${Date.now()}`,
        title: assetTitle.trim(),
        url: assetUrl.trim(),
        description: assetDesc.trim(),
        link: assetLink.trim(),
        type: assetType,
      };
      patchCurrentScene({ assets: [...assets, newAsset] });
    }
    setAssetTitle('');
    setAssetUrl('');
    setAssetDesc('');
    setAssetLink('');
    setAssetType('npc');
    setEditingAsset(null);
    setShowAddForm(false);
  };

  const handleGenerateDescription = async () => {
    if (!currentScene) return;
    setIsGeneratingDesc(true);
    try {
      const activeObjs = currentScene.objectives.filter(o => !o.completed).map(o => o.text).join(', ');
      const prompt = `Gere uma descrição narrativa literária e imersiva (MÁXIMO 2 PARÁGRAFOS curtos) para uma cena de RPG de mesa com as seguintes características: Título da Cena: ${currentScene.title}. Clima: ${weather}. Atmosfera: ${mood}. Horário: ${currentScene.timeOfDay}. ${activeObjs ? `Objetivos dos jogadores: ${activeObjs}.` : ''} Foque em criar tensão e ambientação sensorial (visões, sons, cheiros). Aja como um Mestre de Jogo experiente. Não inclua comentários fora do personagem, responda apenas com a narrativa em Português do Brasil.`;

      const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
      if (response.ok) {
        const text = await response.text();
        patchCurrentScene({ description: text.trim() });
      } else {
        throw new Error('Falha na resposta do Pollinations API');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar descrição pela IA Mágica (Pollinations). Verifique sua conexão.');
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleGenerateImage = () => {
    if (!currentScene) return;
    setIsGeneratingImage(true);
    const promptText = `Epic RPG scenery, ${currentScene.title}, ${mood} atmosphere, ${weather} weather, ${currentScene.timeOfDay}, highly detailed, digital painting, masterpiece, 4k`;
    const encodedPrompt = encodeURIComponent(promptText);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=400&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
    
    // Simulate loading to allow user to see it happening
    setTimeout(() => {
      patchCurrentScene({ imageUrl: url });
      setIsGeneratingImage(false);
    }, 1500);
  };

  const handleGenerateAssetImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!assetTitle.trim()) {
      alert("Por favor, preencha o Título primeiro para a IA saber o que desenhar!");
      return;
    }
    
    setIsGeneratingAssetImage(true);
    
    // Convert asset type to english prompt helper
    let typePrompt = "fantasy concept art";
    if (assetType === 'npc') typePrompt = "fantasy character portrait, portrait, face";
    if (assetType === 'monster') typePrompt = "scary fantasy monster creature concept, full body";
    if (assetType === 'location') typePrompt = "fantasy landscape scenery, environment art";
    if (assetType === 'prop') typePrompt = "fantasy item prop icon, magic artifact, centered on dark background";
    
    const promptText = `Epic RPG art, ${assetTitle.trim()}, ${typePrompt}, highly detailed, masterpiece, 4k`;
    const encodedPrompt = encodeURIComponent(promptText);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
    
    setTimeout(() => {
      setAssetUrl(url);
      setIsGeneratingAssetImage(false);
    }, 1500);
  };

  const startEditAsset = (asset: SceneAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAsset(asset);
    setAssetTitle(asset.title);
    setAssetUrl(asset.url);
    setAssetDesc(asset.description || '');
    setAssetLink(asset.link || '');
    setAssetType(asset.type || 'npc');
    setShowAddForm(true);
  };

  const handleDeleteAsset = (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente remover este elemento visual?')) return;
    if (!currentScene) return;
    const assets = currentScene.assets || [];
    patchCurrentScene({ assets: assets.filter(a => a.id !== assetId) });
  };

  const getAssetTypeColors = (type?: SceneAsset['type']) => {
    switch (type) {
      case 'npc':
        return { border: 'rgba(168,85,247,0.4)', text: '#c084fc', bg: 'rgba(168,85,247,0.1)', label: 'NPC' };
      case 'monster':
        return { border: 'rgba(239,68,68,0.4)', text: '#fca5a5', bg: 'rgba(239,68,68,0.1)', label: 'Monstro' };
      case 'location':
        return { border: 'rgba(59,130,246,0.4)', text: '#93c5fd', bg: 'rgba(59,130,246,0.1)', label: 'Lugar' };
      case 'prop':
        return { border: 'rgba(249,115,22,0.4)', text: '#fed7aa', bg: 'rgba(249,115,22,0.1)', label: 'Prop' };
      default:
        return { border: 'rgba(107,114,128,0.4)', text: '#e2e8f0', bg: 'rgba(107,114,128,0.1)', label: 'Outro' };
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      patchCurrentScene({ imageUrl: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  

  if (!currentScene) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: '#475569' }}>
        <div style={{ fontSize: '3rem', opacity: 0.3 }}>🎬</div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>Nenhuma cena ativa</p>
        <p style={{ fontSize: '0.8rem', color: '#374151', textAlign: 'center' }}>Crie uma cena na trilha narrativa à esquerda</p>
      </div>
    );
  }

  const visibleObjectives = currentScene.objectives.filter(o => showSecretObjs || !o.secret);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0', overflowY: 'auto' }}>
      {/* Scene image */}
      <div
        style={{
          position: 'relative',
          height: '140px',
          background: currentScene.imageUrl
            ? `url(${currentScene.imageUrl}) center/cover no-repeat`
            : 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(59,130,246,0.08) 100%)',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '16px',
          flexShrink: 0,
          cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        onClick={() => imageInputRef.current?.click()}
      >
        {!currentScene.imageUrl && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#374151', gap: '8px' }}>
            <Image size={32} />
            <span style={{ fontSize: '0.8rem' }}>Clique para adicionar imagem</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', borderRadius: '0 0 12px 12px' }} />

        {/* Generate Image Button overlay */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleGenerateImage(); }}
            disabled={isGeneratingImage}
            style={{ 
              background: 'rgba(168,85,247,0.7)', 
              border: '1px solid rgba(255,255,255,0.2)', 
              color: 'white', 
              borderRadius: '8px', 
              padding: '6px 10px', 
              fontSize: '0.75rem', 
              cursor: isGeneratingImage ? 'wait' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
            }}
          >
            <Wand2 size={14} />
            {isGeneratingImage ? 'Gerando Fundo...' : 'Gerar Fundo IA'}
          </button>
        </div>

        {/* Title overlay */}
        <div style={{ position: 'absolute', bottom: '12px', left: '14px', right: '14px' }}>
          {editingTitle ? (
            <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { patchCurrentScene({ title: titleDraft }); setEditingTitle(false); } if (e.key === 'Escape') setEditingTitle(false); }}
                onBlur={() => { if (titleDraft.trim()) { patchCurrentScene({ title: titleDraft.trim() }); } setEditingTitle(false); }}
                style={{ flex: 1, background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(168,85,247,0.5)', borderRadius: '6px', color: 'white', padding: '6px 10px', fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}
              />
              <button onClick={() => { patchCurrentScene({ title: titleDraft }); setEditingTitle(false); }} style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '6px', color: '#6ee7b7', cursor: 'pointer', padding: '4px 8px' }}><Check size={14} /></button>
              <button onClick={() => setEditingTitle(false)} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '6px', color: '#fca5a5', cursor: 'pointer', padding: '4px 8px' }}><X size={14} /></button>
            </div>
          ) : (
            <h2
              style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.8)', cursor: 'text', display: 'flex', alignItems: 'center', gap: '8px' }}
              onDoubleClick={e => { e.stopPropagation(); setTitleDraft(currentScene.title); setEditingTitle(true); }}
              title="Duplo clique para editar"
            >
              {currentScene.title}
              <Edit2 
                size={14} 
                color="rgba(255,255,255,0.4)" 
                style={{ cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); setTitleDraft(currentScene.title); setEditingTitle(true); }}
              />
            </h2>
          )}
          {editingSubtitle ? (
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }} onClick={e => e.stopPropagation()}>
              <input autoFocus value={subtitleDraft} onChange={e => setSubtitleDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { patchCurrentScene({ subtitle: subtitleDraft }); setEditingSubtitle(false); } if (e.key === 'Escape') setEditingSubtitle(false); }} onBlur={() => { patchCurrentScene({ subtitle: subtitleDraft }); setEditingSubtitle(false); }} style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '4px', color: '#cbd5e1', padding: '3px 8px', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }} />
            </div>
          ) : (
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', cursor: 'text' }} onDoubleClick={e => { e.stopPropagation(); setSubtitleDraft(currentScene.subtitle); setEditingSubtitle(true); }} title="Duplo clique para editar">
              {currentScene.subtitle || 'Clique duplo para adicionar subtítulo'}
            </p>
          )}
        </div>

        {/* Time of day indicator */}
        <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
          {(['dawn', 'day', 'dusk', 'night'] as TimeOfDay[]).map(t => (
            <button key={t} onClick={() => patchCurrentScene({ timeOfDay: t })} style={{ padding: '5px', borderRadius: '50%', background: currentScene.timeOfDay === t ? 'rgba(168,85,247,0.5)' : 'rgba(0,0,0,0.5)', border: currentScene.timeOfDay === t ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.1)', color: currentScene.timeOfDay === t ? 'white' : 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.2s' }} title={t}>
              {TIME_ICONS[t]}
            </button>
          ))}
        </div>

        <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
      </div>

      {/* Mood & Weather controls */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '120px' }}>
          <label style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)', display: 'block', marginBottom: '6px' }}>Atmosfera</label>
          <select
            value={mood}
            onChange={e => setTheaterMood(e.target.value as MoodType)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            {MOODS.map(m => <option key={m.value} value={m.value}>{m.icon} {m.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)', display: 'block', marginBottom: '6px' }}>Clima</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            {WEATHERS.map(w => (
              <button key={w.value} onClick={() => setTheaterWeather(w.value)} title={w.value} style={{ padding: '6px 8px', borderRadius: '6px', background: weather === w.value ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${weather === w.value ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' }}>
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Description */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)' }}>Descrição Narrativa</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleGenerateDescription} disabled={isGeneratingDesc} style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', borderRadius: '4px', padding: '2px 8px', fontSize: '0.65rem', cursor: isGeneratingDesc ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isGeneratingDesc ? 'Gerando...' : 'Copiloto IA'}
            </button>
            <button onClick={() => { setDescDraft(currentScene.description || ''); setEditingDesc(!editingDesc); }} style={{ background: 'transparent', border: 'none', color: editingDesc ? '#a855f7' : '#475569', cursor: 'pointer' }}>
              <Edit2 size={12} />
            </button>
          </div>
        </div>
        {editingDesc ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <textarea
              autoFocus
              value={descDraft}
              onChange={e => setDescDraft(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(168,85,247,0.3)', color: '#e2e8f0', fontSize: '0.82rem', fontFamily: 'var(--font-body)', resize: 'vertical', lineHeight: 1.5 }}
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => { patchCurrentScene({ description: descDraft }); setEditingDesc(false); }} style={{ flex: 1, padding: '6px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', color: '#6ee7b7', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Check size={12} /> Salvar
              </button>
              <button onClick={() => setEditingDesc(false)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem' }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '0.82rem', color: currentScene.description ? '#94a3b8' : '#374151', lineHeight: 1.6, fontStyle: currentScene.description ? 'normal' : 'italic', cursor: 'pointer' }} onClick={() => { setDescDraft(currentScene.description || ''); setEditingDesc(true); }}>
            {currentScene.description || 'Clique para adicionar descrição...'}
          </p>
        )}
      </div>

      {/* Estilos específicos para hover dos cards */}
      <style>{`
        .asset-card-hover:hover .asset-actions {
          opacity: 1 !important;
        }
        .asset-card-hover:hover {
          transform: scale(1.03);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3) !important;
          border-color: rgba(255,255,255,0.4) !important;
        }
        .asset-card-add-hover:hover {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(168,85,247,0.4) !important;
          color: rgba(255,255,255,0.7) !important;
        }
      `}</style>

      {/* Elementos Visuais */}
      <div style={{ marginBottom: '20px', marginTop: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)' }}>Elementos Visuais</label>
          <button
            onClick={() => {
              setEditingAsset(null);
              setAssetTitle('');
              setAssetUrl('');
              setAssetDesc('');
              setAssetLink('');
              setAssetType('npc');
              setShowAddForm(true);
            }}
            style={{ background: 'transparent', border: 'none', color: '#a855f7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>

        {/* Grade de Elementos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '10px', marginTop: '6px' }}>
          {(currentScene.assets || []).map((asset, idx) => {
            const colors = getAssetTypeColors(asset.type);
            return (
              <div
                key={asset.id}
                onClick={() => setGalleryIndex(idx)}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: '10px',
                  background: `url(${asset.url}) center/cover no-repeat`,
                  border: `1.5px solid ${colors.border}`,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                  transition: 'all 0.2s ease',
                }}
                className="asset-card-hover"
              >
                {/* Legenda/Título no topo */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  padding: '4px 6px',
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}>
                  {asset.title}
                </div>

                {/* Badge de tipo */}
                <div style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '4px',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  background: 'rgba(0,0,0,0.6)',
                  color: colors.text,
                  fontSize: '0.55rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  border: `1px solid ${colors.border}`
                }}>
                  {colors.label}
                </div>

                {/* Overlay de ações ao passar o mouse */}
                <div
                  className="asset-actions"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <button
                    onClick={(e) => startEditAsset(asset, e)}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      borderRadius: '50%',
                      padding: '5px',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                    title="Editar"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteAsset(asset.id, e)}
                    style={{
                      background: 'rgba(239,68,68,0.2)',
                      border: 'none',
                      borderRadius: '50%',
                      padding: '5px',
                      color: '#fca5a5',
                      cursor: 'pointer'
                    }}
                    title="Excluir"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Card de Adição */}
          <div
            onClick={() => {
              setEditingAsset(null);
              setAssetTitle('');
              setAssetUrl('');
              setAssetDesc('');
              setAssetLink('');
              setAssetType('npc');
              setShowAddForm(true);
            }}
            style={{
              aspectRatio: '1',
              borderRadius: '10px',
              border: '2px dashed rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.02)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            className="asset-card-add-hover"
          >
            <Plus size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Adicionar</span>
          </div>
        </div>
      </div>

      {/* Formulário Modal de Adição/Edição */}
      {showAddForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '420px',
            padding: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'white', fontWeight: 700 }}>
                {editingAsset ? 'Editar Elemento Visual' : 'Novo Elemento Visual'}
              </h3>
              <button
                onClick={() => setShowAddForm(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Título */}
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Título / Nome</label>
              <input
                type="text"
                value={assetTitle}
                onChange={e => setAssetTitle(e.target.value)}
                placeholder="Ex: Sentinela Orc, Poção de Vida..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.82rem' }}
              />
            </div>

            {/* Tipo */}
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Tipo</label>
              <select
                value={assetType}
                onChange={e => setAssetType(e.target.value as any)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                <option value="npc">👤 NPC</option>
                <option value="monster">👾 Monstro</option>
                <option value="location">🏔️ Lugar</option>
                <option value="prop">📦 Prop</option>
                <option value="other">❓ Outro</option>
              </select>
            </div>

            {/* Origem da Imagem */}
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Imagem</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  value={assetUrl.startsWith('data:') ? 'Arquivo Local Carregado' : assetUrl}
                  disabled={assetUrl.startsWith('data:')}
                  onChange={e => setAssetUrl(e.target.value)}
                  placeholder="URL da imagem (ex: https://...)"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: assetUrl.startsWith('data:') ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: assetUrl.startsWith('data:') ? '#64748b' : 'white', fontSize: '0.82rem' }}
                />

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => assetImageInputRef.current?.click()}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(168,85,247,0.1)',
                      border: '1px solid rgba(168,85,247,0.2)',
                      borderRadius: '6px',
                      color: '#c084fc',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Image size={13} />
                    Carregar Local
                  </button>

                  <button
                    onClick={handleGenerateAssetImage}
                    disabled={isGeneratingAssetImage}
                    style={{
                      padding: '6px 12px',
                      background: 'linear-gradient(to right, rgba(59,130,246,0.2), rgba(168,85,247,0.2))',
                      border: '1px solid rgba(168,85,247,0.4)',
                      borderRadius: '6px',
                      color: '#e2e8f0',
                      fontSize: '0.75rem',
                      cursor: isGeneratingAssetImage ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: isGeneratingAssetImage ? 0.6 : 1,
                      fontWeight: 600
                    }}
                  >
                    <Wand2 size={13} color="#fcd34d" />
                    {isGeneratingAssetImage ? 'Criando...' : 'IA Mágica (Grátis)'}
                  </button>
                  {assetUrl && (
                    <button
                      onClick={() => setAssetUrl('')}
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '6px',
                        color: '#fca5a5',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <input
                  ref={assetImageInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAssetImageUpload}
                />
              </div>
            </div>

            {/* Vinculação de Ficha ou Link Customizado */}
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Vincular Ficha (Wiki)</label>
              <select
                value={wikiIndex.some(e => e.path === assetLink) ? assetLink : ''}
                onChange={e => setAssetLink(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.82rem', cursor: 'pointer', marginBottom: '8px' }}
              >
                <option value="">-- Selecione uma Ficha --</option>
                {wikiIndex
                  .filter(e => {
                    const tipo = String(e.metadata?.tipo || '').toLowerCase();
                    const path = e.path.toLowerCase();
                    return ['pc', 'npc', 'monstro', 'personagem', 'jogador', 'inimigo'].includes(tipo) ||
                           path.includes('/fichas/') ||
                           path.includes('/personagens/');
                  })
                  .map(e => (
                    <option key={e.path} value={e.path}>
                      {e.metadata?.nome || e.metadata?.titulo || e.slug}
                    </option>
                  ))
                }
              </select>

              <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Ou Link Customizado (URL)</label>
              <input
                type="text"
                value={assetLink && !wikiIndex.some(e => e.path === assetLink) ? assetLink : ''}
                onChange={e => setAssetLink(e.target.value)}
                placeholder="Ex: https://obsidian.md ou outro link..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.82rem' }}
              />
            </div>

            {/* Descrição/Legenda */}
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Legenda / Descrição</label>
              <textarea
                value={assetDesc}
                onChange={e => setAssetDesc(e.target.value)}
                placeholder="Uma breve descrição sobre o personagem ou objeto..."
                rows={3}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.82rem', fontFamily: 'var(--font-body)', resize: 'vertical' }}
              />
            </div>

            {/* Botões de Ação */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                onClick={handleSaveAsset}
                disabled={!assetTitle.trim() || !assetUrl.trim()}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: (!assetTitle.trim() || !assetUrl.trim()) ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.8)',
                  color: (!assetTitle.trim() || !assetUrl.trim()) ? 'rgba(255,255,255,0.3)' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: (!assetTitle.trim() || !assetUrl.trim()) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Check size={14} />
                Salvar
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#64748b',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Galeria Flutuante Expandida */}
      {galleryIndex !== null && currentScene.assets && currentScene.assets[galleryIndex] && (() => {
        const asset = currentScene.assets[galleryIndex];
        const colors = getAssetTypeColors(asset.type);
        const hasPrev = galleryIndex > 0;
        const hasNext = galleryIndex < (currentScene.assets.length - 1);

        const handlePrev = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (hasPrev) setGalleryIndex(galleryIndex - 1);
        };

        const handleNext = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (hasNext) setGalleryIndex(galleryIndex + 1);
        };

        const handleOpenLink = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (!asset.link) return;

          const isWiki = wikiIndex.some(e => e.path === asset.link);
          if (isWiki) {
            window.dispatchEvent(new CustomEvent('open-sheet-by-wiki', { detail: asset.link }));
          } else {
            window.open(asset.link, '_blank');
          }
        };

        return (
          <div
            onClick={() => setGalleryIndex(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.9)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}
          >
            {/* Botão de Fechar */}
            <button
              onClick={() => setGalleryIndex(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '50%',
                padding: '10px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                zIndex: 1010
              }}
              title="Fechar"
            >
              <X size={20} />
            </button>

            {/* Painel Central da Galeria */}
            <div
              onClick={e => e.stopPropagation()}
              style={{
                display: 'flex',
                background: '#090d16',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                overflow: 'hidden',
                width: '100%',
                maxWidth: '900px',
                maxHeight: '80vh',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                position: 'relative'
              }}
            >
              {/* Box da Imagem */}
              <div style={{
                flex: 1.3,
                background: `url(${asset.url}) center/contain no-repeat`,
                backgroundColor: 'rgba(0,0,0,0.3)',
                minHeight: '450px',
                position: 'relative'
              }}>
                {/* Setas de navegação */}
                {hasPrev && (
                  <button
                    onClick={handlePrev}
                    style={{
                      position: 'absolute',
                      left: '15px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0,0,0,0.6)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title="Anterior"
                  >
                    <span>◀</span>
                  </button>
                )}
                {hasNext && (
                  <button
                    onClick={handleNext}
                    style={{
                      position: 'absolute',
                      right: '15px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0,0,0,0.6)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title="Próximo"
                  >
                    <span>▶</span>
                  </button>
                )}
              </div>

              {/* Informações na lateral */}
              <div style={{
                flex: 0.9,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                borderLeft: '1px solid rgba(255,255,255,0.06)',
                overflowY: 'auto',
                background: 'linear-gradient(135deg, rgba(15,23,42,0.6) 0%, rgba(9,13,22,0.8) 100%)'
              }}>
                {/* Badge do Tipo */}
                <div>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: colors.bg,
                    color: colors.text,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    border: `1px solid ${colors.border}`
                  }}>
                    {colors.label}
                  </span>
                </div>

                {/* Título */}
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem', color: 'white', lineHeight: 1.2 }}>
                  {asset.title}
                </h2>

                {/* Legenda/Descrição */}
                <p style={{
                  margin: 0,
                  fontSize: '0.88rem',
                  color: '#94a3b8',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  flex: 1
                }}>
                  {asset.description || 'Nenhuma descrição detalhada fornecida.'}
                </p>

                {/* Botões de Ação */}
                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px' }}>
                  {asset.link && (
                    <button
                      onClick={handleOpenLink}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: 'rgba(168,85,247,0.2)',
                        border: '1px solid rgba(168,85,247,0.4)',
                        borderRadius: '8px',
                        color: '#c084fc',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      {wikiIndex.some(e => e.path === asset.link) ? (
                        <>
                          <LinkIcon size={14} />
                          Abrir Ficha (Wiki)
                        </>
                      ) : (
                        <>
                          <ExternalLink size={14} />
                          Acessar Link Externo
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      setGalleryIndex(null);
                      startEditAsset(asset, e);
                    }}
                    style={{
                      padding: '10px 16px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      color: '#94a3b8',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Edit2 size={13} />
                    Editar
                  </button>
                </div>
              </div>
            </div>

            {/* Indicador de Bolinhas */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              {currentScene.assets.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setGalleryIndex(i)}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === galleryIndex ? '#a855f7' : 'rgba(255,255,255,0.2)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Painel de Missões (Quest Board) */}
      <div style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={13} color="#fca5a5" /> Painel de Missões
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={async () => {
                if (!currentScene) return;
                const prompt = `Gere uma missão curta e dramática para os jogadores num RPG de mesa, considerando esta cena: ${currentScene.title} (${mood}). Aja como um Mestre. Retorne apenas o texto da missão (máximo 15 palavras).`;
                try {
                  const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
                  const text = await res.text();
                  addObjective(text.trim());
                } catch (e) {
                  console.error(e);
                  alert('Erro ao gerar missão com IA');
                }
              }}
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', borderRadius: '4px', padding: '2px 8px', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Sugerir Missão com IA"
            >
              <Wand2 size={12} /> IA
            </button>
            <button onClick={() => setAddingObj(!addingObj)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer' }}>
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {addingObj && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <input
                autoFocus
                value={newObjText}
                onChange={e => setNewObjText(e.target.value)}
                placeholder="Descreva a missão..."
                onKeyDown={e => {
                  if (e.key === 'Enter' && newObjText.trim()) {
                    addObjective(newObjText.trim(), false);
                    setNewObjText('');
                    setAddingObj(false);
                  }
                  if (e.key === 'Escape') setAddingObj(false);
                }}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(239,68,68,0.2)', color: 'white', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#94a3b8', cursor: 'pointer' }}>
                  <input type="checkbox" id="secret-quest" /> Missão Secreta (Mestre)
                </label>
                <button
                  onClick={() => {
                    if (newObjText.trim()) {
                      const isSecret = (document.getElementById('secret-quest') as HTMLInputElement)?.checked;
                      addObjective(newObjText.trim(), isSecret);
                      setNewObjText('');
                      setAddingObj(false);
                    }
                  }}
                  style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', color: '#fca5a5', cursor: 'pointer', fontSize: '0.7rem' }}
                >
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {currentScene.objectives.length === 0 && !addingObj && (
            <div style={{ color: '#475569', fontSize: '0.75rem', textAlign: 'center', padding: '10px', fontStyle: 'italic' }}>
              Nenhuma missão nesta cena.
            </div>
          )}

          {currentScene.objectives.map(obj => {
            const isSuccess = obj.completed;
            const isFailed = obj.failed;
            const isActive = !isSuccess && !isFailed;
            
            let bg = 'rgba(0,0,0,0.3)';
            let borderColor = 'rgba(255,255,255,0.06)';
            let icon = <Target size={14} color="#94a3b8" />;
            
            if (isSuccess) {
              bg = 'rgba(16,185,129,0.05)';
              borderColor = 'rgba(16,185,129,0.3)';
              icon = <CheckCircle2 size={14} color="#10b981" />;
            } else if (isFailed) {
              bg = 'rgba(239,68,68,0.05)';
              borderColor = 'rgba(239,68,68,0.3)';
              icon = <XCircle size={14} color="#ef4444" />;
            }
            
            if (obj.secret) {
              borderColor = 'rgba(168,85,247,0.5)';
            }

            return (
              <div
                key={obj.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  background: bg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  padding: '8px 10px',
                  position: 'relative',
                  opacity: isActive ? 1 : 0.6,
                  transition: 'all 0.2s',
                  boxShadow: obj.secret ? '0 0 10px rgba(168,85,247,0.1)' : 'none'
                }}
              >
                {obj.secret && (
                  <div style={{ position: 'absolute', top: '-8px', right: '10px', background: '#a855f7', color: 'white', fontSize: '0.55rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Lock size={8} /> SECRETO
                  </div>
                )}
                
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ marginTop: '2px' }}>{icon}</div>
                  <div style={{ flex: 1, fontSize: '0.85rem', color: isSuccess ? '#a7f3d0' : isFailed ? '#fecaca' : '#e2e8f0', textDecoration: (isSuccess || isFailed) ? 'line-through' : 'none', lineHeight: 1.4 }}>
                    {obj.text}
                  </div>
                  <button onClick={() => removeObjective(obj.id)} style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '0' }}>
                    <X size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '4px', marginTop: '4px', marginLeft: '22px' }}>
                  <button
                    onClick={() => setObjectiveStatus(obj.id, 'active')}
                    style={{ flex: 1, padding: '3px', background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: isActive ? 'white' : '#64748b', fontSize: '0.65rem', cursor: 'pointer' }}
                  >
                    ⏳ Andamento
                  </button>
                  <button
                    onClick={() => setObjectiveStatus(obj.id, 'success')}
                    style={{ flex: 1, padding: '3px', background: isSuccess ? 'rgba(16,185,129,0.2)' : 'transparent', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '4px', color: isSuccess ? '#6ee7b7' : '#64748b', fontSize: '0.65rem', cursor: 'pointer' }}
                  >
                    🏆 Sucesso
                  </button>
                  <button
                    onClick={() => setObjectiveStatus(obj.id, 'failed')}
                    style={{ flex: 1, padding: '3px', background: isFailed ? 'rgba(239,68,68,0.2)' : 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px', color: isFailed ? '#fca5a5' : '#64748b', fontSize: '0.65rem', cursor: 'pointer' }}
                  >
                    💀 Falha
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
