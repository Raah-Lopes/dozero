# DOZERO Plugin Specification

> **Como usar:** Copie este documento inteiro e cole como contexto para qualquer IA (Claude, GPT, Gemini, etc.).  
> Preencha apenas a seção **## TAREFA** no final com o que seu plugin deve fazer.  
> A IA irá gerar os arquivos prontos. Depois, passe o resultado para o **Antigravity** integrar ao projeto.

---

## VISÃO GERAL DO ECOSSISTEMA

DOZERO é um VTT (Virtual Tabletop) para RPG de mesa. É uma SPA React + TypeScript rodando em Vite (porta 5174), com estado compartilhado via **Yjs** e uma **API REST local** servida pelo próprio Vite para operações de arquivo.

---

## STACK TÉCNICA

| Camada | Tecnologia |
|---|---|
| UI | React 18 + TypeScript |
| Build | Vite |
| Estado global | Yjs (IndexedDB + BroadcastChannel) |
| Estilo | CSS inline (style={{}}) ou `<style>` tags — **sem Tailwind, sem módulos CSS** |
| Ícones | `lucide-react` |
| API local | Vite plugin que expõe `/api/wiki/*` |

---

## PADRÃO DE WIDGET

Todo widget é um arquivo `.tsx` em `src/components/HUD/`.  
Ele **sempre** usa o `DraggableWindow` como container raiz.

```tsx
// src/components/HUD/MeuPluginWidget.tsx
import React, { useState, useEffect, useRef } from 'react';
import { DraggableWindow } from './DraggableWindow';

interface MeuPluginWidgetProps {
  onClose: () => void;
}

export const MeuPluginWidget: React.FC<MeuPluginWidgetProps> = ({ onClose }) => {
  return (
    <DraggableWindow
      title="Nome do Plugin"
      id="meu-plugin-widget"        // ID único, kebab-case, nunca duplicar
      onClose={onClose}
      width={800}                   // largura inicial em px
      height={500}                  // altura inicial em px
      initialX={window.innerWidth / 2 - 400}
      initialY={window.innerHeight / 2 - 250}
    >
      {/* Seu conteúdo aqui */}
    </DraggableWindow>
  );
};
```

---

## ESTADO YJS — LEITURA E ESCRITA

### Importação
```ts
import { state } from '../../store';
import type { CampaignData, CampaignSession, CampaignArc } from '../../store';
```

### Maps disponíveis
| Key | Tipo dos valores | Uso |
|---|---|---|
| `state.campaigns` | `CampaignData` | Campanhas, arcos e sessões |
| `state.tokens` | `any` (TokenData) | Fichas de personagens no mapa |
| `state.wiki` | `any` | Metadados da wiki |
| `state.clocks` | `TensionClock` | Relógios de tensão |
| `state.chat` | YArray | Log de mensagens/rolagens |
| `state.combat` | `any` | Estado do rastreador de combate |

### Padrão de hook para observar mudanças
```tsx
const [campanhas, setCampanhas] = useState<CampaignData[]>([]);

useEffect(() => {
  const sync = () => {
    setCampanhas(Array.from(state.campaigns.values()) as CampaignData[]);
  };
  sync();
  state.campaigns.observe(sync);
  return () => state.campaigns.unobserve(sync);
}, []);
```

### Escrever no estado
```ts
// Atualizar um item existente
const item = state.campaigns.get(id) as CampaignData;
state.campaigns.set(id, { ...item, status: 'completed' });

// Deletar
state.campaigns.delete(id);
```

### Interfaces de dados
```ts
interface CampaignData {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'hiatus' | 'completed';
  folderPath?: string;      // Ex: "Campanhas/Minha-Camp"
  overviewPath?: string;    // Ex: "Campanhas/Minha-Camp/_campanha.md"
  arcs: CampaignArc[];
  sessions: CampaignSession[];
}

interface CampaignArc {
  id: string;
  name: string;
  description: string;
  status: 'planned' | 'active' | 'completed';
  filePath?: string;
}

interface CampaignSession {
  id: string;
  date: string;             // ISO: "2026-06-17"
  summary: string;
  status: 'upcoming' | 'completed';
  filePath?: string;
}
```

---

## API WIKI (DISCO LOCAL)

