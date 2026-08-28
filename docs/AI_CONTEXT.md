# Contexto operacional do DOZERO

Atualizado em 27 de agosto de 2026. Este arquivo resume o estado confirmado pelo código; detalhes de implementação continuam nos arquivos-fonte.

## Produto

O DOZERO é uma mesa virtual tabletop e plataforma de worldbuilding para mestre e jogadores. Combina mapa tático, Teatro da Mente, wiki Markdown semântica, ferramentas de campanha, áudio/voz, IA generativa e colaboração em tempo real.

Prioridade do produto: funções completas primeiro; estética deve sustentar clareza, imersão e identidade, não substituir comportamento funcional.

## Stack confirmada

- SPA: React 19 canary, TypeScript 6 e Vite 8.
- UI: Tailwind CSS 4, CSS próprio, Lucide e sistema de temas em `src/themes/`.
- Mapa: PixiJS 8 e `@pixi/react`.
- Estado: stores locais/Zustand e documento compartilhado Yjs.
- Colaboração: Yjs com IndexedDB, Supabase Realtime e WebSocket local de desenvolvimento.
- Nuvem: Supabase Auth, Postgres, Realtime e Storage.
- Visualização: D3 e Mermaid.
- Testes: Vitest, Testing Library e JSDOM; Puppeteer está disponível para automação.
- Deploy: Vercel; Node 24.x é exigido por `package.json`.

## Arquitetura de execução

1. `src/main.tsx` inicializa a aplicação principal.
2. `src/App.tsx` compõe mesa, modais, wiki e camada de widgets.
3. `src/services/yjs.ts` mantém o estado colaborativo e conecta Supabase Realtime; IndexedDB sustenta o caminho local-first.
4. `src/store/` expõe domínios compartilhados como mapa, tokens, combate, chat, teatro, mundo e calendário.
5. `src/services/*CloudService.ts` e repositórios sincronizam recursos persistentes com Supabase.
6. `src/engine/GameCanvas.tsx` concentra a mesa PixiJS; alterações nele exigem teste cuidadoso de interação e performance.
7. `vite-plugins/` fornece APIs locais de desenvolvimento para wiki, Yjs, YouTube e mídia.

## Domínios importantes

| Domínio | Arquivos centrais |
|---|---|
| Auth e campanhas | `src/store/authStore.ts`, `src/services/campaignCloudService.ts`, `src/components/Modals/CampaignLobbyModal.tsx` |
| Mesa e tokens | `src/engine/GameCanvas.tsx`, `src/store/map.ts`, `src/store/modules/tokenModule.ts` |
| Sync | `src/services/yjs.ts`, `src/services/supabaseRealtimeProvider.ts`, `src/services/sessionSnapshotManager.ts` |
| Voz & Comunicação | `src/store/voiceStore.ts`, `src/services/webrtcVoiceManager.ts`, `src/components/HUD/FloatingVoiceHUD.tsx`, `src/components/Widgets/System/VoiceRoomWidget.tsx`, `src/components/Chat/ChatVoicePanel.tsx` |
| Wiki | `src/components/Wiki/`, `src/services/wiki/`, `vite-plugins/wiki-api.ts` |
| Teatro | `src/components/Theater/`, `src/store/theater.ts` |
| História/calendário | `src/components/Widgets/GameMaster/ChronicleWidget.tsx` (eras e história), `src/components/Widgets/GameMaster/ChronosWidget.tsx` (tempo operacional), `src/store/world.ts`, `src/utils/fantasyCalendar.ts` |
| Temas | `src/themes/`, `src/hooks/useTheme.ts`, `src/components/Modals/SettingsModal.tsx` |
| Banco | `supabase/migrations/`, serviços Supabase e RLS no projeto hospedado |

## Invariantes

- O estado de sessão deve continuar local-first; falha da nuvem não pode apagar o estado local.
- Yjs é a fonte compartilhada da mesa ativa; Postgres/Storage persistem recursos e snapshots.
- Operações de mestre e conteúdo privado precisam de controle no cliente e, quando persistidos, RLS no banco.
- Nunca confiar somente em bloqueio visual para autorização.
- Alterações de schema entram em `supabase/migrations/` e precisam ser reaplicáveis.
- Mudanças de UI devem manter teclado, foco, touch e `prefers-reduced-motion` quando aplicável.

## Riscos e dívida conhecidos

- O bundle possui chunks muito grandes; `projector` e vendors pesados precisam de atenção antes de otimização ampla.
- O projeto usa React canary, então recomendações de React devem respeitar a versão instalada.
- A cobertura de migrations versionadas ainda não descreve todo o schema remoto existente.
- Algumas áreas antigas usam `any`, arquivos muito grandes e estado global; corrigir progressivamente quando uma função tocar nesses fluxos.
- Documentos legados podem estar desatualizados. Este arquivo, `ROADMAP_STATUS.md`, `DECISIONS.md`, código e migrations são as fontes operacionais.

## Preferências de colaboração

- Avançar com autonomia em pedidos curtos como "continue".
- Priorizar funções e integração real.
- Usar Ponytail com parcimônia, em modo leve.
- Não publicar no Git sem solicitação.
- Não misturar arquivos pessoais da wiki ou artefatos gerados em commits.
