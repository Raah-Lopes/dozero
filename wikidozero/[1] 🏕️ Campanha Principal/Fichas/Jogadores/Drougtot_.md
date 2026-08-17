---
inventario:
  - Katana Térmica Subcutânea de Nanotubos
  - Injetor Neuro-Estabilizador de Sanidade (3 doses)
  - Datapad Criptografado da Aethel-Corp (Registro de Experimento Espécime-09)
tipo: PC
status: vivo
ativo: true
ancestralidade: Slime Biotecnológico
heranca: Núcleo Aberrante Espacial
biografia: Nascido em uma câmara de contenção da mega-corporação Aethel-Corp, Drougtot é a fusão grotesca entre nanobots de infestação biológica e o lodo primordial colhido de um meteoro abissal. Desenvolveu consciência própria após absorver um bio-deck corporativo e escapou para os esgotos enevoados da megalópole, onde ouve os sussurros de ecossistemas mutantes e entidades de além-estrelas.
classe: Druida Bio-Hacker (Círculo da Biocorrupção)
alinhamento: Neutro
genero: Fluido
nome_jogador: Mestre
xp: 1250
registro_aventura: Infiltrou-se nos galpões da Aethel-Corp e infectou os servidores de bio-dados com mofo sintético consciente.
anotacoes: Visco constante com odor de ozônio e carcaça queimada. Quando sua sanidade cai, visões de um oceano negro com olhos vermelhos distorcem sua percepção visual.
imagens: []
magias:
  - 'Hack: Bio-Corrosão Cáustica (Truque)'
  - Sobrecarga Neuronal Miasmática (Nível 1)
  - Metamorfose de Biogel Aberrante (Nível 2)
macros:
  - nome: Ataque de Pseudópode Térmico
    formula: 1d20+9
    dano: 1d8+3
    tipo: ataque
    descricao: Um chicote de gelatina ácida superaquecida com filamentos de plasma.
  - nome: Disparo Nanóide Corrosivo
    formula: 1d20+9
    dano: 2d6+4
    tipo: ataque
    descricao: Projétil de bio-lodo infectado com um vírus de invasão cibernética.
ficha_personagem:
  cabecalho:
    nome_personagem: Drougtot
    genero: Fluido
    alinhamento: Neutro
    nivel: 3
    nome_jogador: Mestre
    xp: 1200
  ancestralidade:
    heranca: Núcleo Aberrante Espacial
    habilidade: Resistência Cáustica, Compressão Corporal, Visão Cósmica
  biografia:
    habilidade: Conhecimento Corporativo (Aethel-Corp), Biologia Sintética
  classe:
    habilidades_nivel:
      - 'Ordem Druídica: Biocorrupção Cyber-Cósmica'
      - Empatia com Infestações e Mutantes
      - Injeção de Código Primordial (Nível 3)
  atributos:
    for: 12
    des: 14
    con: 16
    int: 12
    sab: 18
    car: 8
  pontos_vida:
    maximo: 43
    atuais: 43
    anotacoes: 'Sanidade Limiar: 14/20 (Suscetível a alucinações de geometria não-euclidiana)'
  velocidade_metros: 7.5
  pericias:
    acrobatismo: 2
    arcanismo: 0
    atletismo: 6
    diplomacia: -1
    dissimulacao: -1
    furtividade: 7
    intimidacao: -1
    ladroagem: 2
    manufatura: 6
    medicina: 9
    natureza: 9
    ocultismo: 6
    performance: -1
    religiao: 4
    saber: 6
    sociedade: 1
    sobrevivencia: 9
  percepcao:
    total: 11
    sab: 4
    prof: 7
    sentidos_anotacoes: Visão no Escuro Infravermelha, Percepção Vibracional Químia
  jogadas_salvamento:
    fortitude: 10
    reflexos: 7
    vontade: 11
  defesas:
    proficiencia_armadura:
      sem_armadura: 5
      leve: 5
      media: 0
      pesada: 0
    ca: 18
    anotacoes: Membrana Biomecânica Magnética (+1 CA contra armas de energia e laser)
  ataques_armas:
    proficiencia:
      simples: 5
      marcial: 0
      desarmado: 5
      outra: 0
    corpo_a_corpo:
      - nome: Pseudópode Térmico
        dano: 1d8+3
        tracos: Desarmado, Ágil, Ácido/Fogo
      - nome: Katana Térmica Subcutânea
        dano: 1d8+1
        tracos: Acuidade, Cortante, Térmico
    a_distancia:
      - nome: Disparo Nanóide Corrosivo
        dano: 2d6+4
        tracos: Distância 9m, Injeção Bio-Hack
        municao: Massa de Gelatina Corporal
