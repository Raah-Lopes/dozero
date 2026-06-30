# Diário de Bordo: Virada de Chave para Pathfinder 2e 🐉

A fundação do VTT foi limpa e reconstruída para abraçar oficialmente as mecânicas do **Pathfinder 2e**, removendo qualquer fantasma do antigo sistema 3D&T e consolidando uma experiência de jogo muito mais tática e automatizada.

## O Que Foi Construído

### 1. Limpeza da Inteligência Artificial
A IA agora entende que o sistema mestre é Pathfinder 2e.
- Os Atributos antigos (Força, Habilidade, Resistência, Armadura, Poder de Fogo) foram completamente erradicados do cérebro dela e dos templates de geração de personagem.
- Fichas geradas a partir de agora virão com os **Atributos Clássicos** (FOR, DES, CON, INT, SAB, CAR) e as **Resistências** nativas do PF2e (Fortitude, Reflexos, Vontade).

### 2. Disputas Automáticas de Perícia ⚔️
Se você rolar uma perícia tendo outro token selecionado (como "Alvo"), o VTT fará uma disputa invisível!
- A engine vai rolar o seu dado, extrair o modificador correspondente da ficha do **Alvo**, e calcular a **CD (Classe de Dificuldade) Passiva** dele (10 + Modificador).
- O log de combate anunciará automaticamente se você conseguiu um Sucesso, Falha ou Acerto Crítico contra ele! Perfeito para rolar Percepção vs Furtividade, ou Acrobacia vs Atletismo.

### Progresso Atual

1. **Unificação do Target:**
   - O clique esquerdo do mouse agora chama a função universal `toggleTarget()` se feito sobre o anel de token; caso contrário, chama `clearTargets()`. Isso garante que a UI e a lógica de seleção andem de mãos dadas.
2. **Restauração da Seleção de Alvos e Combate:**
   - O `GameCanvas.tsx` foi ajustado para permitir a marcação e desmarcação correta de Alvos sem limpar a lista prematuramente, restaurando o funcionamento da "Mira" em campo que havia sumido!
3. **Escudo Anti Auto-Dano:**
   - Implementado o sistema que injeta de forma invisível a condicional `if (tId === tokenId) return;` no motor iterativo de danos. Isso impede completamente a dedução mútua ou indesejada de HP caso o jogador teste habilidades em si mesmo tendo seu token focado/mirado, prevenindo assim perdas aleatórias de saúde no painel. 
4. **Purgação Completa do 3D&T (Legacy Code):**
   - Os painéis visuais do Mestre (`ArsenalMestreWidget.tsx`) e a interface do rolagens automatizadas (`AutomatedDiceWidget.tsx`) foram minuciosamente purificados do sistema legado "Bônus Reto". Atributos como "PdF", "Habilidade" e "Armadura" deram espaço exclusivamente às mecânicas limpas do Pathfinder.

### 5. Auditor Automático de Progressão de Nível 📈
Foi criado o novo **LevelUpWidget**, integrado diretamente na interface do Token (`TargetTerminal.tsx`) através de um botão ao lado da palavra "Nível" (ícone de gráfico). 
- Ele calcula automaticamente a pontuação máxima possível para aquele nível.
- Realiza auditoria matemática das discrepâncias entre os pontos que o jogador tem, e os pontos que ele *deveria* ter, listando todas as "Sobras" positivas ou negativas.
- Adicionado sistema de **Distribuição Rápida de Arquétipos**: o mestre ou o jogador pode selecionar rapidamente se deseja moldar sua distribuição matemática como *Tanque (HP/FOR)*, *Ladino (DES/Furtividade)*, *Místico (INT/SAB)*, etc, com o sistema aplicando as sobras automaticamente e salvando direto no `.md` do personagem!

### 3. A Economia das 3 Ações (HUD) ◈
No topo do painel do personagem, você notará três diamantes (`◈ ◈ ◈`). 
- Agora você (e seus jogadores) podem clicar neles para gastar ações durante o turno. 
- O botão **Reset** recarrega todas as 3 ações instantaneamente para o próximo turno.

### 4. Botões de Múltiplos Ataques (MAP)
Integrado na aba de "Combate", no painel de Condições Ativas, você agora encontra os botões **MAP (-5)** e **MAP (-10)**.
- Ative-os antes de desferir o segundo ou terceiro golpe do seu turno. A engine subtrairá automaticamente o valor do seu dado de acerto final e calculará as chances de acerto contra o alvo considerando a penalidade pesada!

> [!TIP]
> **Como Testar:**
> 1. Atualize o navegador (F5) para o React puxar os botões e a nova engine de Atributos.
> 2. Selecione o Token de um Goblin, abra a ficha do seu Herói, e clique na perícia "Atletismo" (como se fosse Empurrar o Goblin). Veja o comparativo automático no chat!
> 3. Na aba de "Combate", clique no botão MAP (-5) e ataque o Goblin com a sua Arma. O chat mostrará a penalidade aplicada no acerto de forma transparente.
