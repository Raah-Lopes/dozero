const fs = require('fs');
const path = 'D:/DOZERO/wikidozero/MegaNPCs.md';

let content = fs.readFileSync(path, 'utf8');

// The new tables for Phase 1
let newSection = `## Motivação Principal
dados: 1d20

| Dado | Resultado |
|---|---|
| 1-2 | Vingança por um erro do passado |
| 3-4 | Acumular riqueza a qualquer custo |
| 5-6 | Proteger um ente querido ou legado |
| 7-8 | Escapar de uma dívida ou ameaça iminente |
| 9-10 | Encontrar uma cura ou solução desesperada |
| 11-12 | Provar seu valor para uma facção ou família |
| 13-14 | Saciar uma curiosidade obsessiva |
| 15-16 | Espalhar caos ou destruir o sistema atual |
| 17-18 | Encontrar um amor perdido ou redenção |
| 19-20 | Seguir um juramento sagrado inquebrável |

## Segredo Sombrio
dados: 1d20

| Dado | Resultado |
|---|---|
| 1-2 | É um espião infiltrado para uma facção rival |
| 3-4 | Cometeu um assassinato que culparam outra pessoa |
| 5-6 | Está infectado/amaldiçoado com algo contagioso |
| 7-8 | Deve muito dinheiro a um sindicato criminoso local |
| 9-10 | A identidade atual é roubada de um falecido |
| 11-12 | Vende informações sigilosas por chantagem |
| 13-14 | Fez um pacto obscuro para obter sua posição atual |
| 15-16 | Está secretamente apaixonado(a) por um dos inimigos |
| 17-18 | Planeja trair seus aliados na primeira oportunidade |
| 19-20 | Guarda um artefato proibido e caçado pelas autoridades |
`;

if (!content.includes('## Motivação Principal')) {
  content += '\n\n' + newSection;
  fs.writeFileSync(path, content, 'utf8');
  console.log('Motivações e Segredos adicionados!');
} else {
  console.log('As tabelas já existem.');
}