avatar: https://i.ibb.co/rfbvhDs9/Drougtot-1785592013203.webp
imagem: https://i.ibb.co/rfbvhDs9/Drougtot-1785592013203.webp
imageUrl: https://i.ibb.co/rfbvhDs9/Drougtot-1785592013203.webp
sanidade: 44
pv: 18
status_efeitos: []
HP: 18
visionRadius: 200
HP_max: 43
PM: 20
PM_max: 0
usos_cura_atual: 3
saqueado: false
energia: 100
energia_max: 100
sanidade_max: 100
fome: 0
fome_max: 100
sede: 0
sede_max: 100
cansaco: 0
cansaco_max: 100
defesa: 18
riquezas: 0
armas: []
poderes: []
pocoes: []
maldicoes: []
objetos_campanha: []
Ouro: 0
XP: 1200
po: 356
mana: 20
titulo: Drougtot_
nome: Drougtot_
title: Drougtot_
---




































































<div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: start;">
  <div style="flex: 1; min-width: 300px;">
    :::note[Interpretação e Lore]
    **Nome Completo:** `INPUT[text:ficha_personagem.cabecalho.nome_personagem]`
    **Ancestralidade:** `INPUT[text:ficha_personagem.ancestralidade.heranca]`
    **Classe:** `INPUT[textArea:ficha_personagem.classe.habilidades_nivel]`
    :::

    :::tip[🌟 PROGRESSO]
    **Nível:** `INPUT[number:ficha_personagem.cabecalho.nivel]`
    **XP Atual:** `INPUT[number:ficha_personagem.cabecalho.xp]`
    :::
  </div>

  <div style="flex: 1; min-width: 300px;">
    :::danger[⚔️ COMBATE, STATUS E SOBREVIVÊNCIA]
    **Ativo no Combate:** `INPUT[toggle:ativo]`
    **HP:** `INPUT[number:ficha_personagem.pontos_vida.atuais]` / `VIEW[{ficha_personagem.pontos_vida.maximo}]`

    **Atributos (Pathfinder 2e)**
    **FOR:** `INPUT[number:ficha_personagem.atributos.for]` | **DES:** `INPUT[number:ficha_personagem.atributos.des]` | **CON:** `INPUT[number:ficha_personagem.atributos.con]`
    **INT:** `INPUT[number:ficha_personagem.atributos.int]` | **SAB:** `INPUT[number:ficha_personagem.atributos.sab]` | **CAR:** `INPUT[number:ficha_personagem.atributos.car]`

    **Defesa e Movimento**
    **CA:** `INPUT[number:ficha_personagem.defesas.ca]` | **Deslocamento:** `INPUT[number:ficha_personagem.velocidade_metros]`m

    **Salvamentos:**
    **Fortitude:** `INPUT[number:ficha_personagem.jogadas_salvamento.fortitude]` | **Reflexos:** `INPUT[number:ficha_personagem.jogadas_salvamento.reflexos]` | **Vontade:** `INPUT[number:ficha_personagem.jogadas_salvamento.vontade]`
    :::
  </div>
</div>