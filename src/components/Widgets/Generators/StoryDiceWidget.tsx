import React, { useState, useCallback, useEffect } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { Dices, Sparkles, Save, RotateCcw, Copy, BookOpen, Lightbulb, MapPin, Target, Skull, Theater, Anchor, Zap } from 'lucide-react';
import { pushChatMessage } from '../../../store/chat';

// ============================================
// DADOS DE STORY DICES (20 itens por categoria, separados por Gênero)
// ============================================

type Genre = 'fantasia' | 'scifi' | 'misterio' | 'generico';

interface CategoryData {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  items: Record<Genre, string[]>;
}

const CATEGORIES: CategoryData[] = [
  {
    id: 'cenario',
    name: 'Cenário',
    icon: <MapPin size={16} />,
    color: '#3b82f6',
    items: {
      fantasia: [
        'Um castelo em ruínas abandonado', 'Uma floresta sussurrante', 'Uma cidade submersa por magia', 'Uma montanha de cristais flutuantes', 'Um deserto de areias negras',
        'Uma taberna amaldiçoada', 'Um templo esquecido nos picos', 'Um pântano de águas venenosas', 'Uma torre de um mago louco', 'Uma ponte sobre um abismo',
        'Um acampamento orc destruído', 'Uma gruta de cogumelos brilhantes', 'Um arquipélago voador', 'Uma cidade élfica nas copas das árvores', 'Um vulcão de fogo azul',
        'Uma masmorra mecânica antiga', 'Um oásis ilusório', 'Uma vila tomada por fantasmas', 'Um campo de batalha petrificado', 'Uma ilha nas costas de um leviatã'
      ],
      scifi: [
        'Uma estação espacial derelicta', 'Um planeta de selva hostil', 'Uma colônia mineradora silenciosa', 'Um mercado negro orbital', 'Uma mega-cidade cyberpunk chuvosa',
        'Um deserto vermelho', 'Um cruzador destruído', 'Uma fábrica de andróides autônoma', 'Um planeta oceânico congelado', 'Um anel de asteroides',
        'Um laboratório genético isolado', 'Um elevador espacial abandonado', 'Uma dimensão de bolso instável', 'Um planeta prisão', 'Uma arca geracional',
        'Um resort de luxo espacial vazio', 'Um sistema solar binário', 'Uma anomalia de buraco negro', 'Uma nave de pesquisa à deriva', 'Uma base militar subterrânea'
      ],
      misterio: [
        'Uma mansão vitoriana sombria', 'Um asilo abandonado', 'Um hotel na beira da estrada', 'Uma cidade enevoada', 'Um beco escuro no centro',
        'Um teatro antigo fechado', 'Um farol isolado', 'Um cemitério antigo', 'Um porão secreto', 'Uma biblioteca particular',
        'Um trem expresso à meia-noite', 'Uma cabana na floresta', 'Uma escola à noite', 'Uma igreja gótica', 'Um museu de cera',
        'Um necrotério', 'Um apartamento no 13º andar', 'Uma fábrica abandonada', 'Um parque de diversões decadente', 'Um pântano envolto em bruma'
      ],
      generico: [
        'Uma encruzilhada isolada', 'Uma ponte antiga', 'Um vale silencioso', 'Uma caverna escura', 'Um vilarejo esquecido',
        'Uma montanha nebulosa', 'Um lago tranquilo', 'Uma torre alta', 'Um campo aberto', 'Um labirinto de pedra',
        'Um porto movimentado', 'Uma estrada poeirenta', 'Uma floresta densa', 'Um jardim abandonado', 'Uma praça central',
        'Um forte isolado', 'Uma mina desativada', 'Um arquipélago remoto', 'Um abismo profundo', 'Uma planície gelada'
      ]
    }
  },
  {
    id: 'objeto',
    name: 'Objeto',
    icon: <Target size={16} />,
    color: '#f59e0b',
    items: {
      fantasia: [
        'Uma ampulheta quebrada', 'Uma espada enferrujada que sussurra', 'Um mapa rasgado', 'Uma coroa de espinhos', 'Um espelho que não reflete quem está de frente',
        'Uma chave que muda de forma', 'Um anel quente ao toque', 'Um cálice com sangue fresco', 'Um grimório trancado com correntes', 'Uma pedra brilhante pulsante',
        'Uma bússola que aponta para o que você mais deseja', 'Um manto de invisibilidade rasgado', 'Um chifre de dragão', 'Um ídolo de um deus esquecido', 'Uma pena de fênix',
        'Um frasco com líquido prateado', 'Uma flauta de osso', 'Uma moeda com o mesmo rosto dos dois lados', 'Um amuleto protetor rachado', 'Uma rosa de vidro que nunca quebra'
      ],
      scifi: [
        'Um disco de dados corrompido', 'Um implante cibernético ensanguentado', 'Um blaster descarregado', 'Um núcleo de energia instável', 'Uma IA em um chip de memória',
        'Uma caixa-preta de uma nave', 'Um comunicador interceptando um sinal estranho', 'Uma cápsula criogênica portátil', 'Um traje espacial danificado', 'Uma amostra de DNA alienígena',
        'Um passe de acesso nível ômega', 'Uma bomba-relógio pausada', 'Uma chave mestra holográfica', 'Um drone de reparo hackeado', 'Um inibidor neural',
        'Um projetor de camuflagem falhando', 'Um medkit com substâncias desconhecidas', 'Uma relíquia alienígena brilhante', 'Um cubo de antimatéria', 'Um passaporte falsificado perfeito'
      ],
      misterio: [
        'Um diário trancado', 'Uma fotografia borrada', 'Uma fita cassete antiga', 'Um revólver com uma bala a menos', 'Um medalhão com cabelo dentro',
        'Uma carta com código cifrado', 'Uma caixa de música tocando sozinha', 'Uma faca de prata', 'Um frasco de veneno vazio', 'Uma máscara de porcelana quebrada',
        'Um anel de sinete com brasão desconhecido', 'Uma fita VHS amaldiçoada', 'Um recorte de jornal de amanhã', 'Um passaporte rasgado', 'Um relógio de bolso parado',
        'Um testamento alterado', 'Uma chave coberta de barro', 'Um par de luvas manchadas', 'Um bilhete ameaçador', 'Uma estátua de gesso oca'
      ],
      generico: [
        'Uma chave enferrujada', 'Uma caixa misteriosa', 'Um livro antigo', 'Uma moeda estrangeira', 'Um mapa incompleto',
        'Um anel de prata', 'Um colar quebrado', 'Uma faca de caça', 'Uma carta não enviada', 'Uma garrafa selada',
        'Uma mochila pesada', 'Uma lanterna sem bateria', 'Um diário com páginas rasgadas', 'Um símbolo esculpido em madeira', 'Um pedaço de tecido rasgado',
        'Um relógio estranho', 'Um amuleto de pedra', 'Uma caixa de fósforos úmida', 'Uma corda desgastada', 'Um objeto não identificado'
      ]
    }
  },
  {
    id: 'criatura',
    name: 'Criatura',
    icon: <Skull size={16} />,
    color: '#ef4444',
    items: {
      fantasia: [
        'Um anfíbio com asas de águia', 'Um golem de carne', 'Um dragão de cristal cego', 'Um lobo com olhos de fogo', 'Um elemental de sombra',
        'Um gigante de pedra adormecido', 'Uma hidra com cabeças que falam', 'Um unicórnio corrompido', 'Um enxame de insetos de ouro', 'Um espírito vingativo da floresta',
        'Um leviatã dos céus', 'Um vampiro exilado', 'Um doppleganger imperfeito', 'Uma aranha do tamanho de uma casa', 'Um esqueleto coberto de runas',
        'Um elemental de tempestade', 'Uma fênix negra', 'Um demônio barganhador', 'Um cão infernal de três patas', 'Uma quimera feita de partes humanas'
      ],
      scifi: [
        'Um enxame de nanobots devoradores', 'Uma fera alienígena parasita', 'Um andróide assassino defeituoso', 'Um clone que sofreu mutação', 'Uma criatura baseada em silício',
        'Um predador invisível', 'Um ciborgue ensandecido', 'Uma mente colmeia fúngica', 'Um holograma senciente hostil', 'Uma fera de energia plasmática',
        'Um mutante do submundo', 'Uma IA enlouquecida', 'Um simbionte alienígena', 'Uma aranha mecânica gigante', 'Um construto de segurança implacável',
        'Uma besta criada em laboratório', 'Uma raça insectóide', 'Um leviatã de vácuo espacial', 'Um parasita mental', 'Um caçador de recompensas alienígena reptiliano'
      ],
      misterio: [
        'Um assassino em série mascarado', 'Um culto de fanáticos', 'Uma sombra que se move sozinha', 'Um cão selvagem gigante', 'Um fantasma sem rosto',
        'Uma mulher de branco na estrada', 'Uma criatura do pântano', 'Um vizinho de aparência monstruosa', 'Uma figura de sobretudo', 'Um boneco ventríloquo amaldiçoado',
        'Uma matilha de cães selvagens', 'Um perseguidor silencioso', 'Um imitador de vozes', 'Um demônio interior', 'Um ser rastejante no teto',
        'Um coveiro de olhos vidrados', 'Um gêmeo maligno', 'Uma criatura feita de lixo', 'Um espantalho que anda', 'Uma sombra com garras'
      ],
      generico: [
        'Um animal selvagem feroz', 'Uma criatura deformada', 'Um grupo de bandidos', 'Um guardião solitário', 'Um ser gigantesco',
        'Um monstro espreitando', 'Uma figura oculta', 'Um perseguidor implacável', 'Um enxame agressivo', 'Um ser mutante',
        'Uma anomalia biológica', 'Um caçador selvagem', 'Uma besta incontrolável', 'Um ser rastejante', 'Uma entidade desconhecida',
        'Um grupo agressivo', 'Um predador alfa', 'Uma aberração da natureza', 'Um monstro mitológico', 'Um ser de energia'
      ]
    }
  },
  {
    id: 'personagem',
    name: 'Personagem',
    icon: <Theater size={16} />,
    color: '#8b5cf6',
    items: {
      fantasia: [
        'Um paladino caído buscando redenção', 'Uma bruxa exilada da floresta', 'Um ladino que perdeu a sorte', 'Um rei mendigo', 'Uma criança vidente',
        'Um guerreiro com memória apagada', 'Um bardo que só canta tragédias', 'Um mago arrogante, mas covarde', 'Um ranger que caça sua própria espécie', 'Um mercador que vende segredos',
        'Um clérigo que duvida de sua fé', 'Um príncipe metamorfo', 'Um ferreiro que forja almas', 'Um cavaleiro sem rosto', 'Uma princesa guerreira',
        'Um caçador de bruxas amaldiçoado', 'Um ladrão com coração de ouro', 'Um druida corrompido', 'Um bobo da corte assassino', 'Um necromante bondoso'
      ],
      scifi: [
        'Um contrabandista com uma recompensa na cabeça', 'Uma inteligência artificial melancólica', 'Um super soldado desertor', 'Um cientista louco', 'Uma capitã de nave veterana',
        'Um hacker adolescente prodígio', 'Um diplomata alienígena exilado', 'Um médico cibernético viciado', 'Um caçador de andróides rebeldes', 'Um explorador espacial perdido',
        'Um minerador com poeira estelar nos pulmões', 'Um detetive corporativo corrupto', 'Um clone que descobriu sua origem', 'Um monge guerreiro psíquico', 'Uma rainha pirata do cinturão',
        'Um mercenário de poucas palavras', 'Um inspetor de segurança paranoico', 'Um engenheiro que fala com máquinas', 'Um prisioneiro político fugitivo', 'Um astro de holovisão decadente'
      ],
      misterio: [
        'Um detetive particular cínico', 'Uma viúva rica com segredos', 'Um jornalista investigativo obsessivo', 'Um inspetor de polícia corrupto', 'Um mordomo de passado sombrio',
        'Uma testemunha ocular amnésica', 'Um suspeito óbvio demais', 'Um médico forense cético', 'Um psiquiatra manipulador', 'Um herdeiro deserdado em busca de vingança',
        'Uma cantora de jazz ligada à máfia', 'Um informante assustado', 'Um padre com uma crise de fé', 'Uma criança que vê o futuro', 'Um ex-presidiário buscando paz',
        'Um advogado sem escrúpulos', 'Uma governanta rigorosa', 'Um motorista leal até demais', 'Um investigador de seguros intrometido', 'Um zelador que sabe de tudo'
      ],
      generico: [
        'Um andarilho misterioso', 'Um mentor idoso', 'Um jovem destemido', 'Um traidor disfarçado', 'Um oficial autoritário',
        'Um refugiado desesperado', 'Um comerciante ganancioso', 'Um curandeiro sábio', 'Um assassino de aluguel', 'Um líder rebelde',
        'Uma testemunha assustada', 'Um colecionador excêntrico', 'Um veterano amargurado', 'Um inventor brilhante', 'Um mensageiro apressado',
        'Um explorador audaz', 'Um guarda corrupto', 'Um fora da lei com um código', 'Uma figura mascarada', 'Um passageiro silencioso'
      ]
    }
  },
  {
    id: 'conflito',
    name: 'Conflito',
    icon: <Zap size={16} />,
    color: '#ec4899',
    items: {
      fantasia: [
        'Uma praga mágica devastadora', 'A invasão de um exército de mortos', 'A quebra de um juramento ancestral', 'Um feitiço de controle mental', 'A libertação de um mal antigo',
        'Uma guerra civil entre guildas', 'Um sacrifício inaceitável exigido pelos deuses', 'A perseguição a todos os usuários de magia', 'Um portal se abrindo no centro da capital', 'O roubo de uma relíquia sagrada',
        'O rei enlouqueceu', 'O fim da magia no mundo', 'A traição do conselho dos sábios', 'O nascimento do filho da profecia sombria', 'A ressurreição do dragão rei',
        'Uma seita de sangue', 'A invasão do mundo das fadas', 'Um inverno que não tem fim', 'Uma rebelião de escravos', 'A maldição da cidade'
      ],
      scifi: [
        'A rebelião das IAs', 'Um vírus que afeta cibernética', 'Uma invasão alienígena em andamento', 'A explosão de uma estrela próxima', 'O colapso da rede de suporte de vida',
        'Uma guerra corporativa sangrenta', 'A falha nos motores de dobra', 'O descobrimento de uma arma biológica antiga', 'Um motim em uma prisão de segurança máxima', 'A perda de comunicação com a Terra',
        'A infiltração de metamorfos alienígenas', 'A disputa por recursos escassos', 'Um ataque pirata a um cargueiro', 'O despertar de um leviatã espacial', 'Uma tempestade de radiação letal',
        'A queda do governo intergaláctico', 'Um salto hiperespacial acidental', 'A detecção de um sinal de socorro misterioso', 'A propagação de um nano-vírus zumbi', 'Uma anomalia temporal'
      ],
      misterio: [
        'Um assassinato em uma sala trancada', 'O desaparecimento do testamento principal', 'Uma carta ameaçadora do "Assassino Z"', 'A descoberta de uma vida dupla', 'O sequestro do herdeiro',
        'Um álibi falso sendo exposto', 'A sabotagem dos freios do carro', 'O envenenamento lento do patriarca', 'Um pacto de silêncio quebrado', 'Uma conspiração encobrindo um crime',
        'A aparição de um fantasma ou farsa', 'O roubo das joias da família', 'Um caso de identidade trocada', 'O retorno de alguém dado como morto', 'Uma fraude milionária no banco',
        'A revelação de um filho ilegítimo', 'O encontro do diário da vítima', 'Um crime ritualístico', 'Uma testemunha crucial foi assassinada', 'A polícia prendendo um inocente'
      ],
      generico: [
        'Um ataque surpresa', 'A traição de um aliado', 'A perda de suprimentos críticos', 'Uma armadilha mortal', 'Um impasse sem solução óbvia',
        'A chegada de forças inimigas', 'O descumprimento de um acordo', 'Um desastre natural iminente', 'A falha de um equipamento vital', 'O início de uma tempestade severa',
        'A descoberta de um espião', 'Um erro de cálculo fatal', 'A perda do mapa', 'A contaminação da água', 'A destruição da única saída',
        'O bloqueio do caminho', 'Um desentendimento no grupo', 'A pressão do tempo esgotando', 'O roubo da única arma defensiva', 'A chegada de uma mensagem sinistra'
      ]
    }
  },
  {
    id: 'reviravolta',
    name: 'Reviravolta',
    icon: <RotateCcw size={16} />,
    color: '#06b6d4',
    items: {
      fantasia: [
        'O vilão era na verdade o herói da história', 'A relíquia é uma falsificação', 'O mentor traiu o grupo desde o início', 'A magia deles parou de funcionar', 'Eles foram teletransportados acidentalmente',
        'A princesa não queria ser resgatada', 'O dragão é a mãe do herói', 'O tesouro é amaldiçoado', 'A guerra já havia acabado', 'Os mortos-vivos estão fugindo de algo pior',
        'A profecia foi mal traduzida', 'O paladino é secretamente um vampiro', 'O rei é um ilusão', 'A masmorra está viva e faminta', 'Eles viajaram para o passado',
        'Os elfos são os verdadeiros invasores', 'O feitiço de cura os adoece lentamente', 'A montanha é na verdade um gigante dormindo', 'O deus que eles adoram está morto', 'A escuridão os salva do perigo'
      ],
      scifi: [
        'A Terra nunca existiu', 'O andróide pensa ser humano', 'A nave esteve parada esse tempo todo', 'Os alienígenas são humanos do futuro', 'Tudo é uma simulação de realidade virtual',
        'A praga biológica os tornou imortais', 'O comandante é um clone defeituoso', 'O planeta alvo já foi destruído', 'A IA não quer matá-los, quer amá-los', 'O combustível da nave são as memórias',
        'O inimigo é o irmão gêmeo', 'Eles estão em um loop temporal de 20 minutos', 'A anomalia estelar engoliu todo o setor', 'Os invasores só querem pedir ajuda', 'O artefato antigo ativa a nave',
        'O governo os mandou para morrer', 'A oxigenação era controlada por um esporo', 'A arma super-poderosa é na verdade um escudo', 'Eles são os últimos de sua espécie', 'O sinal de socorro vinha deles mesmos do futuro'
      ],
      misterio: [
        'O detetive é o assassino com dupla personalidade', 'A vítima forjou a própria morte', 'O marido não é quem diz ser', 'O mordomo é um agente secreto', 'O testamento verdadeiro estava sob o tapete',
        'O veneno foi colocado pela própria vítima', 'A foto revelada mostra algo impossível', 'Todos na mansão estão envolvidos', 'O investigador foi pago para falhar', 'O álibi perfeito é de um irmão gêmeo secreto',
        'O fantasma não era assombração, mas gás vazando', 'O bilhete foi escrito antes do crime', 'O corpo encontrado era de outra pessoa', 'O culpado confessa, mas mente', 'O cego na verdade viu tudo',
        'A criança foi a autora intelectual', 'A porta estava trancada por fora com gelo', 'O seguro da vítima iria para o investigador', 'A arma do crime foi engolida pelo cão', 'A confissão foi feita sob hipnose'
      ],
      generico: [
        'O guia os levou direto para uma armadilha', 'O objeto de desejo era inútil', 'O plano falhou por causa do aliado', 'O alvo fugiu antes deles chegarem', 'Eles foram ajudados pelo inimigo',
        'O clima mudou abruptamente', 'A saída estava onde eles entraram', 'O vilão decidiu se render', 'Eles descobriram que são os vilões', 'O mapa estava de cabeça para baixo',
        'A resposta estava com a pessoa mais fraca', 'Eles perderam o bem mais valioso no caminho', 'A maldição/doença teve o efeito oposto', 'O prisioneiro recusou a liberdade', 'A mensagem final era uma piada de mau gosto',
        'O tesouro era apenas conhecimento', 'Eles mataram o guardião que deveria protegê-los', 'A ponte desabou com os inimigos nela', 'O resgate foi pago, mas com dinheiro falso', 'O verdadeiro monstro estava na própria equipe'
      ]
    }
  },
  {
    id: 'tema',
    name: 'Tema Central',
    icon: <Anchor size={16} />,
    color: '#10b981',
    items: {
      fantasia: [
        'Sacrifício pelo bem maior', 'Redenção do passado sombrio', 'A corrupção do poder absoluto', 'O amor transcendendo o tempo', 'A revolta contra o destino',
        'O equilíbrio entre natureza e magia', 'A busca pelo poder proibido', 'O peso da liderança e da coroa', 'A loucura trazida pelo conhecimento', 'A luz na escuridão mais profunda',
        'A traição irreparável', 'O retorno do exilado', 'A esperança após o apocalipse', 'O custo do heroísmo', 'A natureza predatória da guerra',
        'A união de raças inimigas', 'A tragédia de viver para sempre', 'A força da linhagem e do sangue', 'O mistério além do véu da morte', 'A liberdade contra a profecia'
      ],
      scifi: [
        'A exploração dos limites do universo', 'A fragilidade da sanidade humana no espaço', 'O conflito entre criador e máquina', 'A perda da humanidade na cibernética', 'A opressão corporativa',
        'A sobrevivência contra todas as probabilidades', 'O contato incompreensível', 'O isolamento e solidão do vazio', 'A esperança da nova fronteira', 'A evolução acelerada',
        'A utopia distópica', 'O preço da colonização', 'O apagamento da memória e identidade', 'O terror cósmico', 'A transcendência pós-humana',
        'A arrogância científica e suas consequências', 'A interconectividade da rede', 'A falência dos ideais terráqueos', 'O retorno à Terra devastada', 'A resistência contra o império galáctico'
      ],
      misterio: [
        'A ilusão da inocência familiar', 'O peso da culpa inconfessável', 'A ganância desenfreada', 'O passado voltando para assombrar', 'A fragilidade da percepção da realidade',
        'O lado negro da classe alta', 'A loucura mascarada de genialidade', 'O amor obsessivo e fatal', 'O preço da vingança', 'A injustiça da justiça',
        'Os segredos que matam', 'A mentira repetida que vira verdade', 'O isolamento e claustrofobia', 'A paranóia de ser seguido', 'A corrupção da lei e da ordem',
        'O fanatismo cego', 'A destruição da reputação perfeita', 'O medo do desconhecido na própria casa', 'A inevitabilidade do carma', 'A linha tênue entre o detetive e o criminoso'
      ],
      generico: [
        'A superação através da dor', 'O sacrifício supremo', 'O valor da amizade e lealdade', 'A coragem de lutar sozinho', 'O poder da verdade sobre a mentira',
        'A adaptação a um novo mundo', 'O medo como força motriz', 'A esperança de um novo amanhã', 'O arrependimento e a reparação', 'A descoberta da força interior',
        'O confronto com os próprios demônios', 'A importância de lembrar', 'O ciclo da vida e da morte', 'O choque entre gerações', 'A beleza nas ruínas',
        'O custo da ambição', 'A fragilidade da paz', 'A resiliência do espírito humano', 'O triunfo da união', 'O fim de uma era'
      ]
    }
  }
];

