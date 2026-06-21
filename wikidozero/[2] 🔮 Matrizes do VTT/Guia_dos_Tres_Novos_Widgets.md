# 🎮 Guia dos Três Novos Widgets

> Criado em: Junho 2026 | Versão: 1.0

Este guia explica como usar os três novos widgets integrados ao DOZERO:
**Painel de Conspiração**, **Dados Automáticos** e **Lista de Personagens**.

---

## 📍 Como Abrir os Widgets

1. Abra o **Hub de Widgets** clicando no ícone de grade (⊞) no canto superior direito da mesa
2. Clique no ícone do widget desejado:

| Ícone | Cor | Widget |
|---|---|---|
| 🕸️ Rede | Rosa | Painel de Conspiração (Mapa Mental) |
| 🎲 Dados | Vermelho | Dados Automáticos |
| 👥 Pessoas | Verde | Lista de Personagens |

Todos os widgets são **janelas flutuantes arrastáveis** — você pode reposicioná-las livremente na mesa.

---

## 1️⃣ Painel de Conspiração (Mapa Mental)

**Para que serve:** Criar conexões visuais entre personagens, locais, eventos e documentos da Wiki. Pense num quadro de investigação de série policial — com fios vermelhos ligando tudo.

### Como usar — Passo a Passo

**Criando nós:**
Clique nos botões da barra superior para adicionar elementos ao quadro:

| Botão | Tipo | Cor | Uso |
|---|---|---|---|
| 👤 NPC | Personagem | Azul | Figuras importantes |
| 📍 Local | Localização | Verde | Cidades, masmorras, regiões |
| 📅 Evento | Evento | Vermelho | Acontecimentos da narrativa |
| 📄 Nota | Nota | Âmbar | Anotações rápidas do mestre |
| 📖 Doc | Wiki | Roxo | Link para arquivo da Wiki |
| ✏️ Texto | Texto livre | Transparente | Rótulos e títulos |
| 🖼️ Imagem | Imagem | Cinza | Fotos, mapas, ilustrações |

**Conectando nós (os "fios"):**
1. Passe o mouse em cima de um nó — aparece um **ponto roxo** na direita
2. **Clique e arraste** esse ponto até outro nó
3. Uma seta curva aparece conectando os dois
4. Para **deletar uma conexão**: dê duplo clique na seta

**Movendo nós:**
- Arraste pela **barra de cabeçalho** do card (a parte escura do topo)
- Para textos e imagens: arraste pelos **controles flutuantes** que aparecem acima ao passar o mouse

**Zoom e navegação:**
- **🔍-** / **🔍+**: Diminui e aumenta o zoom
- **⊠ Centralizar**: Volta para zoom 1x no centro
- **Clique e arraste no fundo**: Move o quadro (pan)

**Integrando com a Wiki:**
- Adicione um nó tipo **Doc** e escreva o caminho do arquivo (ex: `Personagens/Lyra_Shadowveil.md`)
- **Duplo clique** no nó Doc abre o arquivo na Wiki automaticamente
- Arquivos abertos na Wiki também podem ser **adicionados ao mapa automaticamente** se o Painel estiver aberto

**Salvando:**
- Clique em **💾 Salvar** — o quadro é salvo em `MapasMentais/Quadro_Principal.md` na sua Wiki
- O mapa carrega automaticamente ao reabrir o widget

---

### Exemplo Prático — Investigação de Assassinato

```
Situação: O Duque foi assassinado. Quem foi?

Nós criados:
  [Evento] "Assassinato do Duque" — centro do quadro
  [NPC] "Lord Varen" — suspeito político
  [NPC] "Condessa Yria" — herdeira
  [NPC] "Mira Vendas-ao-Vento" — última a vê-lo vivo
  [Local] "Câmara Secreta B3" — onde o corpo foi encontrado
  [Doc] "Autopsia_Duque.md" — laudo na Wiki

Conexões:
  Lord Varen → Assassinato (tinha motivo)
  Condessa Yria → Assassinato (herda o título)
  Mira → Duque (último contato)
  Câmara B3 → Assassinato (local)
  Doc Autopsia → Assassinato (evidência)
```

---

## 2️⃣ Dados Automáticos

