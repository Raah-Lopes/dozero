# Replano: Teatro da Mente

> Inspirado no Foundry VTT Theatre of the Mind (vídeo Axium). Abandonamos o layout atual por completo.

---

## O Problema com o Layout Atual

O layout atual é uma grade de 3 colunas com painéis em vidro ao redor de um fundo — na prática parece um **dashboard de dados** com uma imagem atrás, não um teatro. As ferramentas do mestre (dados, clima, atmosfera) estão escondidas em abas dentro de uma barra inferior que compete com o espaço da cena.

---

## Nova Filosofia: "Palco + Camarim"

A ideia central do Foundry VTT é simples e poderosa:

- **O Palco** → tela limpa, imersiva, dominada pela arte da cena. Isso é o que os jogadores veem.
- **O Camarim** → painel de controle do mestre, que pode aparecer/desaparecer com um atalho.

---

## Novo Layout Proposto

### Modo Padrão (Palco + Camarim visível)

```
┌─────────────────────────────────────────────────────────────┐
│  [≡ CENAS] [🎭 Neutro] [☀️ Claro]    [TÍTULO DA CENA]   [✕] │  ← Topbar compacta (altura 44px)
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                  ★ PALCO (fullscreen) ★                    │
│              Arte da cena + efeitos climáticos              │
│                                                             │
│  ┌──────────────┐                        ┌──────────────┐  │
│  │  RETRATOS    │                        │  RETRATO NPC │  │
│  │  dos Heróis  │                        │  (ao falar)  │  │
│  │  (cantos)    │                        │              │  │
│  └──────────────┘                        └──────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [⚔️ 1d20] [Atq] [Def] │ [🌦️] [🎭] │ [🎬] [📖] [💀] [⏰] │  ← Cockpit bottom (sempre visível)
└─────────────────────────────────────────────────────────────┘
```

### Painel do Mestre (drawer lateral, ativado por ≡ CENAS)

```
┌──────────────────────────┐
│ 🎬 DIRETOR DE CENAS       │
├──────────────────────────┤
│ [Taverna ▼] [+ Nova]     │  ← Quick switcher de cenas
├──────────────────────────┤
│ 🖼️ GALERIA DE FUNDOS      │
│ [img1][img2][img3][+]    │  ← Click para trocar bg instantâneo
├──────────────────────────┤
│ 👥 RETRATOS (NPCs)        │
│ [Taberneiro][Guarda][+]  │  ← Click = retrato aparece no palco
├──────────────────────────┤
│ 📝 ANOTAÇÕES DA CENA      │
│ Textarea livre           │
└──────────────────────────┘
```

---

## Funcionalidades Novas (inspiradas no vídeo)

### 1. 🖼️ Galeria de Fundos (Background Switcher)
- Cada cena pode ter **múltiplos fundos** (não só um `imageUrl`)
- O mestre tem uma grade de thumbnails no painel lateral
- **Um clique** → troca o fundo com uma transição de fade (0.6s)
- Suporte a imagens locais (upload) e URLs

### 2. 👥 Retratos de NPCs no Palco
- Os `SceneAssets` do tipo `npc` existem no store — só precisamos **exibir** eles
- O mestre clica no NPC → retrato aparece sobre a cena em posição configurável (esquerda, centro, direita)
- Clica de novo → some suavemente
- Perfeito para: "Taverneiro se aproxima" → retrato do Taverneiro surge no palco

### 3. 🎯 Mood & Weather como Pills visíveis (sem abas)
- Clima e atmosfera como **pills horizontais coloridos** diretamente na topbar
- Clique único muda instantaneamente — sem precisar abrir aba

### 4. 🎭 Retratos dos Heróis (cantos da tela)
- Mini avatares dos personagens nos cantos inferiores
- Status de HP/condição visível
- Clique no herói = abre ficha

### 5. 📺 Cockpit Inferior Reorganizado
- Tira as abas. Exibe sempre: dados rápidos | clima | atmosfera | ferramentas narrativas
- Layout horizontal compacto e legível

---

## Componentes a Criar/Reescrever

| Componente | Ação | Descrição |
|---|---|---|
| `TheaterView.tsx` | **Reescrever** | Novo layout palco + topbar + cockpit |
| `Theater.css` | **Reescrever** | CSS limpo para o novo layout |
| `DirectorPanel.tsx` | **Criar** | Drawer lateral: galeria, NPCs, anotações |
| `NpcPortrait.tsx` | **Criar** | Retrato do NPC que aparece sobre o palco |
| `HeroBadge.tsx` | **Criar** | Mini badge dos heróis nos cantos |
| `SceneSwitcher.tsx` | **Criar** | Quick select de cenas com thumbnails |
| `BackgroundGallery.tsx` | **Criar** | Grid de fundos clicáveis por cena |
| `DirectorBar.tsx` | **Refatorar** | Pills de clima/mood + dados compactos |
| `MoodEngine.tsx` | **Manter** | Lógica de partículas e filtros (ok) |

> [!IMPORTANT]
> Os componentes existentes (ScenePanel, CastPanel, EnemyArsenal, ClockRail, NarrativeTrack, TacticalRadar, SessionDiary) serão **mantidos funcionalmente** mas movidos para dentro do `DirectorPanel` como sub-seções acessíveis por abas — sem ocupar espaço na tela principal.

---

## Open Questions

> [!NOTE]
> **Os retratos de NPC devem aparecer na tela dos jogadores também, ou só para o mestre?**
> No Foundry o mestre controla o que os jogadores veem (Monk's Common Display). No DoZero, o teatro é exibido na tela de todos. Assumirei que os retratos aparecem para todos — é o comportamento mais imersivo.

---

## Verificação Final
- `npx tsc --noEmit` sem erros
- Abrir o teatro e testar: trocar cena, clicar NPC, mudar atmosfera/clima via pills