### Importação
```ts
import {
  saveMarkdownContent,
  fetchMarkdownContent,
  loadMarkdownFile,      // Versão null-safe (retorna null em 404)
  ensureWikiFolder,      // Cria pasta, idempotente
  createFolder,
  moveFileOrFolder,
  deleteFileOrFolder,
} from '../../utils/githubApi';

import { getWikiConfig } from '../../store';
```

### Exemplos de uso
```ts
// Ler um arquivo (retorna null se não existir)
const conteudo = await loadMarkdownFile('Campanhas/Minha-Camp/_campanha.md');

// Salvar/criar um arquivo (cria pastas intermediárias automaticamente)
await saveMarkdownContent('MeuPlugin/dados.md', '# Meu Conteúdo\n\n...');

// Criar pasta
await ensureWikiFolder('MeuPlugin/Subpasta');

// Mover ou renomear
await moveFileOrFolder('Pasta/arquivo.md', 'Pasta/novo-nome.md');

// Deletar
await deleteFileOrFolder('Pasta/arquivo.md');

// Obter caminho raiz configurado pelo usuário
const config = getWikiConfig();
const wikiRoot = config.repoUrl; // Ex: "D:/wikidozero"
```

### Endpoints REST disponíveis (baixo nível, prefira as funções acima)
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/wiki/tree?repoPath=...` | Lista todos os arquivos da wiki |
| GET | `/api/wiki/file?repoPath=...&path=...` | Lê conteúdo de um arquivo |
| POST | `/api/wiki/save` | Salva arquivo (`{ repoPath, path, content }`) |
| POST | `/api/wiki/folder` | Cria pasta (`{ repoPath, path }`) |
| POST | `/api/wiki/move` | Move/renomeia (`{ repoPath, oldPath, newPath }`) |
| DELETE | `/api/wiki/file` | Deleta arquivo (`{ repoPath, path }`) |
| GET | `/api/wiki/graph` | Grafo de links entre arquivos |

---

## EVENTOS DO SISTEMA

### Disparar
```ts
// Abrir um arquivo diretamente no WikiViewer
window.dispatchEvent(new CustomEvent('open-wiki-file', {
  detail: { filePath: 'Campanhas/Minha-Camp/_campanha.md' }
}));

// Abrir configuração de relógio
window.dispatchEvent(new Event('open-clock-config'));
```

### Escutar (no useEffect)
```ts
useEffect(() => {
  const handler = (e: Event) => {
    const { filePath } = (e as CustomEvent).detail;
    // fazer algo com o filePath
  };
  window.addEventListener('open-wiki-file', handler);
  return () => window.removeEventListener('open-wiki-file', handler);
}, []);
```

### Eventos emitidos pelo sistema
| Evento | Payload | Descrição |
|---|---|---|
| `token-dblclick` | `{ tokenId }` | Usuário deu duplo clique em um token |
| `targets-updated` | — | Lista de tokens alvejados mudou |
| `token-selection-updated` | — | Seleção de tokens mudou |
| `bg-selection-updated` | — | Seleção de backgrounds mudou |
| `open-clock-config` | — | Abre modal de relógio |
| `open-wiki-file` | `{ filePath }` | Navega para arquivo na Wiki |

---

## UTILITÁRIOS COMUNS

### Log no chat de jogo
```ts
import { pushChatMessage } from '../../store';

pushChatMessage('Mensagem normal');
pushChatMessage('Sucesso crítico!', true, false);   // isCritical
pushChatMessage('Falha catastrófica!', false, true); // isFailure
```

### Helpers de campanha
```ts
import { createCampaign, updateCampaign, deleteCampaign } from '../../store';

createCampaign({ name: 'Nova', description: '', status: 'active', arcs: [], sessions: [] });
updateCampaign(id, { status: 'completed' });
deleteCampaign(id);
```

---

## PALETA DE CORES

```
Roxo primário:   #a855f7   rgba(168, 85, 247, ...)   → ações, destaques
Azul:            #38bdf8   rgba(56, 189, 248, ...)    → info, wiki
Verde:           #22c55e   rgba(34, 197, 94, ...)     → sucesso, ativo
Âmbar:           #f59e0b   rgba(245, 158, 11, ...)    → aviso, agendado
Vermelho:        #ef4444   rgba(239, 68, 68, ...)     → perigo, deletar
Roxo claro:      #c084fc                              → texto em botão primário
Fundo escuro:    rgba(2, 6, 23, ...)                  → painéis
Fundo médio:     rgba(15, 23, 42, ...)                → inputs, cards
Borda sutil:     rgba(255, 255, 255, 0.06-0.10)
Texto primário:  #f1f5f9
Texto secundário:#cbd5e1 / #94a3b8
```

### Temas disponíveis (botões no WidgetHubModal)
```
theme-red | theme-amber | theme-purple | theme-green
theme-blue | theme-orange | theme-indigo | theme-cyan
```

---

## TIPOGRAFIA

```ts
// Títulos, labels, badges, botões
fontFamily: 'var(--font-display)'