**Para que serve:** Resolver combates entre personagens automaticamente — sem precisar calcular nada na mão. O sistema lê as fichas dos personagens da Wiki, aplica as mecânicas e salva os resultados de volta.

### Pré-requisito

Os personagens precisam existir como arquivos `.md` na pasta **`Personagens/`** da sua Wiki (wikidozero) com o frontmatter correto. Veja os modelos na mesma pasta deste guia.

### Como usar

1. **Abra o widget** (ícone 🎲 vermelho no Hub)
2. **Escolha o Atacante** no dropdown da esquerda (roxo)
3. **Escolha o Defensor** no dropdown da direita (azul)
4. **Escolha a ação:**

---

#### ⚔️ Ataque Básico

**O que faz:**
- Calcula: `Dano Bruto = Ataque do atacante - Defesa do defensor`
- Aplica armadura: `Armadura absorve dano até zerar`
- Desconta PV: `PV do defensor reduz pelo dano restante`
- Dá XP: `Atacante ganha (Nível do defensor × 10) XP`
- **Salva automaticamente** as fichas atualizadas na Wiki

**Exemplo real:**
```
Kael Ironfist (Ataque: 22) vs Gorath o Implacável (Defesa: 8, Armadura: 25)

Dano bruto = 22 - 8 = 14
Armadura absorve: 14 (Armadura de Gorath: 25 → 11)
Dano final: 0 (armadura absorveu tudo!)
Gorath PV: 120/120 (sem dano)
Kael ganha 60 XP (nível 6 × 10)

⚠️ Gorath tem MUITA armadura — Kael precisa atacar várias vezes para zerá-la!
```

**Segundo ataque (armadura parcial):**
```
Kael (22) vs Gorath (Defesa: 8, Armadura: 11 restante)

Dano bruto = 14
Armadura absorve: 11 (Armadura de Gorath: 0 — DESTRUÍDA!)
💥 Armadura destruída!
Dano final: 3
Gorath PV: 117/120
```

---

#### 🎯 Teste de Perícia

**O que faz:**
- Rola 1d20 para o personagem selecionado como "Atacante"
- Adiciona modificador: `nivel ÷ 2` (arredondado para baixo)
- Compara com a **CD** (Classe de Dificuldade) que você define
- Registra no log e no Chat do sistema

**Exemplos de uso:**

| Situação | CD sugerida | Personagem |
|---|---|---|
| Arrombar porta comum | 10 | Qualquer um |
| Escalar muro molhado | 14 | Qualquer um |
| Decifrar texto antigo | 16 | Mago preferível |
| Detectar armadilha oculta | 18 | Ladino preferível |
| Convencer o rei | 20 | Diplomata preferível |
| Façanha épica | 25+ | Herói no pico |

**Exemplo real:**
```
Thalion (Nível 3) tenta decifrar runas antigas (CD 16)

Dado: 14
Modificador: +1 (nível 3 ÷ 2 = 1)
Total: 15

❌ Falha! (15 < 16)
→ "Thalion não consegue decifrar completamente, mas reconhece a linguagem..."
```

---

#### 🏃 Teste de Velocidade

**O que faz:**
- Compara diretamente a **velocidade** dos dois personagens selecionados
- Define quem age primeiro em combate
- Registra no log e no Chat

**Exemplo real:**
```
Lyra (Velocidade: 14) vs Gorath (Velocidade: 6)

🏃‍♂️ Resultado: Lyra Shadowveil é mais rápida!
→ Lyra age ANTES de Gorath neste turno
```

**Empate:**
```
Kael (Velocidade: 8) vs Mira (Velocidade: 12)
→ Mira age primeiro (12 > 8)
```

### Log de Resultados

Todos os resultados ficam no **painel inferior** do widget. Guarda os últimos 50 resultados da sessão. Cada resultado também aparece automaticamente no **Registro de Rolagens** da mesa.

---

## 3️⃣ Lista de Personagens

**Para que serve:** Ver um painel geral de todos os personagens da campanha — jogadores, NPCs e inimigos — com status de vida em tempo real.

### Como usar

1. **Abra o widget** (ícone 👥 verde no Hub)
2. Os personagens carregam automaticamente da pasta `Personagens/`
3. Use os **filtros no topo** para ver só o que precisa:

