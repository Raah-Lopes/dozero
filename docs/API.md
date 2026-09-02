# API de dados do DOZERO

O navegador usa a API de mesma origem para chamadas PostgREST do Supabase:

- Produção: `GET|POST|PATCH|PUT|DELETE /api/data?path=<tabela-ou-rpc>`
- Desenvolvimento: `GET|POST|PATCH|PUT|DELETE /data-api?path=<tabela-ou-rpc>`
- Arquivos: `/api/storage?path=object/<visibilidade>/<bucket>/<arquivo>`
- Disponibilidade: `GET /api/health` (produção) ou `/data-api?health=true` (desenvolvimento)

O cliente `src/services/supabase.ts` aplica essa rota automaticamente para
`supabase.from(...)` e `supabase.rpc(...)`; os componentes não devem chamar a
rota manualmente.

## Segurança

- O gateway só encaminha recursos PostgREST com nomes válidos.
- Ele repassa `Authorization`, `apikey` e cabeçalhos de consulta do usuário.
- Não possui nem usa chave `service_role`.
- O Supabase RLS continua sendo a fronteira de autorização para cada leitura e
  escrita.
- Auth e Realtime permanecem nos transportes oficiais do Supabase. As operações
  de Storage passam pelo gateway com o JWT do usuário, incluindo uploads e URLs
  públicas retornadas pelo aplicativo.

## Operação

Respostas do gateway não são armazenadas em cache. Se a nuvem ficar
indisponível, os serviços locais preservam seus dados local-first e expõem um
erro recuperável, sem descartar o estado da mesa.
