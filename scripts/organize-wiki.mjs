import fs from 'fs';
import path from 'path';

const wikiRoot = 'D:/DOZERO/wikidozero';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function safeMove(srcRel, destRel) {
  const src = path.join(wikiRoot, srcRel);
  const dest = path.join(wikiRoot, destRel);
  if (!fs.existsSync(src)) {
    console.warn(`[Skip] Arquivo fonte não existe: ${srcRel}`);
    return false;
  }
  ensureDir(path.dirname(dest));
  fs.renameSync(src, dest);
  console.log(`[Moved] ${srcRel} -> ${destRel}`);
  return true;
}

console.log('--- 1. CRIANDO PASTAS DE DESTINO ---');
const disposableRoot = '[99] 🗑️ Descartaveis & Stubs';
ensureDir(path.join(wikiRoot, disposableRoot));
ensureDir(path.join(wikiRoot, disposableRoot, 'Exemplos_Stubs'));
ensureDir(path.join(wikiRoot, disposableRoot, 'Bestiario_Vazio'));
ensureDir(path.join(wikiRoot, disposableRoot, 'Audios_Vazios'));
ensureDir(path.join(wikiRoot, disposableRoot, 'Missoes_Temporarias'));

const charRoot = '[1] 🏕️ Campanha Principal/Personagens';
ensureDir(path.join(wikiRoot, charRoot, 'Jogadores'));
ensureDir(path.join(wikiRoot, charRoot, 'Monstros'));
ensureDir(path.join(wikiRoot, charRoot, 'NPCs'));
ensureDir(path.join(wikiRoot, charRoot, 'Modelos'));

console.log('\n--- 2. MOVENDO ARQUIVOS DESCARTÁVEIS / EXEMPLOS / VAZIOS ---');

// Exemplos vazios
const exemploFiles = [
  '[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Diario_de_Sessao/Resumos/Resumos_Exemplo.md',
  '[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Fichas/Jogadores/Jogadores_Exemplo.md',
  '[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Fichas/Monstros/Monstros_Exemplo.md',
  '[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Fichas/NPCs/NPCs_Exemplo.md',
  '[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Itens/Armas/Armas_Exemplo.md',
  '[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Itens/Artefatos_Magicos/Artefatos_Magicos_Exemplo.md',
  '[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Lore/Historia_do_Mundo/Historia_do_Mundo_Exemplo.md',
  '[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Lore/Mitos_e_Lendas/Mitos_e_Lendas_Exemplo.md',
  '[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Lugares/Faccoes/Faccoes_Exemplo.md',
  '[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Lugares/Localizacoes/Localizacoes_Exemplo.md',
  '[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Lugares/Lojas/Lojas_Exemplo.md',
  '[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Regras/Homebrew/Homebrew_Exemplo.md',
  '[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/Diario_de_Sessao/Anotacoes_do_Mestre/Anotacoes_do_Mestre_Exemplo.md',
];

for (const ef of exemploFiles) {
  safeMove(ef, `${disposableRoot}/Exemplos_Stubs/${path.basename(ef)}`);
}

// Arquivos vazios de áudio e testes
safeMove('[0] 📦 Arquivo (Quarentena)/Biblioteca/Audios/Vrias.md', `${disposableRoot}/Audios_Vazios/Vrias.md`);
safeMove('[0] 📦 Arquivo (Quarentena)/Biblioteca/Audios/teste.md', `${disposableRoot}/Audios_Vazios/teste.md`);
safeMove('[1] 🏕️ Campanha Principal/Teste Ficha.md', `${disposableRoot}/Teste Ficha.md`);

// Bestiário vazio (apenas cabeçalhos)
const emptyBestiary = [
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Aberrações.md',
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Anjos.md',
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Anões.md',
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Bestas e Feras.md',
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Celestiais.md',
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Centauros.md',
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Deidades e Entidades Ascendidas.md',
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Demônios e Diabos.md',
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Djinni.md',
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Dragonborn.md',
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Dragões.md',
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Drow.md',
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Elementais.md',
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Elfos e Meio-Elfos.md',
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Fadas.md',
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Gigantes.md',
  '[1] 🏕️ Campanha Principal/Regras/Bestiario/Gith.md',
];

