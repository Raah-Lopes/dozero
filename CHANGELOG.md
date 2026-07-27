# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [0.1.0] - 2026-07-27

### Adicionado
- ✨ ErrorBoundary em componentes críticos (App, Canvas, etc)
- ✨ Hook centralizado `useAppEventListeners`
- ✨ Hook `useYjsCleanup` para limitar o tamanho do cache do Yjs no IndexedDB
- ✨ Melhorias de performance com code splitting no Vite
- ✨ Pipeline de CI/CD completa para testes automatizados e compilação
- ✨ Arquivos de teste unitário básicos usando Vitest (`useWindowManager.test.ts`)
- ✨ Arquivo `.env.example` e documentação atualizada no `README.md`

### Corrigido
- 🐛 Renderização de tokens no Canvas otimizada e correções de vazamento de UI em mobile.
- 🐛 Atualização condicional do estado `massAttackSelected` via `React.memo` para previnir renderizações excessivas no `CombatTracker`.
- 🐛 Limpeza de imagens corrompidas de tokens após migração via API de rotas.
- 🐛 Problemas de UI travada pela propriedade `touch-action: none` corrigidos.

### Modificado
- 🔄 Refatoração do `App.tsx`, transferindo lógica pesada para hooks isolados.
- 🔄 Limpeza de scripts de desenvolvimento antigos e arquivos `.log` que foram movidos para a pasta oculta `.archive/`.
- 🔄 Configurações no `vite.config.ts` ajustadas para suporte ao Vite 8.

## [0.0.1] - Versão Inicial
- 🚀 Commit original da fundação da ferramenta de mesa virtual (VTT) Dozero.
