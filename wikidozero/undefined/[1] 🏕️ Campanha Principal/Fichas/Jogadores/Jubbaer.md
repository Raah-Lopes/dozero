---
inventario: 
- nome: Hidromel de Guerreiro
desc: Um hidromel forte e especial que aumenta a força de Jubbaer quando consumido.
- nome: Espada de Batalha
desc: Uma espada larga e pesada, ideal para cortar inimigos com força bruta.
- nome: Escudo de Madeira
desc: Um escudo simples feito de madeira, usado para defender Jubbaer em combate.
tipo: PC
status: vivo
nome: Jubbaer
nivel: 1
XP: 0
Ouro: 0
imagem: ""
tags: 
- personagem: 
ativo: true
origem: Cidade Subterrânea
Localizacao: Barrio de Hidromel
HP: 15
HP_max: 15
PM: 10
PM_max: 10
Energia: 100
Energia_max: 100
Sanidade: 10
Sanidade_max: 10
Fome: 0
Sede: 0
FOR: 16
DES: 12
CON: 14
INT: 8
SAB: 10
CAR: 12
F: 2
H: 1
R: 1
A: 1
PdF: 1
CA: 12
Deslocamento: "9m"
Acrobacia: 0
Furtividade: 0
Intimidacao: 2
Investigacao: 0
Medicina: 0
Percepcao: 1
Sobrevivencia: 1
status_efeitos: []
imagens: ![](http://localhost:5174/api/wiki/media?repoPath=D%3A%2FDOZERO%2Fwikidozero\&path=ANEXOS/Jubbaer___qu.webp)
magias: []
macros: 
- nome: "Ataque Básico"
formula: "1d20+4"
tipo: "ataque"
descricao: "Ataque corpo-a-corpo com espada"
- nome: "Golpe de Hidromel"
formula: "1d20+6"
tipo: "ataque"
descricao: "Ataque especial com aumento de força após beber hidromel"
---
[!quote]- Interpretação e Lore
> **Nome Completo:** Jubbaer, a Guerreira Bebada | **Imagem:** 
> **Resumo:** 
> Jubbaer é uma elfa de cabelos verdes, nascida em uma cidade subterrânea. Ela é uma guerreira feroz e tem uma peculiaridade: quando bebe hidromel, sua força aumenta descomunalmente. Essa característica a torna uma oponente formidável em combate.
> 
> **Títulos e Apelidos:** A Bebada, A Guerreira de Hidromel
> **Facção / Ocupação:** Guerreira, Protetora do Barrio de Hidromel
> **Raça / Espécie:** Elfa Subterrânea
> **Origem / Nacionalidade:** Cidade Subterrânea
> **Idade / Gênero:** 25 anos, Feminino
> **Alinhamento:** Neutro Bom
> **Nível:** 1
> **Altura / Peso:** 1,70m / 60kg
> 
> **🧠 PERSONALIDADE & CITAÇÕES**
> - **Traços Dominantes:** Jubbaer é uma pessoa forte e direta, que não tem medo de enfrentar desafios. Ela é leal aos seus amigos e familiares, e fará de tudo para protegê-los.
> - **Virtudes:** Coragem, Lealdade, Força
> - **Defeitos / Vícios / Medos:** Bebedeira, Impulsividade, Medo de perder pessoas queridas
> - **Sonhos e Objetivos:** Proteger o Barrio de Hidromel, encontrar um meio de controlar sua bebedeira, se tornar uma das maiores guerreiras da cidade subterrânea

> [!warning]- ✨ PODERES, VANTAGENS & MAGIAS
> ## Vantagens e Desvantagens (Passivas/Ativas)
> - **Vantagem:** Força aumentada quando bebe hidromel
> - **Desvantagem:** Perda de controle quando bebe demais
> 
> ## Magias Conhecidas
> - **Nenhuma**

> [!info]- 🗺️ MAPA MENTAL & REFERÊNCIAS
> ```mermaid
> mindmap
> root((Jubbaer))
>   Goma
>   Sentinela Ômega
>   Barrio de Hidromel
> ```

> [!success] 🌟 PROGRESSO: Nível `1`
> **XP Atual:** `0` / Próximo Nível: `1000`

> [!danger] ⚔️ COMBATE, STATUS E SOBREVIVÊNCIA
> **Ativo no Combate:** Sim | **Localização:** Barrio de Hidromel
> 
> **Barras de Vida e Combate**
> **HP:** `15` / `15` | **PM:** `10` / `10`
> 
> **Sobrevivência & Sanidade**
> **Energia:** `100` / `100` | **Sanidade:** `10` / `10`
> **Fome (%):** `0` | **Sede (%):** `0`
> 
> **Atributos Principais (D&D)**
> **FOR:** `16` | **DES:** `12` | **CON:** `14` 
> **INT:** `8` | **SAB:** `10` | **CAR:** `12`
> 
> **Atributos Clássicos (4DeT)**
> **F:** `2` | **H:** `1` | **R:** `1` | **A:** `1` | **PdF:** `1`
> 
> **Defesa e Movimento**
> **CA:** `12` | **Deslocamento:** `9m`
> 
> **Perícias Básicas:**
> **Acrobacia:** `0` | **Furtividade:** `0`
> **Intimidação:** `2` | **Investigação:** `0`
> **Medicina:** `0` | **Percepção:** `1`
> **Sobrevivência:** `1`
> 
> **Condições:**
> ```meta-bind
> []
> ```

> [!tip]- 💰 RIQUEZAS E TESOUROS
> - Ouro atual: `0` MO

---
### ⚙️ INVENTÁRIO & ARMAS
```dataviewjs
const meta = app.metadataCache.getFileCache(app.workspace.getActiveFile())?.frontmatter || {};
if(!meta.inventario || meta.inventario.length === 0) {
    dv.paragraph("Inventário vazio.");
} else {
    // Tabela simples de inventário
    dv.table(["Item", "Descrição"], meta.inventario.map(i => [i.nome, i.desc]));
}
```
![](http://localhost:5174/api/wiki/media?repoPath=D%3A%2FDOZERO%2Fwikidozero\&path=ANEXOS/Jubbaer___qu.webp)