export function StoryDiceWidget({ onClose, embedded }: { onClose?: () => void; embedded?: boolean }) {
  const [genre, setGenre] = useState<Genre>('fantasia');
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.id)));
  const [lastRoll, setLastRoll] = useState<Record<string, string> | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [history, setHistory] = useState<Record<string, string>[]>([]);
  const [suggestion, setSuggestion] = useState<string>('');

  // Load from local storage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('story_dice_history');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      const savedGenre = localStorage.getItem('story_dice_genre');
      if (savedGenre) setGenre(savedGenre as Genre);
    } catch (e) {
      console.warn('Failed to load story dice data', e);
    }
  }, []);

  const toggleCategory = (id: string) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRoll = () => {
    if (activeCategories.size === 0) return;
    setIsRolling(true);
    setSuggestion('');
    
    // Simulate dice roll animation
    setTimeout(() => {
      const newRoll: Record<string, string> = {};
      CATEGORIES.forEach(cat => {
        if (activeCategories.has(cat.id)) {
          const items = cat.items[genre];
          const randomItem = items[Math.floor(Math.random() * items.length)];
          newRoll[cat.id] = randomItem;
        }
      });
      
      setLastRoll(newRoll);
      generateSuggestion(newRoll);
      setIsRolling(false);
    }, 600);
  };

  const generateSuggestion = (roll: Record<string, string>) => {
    const templates = [
      `Em {cenario}, {personagem} encontrou {objeto}. Tudo mudou quando ocorreu {conflito}, levando a uma situação onde {reviravolta}. O tema central dessa jornada foi {tema}, enfrentando {criatura}.`,
      `A história de {personagem}, lidando com {conflito} usando {objeto}. Tudo acontece em {cenario}, onde {criatura} aguarda. O inesperado? {reviravolta}. Uma lição de {tema}.`,
      `Um mistério começa em {cenario}: {conflito} assombra a região. {personagem} deve usar {objeto} para derrotar {criatura}. Mas cuidado: {reviravolta}. A essência da aventura é {tema}.`
    ];

    let tmpl = templates[Math.floor(Math.random() * templates.length)];
    
    // Replace tokens safely
    CATEGORIES.forEach(cat => {
      tmpl = tmpl.replace(new RegExp(`{${cat.id}}`, 'g'), roll[cat.id]?.toLowerCase() || 'algo desconhecido');
    });

    setSuggestion(tmpl);
  };

  const saveToHistory = () => {
    if (!lastRoll) return;
    setHistory(prev => {
      const next = [lastRoll, ...prev].slice(0, 20); // Keep last 20
      localStorage.setItem('story_dice_history', JSON.stringify(next));
      return next;
    });
  };

  const sendToChat = () => {
    if (!lastRoll) return;
    
    let html = `
      <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; border: 1px solid var(--glass-border);">
        <div style="color: var(--accent-primary); display:flex; align-items:center; gap: 6px; font-weight: bold; margin-bottom: 8px; font-size: 14px;">
          <Sparkles size={16} /> <b>Story Dice Rolados</b> (${genre.toUpperCase()})
        </div>
        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px;">
    `;
    
    CATEGORIES.forEach(cat => {
      if (lastRoll[cat.id]) {
        html += `
          <li style="font-size: 13px; color: var(--text-primary);">
            <strong style="color: ${cat.color};">${cat.name}:</strong> ${lastRoll[cat.id]}
          </li>
        `;
      }
    });

    html += `</ul></div>`;
    
    if (suggestion) {
       html += `
         <div style="margin-top: 8px; padding: 8px; font-style: italic; font-size: 12px; color: var(--text-secondary); border-left: 2px solid var(--accent-primary);">
           " ${suggestion} "
         </div>
       `;
    }

    pushChatMessage(html);
  };

  const handleGenreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as Genre;
    setGenre(val);
    localStorage.setItem('story_dice_genre', val);
  };

  const bodyContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* Header / Configurações */}
        <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Gênero Narrativo</span>
            <select 
              value={genre} 
              onChange={handleGenreChange}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid var(--glass-border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                padding: '4px 8px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="fantasia">🗡️ Fantasia</option>
              <option value="scifi">🚀 Ficção Científica</option>
              <option value="misterio">🔍 Mistério/Terror</option>
              <option value="generico">🎲 Genérico</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {CATEGORIES.map(cat => {
              const isActive = activeCategories.has(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  style={{
                    background: isActive ? `${cat.color}22` : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${isActive ? cat.color : 'rgba(255,255,255,0.1)'}`,
                    color: isActive ? cat.color : 'var(--text-secondary)',
                    borderRadius: '20px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title={isActive ? `Remover ${cat.name}` : `Incluir ${cat.name}`}
                >
                  {cat.icon} {cat.name}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleRoll}
            disabled={activeCategories.size === 0 || isRolling}
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              padding: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: (activeCategories.size === 0 || isRolling) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: (activeCategories.size === 0 || isRolling) ? 0.7 : 1,
              transition: 'transform 0.1s'
            }}
            onMouseDown={e => { if(!isRolling) e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Dices size={18} className={isRolling ? 'animate-spin' : ''} />
            {isRolling ? 'Rolando Dados...' : 'Rolar Dados de História'}
          </button>
        </div>

        {/* Resultados */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {!lastRoll && !isRolling && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Dices size={40} opacity={0.3} />
              <p>Selecione as categorias e role os dados<br/>para gerar ideias e histórias.</p>
            </div>
          )}

          {lastRoll && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.4s ease-out' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                {CATEGORIES.filter(cat => lastRoll[cat.id]).map(cat => (
                  <div key={cat.id} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--glass-border)',
                    borderLeft: `3px solid ${cat.color}`,
                    borderRadius: '6px',
                    padding: '8px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ fontSize: '11px', color: cat.color, fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {cat.icon} {cat.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.3' }}>
                      {lastRoll[cat.id]}
                    </div>
                  </div>
                ))}
              </div>

              {suggestion && (
                <div style={{
                  background: 'rgba(236, 72, 153, 0.1)',
                  border: '1px solid rgba(236, 72, 153, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginTop: '8px'
                }}>
                  <div style={{ fontSize: '11px', color: '#ec4899', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Lightbulb size={14} /> Sugestão de Narrativa
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: '1.4' }}>
                    "{suggestion}"
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button 
                  onClick={sendToChat}
                  style={{ flex: 1, background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
                >
                  <Sparkles size={16} /> Enviar para o Chat
                </button>
                <button 
                  onClick={saveToHistory}
                  style={{ flex: 1, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
                >
                  <Save size={16} /> Salvar Histórico
                </button>
              </div>

            </div>
          )}

          {history.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                <BookOpen size={16} color="var(--text-secondary)" />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Histórico Salvo</span>
                <button 
                  onClick={() => { setHistory([]); localStorage.removeItem('story_dice_history'); }}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Limpar
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {history.map((hRoll, i) => (
                  <div key={i} style={{
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    padding: '8px',
                    fontSize: '12px'
                  }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {CATEGORIES.filter(c => hRoll[c.id]).map(c => (
                        <li key={c.id} style={{ display: 'flex', gap: '6px' }}>
                          <span style={{ color: c.color, fontWeight: 600, width: '90px', flexShrink: 0 }}>{c.name}:</span>
                          <span style={{ color: 'var(--text-primary)' }}>{hRoll[c.id]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
  );

  if (embedded) {
    return bodyContent;
  }

  return (
    <DraggableWindow 
      id="story-dice"
      title="Story Dice (Dados de Histórias)" 
      onClose={onClose} 
      width={450}
      height={650}
      initialX={window.innerWidth / 2 - 225} 
      initialY={100}
      dragAnywhere={false}
    >
      {bodyContent}
    </DraggableWindow>
  );
}
