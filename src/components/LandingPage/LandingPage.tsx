import React, { useState, useEffect } from 'react';
import { 
    Bot, Dices, Play, Sparkles, MapPin, Layers, Map as MapIcon, 
    CheckCircle2, Film, Crown, Swords, Timer, Clock, ScrollText, 
    Notebook, Shield, Crosshair, Users, ShoppingBag, TrendingUp, MessageSquare, 
    WifiOff, ShieldCheck, Code, ChevronRight, X, ArrowRight, User as UserIcon, 
    LogIn, LogOut, Globe, Plus, Compass, Wand2, Terminal
} from 'lucide-react';
import './LandingPage.css';
import './landing-tailwind.css';
import { useAuthStore } from '../../store/authStore';
import { AuthModal } from '../Modals/AuthModal';
import { ProfileModal } from '../Modals/ProfileModal';
import { ResetPasswordModal } from '../Modals/ResetPasswordModal';
import { CampaignLobbyModal } from '../Modals/CampaignLobbyModal';

export function LandingPage() {
    const { user, initialize, setAuthModalOpen, setProfileModalOpen, signOut } = useAuthStore();
    const [isDiceModalOpen, setIsDiceModalOpen] = useState(false);
    const [isLobbyModalOpen, setIsLobbyModalOpen] = useState(false);
    
    // Quick Dice Roller in Hero
    const [d20Val, setD20Val] = useState<number>(20);
    const [isRolling, setIsRolling] = useState(false);
    const [rollOutcome, setRollOutcome] = useState('🔥 Sucesso Decisivo Crítico!');

    // Modal Dice
    const [modalDiceVal, setModalDiceVal] = useState<number>(18);
    const [modalDiceSub, setModalDiceSub] = useState<string>('Sucesso com Louvor!');
    const [modalDiceAnim, setModalDiceAnim] = useState(false);

    // Active Feature Tab
    const [activeTab, setActiveTab] = useState<'zye' | 'tactical' | 'theater' | 'modules'>('zye');

    useEffect(() => {
        initialize();
    }, [initialize]);

    const handleRollD20 = () => {
        setIsRolling(true);
        const roll = Math.floor(Math.random() * 20) + 1;
        setTimeout(() => {
            setD20Val(roll);
            if (roll === 20) setRollOutcome('🔥 Sucesso Decisivo Crítico!');
            else if (roll >= 15) setRollOutcome('✨ Sucesso Triunfante!');
            else if (roll >= 10) setRollOutcome('⚖️ Sucesso com Complicação.');
            else if (roll === 1) setRollOutcome('💀 Falha Crítica Desastrosa!');
            else setRollOutcome('❌ Falha na Tentativa.');
            setIsRolling(false);
        }, 300);
    };

    const rollModalDice = (sides: number) => {
        setModalDiceAnim(true);
        const val = Math.floor(Math.random() * sides) + 1;
        setTimeout(() => {
            setModalDiceVal(val);
            if (val === sides) {
                setModalDiceSub('Sucesso Crítico Absoluto!');
            } else if (val >= sides * 0.7) {
                setModalDiceSub('Excelente Resultado!');
            } else if (val >= sides * 0.4) {
                setModalDiceSub('Resultado Moderado.');
            } else {
                setModalDiceSub('Resultado Baixo.');
            }
            setModalDiceAnim(false);
        }, 300);
    };

    return (
        <div className="landing-page-body antialiased selection:bg-[#c98a39] selection:text-white">
            
            {/* 1. TOP HEADER / TAVERN SIGN */}
            <header className="sticky top-0 z-50 w-full bg-[#f5ede0]/95 backdrop-blur-md border-b-2 border-[#dfd1be] shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex justify-between items-center">
                    {/* Brand */}
                    <a href="#" className="flex items-center gap-3 group">
                        <img 
                            src="/assets/logo.webp" 
                            alt="Dozero VTT" 
                            className="header-logo-img rounded-xl border border-[#c49a6c]/50 group-hover:scale-105 transition-transform" 
                            style={{ height: '40px', width: 'auto', maxHeight: '40px', objectFit: 'contain' }}
                        />
                        <div className="flex flex-col">
                            <span className="text-base sm:text-lg font-black tracking-tight text-[#271d17] leading-none rpg-font-title">
                                DOZERO <span className="text-[#a46830] text-xs font-mono px-1.5 py-0.5 rounded bg-[#e8dac7]">VTT</span>
                            </span>
                            <span className="text-[10px] text-[#8c6e5a] font-medium hidden sm:inline mt-0.5">
                                Mesa Virtual Descentralizada & Copiloto IA
                            </span>
                        </div>
                    </a>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2.5">
                        <button 
                            onClick={() => setIsDiceModalOpen(true)}
                            className="hidden sm:flex px-3.5 py-2 text-xs font-bold text-[#5a4234] bg-[#fffdf9] hover:bg-[#ebdcc6] border border-[#dfd1be] rounded-xl transition-all items-center gap-1.5 shadow-sm"
                        >
                            <Dices className="w-4 h-4 text-[#a46830]" /> Rolar Dados 3D
                        </button>

                        {user ? (
                            <div 
                                onClick={() => setProfileModalOpen(true)}
                                className="flex items-center gap-2 bg-[#fffdf9] hover:bg-[#ebdcc6] border border-[#dfd1be] rounded-xl px-2.5 py-1.5 shadow-sm cursor-pointer transition-all"
                            >
                                {user.user_metadata?.custom_avatar || user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                                    <img
                                        src={user.user_metadata.custom_avatar || user.user_metadata?.avatar_url || user.user_metadata?.picture}
                                        alt="Avatar"
                                        className="user-avatar-img border border-[#a46830]"
                                        style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', objectFit: 'cover', borderRadius: '8px' }}
                                    />
                                ) : (
                                    <div className="w-7 h-7 rounded-lg bg-[#a46830]/20 border border-[#a46830] flex items-center justify-center text-[#5a4234] font-bold text-xs">
                                        {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                )}
                                <div className="hidden sm:block text-left">
                                    <div className="text-xs font-bold text-[#271d17] leading-none truncate max-w-[100px]">
                                        {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}
                                    </div>
                                    <div className="text-[10px] text-[#386641] font-bold mt-0.5">Online</div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); signOut(); }}
                                    title="Desconectar"
                                    className="ml-1 p-1 text-[#8c6e5a] hover:text-red-600 rounded-md transition-colors"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setAuthModalOpen(true)}
                                className="px-3.5 py-2 text-xs font-bold text-[#5a4234] bg-[#fffdf9] hover:bg-[#ebdcc6] border border-[#dfd1be] rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                            >
                                <LogIn className="w-3.5 h-3.5 text-[#a46830]" /> Entrar
                            </button>
                        )}

                        <button 
                            onClick={() => setIsLobbyModalOpen(true)} 
                            className="btn-rpg-primary px-4 py-2 text-xs flex items-center gap-1.5"
                        >
                            <Play className="w-3.5 h-3.5 fill-white" /> {user ? 'Minhas Mesas' : 'Entrar no VTT'}
                        </button>
                    </div>
                </div>
            </header>

            {/* 2. HERO: FOCUSED TABLE LAUNCHER + INTERACTIVE TAVERN BOARD */}
            <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-16">
                <div className="grid lg:grid-cols-12 gap-8 items-stretch">
                    
                    {/* Left: Direct Launcher Card */}
                    <div className="lg:col-span-7 rpg-parchment-card p-6 sm:p-10 flex flex-col justify-between relative overflow-hidden">
                        <div>
                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 items-center mb-5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#386641]/15 text-[#386641] border border-[#386641]/30 text-xs font-bold">
                                    <span className="w-2 h-2 rounded-full bg-[#386641] animate-pulse"></span>
                                    Lobby Nuvem & P2P Conectados
                                </span>
                                <span className="text-xs font-bold text-[#8c6e5a] bg-[#f1e5d4] px-2.5 py-1 rounded-full border border-[#dfd1be]">
                                    Sem Instalação • 100% Gratuito
                                </span>
                            </div>

                            {/* Headline */}
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#271d17] leading-[1.12] mb-4 rpg-font-title">
                                A sua próxima sessão de RPG começa aqui.
                            </h1>

                            <p className="text-sm sm:text-base text-[#5a4234] leading-relaxed mb-6">
                                Crie sua mesa em segundos, compartilhe o link direto com seus jogadores e aproveite um 
                                <b> tabuleiro tático 60FPS</b> com <b>copiloto Zye</b>, <b>áudio orquestrado</b> e <b>18+ ferramentas flutuantes</b>.
                            </p>

                            {/* Main CTA Group */}
                            <div className="flex flex-wrap gap-3.5 items-center mb-8">
                                <button 
                                    onClick={() => setIsLobbyModalOpen(true)}
                                    className="btn-rpg-primary px-7 py-4 text-base flex items-center gap-3 shadow-lg"
                                >
                                    <Play className="w-5 h-5 fill-white" />
                                    {user ? 'Abrir Mural de Campanhas' : 'Criar Mesa ou Entrar Agora'}
                                </button>

                                <button 
                                    onClick={() => window.location.href = '/vtt.html?room=sandbox-demo'}
                                    className="btn-rpg-secondary px-5 py-4 text-sm flex items-center gap-2"
                                >
                                    <Compass className="w-4 h-4 text-[#a46830]" /> Modo Tabuleiro Rápido (Sandbox)
                                </button>
                            </div>
                        </div>

                        {/* Interactive D20 Mini-Roller */}
                        <div className="p-4 rounded-2xl bg-[#f5ede0] border border-[#dfd1be] flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleRollD20}
                                    disabled={isRolling}
                                    className={`w-12 h-12 rounded-xl bg-[#fffdf9] border-2 border-[#c49a6c] flex items-center justify-center text-xl font-black text-[#a46830] shadow-sm hover:scale-105 active:scale-95 transition-transform ${isRolling ? 'animate-dice-roll' : ''}`}
                                    title="Clique para rolar o d20 da sorte"
                                >
                                    {d20Val}
                                </button>
                                <div>
                                    <div className="text-xs font-bold text-[#271d17] flex items-center gap-1.5">
                                        <span>Teste de Iniciativa</span>
                                        <span className="text-[10px] text-[#8c6e5a] font-normal">(Clique no dado para rolar)</span>
                                    </div>
                                    <div className="text-xs font-bold text-[#a46830] mt-0.5">{rollOutcome}</div>
                                </div>
                            </div>
                            <span className="text-[11px] font-mono text-[#386641] font-bold hidden sm:inline">P2P LATENCY: 0ms</span>
                        </div>
                    </div>

                    {/* Right: Zye Copilot & Tactical Spotlight Card */}
                    <div className="lg:col-span-5 rpg-wood-card p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
                        <div>
                            {/* Zye Header */}
                            <div className="flex items-center gap-4 mb-5 pb-4 border-b border-[#4a3528]">
                                <img 
                                    src="/assets/mascot_zye_2k.jpg" 
                                    alt="Zye Copilot" 
                                    className="zye-avatar-img border-2 border-[#c49a6c] bg-[#1a110b]" 
                                    style={{ width: '64px', height: '64px', minWidth: '64px', minHeight: '64px', maxWidth: '64px', maxHeight: '64px', objectFit: 'cover', borderRadius: '14px', flexShrink: 0 }}
                                    onError={(e) => { (e.target as HTMLImageElement).src = '/assets/logo.webp' }}
                                />
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#a46830]/30 text-amber-300 text-[11px] font-bold border border-[#c49a6c]/40 mb-1">
                                        <Bot className="w-3 h-3" /> Zye Copilot Integrado
                                    </div>
                                    <h3 className="text-xl font-black text-[#fdfaf5] rpg-font-title">O Cérebro da Sua Mesa</h3>
                                    <p className="text-xs text-[#d7c9b8]">IA nativa para Mestre & Jogadores</p>
                                </div>
                            </div>

                            {/* Zye Capabilities Grid */}
                            <div className="space-y-3 mb-6">
                                <div className="p-3 rounded-xl bg-[#1f130b] border border-[#4a3528] flex items-start gap-3">
                                    <Wand2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                                    <div>
                                        <h4 className="text-xs font-bold text-[#fdfaf5]">Geração Visual Instantânea</h4>
                                        <p className="text-[11px] text-[#d7c9b8]">Crie tokens, mapas e NPCs ilustrados em tempo real via Pollinations AI.</p>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-[#1f130b] border border-[#4a3528] flex items-start gap-3">
                                    <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                    <div>
                                        <h4 className="text-xs font-bold text-[#fdfaf5]">Oráculo & Diálogos Inteligentes</h4>
                                        <p className="text-[11px] text-[#d7c9b8]">Respostas narrativas, ganchos de aventura e tabelas de encontros com Gemini.</p>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-[#1f130b] border border-[#4a3528] flex items-start gap-3">
                                    <Film className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                                    <div>
                                        <h4 className="text-xs font-bold text-[#fdfaf5]">Teatro da Mente & Áudio 3D</h4>
                                        <p className="text-[11px] text-[#d7c9b8]">Soundscape atmosférico sincronizado com a cena de combate ou exploração.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Direct Button */}
                        <button 
                            onClick={() => setIsLobbyModalOpen(true)}
                            className="w-full py-3 rounded-xl bg-[#3b281d] hover:bg-[#4a3528] text-amber-200 border border-[#c49a6c]/40 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            Ver Todas as Ferramentas do Arsenal <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* 3. INTERACTIVE FEATURE SHOWCASE */}
                <div className="mt-14">
                    <div className="text-center max-w-2xl mx-auto mb-8">
                        <h2 className="text-2xl sm:text-3xl font-black text-[#271d17] rpg-font-title">
                            Tudo o Que Você Precisa em Uma Única Tela
                        </h2>
                        <p className="text-xs sm:text-sm text-[#5a4234] mt-1">
                            Alterne livremente entre os módulos sem janelas travadas ou limites de configuração.
                        </p>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex justify-center gap-2 sm:gap-3 flex-wrap mb-8">
                        {[
                            { id: 'zye', label: '🤖 Copiloto Zye', icon: Bot },
                            { id: 'tactical', label: '⚔️ Grid Tático PixiJS', icon: Swords },
                            { id: 'theater', label: '🎭 Teatro da Mente', icon: Film },
                            { id: 'modules', label: '🎒 18+ Widgets', icon: Shield }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                    activeTab === tab.id 
                                        ? 'bg-[#261911] text-[#fdfaf5] shadow-md border-2 border-[#5a4234]' 
                                        : 'bg-[#fffdf9] text-[#5a4234] border-2 border-[#dfd1be] hover:border-[#c49a6c]'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content Display */}
                    <div className="rpg-parchment-card p-6 sm:p-10">
                        {activeTab === 'zye' && (
                            <div className="grid md:grid-cols-2 gap-8 items-center">
                                <div>
                                    <span className="text-xs font-bold text-[#a46830] uppercase tracking-wider">Inteligência Narrativa</span>
                                    <h3 className="text-2xl sm:text-3xl font-bold text-[#271d17] mt-1 mb-3 rpg-font-title">
                                        Zye: O Primeiro Copiloto Especialista em RPG
                                    </h3>
                                    <p className="text-sm text-[#5a4234] leading-relaxed mb-4">
                                        Diferente de IAs genéricas, o Zye compreende o contexto da sua mesa, lembra das escolhas dos personagens e atua diretamente nos parâmetros do VTT para criar desafios equilibrados na hora.
                                    </p>
                                    <ul className="space-y-2 text-xs text-[#5a4234] font-medium mb-6">
                                        <li className="flex items-center gap-2">✅ Vozes TTS nativas para interpretação de NPCs</li>
                                        <li className="flex items-center gap-2">✅ Geração de mapas de batalha detalhados</li>
                                        <li className="flex items-center gap-2">✅ Resumo automático dos acontecimentos da sessão</li>
                                    </ul>
                                    <button onClick={() => setIsLobbyModalOpen(true)} className="btn-rpg-primary px-6 py-3 text-xs flex items-center gap-2">
                                        Testar Zye na Sua Campanha <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="rounded-2xl overflow-hidden border-2 border-[#dfd1be] shadow-inner bg-[#1a110b]">
                                    <img src="/assets/vtt_screenshot_canvas.png" alt="Zye na Mesa" className="tab-screenshot-img opacity-90" style={{ width: '100%', height: '260px', maxHeight: '260px', objectFit: 'cover', borderRadius: '12px' }} onError={(e) => { (e.target as HTMLImageElement).src = '/assets/vtt_layout_hero.jpg' }} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'tactical' && (
                            <div className="grid md:grid-cols-2 gap-8 items-center">
                                <div>
                                    <span className="text-xs font-bold text-[#386641] uppercase tracking-wider">Performance WebGL</span>
                                    <h3 className="text-2xl sm:text-3xl font-bold text-[#271d17] mt-1 mb-3 rpg-font-title">
                                        Grid 60FPS com Neblina Dinâmica
                                    </h3>
                                    <p className="text-sm text-[#5a4234] leading-relaxed mb-4">
                                        Movimente miniaturas com física suave, régua de alcance automática, camadas de desenho livres e campo de visão com revelação progressiva em tempo real.
                                    </p>
                                    <ul className="space-y-2 text-xs text-[#5a4234] font-medium mb-6">
                                        <li className="flex items-center gap-2">✅ Renderizador PixiJS ultra-otimizado</li>
                                        <li className="flex items-center gap-2">✅ Importação direta de mapas em alta resolução</li>
                                        <li className="flex items-center gap-2">✅ Sistema de miras, alvos e cálculo de dano</li>
                                    </ul>
                                    <button onClick={() => setIsLobbyModalOpen(true)} className="btn-rpg-primary px-6 py-3 text-xs flex items-center gap-2">
                                        Abrir Tabuleiro Tático <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="rounded-2xl overflow-hidden border-2 border-[#dfd1be] shadow-inner bg-[#1a110b]">
                                    <img src="/assets/vtt_screenshot_canvas.png" alt="Grid Tático" className="tab-screenshot-img opacity-90" style={{ width: '100%', height: '260px', maxHeight: '260px', objectFit: 'cover', borderRadius: '12px' }} onError={(e) => { (e.target as HTMLImageElement).src = '/assets/vtt_layout_hero.jpg' }} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'theater' && (
                            <div className="grid md:grid-cols-2 gap-8 items-center">
                                <div>
                                    <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Imersão Visual Novel</span>
                                    <h3 className="text-2xl sm:text-3xl font-bold text-[#271d17] mt-1 mb-3 rpg-font-title">
                                        Teatro da Mente & Cutscenes
                                    </h3>
                                    <p className="text-sm text-[#5a4234] leading-relaxed mb-4">
                                        Ideal para cenas de investigação, diálogos dramáticos e viagens. Mostre retratos dos personagens em destaque, paisagens épicas e controle o som ambiente da cena.
                                    </p>
                                    <ul className="space-y-2 text-xs text-[#5a4234] font-medium mb-6">
                                        <li className="flex items-center gap-2">✅ Transições suaves de cenário e clima</li>
                                        <li className="flex items-center gap-2">✅ Integração de trilhas e efeitos sonoros Pixabay</li>
                                        <li className="flex items-center gap-2">✅ Modo focado para sessões narrativas</li>
                                    </ul>
                                    <button onClick={() => setIsLobbyModalOpen(true)} className="btn-rpg-primary px-6 py-3 text-xs flex items-center gap-2">
                                        Explorar Modo Teatro <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="rounded-2xl overflow-hidden border-2 border-[#dfd1be] shadow-inner bg-[#1a110b]">
                                    <img src="/assets/vtt_screenshot_theater.png" alt="Teatro da Mente" className="tab-screenshot-img opacity-90" style={{ width: '100%', height: '260px', maxHeight: '260px', objectFit: 'cover', borderRadius: '12px' }} onError={(e) => { (e.target as HTMLImageElement).src = '/assets/vtt_layout_hero.jpg' }} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'modules' && (
                            <div>
                                <div className="text-center max-w-xl mx-auto mb-6">
                                    <span className="text-xs font-bold text-[#a46830] uppercase tracking-wider">Arsenal Modular</span>
                                    <h3 className="text-2xl font-bold text-[#271d17] mt-1 rpg-font-title">
                                        18+ Widgets Prontos Para Uso
                                    </h3>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {[
                                        { title: 'AI Studio', desc: 'Gerador de Arte e Tokens', icon: Sparkles },
                                        { title: 'Encounter Tático', desc: 'Iniciativa e Turnos', icon: Swords },
                                        { title: 'Relógio de Tensão', desc: 'Estilo PBTA / Blades', icon: Timer },
                                        { title: 'Chronos Time', desc: 'Clima e Calendário', icon: Clock },
                                        { title: 'Trade & Shop', desc: 'Loja e Equipamentos', icon: ShoppingBag },
                                        { title: 'Terminal de Alvos', desc: 'Dano e Seleção Rápida', icon: Crosshair },
                                        { title: 'Diário de Missões', desc: 'Quests e Ganchos', icon: ScrollText },
                                        { title: 'Fichas de Grupo', desc: 'Gerenciador de Heróis', icon: Users },
                                    ].map((mod, i) => (
                                        <div key={i} className="p-3.5 rounded-xl bg-[#f5ede0] border border-[#dfd1be] hover:border-[#c49a6c] transition-colors">
                                            <mod.icon className="w-5 h-5 text-[#a46830] mb-1.5" />
                                            <h4 className="font-bold text-xs text-[#271d17]">{mod.title}</h4>
                                            <p className="text-[11px] text-[#8c6e5a] mt-0.5">{mod.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. FOOTER */}
                <footer className="mt-16 pt-8 border-t-2 border-[#dfd1be] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#8c6e5a]">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-[#271d17]">DOZERO VTT</span>
                        <span>•</span>
                        <span>Mesa Virtual Livre & Aberta</span>
                    </div>
                    <div className="flex items-center gap-4 font-bold text-[#5a4234]">
                        <button onClick={() => setIsDiceModalOpen(true)} className="hover:text-[#a46830]">Rolar Dados</button>
                        <button onClick={() => setIsLobbyModalOpen(true)} className="hover:text-[#a46830]">Lobby de Mesas</button>
                        <a href="https://github.com/Raah-Lopes/dozero" target="_blank" rel="noreferrer" className="hover:text-[#a46830]">GitHub</a>
                    </div>
                </footer>
            </main>

            {/* MODALS */}
            <AuthModal />
            <ProfileModal />
            <ResetPasswordModal />
            <CampaignLobbyModal 
                isOpen={isLobbyModalOpen} 
                onClose={() => setIsLobbyModalOpen(false)} 
            />

            {/* POLIEDRIC DICE MODAL */}
            {isDiceModalOpen && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-sm rpg-parchment-card p-6 bg-[#fffdf9] border-2 border-[#c49a6c]">
                        <div className="flex justify-between items-center border-b border-[#dfd1be] pb-3 mb-4">
                            <h3 className="text-base font-bold text-[#271d17] flex items-center gap-2 rpg-font-title">
                                <Dices className="w-5 h-5 text-[#a46830]" /> Torre de Dados da Taverna
                            </h3>
                            <button onClick={() => setIsDiceModalOpen(false)} className="p-1 rounded-lg hover:bg-[#f1e5d4] text-[#8c6e5a]">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="text-center my-6">
                            <div className={`text-6xl font-black text-[#a46830] rpg-font-title ${modalDiceAnim ? 'animate-dice-roll' : ''}`}>
                                {modalDiceVal}
                            </div>
                            <div className="text-xs font-bold text-[#386641] mt-2">{modalDiceSub}</div>
                        </div>

                        <div className="grid grid-cols-6 gap-1.5 pt-2 border-t border-[#dfd1be]">
                            {[4, 6, 8, 10, 12, 20].map((d) => (
                                <button
                                    key={d}
                                    onClick={() => rollModalDice(d)}
                                    className="py-2 rounded-lg bg-[#f5ede0] hover:bg-[#ebdcc6] border border-[#dfd1be] font-mono text-xs font-bold text-[#271d17] transition-all active:scale-95"
                                >
                                    d{d}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