| Filtro | Mostra | Borda no card |
|---|---|---|
| Todos | Todos os personagens | Misturado |
| Jogador | PCs do grupo | Verde |
| NPC | Personagens não-jogadores | Azul |
| Inimigo | Antagonistas e monstros | Vermelho |

### O que cada card mostra

```
┌─────────────────────────────────────┐
│ 👤 Kael Ironfist          [Nv. 4]  │
│                                     │
│ ❤️ PV        ████████░░  85/85      │
│                                     │
│ ⚔️ 22    🛡️ 12    ⚡ 8             │
│ (Ataque)  (Defesa)  (Velocidade)   │
│                                     │
│ Armadura: 15   XP: 240             │
└─────────────────────────────────────┘
```

**Cores da barra de PV:**
- 🟢 Verde: PV acima de 60% — saudável
- 🟡 Amarelo: PV entre 30% e 60% — ferido
- 🔴 Vermelho: PV abaixo de 30% — crítico

### Recarregar

Clique em **Recarregar** no rodapé para buscar atualizações da Wiki. Útil depois de usar o widget de Dados Automáticos, que salva as fichas atualizadas.

---

## 🗂️ Estrutura de Fichas — Referência Rápida

Todos os arquivos de personagem ficam em:
```
D:\wikidozero\Personagens\
```

### Campos do Frontmatter

```yaml
---
nome: string        # Nome exibido (obrigatório)
pv: number          # PV atual
pv_max: number      # PV máximo
xp: number          # Experiência total
nivel: number       # Nível (1-20 sugerido)
mana: number        # Mana atual (0 = sem mana)
mana_max: number    # Mana máxima
armadura: number    # Absorção de dano
defesa: number      # Redução de ataque recebido
velocidade: number  # Prioridade em combate
ataque: number      # Dano base
status: string      # "jogador" | "npc" | "inimigo"
avatar: string      # Opcional: caminho da imagem
---
```

### Fórmulas do Sistema

```
Dano Bruto      = Ataque - Defesa (mínimo 0)
Dano Absorvido  = min(Armadura, Dano Bruto)
Dano Final      = Dano Bruto - Dano Absorvido
PV resultante   = max(0, PV atual - Dano Final)
XP ganho        = Nível do alvo × 10

Teste Perícia   = 1d20 + (Nível ÷ 2) vs CD
Velocidade      = Comparação direta (maior age primeiro)
```

---

## 💡 Dicas e Fluxo de Jogo

### Sessão Típica com os Widgets

```
Início da sessão:
  1. Abra Lista de Personagens → verifique PVs de todos
  2. Abra Painel de Conspiração → revise conexões da última sessão

Durante combate:
  3. Dados Automáticos → Teste de Velocidade para definir ordem
  4. Dados Automáticos → Ataque Básico rodada a rodada
  5. Lista de Personagens → Recarregue para ver PVs atualizados

Durante investigação:
  6. Painel de Conspiração → Adicione novos nós com pistas descobertas
  7. Conecte pistas a suspeitos
  8. Links de Doc → Abra fichas de personagens relevantes
```

### Personagens de Teste Prontos

Esta Wiki já tem 5 personagens prontos para usar imediatamente:

| Arquivo | Nome | Status | Nível | Função |
|---|---|---|---|---|
| `Kael_Ironfist.md` | Kael Ironfist | Jogador | 4 | Guerreiro tanque |
| `Lyra_Shadowveil.md` | Lyra Shadowveil | Jogador | 5 | Ladina ágil |
| `Thalion_Brightweave.md` | Thalion Brightweave | Jogador | 3 | Mago de suporte |
| `Gorath_o_Implacavel.md` | Gorath o Implacável | Inimigo | 6 | Boss de combate |
| `Mira_Vendas-ao-Vento.md` | Mira Vendas-ao-Vento | NPC | 2 | Informante |

### Criar Novos Personagens

1. Copie `_MODELO_JOGADOR.md` ou `_MODELO_INIMIGO.md`
2. Renomeie o arquivo (sem o prefixo `_MODELO_`)
3. Edite os campos do frontmatter
4. Salve — o widget Lista de Personagens detecta automaticamente ao recarregar

---

*Guia criado para o DOZERO VTT — Sistema Fantasma de Mesa Virtual*
