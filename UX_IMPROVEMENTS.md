# 📋 Relatório de Sugestões de Melhoria na UX - DOZERO VTT

## Visão Geral do Projeto
O DOZERO é uma plataforma Virtual Table Top (VTT) para RPG desenvolvida em React + TypeScript + Vite, com funcionalidades avançadas como:
- Mapa interativo com tokens (GameCanvas/PixiJS)
- Wiki integrada com visualização gráfica (LivingBrain)
- Teatro da Mente para cenas narrativas
- Sistema de widgets arrastáveis
- Chat integrado com logs de combate
- Suporte a múltiplos sistemas de RPG (D&D 5e, Fate, WoD, d100)

---

## 🔍 Problemas de UX Identificados

### 1. **Navegação e Descoberta de Funcionalidades**

#### Problema:
- O Hub de Ferramentas (`WidgetHubModal`) possui **30+ opções** listadas de uma vez, o que pode sobrecarregar novos usuários
- Não há categorização clara das ferramentas no modal principal
- A barra de pesquisa no menu mobile é útil, mas não existe no desktop

#### Sugestões:
```tsx
// ✅ ADICIONAR BUSCA NO DESKTOP TAMBÉM
// Em MainToolbar.tsx, adicionar search bar no dropdown de ferramentas

// ✅ CATEGORIZAR WIDGETS NO HUB
const widgetCategories = {
  "📊 Gestão de Jogo": ["combatTracker", "clockConfig", "questTracker"],
  "🎲 Geradores": ["oracle", "npcGenerator", "locationGenerator"],
  "📖 Narrativa": ["cutsceneDirector", "loreMachine", "theaterView"],
  "⚙️ Sistema": ["settings", "mapSettings", "audioDirector"]
};
```

**Impacto**: Reduz a carga cognitiva e acelera a descoberta de funcionalidades

---

### 2. **Feedback Visual e Estados de Loading**

#### Problema:
- A sincronização com a nuvem (`handleSyncCloud`) mostra apenas `alert()` nativo
- Não há indicadores visuais de loading para operações assíncronas (ex: carregar wiki, spawnar tokens)
- Transições entre views (canvas ↔ wiki ↔ theater) são básicas (fade-in)

#### Sugestões:
```tsx
// ✅ SUBSTITUIR ALERTS POR TOASTS
import { toast } from 'react-hot-toast';

toast.success('Sincronizado com sucesso!', {
  duration: 3000,
  style: { background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }
});

// ✅ ADICIONAR SKELETON LOADERS
const WikiSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-slate-700 rounded w-3/4"></div>
    <div className="h-4 bg-slate-700 rounded"></div>
  </div>
);

// ✅ MELHORAR TRANSIÇÕES
.view-layer {
  transition: opacity 0.3s ease-in-out, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.view-layer.exiting {
  transform: scale(0.98);
}
```

**Impacto**: Usuário sente mais controle e entende o estado do sistema

---

### 3. **Acessibilidade (a11y)**

#### Problema:
- Botões sem `aria-label` ou `title` consistente
- Ausência de navegação por teclado em modais
- Contraste de cores pode ser insuficiente em alguns temas
- Sem suporte a screen readers para elementos dinâmicos (tokens, clocks)

#### Sugestões:
```tsx
// ✅ ADICIONAR ARIA-LABELS
<button 
  onClick={toggleWindow('chatWindow')}
  aria-label="Abrir chat P2P"
  aria-expanded={openWindows.chatWindow}
  className={`btn-icon theme-blue ${openWindows.chatWindow ? 'active' : ''}`}
>
  <MessageSquare size={20} />
</button>

// ✅ GERENCIAR FOCUS TRAP EM MODAIS
useEffect(() => {
  if (activeModal !== 'none') {
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Implementar focus trap...
  }
}, [activeModal]);

// ✅ LIVE REGIONS PARA ATUALIZAÇÕES
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {chatMessages.length > 0 && `Nova mensagem de ${lastMessage.author}`}
</div>
```

**Impacto**: Torna a aplicação utilizável por pessoas com deficiência e melhora SEO

---

### 4. **Gestão de Janelas Arrastáveis**

