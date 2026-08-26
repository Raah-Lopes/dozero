import { FamilyTree, Person } from "./tree";

/**
 * Saga de exemplo: a Casa Valdris do Reino das Brumas.
 * Construída inteiramente pela API orientada a objetos da FamilyTree.
 */
export function buildSample(): FamilyTree {
  const t0 = Date.now() - 100000;
  let i = 0;
  const stamp = () => t0 + ++i * 1000;

  const aldric = new Person({
    id: "aldric", name: "Aldric Valdris", epithet: "o Rei das Cinzas",
    affiliation: "Casa Valdris", era: "n. 142 · m. 219 da Terceira Era",
    status: "falecido", birthOrder: 1, createdAt: stamp(),
    notes: "Unificou as Sete Marcas após a Guerra das Cinzas. Dizem que sua coroa guarda um fragmento do Primeiro Fogo.",
  });
  const mirelle = new Person({
    id: "mirelle", name: "Mirelle Auberon", epithet: "a Rainha Diplomata",
    affiliation: "Casa Auberon", era: "n. 151 da Terceira Era",
    status: "vivo", createdAt: stamp(),
    notes: "Manteve o reino unido enquanto Aldric guerreava. Patrona do Círculo de Véu-Cinza.",
  });
  const kaelen = new Person({
    id: "kaelen", name: "Kaelen Valdris", epithet: "Príncipe Herdeiro",
    affiliation: "Casa Valdris", era: "n. 178 da Terceira Era",
    status: "vivo", parentIds: ["aldric", "mirelle"], birthOrder: 1, createdAt: stamp(),
    notes: "Herdou a espada do pai e a paciência da mãe. Assinou o Pacto de Espinhal.",
  });
  const seraphina = new Person({
    id: "seraphina", name: "Seraphina Valdris", epithet: "General da Alvorada",
    affiliation: "Casa Valdris", era: "n. 181 da Terceira Era",
    status: "vivo", parentIds: ["aldric", "mirelle"], birthOrder: 2, createdAt: stamp(),
    notes: "Comanda a vanguarda nas Marcas do Norte. Nunca perdeu uma batalha em campo aberto.",
  });
  const dorian = new Person({
    id: "dorian", name: "Dorian Valdris", epithet: "o Príncipe Pálido",
    affiliation: "Casa Valdris", era: "n. 184 · m. 214 da Terceira Era",
    status: "falecido", parentIds: ["aldric", "mirelle"], birthOrder: 3, createdAt: stamp(),
    notes: "Deserdado após o Torneio de Véu-Cinza. Sua morte no desfiladeiro jamais foi explicada.",
  });
  const lyra = new Person({
    id: "lyra", name: "Lyra Thorn", epithet: "Senhora de Espinhal",
    affiliation: "Casa Thorn", era: "n. 180 da Terceira Era",
    status: "vivo", partnerIds: ["kaelen"], createdAt: stamp(),
    notes: "Trouxe os bosques de Espinhal para a aliança. Dizem que conversa com os corvos — e eles respondem.",
  });
  const bram = new Person({
    id: "bram", name: "Bram Ferrovelho", epithet: "Martelo da Legião",
    affiliation: "Legião de Ferro", era: "n. 176 da Terceira Era",
    status: "vivo", partnerIds: ["seraphina"], createdAt: stamp(),
    notes: "Ferreiro antes de soldado. Forjou a própria armadura com metal de um meteoro caído em Gelford.",
  });
  const rowan = new Person({
    id: "rowan", name: "Rowan Valdris", epithet: "Escudeiro do Alvorecer",
    affiliation: "Casa Valdris", era: "n. 205 da Terceira Era",
    status: "vivo", parentIds: ["kaelen", "lyra"], birthOrder: 1, createdAt: stamp(),
    notes: "Treina com a Legião de Ferro contra a vontade do pai. Sonha com um dragão que nunca viu.",
  });
  const elara = new Person({
    id: "elara", name: "Elara Valdris", epithet: "Noviça do Círculo",
    affiliation: "Casa Valdris", era: "n. 208 da Terceira Era",
    status: "vivo", parentIds: ["kaelen", "lyra"], birthOrder: 2, createdAt: stamp(),
    notes: "Afinidade rara com runas de vínculo. A avó Mirelle vê nela a próxima Grã-Sábia.",
  });
  const finn = new Person({
    id: "finn", name: "Finn Ferrovelho", epithet: "o Estandarte Jovem",
    affiliation: "Legião de Ferro", era: "n. 206 da Terceira Era",
    status: "vivo", parentIds: ["seraphina", "bram"], birthOrder: 1, createdAt: stamp(),
    notes: "Carrega o estandarte da mãe desde os doze anos. Coleciona adagas de oficiais derrotados.",
  });
  const vex = new Person({
    id: "vex", name: "Vex", epithet: "o Bastardo de Véu-Cinza",
    affiliation: "Sem Estandarte", era: "n. ? da Terceira Era",
    status: "desconhecido", parentIds: ["dorian"], createdAt: stamp(),
    notes: "Apareceu após a morte de Dorian portando o anel-sinete do príncipe. Reivindica o nome Valdris.",
  });

  return FamilyTree.empty()
    .add(aldric).add(mirelle).add(kaelen).add(seraphina).add(dorian)
    .add(lyra).add(bram).add(rowan).add(elara).add(finn).add(vex)
    .linkPartner("aldric", "mirelle")
    .linkPartner("kaelen", "lyra")
    .linkPartner("seraphina", "bram")
    .linkParent("kaelen", "aldric")
    .linkParent("kaelen", "mirelle")
    .linkParent("seraphina", "aldric")
    .linkParent("seraphina", "mirelle")
    .linkParent("dorian", "aldric")
    .linkParent("dorian", "mirelle")
    .linkParent("rowan", "kaelen")
    .linkParent("rowan", "lyra")
    .linkParent("elara", "kaelen")
    .linkParent("elara", "lyra")
    .linkParent("finn", "seraphina")
    .linkParent("finn", "bram")
    .linkParent("vex", "dorian");
}
