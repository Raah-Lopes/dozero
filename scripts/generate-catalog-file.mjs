import fs from 'fs';

const content = `# 📖 Catálogo Mestre da Wiki DOZERO

> **Última Auditoria:** 26 de Agosto de 2026  
> **Status:** Totalmente catalogado e organizado por camadas RPG.

---

## 🧙 1. Personagens & Fichas Ativas

Localização: \`[1] 🏕️ Campanha Principal/Personagens/\`

### 🛡️ Jogadores (PJ)
- **Jacir Malemog** (\`Jogadores/Jacir Malemog.md\`) — *Mago / Necromante Épico (Ficha Completa com Magias e Lore)*
- **Jubbaer** (\`Jogadores/Jubbaer.md\`) — *Guerreiro Pesado (Ficha com Inventário e Atributos)*
- **Drougtot_** (\`Jogadores/Drougtot_.md\`) — *Ficha de Personagem Estruturada*
- **Lyra Shadowveil** (\`Jogadores/Lyra Shadowveil.md\`) — *Ladina das Sombras (Ficha e História)*
- **Thalion Brightweave** (\`Jogadores/Thalion Brightweave.md\`) — *Bardo / Tecedor Arcano*
- **Goma** (\`Jogadores/Goma.md\`) — *Ficha de Aventureiro*
- **Kael Ironfist** (\`Jogadores/Kael Ironfist.md\`) — *Clérigo / Guardião da Forja*

### 🐉 Monstros & Criaturas
- **Sentinela Omega 01** (\`Monstros/Sentinela Omega 01.md\`) — *Construto Titânico Lendário (Stats Épicos)*
- **Gorath o Implacável** (\`Monstros/Gorath o Implacavel.md\`) — *Chefe Orc Bárbaro*

### 👤 NPCs
- **Mira Vendas-ao-Vento** (\`NPCs/Mira Vendas-ao-Vento.md\`) — *Comerciante / Mestre de Caravanas (Rica com Imagens e Tabela de Vendas)*
- **Norta** (\`NPCs/Norta.md\`) — *NPC de Encontro*
- **MegaNPCs** (\`[2] 🔮 Matrizes do VTT/MegaNPCs.md\`) — *Tabela Mestre e Gerador de NPCs*

### 📋 Modelos & Templates
- **_MODELO_JOGADOR.md** (\`Modelos/_MODELO_JOGADOR.md\`) — *Template base para novos heróis*
- **_MODELO_INIMIGO.md** (\`Modelos/_MODELO_INIMIGO.md\`) — *Template base para novos monstros e NPCs*

---

## 🏰 2. Locais, Cidades & Cenários

- **MegaLocais.md** (\`[2] 🔮 Matrizes do VTT/MegaLocais.md\`) — *Compêndio completo de tavernas, cidades, fortalezas e masmorras*
- **eldorado.md** (\`[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Lugares/Localizacoes/eldorado.md\`) — *Localização de Campanha*
- **Geraldo.md** (\`[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Lugares/Localizacoes/Geraldo.md\`) — *Ponto de Interesse*

---

## 🔮 3. Compêndios, Matrizes do VTT & Guias

- **MegaOraculo.md** (\`[2] 🔮 Matrizes do VTT/MegaOraculo.md\`) — *Banco mestre de tabelas de oráculo (1.4 MB)*
- **MegaLoot.md** (\`[2] 🔮 Matrizes do VTT/MegaLoot.md\`) — *Tabelas de tesouro, moedas e recompensas*
- **Guia_dos_Tres_Novos_Widgets.md** (\`[2] 🔮 Matrizes do VTT/Guia_dos_Tres_Novos_Widgets.md\`) — *Documentação operacional dos widgets do DOZERO*
- **CHAVEDECRIARWIDGETSPRORPG.md** (\`[3] 📎 Anexos/CHAVEDECRIARWIDGETSPRORPG.md\`) — *Especificações de arquitetura para criação de novos widgets*
- **Diario de producao.md** (\`[3] 📎 Anexos/Diario de producao.md\`) — *Histórico de desenvolvimento*

---

## 🗑️ 4. Arquivos Descartáveis e Stubs Arquivados

Localização: \`[99] 🗑️ Descartaveis & Stubs/\`

- **Exemplos vazios (\`Exemplos_Stubs/\`):** 13 arquivos com texto genérico de template não preenchido.
- **Bestiário sem conteúdo (\`Bestiario_Vazio/\`):** 17 arquivos contendo apenas o cabeçalho do monstro sem atributos.
- **Missões automáticas (\`Missoes_Temporarias/\`):** 7 stubs gerados por timestamp.
- **Áudios vazios (\`Audios_Vazios/\`):** Arquivos stubs de áudio sem mídia.
- **Git Desativado (\`Git_Desativado/\`):** 75 arquivos binários internos antigos arquivados fora da árvore principal da wiki.
`;

fs.writeFileSync('D:/DOZERO/wikidozero/CATALOGO_WIKI.md', content, 'utf8');
console.log('CATALOGO_WIKI.md gerado com sucesso!');
