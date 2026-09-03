# 📋 Plano de Centralização: Tokens & FogOfWar

## Executivo

Este documento analisa como as ferramentas **Token Management** e **FogOfWar** estão organizadas atualmente e propõe um plano de centralização para melhorar manutenibilidade, escalabilidade e coesão do código.

---

## 1. DIAGNÓSTICO ATUAL

### 1.1 Localização dos Componentes

#### **Tokens** (`src/store/tokens.ts`)
```
src/
├── store/tokens.ts              # Estado local de tokens (seleção, alvos, dados de HP)
├── services/yjs.ts              # Estado sincronizado (Yjs) dos tokens
├── engine/GameCanvas.tsx         # Renderização e lógica visual de tokens
├── engine/renderers/fogRenderer.ts  # Visão de tokens + FOW
├── components/HUD/
│   ├── NPCPanel.tsx             # Criação/gerenciamento de NPCs
│   ├── PlayerQuickBar.tsx        # Quick actions com tokens vinculados
│   └── CombatTracker.tsx         # Rastreamento de combate
└── utils/types.ts               # Tipos básicos
```

#### **FogOfWar** (`src/store/fog.ts`)
```
src/
├── store/
│   ├── fog.ts                   # Operações de FOW (add/remove/clear)
│   └── map.ts                   # Configurações de FOW (fowRadius, fowShape, fowColor)
├── engine/
│   ├── GameCanvas.tsx           # Lógica de renderização FOW
│   └── renderers/
│       ├── fogRenderer.ts       # Renderização PixiJS
│       └── fogVisibility.ts     # Cálculo de visibilidade (raycasting)
├── components/HUD/MapSettingsPanel.tsx  # UI de configuração
└── services/yjs.ts              # Sincronização de fogOps
```

### 1.2 Problemas Identificados

#### **Problema 1: Fragmentação da Lógica**
- **Tokens**: Dados em 2 lugares (Yjs em `yjs.ts` + local em `tokens.ts`)
- **FOW**: Config espalhada entre `map.ts`, `fog.ts`, UI components e renderer
- Sem ponto centralizado de referência

#### **Problema 2: Falta de Namespacing**
```typescript
// ❌ Confuso - qual é a diferença?
state.tokens              // Yjs
localState                // Ephemeral local
state.fogOps              // Yjs
state.mapConfig           // Yjs
```

#### **Problema 3: Inconsistência na API**
```typescript
// Tokens - padrão misto
getSelectedTokens()       // Getter puro
toggleTokenSelection()    // Setter com side effects
applyDamageToToken()      // Ação de negócio

// FOW - sem padrão
addFogOp()
removeFogOp()
getFogOps()
// Mas: updateMapConfig() fica em map.ts
```

#### **Problema 4: Dependências Cruzadas**
- `GameCanvas.tsx` importa de múltiplos stores
- `MapSettingsPanel.tsx` toca em 4+ arquivos de store
- Difícil rastrear fluxo de dados

#### **Problema 5: Tipos Incompletos**
- `TokenData` em `types.ts` é genérica demais
- `MapConfig` não exportada consistentemente
- `FogOp` interfaces espalhadas

---

## 2. ANÁLISE DE DEPENDÊNCIAS

### 2.1 Quem Consome Token Management?

```
tokens.ts exports:
  ├── (via store/index.ts) → GameCanvas.tsx
  ├── (via store/index.ts) → NPCPanel.tsx
  ├── (via store/index.ts) → PlayerQuickBar.tsx
  ├── (via store/index.ts) → CombatTracker.tsx
  └── (via store/index.ts) → MapSettingsPanel.tsx
```

**Consumidores principais:**
1. `GameCanvas` - renderização visual
2. `HUD Components` - UI de interação
3. `services/yjs` - sincronização

### 2.2 Quem Consome FOW Management?

```
map.ts + fog.ts exports:
  ├── (via store/index.ts) → GameCanvas.tsx (renderFogOfWar)
  ├── (via store/index.ts) → MapSettingsPanel.tsx (UI config)
  ├── fogRenderer.ts → engine/renderers/fogRenderer.ts
  └── services/yjs → state.fogOps
```

**Consumidores principais:**
1. `GameCanvas` - orquestração
2. `fogRenderer` - cálculos visuais
3. `MapSettingsPanel` - UI