// Corpo do texto, inputs, textareas, parágrafos
fontFamily: 'var(--font-body)'
```

---

## COMO REGISTRAR UM NOVO WIDGET

Um widget novo precisa de **3 mudanças** em arquivos existentes:

### 1. `src/components/HUD/WidgetHubModal.tsx`
Adicionar na interface `Props`:
```ts
onOpenMeuPlugin: () => void;
```
Adicionar um botão no grid (escolha um tema de cor):
```tsx
<button onClick={onOpenMeuPlugin} title="Meu Plugin (Descrição curta)" className="widget-btn theme-green">
  <IconDoLucide size={32} />
</button>
```

### 2. `src/App.tsx`
Adicionar estado:
```ts
const [showMeuPlugin, setShowMeuPlugin] = useState(false);
```
Adicionar import:
```ts
import { MeuPluginWidget } from './components/HUD/MeuPluginWidget';
```
Adicionar prop no `<WidgetHubModal>`:
```tsx
onOpenMeuPlugin={() => { setShowMeuPlugin(!showMeuPlugin); setActiveModal('none'); }}
```
Adicionar renderização (dentro do bloco de widgets flutuantes):
```tsx
{showMeuPlugin && <MeuPluginWidget onClose={() => setShowMeuPlugin(false)} />}
```

### 3. Arquivo novo
Criar `src/components/HUD/MeuPluginWidget.tsx` com o componente.

---

## EXEMPLO COMPLETO MÍNIMO

```tsx
// src/components/HUD/ExemploWidget.tsx
import React, { useState, useEffect } from 'react';
import { DraggableWindow } from './DraggableWindow';
import { state } from '../../store';
import type { CampaignData } from '../../store';
import { BookOpen } from 'lucide-react';

interface ExemploWidgetProps {
  onClose: () => void;
}

export const ExemploWidget: React.FC<ExemploWidgetProps> = ({ onClose }) => {
  const [campanhas, setCampanhas] = useState<CampaignData[]>([]);

  useEffect(() => {
    const sync = () => setCampanhas(Array.from(state.campaigns.values()) as CampaignData[]);
    sync();
    state.campaigns.observe(sync);
    return () => state.campaigns.unobserve(sync);
  }, []);

  return (
    <DraggableWindow title="Exemplo" id="exemplo-widget" onClose={onClose} width={600} height={400}
      initialX={window.innerWidth / 2 - 300} initialY={window.innerHeight / 2 - 200}>
      <div style={{ padding: '20px', fontFamily: 'var(--font-body)', color: '#f1f5f9' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', color: '#a855f7', margin: '0 0 16px' }}>
          Campanhas ({campanhas.length})
        </h3>
        {campanhas.map(c => (
          <div key={c.id} style={{
            padding: '10px 14px', marginBottom: '8px', borderRadius: '10px',
            background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <BookOpen size={14} color="#a855f7" />
            <span style={{ fontWeight: 600 }}>{c.name}</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#94a3b8' }}>{c.status}</span>
          </div>
        ))}
      </div>
    </DraggableWindow>
  );
};
```

---

## TAREFA

> ⬇️ **PREENCHA AQUI** — Descreva o que o plugin deve fazer. Seja específico.

```
Crie um widget chamado "[NOME DO WIDGET]Widget" que:
- [O que exibe / lista / mostra]
- [Quais ações o usuário pode fazer]
- [Se precisa ler/salvar arquivos na wiki]
- [Se precisa reagir a algum evento do sistema]
- [Qualquer outra regra de negócio]
```

### Entregue:
1. O arquivo TSX completo: `src/components/HUD/[Nome]Widget.tsx`
2. As alterações em `WidgetHubModal.tsx` (interface Props + botão no grid)
3. As alterações em `App.tsx` (useState + import + prop + renderização)
