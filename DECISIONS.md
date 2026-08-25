# Decisões do DOZERO

Registros curtos de escolhas que afetam trabalhos futuros. Isto não substitui o changelog.

## 2026-08-25 — Funções antes de polimento isolado

**Status:** Ativa  
**Decisão:** priorizar fatias funcionais completas; aplicar estética quando melhora clareza, imersão ou faz parte do pedido.  
**Motivo:** preferência explícita do usuário e foco do roadmap.

## 2026-08-25 — Ponytail em modo leve

**Status:** Ativa  
**Decisão:** usar Ponytail para reduzir duplicação e dependências, nunca para limitar uma boa implementação, segurança, acessibilidade ou testes.  
**Motivo:** o modo integral estava influenciando demais o escopo das soluções.

## 2026-08-25 — Estado local-first com persistência Supabase

**Status:** Ativa  
**Decisão:** manter Yjs/IndexedDB como caminho responsivo da sessão e Supabase como autenticação, persistência, presença e sync universal.  
**Motivo:** preserva funcionamento offline e adiciona acesso multi-dispositivo sem transformar toda interação em round-trip de banco.

## 2026-08-25 — Reutilizar D3 no cérebro semântico

**Status:** Ativa  
**Decisão:** implementar filtros, criação de conexão e shortest path sobre o grafo D3 existente, sem adicionar XY Flow somente para cumprir o nome do roadmap.  
**Motivo:** a capacidade necessária já era atendida pela stack instalada com menor bundle e menor migração.

## 2026-08-25 — Contexto persistente com divulgação progressiva

**Status:** Ativa  
**Decisão:** manter `AGENTS.md` curto e carregar arquitetura, roadmap, design e QA por uma skill própria e documentos versionados.  
**Motivo:** melhora consistência entre tarefas sem ocupar o contexto de toda solicitação com manuais extensos.

## 2026-08-25 — Supabase MCP limitado por padrão

**Status:** Ativa  
**Decisão:** usar MCP com `project_ref`, grupos mínimos e modo somente leitura no trabalho cotidiano; escrita apenas em tarefa explicitamente autorizada.  
**Motivo:** reduz superfície de ataque e evita alterações acidentais em dados hospedados.