---

## 3. PLANO DE CENTRALIZAÇÃO

### Fase 1: Criar Centro Único de Configuração

**Novo arquivo: `src/store/config/gameConfig.ts`**

```typescript
// Centraliza TODA configuração do jogo (tokens, FOW, grid, etc)
export interface GameConfig {
  map: MapConfig;
  fog: FogConfig;
  tokens: TokenConfig;
  rendering: RenderingConfig;
}

export interface FogConfig {
  enabled: boolean;
  radius: number;
  shape: 'circle' | 'square' | 'hexagon';
  color: string;
  hideTokens: boolean;
  visionMode: 'dynamic' | 'static' | 'none';
}

export interface TokenConfig {
  visionEnabled: boolean;
  defaultVisionRadius: number;
  selectionMode: 'single' | 'multi';
}
```

**Benefícios:**
- ✅ Single source of truth
- ✅ Fácil auditoria
- ✅ Escalável para futuras configs

### Fase 2: Consolidar Stores em Namespaces Explícitos

**Novo: `src/store/modules/`**

```
src/store/modules/
├── tokenModule.ts         # getTokens, updateToken, applyDamage
├── fogModule.ts           # getFogOps, addFogOp, clearFog
├── configModule.ts        # getGameConfig, updateConfig
└── index.ts               # Re-export com namespacing
```

**Exemplo: `src/store/modules/tokenModule.ts`**

```typescript
import { state } from '../../services/yjs';
import { pushChatMessage } from '../chat';

// ===== TYPES =====
export interface Token {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  visionRadius?: number;
  hasVision?: boolean;
  // ... mais props RPG
}

export interface TokenLocalState {
  selected: Set<string>;
  targets: Set<string>;
}

// ===== STATE =====
export const localState: TokenLocalState = {
  selected: new Set(),
  targets: new Set(),
};

// ===== GETTERS =====
export const Tokens = {
  getAll(): Token[] {
    return Array.from(state.tokens.values());
  },

  getById(id: string): Token | undefined {
    return state.tokens.get(id) as Token | undefined;
  },

  getSelected(): Token[] {
    return Array.from(localState.selected).map(id => 
      state.tokens.get(id)
    ).filter(Boolean) as Token[];
  },

  getTargets(): string[] {
    return Array.from(localState.targets);
  },

  // ===== MUTATIONS =====
  create(data: Partial<Token>): Token {
    const id = `token_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const token: Token = {
      id,
      name: 'Novo Token',
      hp: 10,
      maxHp: 10,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      visionRadius: 6 * 50, // defaulta a 6 quadrados
      hasVision: true,
      ...data,
    };
    state.tokens.set(id, token);
    return token;
  },

  update(id: string, props: Partial<Token>): void {
    const token = this.getById(id);
    if (token) {
      state.tokens.set(id, { ...token, ...props });
    }
  },

  applyDamage(id: string, amount: number): void {
    const token = this.getById(id);
    if (token) {
      const newHp = Math.max(0, token.hp - amount);
      this.update(id, { hp: newHp });
      if (newHp === 0) {
        pushChatMessage(`💀 ${token.name} foi derrotado!`);
      }
    }
  },

  toggleTarget(id: string): void {
    if (localState.targets.has(id)) {
      localState.targets.delete(id);
    } else {
      localState.targets.add(id);
    }
    window.dispatchEvent(new Event('targets-updated'));
  },

  clearTargets(): void {
    localState.targets.clear();
    window.dispatchEvent(new Event('targets-updated'));
  },

  toggleSelected(id: string, multi: boolean = false): void {
    if (!multi) localState.selected.clear();
    if (localState.selected.has(id)) {
      localState.selected.delete(id);
    } else {
      localState.selected.add(id);
    }
    window.dispatchEvent(new Event('token-selection-updated'));
  },

  selectBulk(ids: string[]): void {
    localState.selected.clear();
    ids.forEach(id => localState.selected.add(id));
    window.dispatchEvent(new Event('token-selection-updated'));
  },

  delete(id: string): void {
    state.tokens.delete(id);
    localState.selected.delete(id);
    localState.targets.delete(id);
  },
};
```

### Fase 3: Refatorar Consumidores

**Antes:**
```typescript
import { getSelectedTokens, toggleTokenSelection, applyDamageToToken } from '../../store';
import { state } from '../../services/yjs';