#### Problema:
- Múltiplas janelas podem se sobrepor de forma caótica
- Não há indicação clara de qual janela está ativa/focada
- Falta opção para "restaurar layout padrão" ou "organizar janelas"
- Janelas podem sair da tela em resoluções menores

#### Sugestões:
```tsx
// ✅ BOTÃO "ORGANIZAR JANELAS" (Tile/Tiled Layout)
const organizeWindows = () => {
  const total = openWindows.length;
  const cols = Math.ceil(Math.sqrt(total));
  const rows = Math.ceil(total / cols);
  const width = window.innerWidth / cols;
  const height = (window.innerHeight - 100) / rows;
  
  openWindows.forEach((win, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    updateWindowPosition(win.id, {
      x: col * width + 10,
      y: row * height + 100,
      width: width - 20,
      height: height - 20
    });
  });
};

// ✅ INDICADOR DE FOCO VISUAL
.drw-window.focused {
  border: 2px solid var(--accent-primary);
  box-shadow: 0 0 20px var(--accent-glow);
}
.drw-window:not(.focused) {
  opacity: 0.85;
}

// ✅ SNAP TO EDGES (Imã nas bordas)
// Implementar em DraggableWindow.tsx usando react-draggable com bounds
```

**Impacto**: Reduz frustração com gerenciamento de espaço na tela

---

### 5. **Onboarding e Primeiros Passos**

#### Problema:
- Não há tutorial interativo para novos usuários
- Funcionalidades avançadas (ex: Spawn de tokens da Wiki) são descobertas por acidente
- Ausência de "dicas contextuais" ou tooltips explicativos

#### Sugestões:
```tsx
// ✅ IMPLEMENTAR TOUR GUIADO (usando react-joyride ou similar)
const steps = [
  {
    target: '.hud-hub-btn',
    content: 'Aqui você acessa o Hub de Ferramentas com todos os widgets',
    placement: 'bottom' as const
  },
  {
    target: '#canvas-container',
    content: 'Este é o mapa principal. Arraste tokens, use o botão direito para ações contextuais',
    placement: 'top' as const
  },
  {
    target: '.btn-icon.theme-cyan',
    content: 'A Wiki da Campanha integra documentos com o mapa. Experimente arrastar um personagem!',
    placement: 'left' as const
  }
];

// ✅ TOOLTIPS EXPLICATIVOS EM PRIMEIRO USO
const [hasSeenTokenTip, setHasSeenTokenTip] = useState(
  () => localStorage.getItem('dozero_token_tip') === 'true'
);

useEffect(() => {
  if (!hasSeenTokenTip && state.tokens.size > 0) {
    showToast({
      message: '💡 Dica: Clique duplo em um token para abrir sua ficha!',
      action: { label: 'Entendi', onClick: () => {
        localStorage.setItem('dozero_token_tip', 'true');
        setHasSeenTokenTip(true);
      }}
    });
  }
}, []);
```

**Impacto**: Reduz curva de aprendizado e churn de novos usuários

---

### 6. **Responsividade Mobile**

#### Problema:
- Menu mobile é funcional mas esconde TODAS as ferramentas atrás de um hambúrguer
- Janelas arrastáveis podem ser difíceis de manipular em touch
- Canvas do mapa pode ter problemas de zoom/pan em dispositivos touch

#### Sugestões:
```tsx
// ✅ BOTTOM NAVIGATION BAR PARA MOBILE
<nav className="md:hidden fixed bottom-0 left-0 right-0 glass-panel flex justify-around py-3">
  <button onClick={() => setViewMode('canvas')} aria-label="Mapa">
    <LayoutGrid size={24} />
  </button>
  <button onClick={() => setViewMode('wiki')} aria-label="Wiki">
    <BookOpen size={24} />
  </button>
  <button onClick={() => toggleWindow('chatWindow')} aria-label="Chat">
    <MessageSquare size={24} />
  </button>
  <button onClick={() => setActiveModal('widgets')} aria-label="Menu">
    <LayoutGrid size={24} />
  </button>
</nav>

// ✅ GESTOS DE PINCH-ZOOM NO MAPA
// Usar react-use-gesture ou similar para pinch-to-zoom
const handlePinch = (pinchState) => {
  if (pinchState.da[0] !== 0) {
    canvasRef.current.scale.set(
      Math.max(0.5, Math.min(3, canvasRef.current.scale.x + pinchState.da[0] * 0.01))
    );
  }
};

// ✅ DRAG EM TOUCH COM FEEDBACK TÁTIL
if ('vibrate' in navigator) {
  navigator.vibrate(10); // Feedback sutil ao iniciar drag
}
```

