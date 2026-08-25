import type { WikiEntry } from '../services/wiki/WikiIndexer';

export type KinshipType = 'parent' | 'child' | 'spouse' | 'sibling' | 'ancestor' | 'descendant';

export interface RawConnection {
  sourcePath: string;
  sourceName: string;
  targetNameOrPath: string;
  relationType: string;
  description?: string;
}

export interface GenealogyMember {
  id: string; // normalizado (slug ou path)
  path?: string;
  name: string;
  avatar?: string | null;
  status?: string;
  entityType?: string;
  relationToFocus?: string; // ex: 'Pai', 'Filho(a)', 'Cônjuge', 'Irmão(ã)', 'Avô(ó)', 'Neto(a)'
  kinshipType?: KinshipType;
}

export interface GenealogyTreeData {
  focus: GenealogyMember;
  ancestors: GenealogyMember[]; // Pais / Avós
  spouses: GenealogyMember[];   // Cônjuges
  siblings: GenealogyMember[];  // Irmãos
  descendants: GenealogyMember[]; // Filhos / Netos
  totalRelatives: number;
}

/**
 * Normaliza o nome ou slug para busca sem distinção de acentos ou maiúsculas
 */
export function normalizeEntityKey(val: string): string {
  return String(val || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Identifica o tipo de parentesco a partir do texto da conexão
 */
export function classifyKinship(rawType: string): { type: KinshipType; label: string; inverse: KinshipType; inverseLabel: string } | null {
  const norm = rawType.toLowerCase().trim();

  // Pai / Mãe / Genitor
  if (/^(pai|m(a|ã)e|genitor(a)?|parent)(\s+de)?$/i.test(norm) || norm.includes('pai de') || norm.includes('mãe de')) {
    return { type: 'parent', label: 'Pai/Mãe de', inverse: 'child', inverseLabel: 'Filho(a) de' };
  }

  // Filho / Filha / Prole
  if (/^(filho|filha|filho\(a\)|prole|child)(\s+de)?$/i.test(norm) || norm.includes('filho de') || norm.includes('filha de') || norm.includes('filho(a) de')) {
    return { type: 'child', label: 'Filho(a) de', inverse: 'parent', inverseLabel: 'Pai/Mãe de' };
  }

  // Cônjuge / Casamento / Parceiro
  if (/^(casad(o|a)|espos(o|a)|marido|mulher|c(o|ô)njuge|parceir(o|a)|married|spouse)(\s+(com|de))?$/i.test(norm) || norm.includes('casado com') || norm.includes('esposa de') || norm.includes('marido de')) {
    return { type: 'spouse', label: 'Casado(a) com', inverse: 'spouse', inverseLabel: 'Casado(a) com' };
  }

  // Irmão / Irmã
  if (/^(irm(a|ã)o|irm(a|ã)|irm(a|ã)o\((a|ã)\)|sibling)(\s+de)?$/i.test(norm) || norm.includes('irmão de') || norm.includes('irmã de') || norm.includes('irmão(ã) de')) {
    return { type: 'sibling', label: 'Irmão(ã) de', inverse: 'sibling', inverseLabel: 'Irmão(ã) de' };
  }

  // Ancestral / Antepassado
  if (/^(ancestral|antepassado|av(o|ô|ó)|ancestor)(\s+de)?$/i.test(norm) || norm.includes('ancestral de')) {
    return { type: 'ancestor', label: 'Ancestral de', inverse: 'descendant', inverseLabel: 'Descendente de' };
  }

  // Descendente / Neto
  if (/^(descendente|net(o|a)|descendant)(\s+de)?$/i.test(norm) || norm.includes('descendente de')) {
    return { type: 'descendant', label: 'Descendente de', inverse: 'ancestor', inverseLabel: 'Ancestral de' };
  }

  return null;
}

/**
 * Extrai todas as conexões genealógicas a partir das entradas da Wiki
 */
export function extractGenealogyConnections(entries: WikiEntry[]): RawConnection[] {
  const connections: RawConnection[] = [];

  entries.forEach(entry => {
    const sourcePath = entry.path;
    const sourceName = String(entry.metadata.nome || entry.metadata.name || entry.metadata.titulo || entry.slug || '');

    // 1. Conexões expressas no frontmatter (ex: pais: [...], filhos: [...], conjuges: [...])
    const meta = entry.metadata;
    const checkArrayOrString = (field: any, relType: string) => {
      if (!field) return;
      const list = Array.isArray(field) ? field : [field];
      list.forEach(target => {
        if (target && typeof target === 'string') {
          connections.push({
            sourcePath,
            sourceName,
            targetNameOrPath: target.replace(/[[\]]/g, '').trim(),
            relationType: relType
          });
        }
      });
    };

    checkArrayOrString(meta.pais || meta.pai || meta.mae || meta.parents, 'Pai/Mãe de');
    checkArrayOrString(meta.filhos || meta.filho || meta.filha || meta.children, 'Filho(a) de');
    checkArrayOrString(meta.conjuges || meta.conjuge || meta.esposa || meta.marido || meta.spouses, 'Casado(a) com');
    checkArrayOrString(meta.irmaos || meta.irmao || meta.irma || meta.siblings, 'Irmão(ã) de');

    // 2. Conexões semânticas no corpo markdown do tipo `tipo:: [[Alvo]]`
    if (entry.content) {
      const regex = /([A-Za-zÀ-ÖØ-öø-ÿ\s()]+)::\s*\[\[(.*?)\]\]/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(entry.content)) !== null) {
        const rawType = match[1].trim();
        const target = match[2].trim();
        if (classifyKinship(rawType)) {
          connections.push({
            sourcePath,
            sourceName,
            targetNameOrPath: target,
            relationType: rawType
          });
        }
      }
    }
  });

  return connections;
}