// Misturado
const tokens = Array.from(state.tokens.values());
const selected = getSelectedTokens();
```

**Depois:**
```typescript
import { Tokens } from '../../store/modules/tokenModule';

// Claro e uniforme
const tokens = Tokens.getAll();
const selected = Tokens.getSelected();

Tokens.applyDamage(tokenId, 10);
```

### Fase 4: Refatorar FOW com Mesmo Padrão

**Novo: `src/store/modules/fogModule.ts`**

```typescript
export interface FogOp {
  id: string;
  type: 'circle' | 'square' | 'polygon' | 'path';
  mode: 'reveal' | 'hide';
  geom: FogGeometry;
}

export const FogOfWar = {
  getOps(): FogOp[] {
    return Array.from(state.fogOps.values());
  },

  addOp(op: FogOp): void {
    state.fogOps.set(op.id, op);
    window.dispatchEvent(new Event('fog-changed'));
  },

  removeOp(id: string): void {
    state.fogOps.delete(id);
    window.dispatchEvent(new Event('fog-changed'));
  },

  clear(): void {
    state.fogOps.clear();
    window.dispatchEvent(new Event('fog-changed'));
  },

  // Helpers
  createCircle(x: number, y: number, r: number, mode: 'reveal' | 'hide'): FogOp {
    const op: FogOp = {
      id: `fog_${Date.now()}`,
      type: 'circle',
      mode,
      geom: { x, y, r },
    };
    this.addOp(op);
    return op;
  },
};
```

### Fase 5: Centralizar Config

**Novo: `src/store/modules/configModule.ts`**

```typescript
export interface GameConfig {
  map: {
    gridSize: number;
    gridType: 'square' | 'hex_v' | 'hex_h' | 'dots_square' | 'dots_hex';
    gridColor: string;
    gridAlpha: number;
    backgroundColor: string;
  };
  fog: {
    enabled: boolean;
    radius: number;
    shape: 'circle' | 'square' | 'hexagon';
    color: string;
    hideTokens: boolean;
  };
}

export const Config = {
  getAll(): GameConfig {
    return state.config.get('global') || Config.getDefaults();
  },

  getDefaults(): GameConfig {
    return {
      map: {
        gridSize: 50,
        gridType: 'square',
        gridColor: '#1e293b',
        gridAlpha: 0.5,
        backgroundColor: 'transparent',
      },
      fog: {
        enabled: false,
        radius: 6,
        shape: 'circle',
        color: '#000000',
        hideTokens: false,
      },
    };
  },

  update(partial: Partial<GameConfig>): void {
    const current = this.getAll();
    const merged = {
      ...current,
      ...partial,
      map: { ...current.map, ...partial.map },
      fog: { ...current.fog, ...partial.fog },
    };
    state.config.set('global', merged);
  },

  updateFog(props: Partial<GameConfig['fog']>): void {
    const current = this.getAll();
    this.update({
      fog: { ...current.fog, ...props },
    });
  },

  updateMap(props: Partial<GameConfig['map']>): void {
    const current = this.getAll();
    this.update({
      map: { ...current.map, ...props },
    });
  },
};
```

### Fase 6: Atualizar `store/index.ts`

```typescript
// Novo padrão com namespaces
export * from './modules/tokenModule';
export * from './modules/fogModule';
export * from './modules/configModule';

export { Tokens, Token, TokenLocalState } from './modules/tokenModule';
export { FogOfWar, FogOp } from './modules/fogModule';
export { Config, GameConfig } from './modules/configModule';
```

---

## 4. MIGRATION PATH

### Passo 1: Criar Nova Estrutura (sem quebrar nada)
```bash
src/store/modules/
├── tokenModule.ts      # Novo
├── fogModule.ts        # Novo
├── configModule.ts     # Novo
└── index.ts            # Novo
```

### Passo 2: Implementar Novo Código
- Manter `tokens.ts`, `fog.ts`, `map.ts` como estão
- Novos módulos usam mesmos `state` do `yjs.ts`
- Adicionar re-exports em `store/index.ts`

### Passo 3: Migrar Consumidores (arquivo por arquivo)
```typescript
// Priority 1 (alta rotatividade)
- GameCanvas.tsx          // Maior consumidor
- MapSettingsPanel.tsx    // UI crítica