**Impacto**: Expande uso para tablets e celulares em sessões presenciais

---

### 7. **Performance Percebida**

#### Problema:
- Muitos componentes renderizados mesmo quando invisíveis (ex: todos os widgets no DOM)
- Logs de chat podem crescer indefinidamente sem paginação
- Imagens de tokens sem lazy loading

#### Sugestões:
```tsx
// ✅ LAZY RENDERING DE WIDGETS
{openWindows.combatTracker && (
  <DraggableWindow ...>
    <CombatTracker />
  </DraggableWindow>
)}
// ❌ Evitar renderizar widgets fechados apenas escondê-los com CSS

// ✅ VIRTUAL SCROLL PARA CHAT LONGO
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={400}
  itemCount={messages.length}
  itemSize={60}
  width="100%"
>
  {({ index, style }) => (
    <ChatMessage key={messages[index].id} message={messages[index]} style={style} />
  )}
</FixedSizeList>

// ✅ LAZY LOADING DE IMAGENS
<img 
  src={token.imageUrl} 
  loading="lazy" 
  decoding="async"
  alt={token.name}
/>
```

**Impacto**: Aplicação parece mais rápida e responsiva

---

### 8. **Consistência Visual e Design System**

#### Problema:
- Cores hard-coded em alguns componentes (ex: `rgba(20,20,20,0.85)`)
- Tamanhos de fonte inconsistentes entre widgets
- Ícones de tamanhos variados (18px, 20px, 24px misturados)

#### Sugestões:
```css
/* ✅ CONSOLIDAR EM VARIÁVEIS CSS */
:root {
  --modal-bg: rgba(15, 23, 42, 0.85);
  --icon-size-sm: 16px;
  --icon-size-md: 20px;
  --icon-size-lg: 24px;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
}

/* ✅ USAR CLASSES UTILITÁRIAS PADRONIZADAS */
.btn-icon-sm { width: 32px; height: 32px; }
.btn-icon-md { width: 40px; height: 40px; }
.btn-icon-lg { width: 48px; height: 48px; }
```

**Impacto**: Interface mais polida e profissional

---

### 9. **Prevenção de Erros e Recuperação**

#### Problema:
- Exclusão de tokens/clocks sem confirmação
- Não há "undo" para ações destrutivas
- Formulários sem validação clara (ex: criar relógio com tempo inválido)

#### Sugestões:
```tsx
// ✅ CONFIRMAÇÃO PARA AÇÕES DESTRUTIVAS
const handleDeleteToken = (tokenId: string) => {
  const confirmed = window.confirm(
    `Tem certeza que deseja remover "${tokenName}"?\n\nEsta ação não pode ser desfeita.`
  );
  if (!confirmed) return;
  // deletar...
};

// ✅ IMPLEMENTAR UNDO STACK
const [history, setHistory] = useState<Action[]>([]);
const [future, setFuture] = useState<Action[]>([]);

const executeAction = (action: Action) => {
  const undoAction = action.execute();
  setHistory(prev => [...prev, undoAction]);
  setFuture([]); // limpar futuro após nova ação
};

const undo = () => {
  const lastAction = history.pop();
  if (lastAction) {
    lastAction.undo();
    setFuture(prev => [...prev, lastAction]);
  }
};

// ✅ VALIDAÇÃO EM TEMPO REAL
<ClockConfigModal
  validation={{
    durationMs: {
      min: 1000,
      max: 3600000,
      message: 'Duração deve ser entre 1 segundo e 1 hora'
    }
  }}
/>
```

**Impacto**: Reduz erros acidentais e ansiedade do usuário

---

### 10. **Personalização e Preferências**

#### Problema:
- Temas visuais existem mas não há preview antes de aplicar
- Layout fixo sem opção de salvar preferências (ex: posição de widgets)
- Atalhos de teclado não são configuráveis

