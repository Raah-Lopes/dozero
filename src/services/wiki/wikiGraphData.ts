import * as yaml from 'js-yaml';

export interface WikiGraphNodeSource {
  id: string;
  name: string;
  path: string;
  group: string;
  isFolder: boolean;
  avatar?: string | null;
  entityType?: string;
  description?: string;
  tags?: string[];
  status?: string;
  level?: string | number;
  nd?: string | number;
  gmNotes?: string;
  inventory?: string;
  shape?: string;
}

export interface WikiGraphLinkSource {
  id?: string;
  source: string;
  target: string;
  label?: string;
  description?: string;
  color?: string;
  sourcePath?: string;
}

export interface WikiGraphSource {
  nodes: WikiGraphNodeSource[];
  links: WikiGraphLinkSource[];
}

export function parseWikiDocument(rawContent: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?/.exec(rawContent);
  if (!match) return { metadata: {} as Record<string, unknown>, content: rawContent };

  try {
    return {
      metadata: (yaml.load(match[1]) || {}) as Record<string, unknown>,
      content: rawContent.slice(match[0].length),
    };
  } catch {
    return { metadata: {} as Record<string, unknown>, content: rawContent.slice(match[0].length) };
  }
}

function normalizePath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}

function stringValue(value: unknown) {
  return value == null ? '' : String(value).trim();
}

function tagsValue(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  return stringValue(value).replace(/^\[/, '').replace(/\]$/, '').split(',').map((tag) => tag.trim()).filter(Boolean);
}

function extractAvatar(rawContent: string, metadata: Record<string, unknown>) {
  const configured = stringValue(metadata.imagem || metadata.avatar || metadata.imageUrl || metadata.image);
  const bodyMatch = /!\[.*?\]\((.*?)\)|!\[\[(.*?)\]\]/.exec(rawContent);
  const extracted = configured || stringValue(bodyMatch?.[1] || bodyMatch?.[2]);
  if (!extracted) return null;
  return extracted.replace(/\\/g, '').split('|')[0].trim();
}

function ensureFolderNodes(path: string, nodes: Map<string, WikiGraphNodeSource>, links: WikiGraphLinkSource[]) {
  const parts = path.split('/').slice(0, -1);
  let parent = '';
  for (const part of parts) {
    const folder = parent ? `${parent}/${part}` : part;
    if (!nodes.has(folder)) {
      nodes.set(folder, {
        id: folder,
        name: part,
        path: folder,
        group: parent,
        isFolder: true,
      });
      if (parent) links.push({ source: folder, target: parent, label: '' });
    }
    parent = folder;
  }
  return parent;
}

export function buildWikiGraphFromFiles(files: Iterable<[string, string]>): WikiGraphSource {
  const nodes = new Map<string, WikiGraphNodeSource>();
  const links: WikiGraphLinkSource[] = [];

  for (const [inputPath, rawContent] of files) {
    const path = normalizePath(inputPath);
    if (!path.toLowerCase().endsWith('.md') || path.toLowerCase().endsWith('/readme.md') || path.toLowerCase() === 'readme.md') continue;

    const parent = ensureFolderNodes(path, nodes, links);
    const filename = path.split('/').pop() || path;
    const name = filename.replace(/\.md$/i, '');
    const { metadata, content } = parseWikiDocument(rawContent);
    const entityType = stringValue(metadata.tipo || metadata.type || metadata.categoria).toLowerCase();

    nodes.set(path, {
      id: path,
      name,
      path,
      group: parent,
      isFolder: false,
      avatar: extractAvatar(rawContent, metadata),
      entityType,
      description: stringValue(metadata.descricao || metadata.description || content.split(/\r?\n/).find((line) => line.trim() && !line.startsWith('#'))),
      tags: tagsValue(metadata.tags),
      status: stringValue(metadata.status || metadata.situacao),
      level: (metadata.nivel || metadata.level) as string | number | undefined,
      nd: metadata.nd as string | number | undefined,
      gmNotes: stringValue(metadata.gmNotes || metadata.notas_mestre),
      inventory: stringValue(metadata.inventory || metadata.inventario),
      shape: stringValue(metadata.shape || metadata.forma),
    });

    if (parent) links.push({ source: path, target: parent, label: '', sourcePath: path });

    const linkPattern = /(?:([^\n]+?)\s*::\s*)?(?:\\?\[){2}(.*?)(?:\\?\]){2}/g;
    let match: RegExpExecArray | null;
    while ((match = linkPattern.exec(rawContent)) !== null) {
      const target = match[2].split('|')[0].split('#')[0].trim();
      if (!target) continue;
      const lineEnd = rawContent.indexOf('\n', linkPattern.lastIndex);
      const trailing = rawContent.slice(linkPattern.lastIndex, lineEnd < 0 ? rawContent.length : lineEnd).trim();
      links.push({
        source: path,
        target,
        label: match[1]?.trim(),
        description: trailing.replace(/^[—-]\s*/, '').trim() || undefined,
        sourcePath: path,
      });
    }
  }

  return { nodes: Array.from(nodes.values()), links };
}
