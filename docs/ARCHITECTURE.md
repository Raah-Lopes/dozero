# Arquitetura do DOZERO VTT

O DOZERO é uma SPA colaborativa em React, TypeScript e Vite. A mesa mantém resposta local imediata por Yjs/IndexedDB e usa Supabase para autenticação, persistência e sincronização entre dispositivos.

## Camadas

### Aplicação e UI

`src/App.tsx` compõe a mesa, wiki, Teatro da Mente, HUD, modais e widgets. `useWindowManager` controla as janelas flutuantes e os modos principais sem exigir navegação de página para cada ferramenta.

### Mesa

`src/engine/GameCanvas.tsx` renderiza mapa, tokens, fog, textos, desenhos e ferramentas táticas com PixiJS. Stores em `src/store/` separam domínios, embora partes legadas ainda estejam concentradas no canvas.

### Estado colaborativo

`src/services/yjs.ts` cria o documento da sala. IndexedDB recupera o estado local; Supabase Realtime é o transporte universal de produção e o WebSocket local complementa o desenvolvimento.

O estado ativo da mesa deve continuar útil durante falhas de rede. Persistência remota não pode apagar silenciosamente uma cópia local válida.

### Nuvem

Supabase fornece Auth, Postgres, Realtime e Storage. Serviços de campanha, personagem, cena, encontros, chat e snapshots encapsulam as operações remotas. Policies RLS são a fronteira de autorização para dados persistidos.

### Conteúdo e worldbuilding

A wiki trabalha com Markdown e frontmatter, sincronizados localmente e pela infraestrutura da sala. D3 renderiza o cérebro semântico; Mermaid cobre diagramas embutidos. O Chronos mantém calendário, eventos e simulação de mundo no estado compartilhado.

### Áudio e voz

`AudioEngine` e `audioStore` coordenam trilhas e efeitos. Voz e screen share usam WebRTC com sinalização via Supabase Realtime.

## Fluxo de dados simplificado

```text
UI/PixiJS
   ↕
Stores + Yjs document
   ↙             ↘
IndexedDB       Supabase Realtime
                    ↕
          Postgres / Storage / Auth
```

## Regras arquiteturais

- Reutilizar serviços e stores existentes antes de criar outra fonte de estado.
- Manter atualizações locais rápidas e sincronização idempotente.
- Versionar schema e RLS em migrations.
- Separar conteúdo privado do mestre no armazenamento, não apenas na renderização.
- Evitar dependências que duplicam capacidades já presentes.
- Testar mudanças cross-layer com teste focado, build e fluxo no navegador.

Veja [AI_CONTEXT.md](AI_CONTEXT.md) para o mapa operacional de arquivos e [ROADMAP_STATUS.md](ROADMAP_STATUS.md) para prioridades.