/**
 * Constrói a árvore genealógica completa para um personagem focal
 */
export function buildGenealogyTree(
  focusEntry: WikiEntry,
  allEntries: WikiEntry[]
): GenealogyTreeData {
  const entityMap = new Map<string, WikiEntry>();
  
  // Indexa por path, slug e nome normalizado
  allEntries.forEach(entry => {
    entityMap.set(normalizeEntityKey(entry.path), entry);
    entityMap.set(normalizeEntityKey(entry.slug), entry);
    const name = entry.metadata.nome || entry.metadata.name || entry.metadata.titulo || entry.slug;
    if (name) entityMap.set(normalizeEntityKey(String(name)), entry);
  });

  const findEntry = (target: string): WikiEntry | undefined => {
    return entityMap.get(normalizeEntityKey(target));
  };

  const focusName = String(focusEntry.metadata.nome || focusEntry.metadata.name || focusEntry.metadata.titulo || focusEntry.slug);
  const focusMember: GenealogyMember = {
    id: focusEntry.slug || focusEntry.path,
    path: focusEntry.path,
    name: focusName,
    avatar: String(focusEntry.metadata.avatar || focusEntry.metadata.imagem || focusEntry.metadata.image || '') || null,
    status: String(focusEntry.metadata.status || focusEntry.metadata.situacao || ''),
    entityType: String(focusEntry.metadata.tipo || focusEntry.metadata.type || 'personagem'),
    relationToFocus: 'Personagem Foco'
  };

  const allConnections = extractGenealogyConnections(allEntries);

  const ancestorsMap = new Map<string, GenealogyMember>();
  const descendantsMap = new Map<string, GenealogyMember>();
  const spousesMap = new Map<string, GenealogyMember>();
  const siblingsMap = new Map<string, GenealogyMember>();

  const focusKey = normalizeEntityKey(focusName);
  const focusPathKey = normalizeEntityKey(focusEntry.path);
  const focusSlugKey = normalizeEntityKey(focusEntry.slug);

  const isFocus = (key: string) => {
    const norm = normalizeEntityKey(key);
    return norm === focusKey || norm === focusPathKey || norm === focusSlugKey;
  };

  // 1. Processa conexões diretas
  allConnections.forEach(conn => {
    const isSourceFocus = isFocus(conn.sourceName) || isFocus(conn.sourcePath);
    const isTargetFocus = isFocus(conn.targetNameOrPath);

    if (!isSourceFocus && !isTargetFocus) return;

    const classified = classifyKinship(conn.relationType);
    if (!classified) return;

    // Papel do outro participante em relação ao foco:
    let kinship: KinshipType;
    let relLabel: string;

    if (classified.type === 'parent') {
      // conn.sourceName é o PAI de conn.targetNameOrPath
      if (isSourceFocus) {
        // Foco é o Pai -> O alvo é Filho do foco
        kinship = 'child';
        relLabel = 'Filho(a) de';
      } else {
        // Foco é o Filho -> A fonte é Pai do foco
        kinship = 'parent';
        relLabel = 'Pai/Mãe de';
      }
    } else if (classified.type === 'child') {
      // conn.sourceName é o FILHO de conn.targetNameOrPath
      if (isSourceFocus) {
        // Foco é o Filho -> O alvo é Pai do foco
        kinship = 'parent';
        relLabel = 'Pai/Mãe de';
      } else {
        // Foco é o Pai -> A fonte é Filho do foco
        kinship = 'child';
        relLabel = 'Filho(a) de';
      }
    } else if (classified.type === 'ancestor') {
      if (isSourceFocus) {
        kinship = 'descendant';
        relLabel = 'Descendente de';
      } else {
        kinship = 'ancestor';
        relLabel = 'Ancestral de';
      }
    } else if (classified.type === 'descendant') {
      if (isSourceFocus) {
        kinship = 'ancestor';
        relLabel = 'Ancestral de';
      } else {
        kinship = 'descendant';
        relLabel = 'Descendente de';
      }
    } else if (classified.type === 'spouse') {
      kinship = 'spouse';
      relLabel = 'Casado(a) com';
    } else {
      kinship = 'sibling';
      relLabel = 'Irmão(ã) de';
    }

    const otherRaw = isSourceFocus ? conn.targetNameOrPath : conn.sourceName || conn.sourcePath;
    const targetEntry = findEntry(otherRaw);
    const memberName = targetEntry
      ? String(targetEntry.metadata.nome || targetEntry.metadata.name || targetEntry.metadata.titulo || targetEntry.slug)
      : otherRaw;

    const memberKey = normalizeEntityKey(memberName);
    if (isFocus(memberKey)) return;

    const member: GenealogyMember = {
      id: targetEntry?.slug || targetEntry?.path || memberKey,
      path: targetEntry?.path,
      name: memberName,
      avatar: targetEntry ? String(targetEntry.metadata.avatar || targetEntry.metadata.imagem || '') || null : null,
      status: targetEntry ? String(targetEntry.metadata.status || targetEntry.metadata.situacao || '') : undefined,
      entityType: targetEntry ? String(targetEntry.metadata.tipo || targetEntry.metadata.type || 'personagem') : 'personagem',
      relationToFocus: relLabel,
      kinshipType: kinship
    };

    if (kinship === 'parent' || kinship === 'ancestor') {
      ancestorsMap.set(memberKey, member);
    } else if (kinship === 'child' || kinship === 'descendant') {
      descendantsMap.set(memberKey, member);
    } else if (kinship === 'spouse') {
      spousesMap.set(memberKey, member);
    } else if (kinship === 'sibling') {
      siblingsMap.set(memberKey, member);
    }
  });

  // 2. Inferência de irmãos: personagens que compartilham pais em comum com o foco
  ancestorsMap.forEach(parent => {
    allConnections.forEach(conn => {
      const isParentSource = isFocus(conn.sourceName) === false && normalizeEntityKey(conn.sourceName) === normalizeEntityKey(parent.name);
      if (isParentSource) {
        const classified = classifyKinship(conn.relationType);
        if (classified && classified.type === 'parent') {
          // Parent -> Filho (potencial irmão do foco)
          const siblingRaw = conn.targetNameOrPath;
          const siblingKey = normalizeEntityKey(siblingRaw);
          if (!isFocus(siblingKey) && !siblingsMap.has(siblingKey)) {
            const entry = findEntry(siblingRaw);
            const siblingName = entry ? String(entry.metadata.nome || entry.metadata.name || entry.slug) : siblingRaw;
            siblingsMap.set(siblingKey, {
              id: entry?.slug || entry?.path || siblingKey,
              path: entry?.path,
              name: siblingName,
              avatar: entry ? String(entry.metadata.avatar || entry.metadata.imagem || '') || null : null,
              status: entry ? String(entry.metadata.status || '') : undefined,
              entityType: 'personagem',
              relationToFocus: 'Irmão(ã) de',
              kinshipType: 'sibling'
            });
          }
        }
      }
    });
  });

  const ancestors = Array.from(ancestorsMap.values());
  const spouses = Array.from(spousesMap.values());
  const siblings = Array.from(siblingsMap.values());
  const descendants = Array.from(descendantsMap.values());

  return {
    focus: focusMember,
    ancestors,
    spouses,
    siblings,
    descendants,
    totalRelatives: ancestors.length + spouses.length + siblings.length + descendants.length
  };
}
