import { loadMarkdownFile, saveMarkdownContent } from '../../utils/githubApi';
import * as yaml from 'js-yaml';
import { state, updateTokenProps } from '../../store';
import { createWikiTokenData } from './wikiTokenAdapter';

/**
 * Sincroniza um atributo numérico (HP, PM, maxHp, maxMana) de um token com seu arquivo Markdown no Obsidian.
 * Preserva comentários e o resto do corpo do texto.
 */
export async function syncTokenFieldToWiki(wikiPath: string, field: string, value: any) {
  try {
    const rawMd = await loadMarkdownFile(wikiPath);
    if (!rawMd) return false;
    
    const parts = rawMd.split('---');
    if (parts.length >= 3) {
      const frontmatterStr = parts[1];
      const data = (yaml.load(frontmatterStr) as any) || {};
      
      if (field === 'hp') { data.HP = value; data.pv = value; }
      else if (field === 'maxHp') { data.HP_max = value; data.pv_max = value; }
      else if (field === 'mana') { data.PM = value; data.mana = value; }
      else if (field === 'maxMana') { data.PM_max = value; data.mana_max = value; }
      else if (field === 'titulo' || field === 'title' || field === 'nome' || field === 'name') {
        data.titulo = value;
        data.nome = value;
        data.title = value;
      }
      else if (field === 'imageUrl' || field === 'avatar' || field === 'imagem') {
        data.avatar = value;
        data.imagem = value;
        data.imageUrl = value;
      }
      else data[field] = value;
      
      const newFrontStr = yaml.dump(data, { indent: 2, lineWidth: -1 });
      const body = parts.slice(2).join('---');
      const newContent = `---\n${newFrontStr}---\n${body}`;
      
      await saveMarkdownContent(wikiPath, newContent);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Erro ao sincronizar atributo com Obsidian:", err);
    return false;
  }
}

export async function syncMultipleFieldsToWiki(wikiPath: string, updates: Record<string, any>) {
  try {
    const rawMd = await loadMarkdownFile(wikiPath);
    if (!rawMd) return false;
    
    const parts = rawMd.split('---');
    if (parts.length >= 3) {
      const frontmatterStr = parts[1];
      const data = (yaml.load(frontmatterStr) as any) || {};
      
      for (const [field, value] of Object.entries(updates)) {
        if (field === 'hp') { data.HP = value; data.pv = value; }
        else if (field === 'maxHp') { data.HP_max = value; data.pv_max = value; }
        else if (field === 'mana') { data.PM = value; data.mana = value; }
        else if (field === 'maxMana') { data.PM_max = value; data.mana_max = value; }
        else if (field === 'titulo' || field === 'title' || field === 'nome' || field === 'name') {
          data.titulo = value;
          data.nome = value;
          data.title = value;
        }
        else if (field === 'imageUrl' || field === 'avatar' || field === 'imagem') {
          data.avatar = value;
          data.imagem = value;
          data.imageUrl = value;
        }
        else data[field] = value;
      }
      
      const newFrontStr = yaml.dump(data, { indent: 2, lineWidth: -1 });
      const body = parts.slice(2).join('---');
      const newContent = `---\n${newFrontStr}---\n${body}`;
      
      await saveMarkdownContent(wikiPath, newContent);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Erro ao sincronizar atributos múltiplos com Obsidian:", err);
    return false;
  }
}

/**
 * Disparado quando um arquivo markdown é salvo/atualizado pela CharacterSheet.
 * Lê o novo YAML e varre todos os tokens no jogo que pertencem a esse arquivo,
 * atualizando HP, Mana e Ouro diretamente no estado em tempo real.
 */
export function syncFileToBoardTokens(wikiPath: string, yamlData: any) {
  if (!yamlData) return;
  const { x: _x, y: _y, ...tokenPropsToUpdate } = createWikiTokenData(yamlData, wikiPath) as Record<string, unknown>;
  const ouro = Number(yamlData.Ouro ?? yamlData.ouro ?? yamlData.po ?? yamlData.Ouro_recompensa);
  if (Number.isFinite(ouro)) {
    tokenPropsToUpdate.ouro = ouro;
    tokenPropsToUpdate.po = ouro;
  }

  // Atualizar todos os tokens em campo que apontam para este arquivo
  for (const [id, token] of Array.from(state.tokens.entries())) {
    const t = token as any;
    if (t.caminhoArquivo === wikiPath || t.wikiPath === wikiPath) {
      updateTokenProps(id, tokenPropsToUpdate);
    }
  }
}

