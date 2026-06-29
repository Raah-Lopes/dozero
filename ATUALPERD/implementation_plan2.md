# Automação Total de Resolução de Combate

## Objetivo
O VTT passará a funcionar como um cRPG. Ao clicar em um ataque (Arma, Ataque Desarmado ou Macro), o sistema deve rolar o acerto e, **em caso de sucesso**, rolar imediatamente o dano, subtrair do HP do alvo e despachar as animações sem exigir um segundo clique do jogador.

## Modificações no Core (`TargetTerminal.tsx`)

### 1. Motor de Dano Dinâmico (`evaluateFormula`)
A nova função inteligente que interpreta `@for` e `@des` será expandida para processar *também* as fórmulas de dano.
- Atualmente, macros antigas tentavam ler o dano por Regex simples.
- Agora, se o `macro.dano` for `1d8 + @for`, ele chamará o motor matemático robusto, rolará o d8 e aplicará a força do personagem.

### 2. Automação de Armas Equipadas
As armas (espada, machado, etc.) que o jogador clica na aba de "Ataques" serão refatoradas para fluir no mesmo pipeline automático:
- Rola d20 + Bônus da Arma + Condições (Flanqueando, MAP).
- Compara com a Defesa (`CA`) dos `targetsIds`.
- Se acertar: Rola a fórmula de dano da arma, aplica `condBonusDmg`, subtrai do HP do alvo e dispara `type: 'dano'`.

### 3. Automação de Ataque Desarmado (Ações Básicas)
- O Ataque Base fará o teste padrão `1d20 + @for` contra o alvo.
- Sucessos rodarão automaticamente `1d4 + @for` (ou bônus de dano de monge se aplicável), descontando do alvo de uma só vez.

> [!TIP]
> **Dica para sua Macro:** Como o seu "Rasteira de Capoeira" tem o dano escrito apenas no campo de *descrição* (`Dano: 1d6+3`), o robô não sabe que aquilo é matemática. Para essa macro brilhar no novo sistema, recomendo editá-la e preencher o campo de Dano com a fórmula real (ex: `1d6 + 3`).

## Verification Plan
1. Selecionar um Token Alvo e usar uma Macro com "Dano". Confirmar se em um acerto, o HP dele é drenado.
2. Usar uma Arma da aba Ataques contra o alvo e confirmar que ele faz a dupla validação (Defesa -> Dreno de HP) automática.
3. Checar a formatação final no novo Combat Log.
