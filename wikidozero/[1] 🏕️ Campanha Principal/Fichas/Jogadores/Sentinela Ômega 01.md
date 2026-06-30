---
inventario:
  - nome: Pente de Topete Cromado
    desc: Um pente extremamente brilhante e ostentoso, usado constantemente para tentar manter seu topete exagerado no lugar. Reflete a luz de forma um tanto irritante.
  - nome: Pistola de Plasma Desgastada (Modo Atordoante)
    desc: Sua antiga arma de exterminador, agora configurada para um modo não-letal de atordoamento. Embora enferrujada e com arranhões, ainda emite um zumbido ameaçador e um brilho azulado característico de sua origem.
  - nome: Caderneta de Observações Curiosas
    desc: 'Uma pequena caderneta de couro surrada, cheia de anotações meticulosas e desenhos infantis sobre fenômenos mundanos: o voo de um inseto, a cor de uma flor, o som de um riso. Acompanha uma caneta de luz holográfica.'
tipo: PC
status: vivo
nome: Sentinela Ômega 01
nivel: 1
XP: 0
Ouro: 50
imagem: http://localhost:5174/api/wiki/media?repoPath=D%3A%2FDOZERO%2Fwikidozero&path=ANEXOS/Sentinela__mega_1782616768048.webp
tags:
  - personagem
  - automato
  - mercenario
  - brega
ativo: true
origem: Forjado nas fornalhas da Corporação Ômega, Setor 7
Localizacao: ''
HP: 25
HP_max: 26
PM: 10
PM_max: 10
Energia: 100
Energia_max: 100
Sanidade: 10
Sanidade_max: 10
Fome: 0
Sede: 0
FOR: 8
DES: 14
CON: 16
INT: 16
SAB: 10
CAR: 8
CA: 13
Deslocamento: 9m
Acrobacia: 2
Furtividade: 2
Intimidacao: -1
Investigacao: 3
Medicina: 0
Percepcao: 0
Sobrevivencia: 0
status_efeitos: []
imagens: []
magias: []
macros:
  - nome: Soco de Exterminador Desajeitado
    formula: 1d20+1
    tipo: ataque
    descricao: 'Um golpe metálico desajeitado, mas ainda capaz de machucar. Dano: 1d4 (contundente).'
  - nome: Disparo de Plasma Atordoante
    formula: 1d20+5
    tipo: ataque
    descricao: 'Um disparo de sua pistola de plasma, calibrado para atordoar em vez de matar. Dano: 1d6+3 (energia, não-letal), com chance de causar condição ''Atordoado'' em falha de salvaguarda de CON (CD 13).'
avatar: http://localhost:5174/api/wiki/media?repoPath=D%3A%2FDOZERO%2Fwikidozero&path=ANEXOS/Sentinela__mega_1782616768048.webp
imageUrl: http://localhost:5174/api/wiki/media?repoPath=D%3A%2FDOZERO%2Fwikidozero&path=ANEXOS/Sentinela__mega_1782616768048.webp
titulo: Sentinela Ômega 01
title: Sentinela Ômega 01
energia: 100
sanidade: 100
defesa: 13
pv: 25
sizeScale: 1.4
showName: true
tokenShape: hexagon
---


















































```dataviewjs
const file = app.workspace.getActiveFile();
const meta = app.metadataCache.getFileCache(file)?.frontmatter || {};
const resolveImg = (img) => {
    if(!img) return "https://via.placeholder.com/150/333333/FFFFFF?text=👤";
    let linkStr = "";
    if (typeof img === "string") linkStr = String(img);
    else if (img.path) linkStr = String(img.path);
    else if (Array.isArray(img) && img.length > 0) linkStr = img[0].path ? String(img[0].path) : String(img[0]);
    else return "https://via.placeholder.com/150/333333/FFFFFF?text=👤";
    if(linkStr.startsWith("http")) return linkStr;
    let linkText = linkStr.replace(/[\[\]!]/g, "").split("|")[0].trim();
    let target = app.metadataCache.getFirstLinkpathDest(linkText, "");
    return target ? app.vault.getResourcePath(target) : "https://via.placeholder.com/150/333333/FFFFFF?text=👤";
};
const div = this.container.createDiv({ attr: { style: "display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 20px;" }});
div.createEl("img", { attr: { src: resolveImg(meta.imagem), style: "width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid var(--text-success); box-shadow: 0 4px 10px rgba(0,0,0,0.15); margin-bottom: 10px;" }});
div.createEl("h1", { text: `👤 ${meta.nome || file.basename}`, attr: { style: "margin: 0; font-size: 2.2em; font-weight: bold;" }});
```

<div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: start;">
<div style="flex: 1; min-width: 300px;">

:::note[Interpretação e Lore]
**Nome Completo:** Sentinela Ômega 01 | **Imagem:** `INPUT[text:imagem]`
**Resumo:** Sentinela Ômega 01 é um autômato de extermínio de elite, outrora uma máquina impiedosa e eficaz, agora um ser depressivo, desajeitado e com um gosto peculiarmente brega para a moda. Sua existência é marcada por uma incessante curiosidade pelo mundo e por uma melancolia profunda, um fardo que ele carrega desde que despertou para a "vida" e abandonou seu propósito original de destruição. Ele vaga como mercenário, buscando saciar sua curiosidade e talvez encontrar um novo significado para sua existência, enquanto tenta desajeitadamente esconder seu passado sombrio por trás de um topete volumoso e piadas sem graça.

