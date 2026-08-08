import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Bot, Dices, Play, Sparkles, MapPin, Box, Layers, Map as MapIcon, 
    CheckCircle, Network, Film, Crown, Swords, Timer, Clock, ScrollText, 
    Notebook, Shield, Crosshair, Users, ShoppingBag, TrendingUp, MessageCircle, 
    ServerOff, WifiOff, ShieldCheck, Code, ChevronDown, X, RotateCw, Info, 
    Rocket, FileText, MessageSquare, BookOpen 
} from 'lucide-react';
import './LandingPage.css';
import './landing-tailwind.css';

export function LandingPage() {
    const navigate = useNavigate();
    const [isDiceModalOpen, setIsDiceModalOpen] = useState(false);
    const [isLauncherModalOpen, setIsLauncherModalOpen] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };
    
    // Dice state
    const [heroDiceResult, setHeroDiceResult] = useState<number>(19);
    const [heroDiceAnim, setHeroDiceAnim] = useState(false);
    const [modalDiceVal, setModalDiceVal] = useState<number>(17);
    const [modalDiceSub, setModalDiceSub] = useState<string>('Sucesso Moderado!');
    const [modalDiceSubColor, setModalDiceSubColor] = useState<string>('text-emerald-600');
    const [modalDiceAnim, setModalDiceAnim] = useState(false);

    // FAQ state
    const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});

    const toggleFaq = (index: number) => {
        setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const rollHeroDice = () => {
        setHeroDiceAnim(true);
        const roll = Math.floor(Math.random() * 20) + 1;
        setTimeout(() => {
            setHeroDiceResult(roll);
            setHeroDiceAnim(false);
        }, 300);
    };

    const getHeroDiceColor = () => {
        if (heroDiceResult === 20) return 'text-amber-500';
        if (heroDiceResult === 1) return 'text-red-500';
        return 'text-emerald-600';
    };

    const rollCustomDice = (faces: number) => {
        setModalDiceAnim(true);
        const roll = Math.floor(Math.random() * faces) + 1;
        setTimeout(() => {
            setModalDiceVal(roll);
            setModalDiceAnim(false);
            if (roll === faces) {
                setModalDiceSub('🎯 É UM CRÍTICO! (SUCESSO TOTAL)');
                setModalDiceSubColor('text-amber-600');
            } else if (roll === 1) {
                setModalDiceSub('💀 FALHA CRÍTICA!');
                setModalDiceSubColor('text-red-600');
            } else {
                setModalDiceSub(`Resultado puro em d${faces}`);
                setModalDiceSubColor('text-slate-500');
            }
        }, 300);
    };

    const handleLaunchRoom = () => {
        // Redireciona para o VTT
        navigate('/vtt');
    };

    return (
        <div className="landing-page-body antialiased">
            {/* Fonts */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Patrick+Hand&display=swap" rel="stylesheet" />

            {/* Subtle radial gradient overlay to focus center */}
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-50/30 to-slate-100/60 z-0"></div>

            {/* Navigation Header */}
            <nav className="fixed w-full z-50 px-4 py-3 top-0 transition-all">
                <div className="max-w-7xl mx-auto glass rounded-2xl px-5 py-2.5 flex justify-between items-center shadow-lg">
                    <a href="#" className="flex items-center gap-3 group">
                        <img src="/assets/logo.webp" alt="Dozero VTT Logo" className="h-10 sm:h-12 w-auto object-contain rounded-lg hover:scale-105 transition-transform" />
                    </a>
                    
                    <div className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-700">
                        <a href="#mascote" onClick={(e) => scrollToSection(e, 'mascote')} className="text-slate-600 hover:text-amber-500 font-semibold transition-colors flex items-center gap-1.5"><Bot className="w-4 h-4 text-amber-600" /> Zye AI</a>
                        <a href="#modos" onClick={(e) => scrollToSection(e, 'modos')} className="text-slate-600 hover:text-amber-500 font-semibold transition-colors">Modos</a>
                        <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="text-slate-600 hover:text-amber-500 font-semibold transition-colors">FAQ</a>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsDiceModalOpen(true)} className="hidden sm:flex px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-all items-center gap-1.5 shadow-sm hover:scale-105 transform">
                            <Dices className="w-4 h-4 text-amber-700" /> Rolar d20
                        </button>
                        <button onClick={() => setIsLauncherModalOpen(true)} className="px-5 py-2.5 bg-slate-900 text-amber-300 text-sm font-bold sketch-border hover:bg-slate-800 transition-all hover:scale-105 transform shadow-md flex items-center gap-2">
                            <Play className="w-4 h-4 fill-amber-300" /> Criar Mesa (Grátis)
                        </button>
                    </div>
                </div>
            </nav>

            {/* MAIN HERO SECTION */}
            <main className="relative z-10 pt-32 pb-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-12 gap-10 items-center">
                        
                        {/* Hero Text (7 cols) */}
                        <div className="lg:col-span-7 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border-amber-300 mb-6 shadow-sm">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">v0.1.0 Alpha • 100% Descentralizado & Offline-First</span>
                            </div>

                            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-slate-900 leading-none mb-6 tracking-tight">
                                Seu RPG de Mesa,<br/>
                                <span className="text-amber-600 relative inline-block">
                                    Sem Servidor,
                                    <svg className="absolute w-full h-3 -bottom-1 left-0 text-amber-300 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 15 100 5" stroke="currentColor" strokeWidth="4" fill="none"/></svg>
                                </span><br/>
                                Infinitas Possibilidades.
                            </h1>

                            <p className="text-lg text-slate-600 mb-8 max-w-xl leading-relaxed">
                                A primeira plataforma de RPG Virtual <b>descentralizada</b>, modular e turbinada com <b>IA Generativa</b>. Jogue com sincronização P2P direta via WebRTC, motor gráfico WebGL 2D e interface personalizável em janelas flutuantes.
                            </p>

                            <div className="flex flex-wrap gap-4 items-center">
                                <button onClick={() => setIsLauncherModalOpen(true)} className="px-8 py-4 bg-amber-400 text-slate-900 text-xl sketch-font font-bold sketch-border hover:bg-amber-300 transition-all hover:-translate-y-1 shadow-xl flex items-center gap-2 group">
                                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Iniciar Campanha Grátis
                                </button>

                                <button onClick={() => setIsDiceModalOpen(true)} className="px-7 py-4 glass text-slate-800 text-xl sketch-font font-bold rounded-xl hover:bg-white transition-all flex items-center gap-2 shadow-sm border border-slate-300">
                                    <Dices className="w-5 h-5 text-amber-600" /> Testar Rolador
                                </button>
                            </div>

                            {/* Quick stats / highlights */}
                            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-slate-200/80 pt-6">
                                <div>
                                    <div className="text-2xl font-bold sketch-font text-slate-900">0 Latência</div>
                                    <div className="text-xs text-slate-500 font-medium">Sincronização P2P Direta</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold sketch-font text-amber-600">18+ Widgets</div>
                                    <div className="text-xs text-slate-500 font-medium">Ferramentas Mestre & Player</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold sketch-font text-slate-900">100% Livre</div>
                                    <div className="text-xs text-slate-500 font-medium">Sem Servidor Central</div>
                                </div>
                            </div>
                        </div>

                        {/* Hero Visual Container (5 cols) */}
                        <div className="lg:col-span-5 relative h-[480px] w-full">
                            
                            {/* Main Canvas Window Mockup */}
                            <div className="absolute inset-0 glass-panel rounded-2xl p-2 z-10 flex flex-col shadow-2xl animate-float border border-slate-300 overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-slate-50/80 rounded-t-xl">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-500 flex items-center gap-1">
                                        <Box className="w-3 h-3 text-amber-600" /> Dozero_Canvas.tsx
                                    </span>
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">P2P LIVE</span>
                                </div>
                                
                                <div className="flex-1 bg-slate-900 rounded-xl relative overflow-hidden group">
                                    <img src="/assets/vtt_screenshot_canvas.png" alt="Dozero VTT Canvas" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" onError={(e) => { (e.target as HTMLImageElement).src = '/assets/vtt_layout_hero.jpg' }} />
                                    
                                    <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg text-white text-xs font-mono flex items-center gap-2 border border-slate-700">
                                        <MapPin className="w-3.5 h-3.5 text-amber-400" /> Grid Tático WebGL
                                    </div>

                                    <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur p-2.5 rounded-xl border border-slate-700 text-white flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center font-bold text-xs text-slate-900">Z</div>
                                            <span className="text-xs font-medium">Turno: Zye (Mascote)</span>
                                        </div>
                                        <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">1d20 + 7 = 23 (CRÍTICO!)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Widget: Live Dice Roller */}
                            <div className="absolute -right-6 bottom-4 w-60 glass-panel rounded-xl p-3.5 z-20 shadow-2xl animate-float-delayed sketch-border bg-white/95 border-amber-300">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
                                        <Dices className="w-4 h-4 text-amber-600" /> Automated Dice
                                    </h3>
                                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">v0.1</span>
                                </div>
                                <div className="bg-slate-100 p-2 rounded-lg text-xs font-medium flex justify-between items-center mb-2">
                                    <span>Ataque Espada Longa</span>
                                    <span className="text-slate-500 font-mono">1d20+5</span>
                                </div>
                                <div className={`text-center text-3xl sketch-font font-bold my-1 cursor-pointer hover:scale-110 transition-transform ${heroDiceAnim ? 'animate-dice' : ''} ${getHeroDiceColor()}`} onClick={rollHeroDice}>
                                    {heroDiceResult}
                                </div>
                                <button onClick={rollHeroDice} className="w-full py-1 bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-bold rounded sketch-border text-center">
                                    Clique para Rolar 🎲
                                </button>
                            </div>

                            {/* Mascot Badge floating on left */}
                            <div className="absolute -left-8 top-12 w-52 glass-panel rounded-xl p-3 z-20 shadow-xl animate-float bg-amber-50/90 sketch-border-amber" style={{ animationDelay: '-2s' }}>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <img src="/assets/mascot_zye.png" alt="Zye Mascot" className="w-8 h-8 object-contain rounded-full bg-amber-200 p-0.5" />
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-900">Zye (Golem)</h4>
                                        <span className="text-[9px] text-amber-700 font-semibold uppercase">Mascote & IA</span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-600 italic leading-snug">"Olá Mestre! Posso gerar o mapa e os NPCs desta sessão instantaneamente."</p>
                            </div>

                        </div>

                    </div>
                </div>
            </main>

            {/* SECTION: MASCOT & AI ASSISTANT */}
            <section id="mascote" className="py-16 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="glass-panel rounded-3xl p-8 sm:p-12 sketch-border bg-gradient-to-br from-amber-50/90 via-white/80 to-amber-100/60 shadow-xl">
                        <div className="grid md:grid-cols-12 gap-8 items-center">
                            
                            <div className="md:col-span-5 text-center relative">
                                <div className="relative inline-block">
                                    <div className="absolute inset-0 bg-amber-400 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                                    <img src="/assets/mascot_zye_2k.jpg" alt="Zye - O Golem" className="w-full max-w-sm mx-auto rounded-2xl sketch-border shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).src = '/assets/mascot_zye.png' }} />
                                </div>
                                <div className="mt-3 inline-block px-3 py-1 bg-amber-200 text-amber-900 rounded-full text-xs font-bold sketch-border">
                                    🤖 Zye • Mascote Oficial
                                </div>
                            </div>

                            <div className="md:col-span-7">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-200 text-amber-900 text-xs font-bold mb-4">
                                    <Sparkles className="w-3.5 h-3.5" /> Assistente com Inteligência Artificial
                                </div>

                                <h2 className="text-4xl sm:text-5xl sketch-font font-bold text-slate-900 mb-4">
                                    Conheça <span className="text-amber-600">Zye, o Guardião da Grade</span>
                                </h2>

                                <p className="text-slate-700 text-base leading-relaxed mb-6">
                                    <b>Zye</b> é o autômato feito de papel milimetrado e lápis de combate mascote do Dozero VTT. Ele funciona como o seu <b>copiloto de IA em tempo real</b>, ajudando o Game Master a improvisar aventuras.
                                </p>

                                <div className="grid sm:grid-cols-3 gap-4">
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-200">
                                        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 mb-2">
                                            <Bot className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-sm text-slate-800">Gemini AI Text</h4>
                                        <p className="text-xs text-slate-500 mt-1">Oráculos, diálogos de NPCs, encontros e descrições.</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-200">
                                        <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 mb-2">
                                            <Film className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-sm text-slate-800">Pollinations</h4>
                                        <p className="text-xs text-slate-500 mt-1">Geração dinâmica de retratos e arte de cenas.</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-200">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 mb-2">
                                            <Bot className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-sm text-slate-800">Google TTS</h4>
                                        <p className="text-xs text-slate-500 mt-1">Vozes atuações sincronizadas para falas.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION: THREE CORE VIEW MODES */}
            <section id="modos" className="py-20 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border-slate-300 text-xs font-bold text-slate-600 mb-3">
                            <Layers className="w-3.5 h-3.5 text-amber-600" /> Flexibilidade Sem Limites
                        </div>
                        <h2 className="text-4xl sm:text-5xl sketch-font font-bold text-slate-900 mb-4">Três Modos. Uma Única Experiência.</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Modo Canvas */}
                        <div className="glass-panel p-6 rounded-3xl hover:-translate-y-2 transition-transform duration-300 group border border-slate-200 flex flex-col">
                            <div className="h-52 rounded-2xl bg-slate-900 mb-6 overflow-hidden relative border border-slate-300 shadow-inner">
                                <img src="/assets/vtt_screenshot_canvas.png" alt="Modo Canvas WebGL" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).src = '/assets/vtt_layout_hero.jpg' }} />
                                <div className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow">PixiJS WebGL Engine</div>
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                    <MapIcon className="w-5 h-5" />
                                </div>
                                <h3 className="text-2xl sketch-font font-bold text-slate-900">Modo Canvas Tático</h3>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed flex-1">
                                Tabuleiro tático com movimentação de tokens em tempo real, Neblina de Guerra (Fog of War) dinâmica.
                            </p>
                        </div>

                        {/* Modo Wiki */}
                        <div className="glass-panel p-6 rounded-3xl hover:-translate-y-2 transition-transform duration-300 group border border-slate-200 flex flex-col">
                            <div className="h-52 rounded-2xl bg-slate-900 mb-6 overflow-hidden relative border border-slate-300 shadow-inner">
                                <img src="/assets/vtt_screenshot_wiki.png" alt="Modo Wiki Graph" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).src = '/assets/vtt_layout_hero.jpg' }} />
                                <div className="absolute top-3 left-3 bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow">D3.js Graph & Yjs</div>
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                                    <Network className="w-5 h-5" />
                                </div>
                                <h3 className="text-2xl sketch-font font-bold text-slate-900">Lore Colaborativa (Wiki)</h3>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed flex-1">
                                Banco de dados vivo do seu mundo. Editor Markdown rico, visualização em Grafo de Conexões interativo com D3.js.
                            </p>
                        </div>

                        {/* Modo Teatro */}
                        <div className="glass-panel p-6 rounded-3xl hover:-translate-y-2 transition-transform duration-300 group border border-slate-200 flex flex-col">
                            <div className="h-52 rounded-2xl bg-slate-900 mb-6 overflow-hidden relative border border-slate-300 shadow-inner">
                                <img src="/assets/vtt_screenshot_theater.png" alt="Modo Teatro da Mente" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).src = '/assets/vtt_layout_hero.jpg' }} />
                                <div className="absolute top-3 left-3 bg-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow">MoodEngine & Audio</div>
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                                    <Film className="w-5 h-5" />
                                </div>
                                <h3 className="text-2xl sketch-font font-bold text-slate-900">Teatro da Mente</h3>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed flex-1">
                                Imersão focada na narrativa pura. Modos de cutscene estilo Visual Novel, mixagem de áudio.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION: 18+ MODULAR WIDGETS ARSENAL */}
            <section id="widgets" className="py-20 bg-slate-900 text-white relative z-10 sketch-border mx-4 md:mx-12 mb-20 shadow-2xl overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <div className="inline-block px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-bold mb-3 border border-amber-400/30">
                            🧩 Janelas Flutuantes & Layouts Arrastáveis
                        </div>
                        <h2 className="text-4xl sm:text-5xl sketch-font font-bold text-amber-300 mb-4">O Arsenal Modular Dozero</h2>
                        <p className="text-slate-300 text-base">Monte sua própria interface de jogo arrastando, redimensionando e ocultando widgets. Mais de 18 módulos construídos para potencializar o Mestre e os Jogadores.</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12">
                        {/* Game Master Arsenal */}
                        <div className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700 shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold">
                                        <Crown className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl sketch-font font-bold text-white">Ferramentas do Game Master</h3>
                                        <span className="text-xs text-amber-400 font-mono">9 Widgets Exclusivos do Mestre</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 hover:border-amber-400/50 transition-colors">
                                    <Sparkles className="w-6 h-6 text-amber-400 mb-2" />
                                    <h4 className="font-bold text-xs text-white">AI Studio</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Gerador de NPCs, loot e locais</p>
                                </div>
                                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 hover:border-amber-400/50 transition-colors">
                                    <Swords className="w-6 h-6 text-red-400 mb-2" />
                                    <h4 className="font-bold text-xs text-white">Encounter Builder</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Calculador de ND e encontros</p>
                                </div>
                                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 hover:border-amber-400/50 transition-colors">
                                    <Timer className="w-6 h-6 text-orange-400 mb-2" />
                                    <h4 className="font-bold text-xs text-white">Tension Clock</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Relógios estilo PBTA/Blades</p>
                                </div>
                                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 hover:border-amber-400/50 transition-colors">
                                    <Clock className="w-6 h-6 text-blue-400 mb-2" />
                                    <h4 className="font-bold text-xs text-white">Chronos Time</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Controle de clima e calendário</p>
                                </div>
                                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 hover:border-amber-400/50 transition-colors">
                                    <ScrollText className="w-6 h-6 text-emerald-400 mb-2" />
                                    <h4 className="font-bold text-xs text-white">Quest Tracker</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Gerenciador de missões ativas</p>
                                </div>
                                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 hover:border-amber-400/50 transition-colors">
                                    <Notebook className="w-6 h-6 text-purple-400 mb-2" />
                                    <h4 className="font-bold text-xs text-white">GM Notes</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Bloco de notas privado</p>
                                </div>
                            </div>
                        </div>

                        {/* Player Tools Arsenal */}
                        <div className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700 shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl sketch-font font-bold text-white">Ferramentas dos Jogadores</h3>
                                        <span className="text-xs text-indigo-300 font-mono">9 Módulos de Ação Tática</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 hover:border-indigo-400/50 transition-colors">
                                    <Dices className="w-6 h-6 text-indigo-400 mb-2" />
                                    <h4 className="font-bold text-xs text-white">Automated Dice</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Rolagens com fórmulas complexas</p>
                                </div>
                                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 hover:border-indigo-400/50 transition-colors">
                                    <Crosshair className="w-6 h-6 text-red-400 mb-2" />
                                    <h4 className="font-bold text-xs text-white">Target Terminal</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Seleção tática de alvos e dano</p>
                                </div>
                                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 hover:border-indigo-400/50 transition-colors">
                                    <Users className="w-6 h-6 text-amber-400 mb-2" />
                                    <h4 className="font-bold text-xs text-white">Char Roster</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Fichas e grupo de heróis</p>
                                </div>
                                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 hover:border-indigo-400/50 transition-colors">
                                    <ShoppingBag className="w-6 h-6 text-emerald-400 mb-2" />
                                    <h4 className="font-bold text-xs text-white">Trade Shop</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Loja de itens e comércio</p>
                                </div>
                                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 hover:border-indigo-400/50 transition-colors">
                                    <TrendingUp className="w-6 h-6 text-cyan-400 mb-2" />
                                    <h4 className="font-bold text-xs text-white">Level Up Panel</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Sistema de evolução</p>
                                </div>
                                <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 hover:border-indigo-400/50 transition-colors">
                                    <MessageCircle className="w-6 h-6 text-purple-400 mb-2" />
                                    <h4 className="font-bold text-xs text-white">Combat Log & Chat</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Histórico completo de rolagens</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION: CHARACTER STUDY & ART SHOWCASE */}
            <section className="py-16 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-200">
                        <div className="grid lg:grid-cols-12 gap-8 items-center">
                            <div className="lg:col-span-6">
                                <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold mb-3">
                                    🎨 Fidelidade de Design & Ilustração
                                </div>
                                <h2 className="text-4xl sketch-font font-bold text-slate-900 mb-4">Expressão e Identidade dos seus Personagens</h2>
                                <p className="text-slate-600 text-base leading-relaxed mb-6">
                                    O Dozero VTT foi projetado respeitando o conceito de guias de estilo e expressão de personagens de RPG. Exiba ilustrações em alta definição, retratos dinâmicos e fichas integradas que ganham vida durante as partidas.
                                </p>
                                <div className="flex gap-4">
                                    <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex-1">
                                        <h4 className="font-bold text-xs text-slate-800">Avatares em Camadas</h4>
                                        <p className="text-[11px] text-slate-500">Suporte a transparência PNG e WebP</p>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex-1">
                                        <h4 className="font-bold text-xs text-slate-800">Status Visual</h4>
                                        <p className="text-[11px] text-slate-500">Indicadores de vida, mana e condições</p>
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-6">
                                <img src="/assets/character_guide.png" alt="Guia de Estudo de Personagem RPG" className="w-full h-auto rounded-2xl sketch-border shadow-xl hover:scale-102 transition-transform duration-300" onError={(e) => { (e.target as HTMLImageElement).src = '/assets/zero_golem_2k.jpg' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION: P2P DECENTRALIZED ARCHITECTURE */}
            <section id="arquitetura" className="py-20 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-4xl sm:text-5xl sketch-font font-bold text-slate-900 mb-4">Por que a Arquitetura P2P Muda Tudo?</h2>
                        <p className="text-slate-600 text-base">Chega de dependência de servidores centrais lentos, mensalidades abusivas e perdas de dados quando o serviço sai do ar.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="glass-panel p-6 rounded-2xl text-center border border-slate-200 hover:-translate-y-1 transition-transform">
                            <div className="w-14 h-14 mx-auto bg-cyan-100 text-cyan-600 rounded-2xl flex items-center justify-center mb-4 transform rotate-3">
                                <ServerOff className="w-7 h-7" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg mb-2">Sem Servidor Central</h4>
                            <p className="text-slate-600 text-xs leading-relaxed">Conexão direta WebRTC com CRDT (Yjs). Sua máquina transmite diretamente para seus jogadores com zero latência.</p>
                        </div>

                        <div className="glass-panel p-6 rounded-2xl text-center border border-slate-200 hover:-translate-y-1 transition-transform">
                            <div className="w-14 h-14 mx-auto bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4 transform -rotate-3">
                                <WifiOff className="w-7 h-7" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg mb-2">100% Offline-First</h4>
                            <p className="text-slate-600 text-xs leading-relaxed">Todos os mapas e campanhas são salvos localmente via IndexedDB. Continue preparando suas sessões sem precisar de internet.</p>
                        </div>

                        <div className="glass-panel p-6 rounded-2xl text-center border border-slate-200 hover:-translate-y-1 transition-transform">
                            <div className="w-14 h-14 mx-auto bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 transform rotate-6">
                                <ShieldCheck className="w-7 h-7" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg mb-2">Privacidade Total</h4>
                            <p className="text-slate-600 text-xs leading-relaxed">Seus dados e histórias não ficam armazenados na nuvem de terceiros. Você é o único dono do seu conteúdo.</p>
                        </div>

                        <div className="glass-panel p-6 rounded-2xl text-center border border-slate-200 hover:-translate-y-1 transition-transform">
                            <div className="w-14 h-14 mx-auto bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-4 transform -rotate-6">
                                <Code className="w-7 h-7" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg mb-2">Open Source & Extensível</h4>
                            <p className="text-slate-600 text-xs leading-relaxed">Desenvolvido em React + Vite + TypeScript. Crie facilmente novos sistemas de regras e widgets customizados.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION: FAQ ACCORDION */}
            <section id="faq" className="py-16 relative z-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl sketch-font font-bold text-slate-900 mb-3">Perguntas Frequentes</h2>
                        <p className="text-slate-600 text-sm">Tudo o que você precisa saber para começar no Dozero VTT.</p>
                    </div>

                    <div className="space-y-4">
                        {[
                            { q: "O Dozero VTT é realmente gratuito?", a: "Sim! Por ser uma aplicação Web descentralizada sem servidores centrais pesados, você pode rodá-la localmente ou via web gratuitamente." },
                            { q: "Como meus jogadores entram na minha mesa?", a: "O Mestre gera um link de convite P2P único. Os jogadores simplesmente abrem o link no navegador e conectam-se diretamente à sala WebRTC." },
                            { q: "Preciso pagar pelas chaves de IA (Gemini / Pollinations)?", a: "Não! O Google Gemini disponibiliza cotas gratuitas generosas de API Key, e o Pollinations AI e Google TTS são integrados sem custos adicionais." },
                            { q: "Funciona em dispositivos mobile e tablets?", a: "Sim! A interface possui barra de navegação adaptativa para mobile e modals em tela cheia para rolagem de dados em celulares." }
                        ].map((faq, index) => (
                            <div key={index} className="glass-panel rounded-2xl p-5 border border-slate-200">
                                <button className="w-full text-left font-bold text-slate-900 flex justify-between items-center" onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}>
                                    <span>{faq.q}</span>
                                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${openFaqIndex === index ? 'rotate-180' : ''}`} />
                                </button>
                                {openFaqIndex === index && (
                                    <div className="mt-3 text-slate-600 text-sm leading-relaxed border-t border-slate-200 pt-3">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA SECTION */}
            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 text-center">
                <button onClick={() => setIsLauncherModalOpen(true)} className="px-10 py-5 bg-amber-400 text-slate-900 text-2xl sketch-font font-bold sketch-border hover:bg-amber-300 transition-all hover:scale-105 transform shadow-2xl flex items-center gap-2 mx-auto">
                    <Rocket className="w-6 h-6" /> Iniciar Campanha (v0.1.0)
                </button>
            </div>

            {/* FOOTER */}
            <footer className="glass mt-12 border-t border-slate-200 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <img src="/assets/logo.webp" alt="Dozero VTT Logo" className="h-9 w-auto object-contain rounded" />
                        <span className="text-xs text-slate-500 font-medium ml-2">© 2026 • RPG Descentralizado</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 font-semibold">
                        <a href="https://github.com/Raah-Lopes/dozero/blob/main/KICKOFF_REPORT_diff.md" target="_blank" rel="noopener noreferrer" className="hover:text-amber-600 transition-colors flex items-center gap-1">
                            <FileText className="w-4 h-4" /> Kickoff Report
                        </a>
                        <a href="#mascote" onClick={(e) => scrollToSection(e, 'mascote')} className="hover:text-amber-600 transition-colors">Zye AI</a>
                        <a href="#modos" onClick={(e) => scrollToSection(e, 'modos')} className="hover:text-amber-600 transition-colors">Modos</a>
                        <a href="#widgets" onClick={(e) => scrollToSection(e, 'widgets')} className="hover:text-amber-600 transition-colors">Widgets</a>
                    </div>

                    <div className="flex gap-3">
                        <a href="https://github.com/Raah-Lopes/dozero" target="_blank" rel="noopener noreferrer" className="p-2.5 glass rounded-xl hover:bg-white transition-all border border-slate-300 text-slate-700 hover:text-slate-900" title="GitHub">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                            </svg>
                        </a>
                        <a href="#" className="p-2.5 glass rounded-xl hover:bg-white transition-all border border-slate-300 text-slate-700 hover:text-indigo-600" title="Discord">
                            <MessageSquare className="w-5 h-5" />
                        </a>
                        <a href="#" className="p-2.5 glass rounded-xl hover:bg-white transition-all border border-slate-300 text-slate-700 hover:text-amber-600" title="Manual">
                            <BookOpen className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </footer>

            {/* MODALS */}
            {isDiceModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-md rounded-3xl p-6 sketch-border relative bg-white shadow-2xl">
                        <button onClick={() => setIsDiceModalOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-200 text-slate-500">
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="text-center mb-4">
                            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-2 sketch-border">
                                <Dices className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl sketch-font font-bold text-slate-900">Simulador Automated Dice</h3>
                        </div>

                        <div className="bg-slate-100 p-4 rounded-2xl text-center border border-slate-200 my-4">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Resultado</div>
                            <div className={`text-5xl sketch-font font-bold my-2 ${modalDiceAnim ? 'animate-dice' : ''} ${modalDiceVal === 20 ? 'text-amber-500' : modalDiceVal === 1 ? 'text-red-500' : 'text-amber-600'}`}>
                                {modalDiceVal}
                            </div>
                            <div className={`text-xs font-mono font-semibold ${modalDiceSubColor}`}>{modalDiceSub}</div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-4">
                            <button onClick={() => rollCustomDice(6)} className="py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded-lg text-xs">d6</button>
                            <button onClick={() => rollCustomDice(10)} className="py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded-lg text-xs">d10</button>
                            <button onClick={() => rollCustomDice(12)} className="py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded-lg text-xs">d12</button>
                            <button onClick={() => rollCustomDice(20)} className="py-2 bg-amber-400 hover:bg-amber-300 font-bold rounded-lg text-xs text-slate-900">d20</button>
                        </div>
                    </div>
                </div>
            )}

            {isLauncherModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-8 sketch-border relative bg-white shadow-2xl">
                        <button onClick={() => setIsLauncherModalOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-200 text-slate-500">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-300 sketch-border flex items-center justify-center text-slate-900 font-bold">
                                <Play className="w-5 h-5 fill-slate-900" />
                            </div>
                            <div>
                                <h3 className="text-2xl sketch-font font-bold text-slate-900">Iniciar Mesa P2P</h3>
                                <p className="text-xs text-slate-500">Crie sua sala descentralizada sem servidores</p>
                            </div>
                        </div>

                        <div className="space-y-4 my-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome da Campanha</label>
                                <input type="text" defaultValue="A Maldição de Gridia" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Jogador / Mestre</label>
                                <input type="text" defaultValue="Mestre Zero" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500" />
                            </div>
                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <span>Você será redirecionado para a mesa. Você pode gerar links de convite por lá!</span>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsLauncherModalOpen(false)} className="flex-1 py-3 glass font-bold text-slate-700 rounded-xl hover:bg-slate-100 text-sm">Cancelar</button>
                            <button onClick={handleLaunchRoom} className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold sketch-border text-sm flex items-center justify-center gap-2">
                                <Sparkles className="w-4 h-4" /> Entrar na Mesa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
