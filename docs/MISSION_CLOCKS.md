# Missão contra o tempo

Na mesa, abra a criação de relógios e escolha **Missão contra o tempo** no tipo de relógio. No Teatro da Mente, abra **Relógios de Tensão → Nova missão contra o tempo**.

1. Dê um nome à missão e adicione etapas (até 30), ou use o exemplo de cinco etapas **A queda da coroa**.
2. Defina em cada etapa um título, duração em minutos, objetivo dos heróis e acontecimento se o prazo acabar. Durações aceitam frações de minuto, de um segundo a 24 horas. As etapas podem ser reordenadas antes da criação.
3. Crie a missão pausada. Inicie a primeira etapa quando os jogadores começarem a agir.
4. Use **Objetivo cumprido** antes do prazo para evitar aquela consequência. Ao zerar, o acontecimento fica registrado. A próxima etapa aguarda o mestre iniciar.
5. Use **Avançar 1 min** para consumir tempo narrativo, inclusive com a contagem pausada; **Dar +1 min** concede tempo adicional. Um avanço que esgota a etapa termina nela, sem consumir tempo da próxima.

A barra pode mostrar o tempo restante da etapa (diminui) ou o caminho até o destino (avança). O caminho mede as etapas transcorridas, inclusive prazos perdidos; os resultados distinguem sucesso e consequência. A conclusão do último objetivo encerra a missão. Reiniciar limpa os resultados após confirmação.

Os jogadores acompanham o objetivo atual e os resultados. A interface do mestre mostra as consequências futuras; os dados fazem parte do documento compartilhado, portanto não inclua segredos que exijam confidencialidade. As consequências são narrativas: não alteram automaticamente personagens, HP ou MP.

O cronômetro usa tempo real: fechar a aba não pausa o prazo. Ao voltar, um prazo vencido é registrado pelo cliente do mestre e a próxima etapa permanece pausada. Sem mestre conectado, a contagem aparece zerada até ele retornar. Para interromper o prazo, pause antes de sair.

Cada missão pertence à sala e usa a persistência já existente dos relógios. As configurações das etapas são definidas antes de criar; para um roteiro diferente, crie outra missão.

## Verificação

- `npx vitest run src/store/missionClocks.test.ts`: transições, retomada, reconexão, conclusão, avanço manual, validação e permissões.
- Com o servidor local em `127.0.0.1:5174`, `node scripts/qa/qa-mission-clock.mjs`: monta os componentes reais em uma sala de QA isolada, sem autenticar ou acessar campanhas existentes; testa criação e condução, viewport estreito e visão de jogador. Não substitui validação autenticada entre dois usuários.