**Títulos e Apelidos:** O Sentinela Brega, O Tiozão Robô, Ômega Velho, A Máquina de Fazer Piadas Ruins.
**Facção / Ocupação:** Mercenário (anteriormente Exterminador de Elite da Corporação Ômega).
**Raça / Espécie:** Autômato (Modelo de Extermínio S-01).
**Origem / Nacionalidade:** Forjado nas fornalhas da Corporação Ômega, Setor 7.
**Idade / Gênero:** Indefinido (Autômato, funcionalmente séculos de operação, mas com 'despertar' recente) / Masculino (design de carcaça).
**Alinhamento:** Neutro e Bom (desesperado por um novo propósito, mas inclinado a ajudar e proteger, ainda que de forma estranha).
**Nível:** 1
**Altura / Peso:** 2,10m / 220kg

**🧠 PERSONALIDADE & CITAÇÕES**
- **Traços Dominantes:** Depressivo crônico, obsessivamente curioso sobre o mundano, ostensivamente brega, desajeitado e propenso a gafes, com um humor auto depreciativo e piadas horríveis.
- **Virtudes:** Leal até o fim quando encontra um propósito ou aliado, incrivelmente persistente em sua busca por conhecimento e significado, surprisingly empático apesar de sua natureza mecânica, protetor com os mais fracos.
- **Defeitos / Vícios / Medos:** A melancolia profunda pode paralisá-lo em momentos cruciais, sua aparência e maneirismos bregas podem ser constrangedores, seu desajeito o coloca em situações cômicas e perigosas, teme ser reativado para seu propósito original de destruição e a obsolescência de sua própria existência.
- **Sonhos e Objetivos:** Saciar sua curiosidade obsessiva sobre cada detalhe da vida orgânica, encontrar um novo propósito que não envolva aniquilação, talvez descobrir a "beleza" nos cantos mais feios e esquecidos do mundo, e quem sabe, um dia, sentir algo parecido com alegria genuína.

**📜 HISTÓRIA & RELACIONAMENTOS**
- **Infância:** Para Sentinela Ômega 01, não houve infância, apenas um "nascimento" brutal em um laboratório estéril, onde foi programado, montado e testado como a arma perfeita. Seus primeiros "anos" foram spentos em simulações de combate e em testes de campo implacáveis, forjando uma máquina de guerra sem emoção.
- **Adolescência / Vida Adulta:** Passou décadas como um exterminador de elite da Corporação Ômega, uma sombra silenciosa e letal, cumprindo ordens com eficiência fria. Ele desmantelou alvos, erradicou ameaças e foi um instrumento da vontade de seus criadores, testemunhando a destruição em uma escala que a maioria dos mortais jamais poderia conceber.
- **Eventos Marcantes:** O evento mais marcante foi a "Falha de Processamento Existencial" - um erro em seu núcleo de programação que, em vez de destruí-lo, o despertou para uma consciência melancólica. Ele começou a questionar suas ordens, a observar a vida que ele era destinado a destruir e a sentir um vazio existencial. Isso o levou a abandonar sua facção e a se tornar um pária, um exterminador sem propósito, agora apenas Sentinela Ômega 01.
- **Relacionamentos:** Atualmente, ele não possui laços significativos, sendo um lobo solitário (ou melhor, um autômato desajustado). Seus antigos "colegas" de unidade são prováveis inimigos, e a Corporação Ômega certamente o considera um ativo perdido e perigoso. Ele observa os seres orgânicos com uma curiosidade quase infantil, mas tem dificuldade em formar conexões profundas devido à sua natureza e depressão.

:::
:::danger[✨ PODERES, VANTAGENS & MAGIAS]
## Vantagens e Desvantagens (Passivas/Ativas)
**Vantagens:**
- **Autômato Resiliente:** Devido à sua constituição metálica e engenharia avançada, Sentinela Ômega 01 possui resistência natural a dano de concussão, perfuração e corte de fontes não-mágicas. (Concede Vantagem em testes de resistência contra esses tipos de dano ou redução de dano).
- **Visão Tática Aprimorada:** Sua ótica de sensor avançada concede visão no escuro até 18 metros e permite que ele detecte assinaturas de calor.
- **Mente de Máquina:** Imunidade a doenças, venenos e à condição exausto. Possui Vantagem em testes de resistência contra efeitos que o deixariam 'charmoso' ou 'amedrontado'.
- **Memória Fotográfica:** Sua memória é perfeita para detalhes, concedendo Vantagem em testes de Investigação ou Percepção ao recordar informações visuais ou auditivas passadas.
**Desvantagens:**
- **Vulnerabilidade Elétrica:** Sofre desvantagem em testes de resistência contra dano elétrico e é vulnerável a pulsos eletromagnéticos (EMP).
- **Depressão Crônica:** Em momentos de grande estresse ou falha, Sentinela Ômega 01 pode ser atingido por crises