for (const eb of emptyBestiary) {
  safeMove(eb, `${disposableRoot}/Bestiario_Vazio/${path.basename(eb)}`);
}

// Missões com timestamp vazias
const missionStubs = [
  '[0] 📦 Arquivo (Quarentena)/Campanhas/Nova-Campanha/Missoes/Nova-Missao-Principal_1782000750751.md',
  '[0] 📦 Arquivo (Quarentena)/Campanhas/Nova-Campanha/Missoes/Nova-Missao-Principal_1782000935566.md',
  '[0] 📦 Arquivo (Quarentena)/Campanhas/Nova-Campanha/Missoes/Nova-Missao-Principal_1782002508650.md',
  '[0] 📦 Arquivo (Quarentena)/Campanhas/Nova-Campanha/Missoes/Nova-Missao-Principal_1782007595193.md',
  '[0] 📦 Arquivo (Quarentena)/Campanhas/Nova-Campanha/Missoes/Nova-Missao-Secundaria_1782002517769.md',
  '[0] 📦 Arquivo (Quarentena)/Campanhas/Nova-Campanha/Missoes/Nova-Missao-Principal_1782520858191.md',
  'Campanhas/Nova-Campanha/Missoes/Nova-Missao-Principal_1784433022851.md'
];

for (const ms of missionStubs) {
  safeMove(ms, `${disposableRoot}/Missoes_Temporarias/${path.basename(ms)}`);
}

// Mover .git_disabled para quarentena/descartáveis
if (fs.existsSync(path.join(wikiRoot, '.git_disabled'))) {
  safeMove('.git_disabled', `${disposableRoot}/Git_Desativado`);
}

console.log('\n--- 3. ORGANIZANDO PERSONAGENS VÁLIDOS ---');

// Jogadores
const playerFiles = [
  '[1] 🏕️ Campanha Principal/Fichas/Jogadores/Drougtot_.md',
  '[1] 🏕️ Campanha Principal/Fichas/Jogadores/Goma.md',
  '[1] 🏕️ Campanha Principal/Fichas/Jogadores/Jacir Malemog.md',
  '[1] 🏕️ Campanha Principal/Fichas/Jogadores/Jubbaer.md',
  '[1] 🏕️ Campanha Principal/Fichas/Jogadores/Kael Ironfist.md',
  '[1] 🏕️ Campanha Principal/Fichas/Jogadores/Lyra Shadowveil.md',
  '[1] 🏕️ Campanha Principal/Fichas/Jogadores/Thalion Brightweave.md',
];

for (const pf of playerFiles) {
  safeMove(pf, `${charRoot}/Jogadores/${path.basename(pf)}`);
}

// Modelos
safeMove('[1] 🏕️ Campanha Principal/Fichas/Jogadores/_MODELO_JOGADOR.md', `${charRoot}/Modelos/_MODELO_JOGADOR.md`);
safeMove('[1] 🏕️ Campanha Principal/Fichas/Jogadores/_MODELO_INIMIGO.md', `${charRoot}/Modelos/_MODELO_INIMIGO.md`);

// Monstros
safeMove('[1] 🏕️ Campanha Principal/Fichas/Monstros/Gorath o Implacavel.md', `${charRoot}/Monstros/Gorath o Implacavel.md`);
safeMove('[1] 🏕️ Campanha Principal/Fichas/Monstros/Sentinela Omega 01.md', `${charRoot}/Monstros/Sentinela Omega 01.md`);

// NPCs
safeMove('[1] 🏕️ Campanha Principal/Fichas/NPCs/Mira Vendas-ao-Vento.md', `${charRoot}/NPCs/Mira Vendas-ao-Vento.md`);
safeMove('[0] 📦 Arquivo (Quarentena)/[1] 🏕️ Campanha Principal/NPCs/Norta.md', `${charRoot}/NPCs/Norta.md`);

console.log('\nOrganização de arquivos concluída com sucesso!');