// Priority 2
- NPCPanel.tsx
- PlayerQuickBar.tsx
- CombatTracker.tsx

// Priority 3
- fogRenderer.ts
- fogVisibility.ts
```

### Passo 4: Depreciar Antigos (manter 1 sprint)
```typescript
// store/tokens.ts - DEPRECATED
export function getSelectedTokens() {
  console.warn('[DEPRECATED] Use Tokens.getSelected() instead');
  return Tokens.getSelected();
}
```

### Passo 5: Remover Antigos
- Delete `tokens.ts` original
- Delete `fog.ts` original
- Delete parte FOW de `map.ts`

---

## 5. BENEFÍCIOS ESPERADOS

### Legibilidade
```typescript
// ❌ Antes
const selected = getSelectedTokens();
state.tokens.set(id, { ...token, hp: newHp });
addFogOp({ id, type: 'circle', ... });

// ✅ Depois
const selected = Tokens.getSelected();
Tokens.update(id, { hp: newHp });
FogOfWar.createCircle(x, y, r, 'reveal');
```

### Manutenção
- 🎯 Single responsibility: cada módulo cuida de um domínio
- 🔍 Fácil buscar relacionados: `Tokens.*`
- 📍 Central point to add logging/validation

### Escalabilidade
```typescript
// Adicionar novo subsistema é óbvio
export const Effects = { ... };
export const Combat = { ... };
export const Initiative = { ... };
```

### Testing
```typescript
// Pode mockar facilmente
const mockTokens = jest.spyOn(Tokens, 'getAll');
```

---

## 6. ESTRUTURA FINAL

```
src/store/
├── modules/
│   ├── tokenModule.ts      # 100 linhas
│   ├── fogModule.ts        # 60 linhas
│   ├── configModule.ts     # 80 linhas
│   └── index.ts            # 5 linhas
├── index.ts                # Re-exports (atualizado)
├── chat.ts                 # Mantém como está
├── campaign.ts             # Mantém como está
├── combat.ts               # Será refatorado depois
├── clocks.ts               # Será refatorado depois
└── ...outros
```

**Estatística:**
- 📉 Reduz espalhamento: 15 arquivos → 5 importação pontos
- 🎯 Namespacing claro: `Tokens.*`, `FogOfWar.*`, `Config.*`
- ✅ Tipos centralizados: tudo em `modules/`

---

## 7. IMPLEMENTAÇÃO SUGERIDA

### Sprint 1: Setup
- [ ] Criar `src/store/modules/` directory
- [ ] Implementar `tokenModule.ts` com todos os getters/setters
- [ ] Implementar `fogModule.ts` com todas operações
- [ ] Implementar `configModule.ts` com schema único

### Sprint 2: Migração GameCanvas
- [ ] Refatorar `GameCanvas.tsx` para usar `Tokens.*`, `FogOfWar.*`, `Config.*`
- [ ] Testar renderização visual
- [ ] Verificar sincronização Yjs

### Sprint 3: Migração HUD
- [ ] Refatorar `MapSettingsPanel.tsx`
- [ ] Refatorar `NPCPanel.tsx`
- [ ] Refatorar `PlayerQuickBar.tsx`

### Sprint 4: Cleanup
- [ ] Deprecar velhos arquivos
- [ ] Remover imports antigos
- [ ] Documentar para equipe

---

## 8. Checklist de Validação

- [ ] Todos os testes passam
- [ ] Fog of War renderiza igual
- [ ] Tokens sincronizam via Yjs
- [ ] Nenhuma regressão visual
- [ ] Perf não piorou (medir em browser devtools)
- [ ] Novos desenvolvedores entendem fluxo

---

## Conclusão

Este plano transforma um sistema fragmentado em uma **arquitetura modular, testável e escalável**. O custo inicial é ~1-2 sprints de refatoração, mas o ganho em manutenibilidade é exponencial.

**Próximos passos:**
1. Validar com equipe
2. Priorizar qual módulo começar (sugestão: `tokenModule`)
3. Criar PRs incrementais (1 módulo por PR)