#### Sugestões:
```tsx
// ✅ PREVIEW DE TEMAS AO PASSAR O MOUSE
<button 
  onMouseEnter={() => previewTheme(theme.id)}
  onMouseLeave={() => previewTheme(null)}
  onClick={() => applyTheme(theme.id)}
>
  {theme.name}
</button>

// ✅ SALVAR LAYOUT PERSISTENTE
useEffect(() => {
  const savedLayout = localStorage.getItem('dozero_widget_layout');
  if (savedLayout) {
    restoreLayout(JSON.parse(savedLayout));
  }
}, []);

useEffect(() => {
  localStorage.setItem('dozero_widget_layout', JSON.stringify(currentLayout));
}, [currentLayout]);

// ✅ CONFIGURAR HOTKEYS
const hotkeyConfig = useHotkeysStore(state => state.config);

useHotkeys('ctrl+k', () => openCommandPalette(), {
  enabled: hotkeyConfig.enableGlobalShortcuts
});
```

**Impacto**: Usuários sentem a ferramenta como "sua"

---

## 📊 Matriz de Priorização

| # | Melhoria | Impacto UX | Esforço Dev | Prioridade |
|---|----------|-----------|-------------|------------|
| 1 | Feedback visual (toasts/skeletons) | Alto | Baixo | 🔴 Crítica |
| 2 | Acessibilidade (aria-labels, focus) | Alto | Médio | 🔴 Crítica |
| 3 | Onboarding/tour guiado | Alto | Médio | 🟠 Alta |
| 4 | Busca no Hub de Widgets | Médio | Baixo | 🟠 Alta |
| 5 | Organização de janelas | Médio | Médio | 🟡 Média |
| 6 | Undo para ações destrutivas | Alto | Alto | 🟡 Média |
| 7 | Responsividade mobile aprimorada | Médio | Alto | 🟡 Média |
| 8 | Performance (virtual scroll, lazy) | Médio | Médio | 🟢 Baixa |
| 9 | Design system consolidado | Baixo | Médio | 🟢 Baixa |
| 10 | Personalização avançada | Baixo | Alto | 🟢 Baixa |

---

## 🎯 Quick Wins (Implementação Rápida)

Estas melhorias podem ser feitas em **menos de 1 dia** cada:

1. **Substituir alerts por toasts** (~2 horas)
2. **Adicionar aria-labels em botões** (~3 horas)
3. **Criar skeleton loaders para Wiki** (~2 horas)
4. **Adicionar confirmação em exclusões** (~1 hora)
5. **Tooltip de primeira utilização** (~3 horas)

---

## 📈 Métricas de Sucesso

Após implementar as melhorias, medir:

- **Tempo para primeira ação significativa** (deve reduzir 30%)
- **Taxa de erro em ações destrutivas** (deve reduzir 80%)
- **Satisfação subjetiva (NPS interno)** (meta: >7/10)
- **Tempo médio de sessão** (deve aumentar 20%)
- **Uso de features avançadas** (deve aumentar 40%)

---

## 🛠️ Tecnologias Recomendadas

| Categoria | Biblioteca | Justificativa |
|-----------|-----------|---------------|
| Toasts | `react-hot-toast` | Leve, customizável, acessível |
| Tour Guiado | `react-joyride` | Fácil integração, acessível |
| Drag & Drop | `react-draggable` + `react-rnd` | Já usado, melhorar com snaps |
| Scroll Virtual | `react-window` | Performance com listas longas |
| Hotkeys | `react-hotkeys-hook` | Simples e poderoso |
| Animações | `framer-motion` | Mais controle que CSS puro |
| Forms | `react-hook-form` + `zod` | Validação robusta |

---

## ✅ Próximos Passos

1. **Semana 1**: Implementar Quick Wins (feedback visual, a11y básica)
2. **Semana 2**: Onboarding tour + busca no hub
3. **Semana 3**: Gestão de janelas + undo stack
4. **Semana 4**: Testes de usabilidade com usuários reais
5. **Contínuo**: Iterar baseado em feedback e métricas

---

*Relatório gerado em: $(date)*
*Versão do documento: 1.0*
