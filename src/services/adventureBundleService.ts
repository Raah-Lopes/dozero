// src/services/adventureBundleService.ts
// Servico de exportacao, auditoria e importacao de pacotes de aventura (.dozero)
// Suporta compressao nativa Gzip via Web Streams, auditoria de assets e importacao seletiva.

import { getScenesFromCloud, saveSceneToCloud, SceneRecord } from './sceneCloudService';
import { getCombatEncounters, saveCombatEncounter, CombatEncounterRecord } from './encounterCloudService';
import { getCampaignCharacters, saveCharacter, CharacterRecord } from './characterRepository';
import { loadLineageAtlas, saveLineageAtlas, LineageAtlasRecord } from './lineageCloudService';
import { toast } from '../components/UI/Toast';

export interface BundleManifest {
  version: '1.0' | '2.0';
  bundleName: string;
  system: string;
  author?: string;
  description?: string;
  exportedAt: string;
  checksum?: string;
  counts: {
    scenes: number;
    encounters: number;
    characters: number;
    hasLineage: boolean;
    hasSnapshot: boolean;
  };
  assetStats?: {
    totalUrls: number;
    imageCount: number;
    audioCount: number;
  };
}

export interface AdventureBundle {
  manifest?: BundleManifest;
  version: string;
  bundleName: string;
  exportedAt: string;
  system?: string;
  author?: string;
  description?: string;
  scenes: SceneRecord[];
  encounters: CombatEncounterRecord[];
  characters: CharacterRecord[];
  lineage?: LineageAtlasRecord | null;
  snapshot?: any;
}

export interface AdventureBundleOptions {
  bundleName?: string;
  system?: string;
  author?: string;
  description?: string;
  exportScenes?: boolean;
  exportCharacters?: boolean;
  exportEncounters?: boolean;
  exportLineage?: boolean;
  exportSnapshot?: boolean;
  compress?: boolean;
}

export interface ImportBundleOptions {
  importScenes?: boolean;
  importCharacters?: boolean;
  importEncounters?: boolean;
  importLineage?: boolean;
  importSnapshot?: boolean;
  overwriteExisting?: boolean;
}

export interface AssetAuditReport {
  totalUrls: number;
  imageUrls: string[];
  audioUrls: string[];
  externalDomains: string[];
  warnings: string[];
}

/**
 * Detecta se o buffer possui o cabecalho de arquivo Gzip (0x1F, 0x8B)
 */
export function isGzipBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 2) return false;
  const arr = new Uint8Array(buffer, 0, 2);
  return arr[0] === 0x1f && arr[1] === 0x8b;
}

/**
 * Comprime string JSON em Gzip usando CompressionStream nativo
 */
export async function compressBundleGzip(jsonString: string): Promise<Blob> {
  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = new Blob([jsonString], { type: 'application/json' })
        .stream()
        .pipeThrough(new CompressionStream('gzip'));
      const compressedBuffer = await new Response(stream).arrayBuffer();
      return new Blob([compressedBuffer], { type: 'application/gzip' });
    } catch {
      // fallback para JSON plain se der erro no stream
    }
  }
  return new Blob([jsonString], { type: 'application/json' });
}

/**
 * Descomprime Gzip ou decodifica texto JSON plano
 */
export async function decompressBundleData(buffer: ArrayBuffer): Promise<string> {
  if (isGzipBuffer(buffer) && typeof DecompressionStream !== 'undefined') {
    try {
      const stream = new Blob([buffer])
        .stream()
        .pipeThrough(new DecompressionStream('gzip'));
      const text = await new Response(stream).text();
      return text;
    } catch (err) {
      console.warn('[AdventureBundle] Falha ao descomprimir stream gzip, tentando decodificacao direta:', err);
    }
  }
  return new TextDecoder('utf-8').decode(buffer);
}

/**
 * Audita assets e links de midia dentro de um pacote
 */
export function auditBundleAssets(bundle: AdventureBundle): AssetAuditReport {
  const imageUrls = new Set<string>();
  const audioUrls = new Set<string>();
  const domains = new Set<string>();
  const warnings: string[] = [];

  // Scans scenes
  if (Array.isArray(bundle.scenes)) {
    for (const sc of bundle.scenes) {
      if (sc.thumbnail_url) imageUrls.add(sc.thumbnail_url);
      if (sc.backgrounds && typeof sc.backgrounds === 'object') {
        const bgs = sc.backgrounds as any;
        if (Array.isArray(bgs)) {
          bgs.forEach((b: any) => { if (b?.url) imageUrls.add(b.url); });
        } else if (bgs?.url) {
          imageUrls.add(bgs.url);
        }
      }
      if (sc.audio_config && typeof sc.audio_config === 'object') {
        const aud = sc.audio_config as any;
        if (aud?.ambienceUrl) audioUrls.add(aud.ambienceUrl);
        if (aud?.musicUrl) audioUrls.add(aud.musicUrl);
      }
    }
  }

  // Scans characters
  if (Array.isArray(bundle.characters)) {
    for (const ch of bundle.characters) {
      if (ch.avatar_url) imageUrls.add(ch.avatar_url);
      const data = ch.data as any;
      if (data?.avatar) imageUrls.add(data.avatar);
      if (data?.tokenImage) imageUrls.add(data.tokenImage);
    }
  }

  // Extrai dominios
  const allUrls = [...imageUrls, ...audioUrls];
  for (const u of allUrls) {
    try {
      if (u.startsWith('http://') || u.startsWith('https://')) {
        const parsed = new URL(u);
        domains.add(parsed.hostname);
      } else if (u.startsWith('data:')) {
        // inline data URL
      } else {
        warnings.push(`URL de midia local ou relativa detectada: ${u.slice(0, 40)}...`);
      }
    } catch {
      warnings.push(`URL invalida detectada: ${u.slice(0, 40)}...`);
    }
  }

  return {
    totalUrls: allUrls.length,
    imageUrls: Array.from(imageUrls),
    audioUrls: Array.from(audioUrls),
    externalDomains: Array.from(domains),
    warnings,
  };
}

/**
 * Valida o arquivo .dozero e retorna o manifesto e sumario antes da importacao
 */
export async function validateAdventureBundle(
  fileOrBuffer: File | Blob | ArrayBuffer
): Promise<{ valid: boolean; bundle: AdventureBundle | null; manifest: BundleManifest | null; error?: string }> {
  try {
    let buffer: ArrayBuffer;
    if (fileOrBuffer && typeof (fileOrBuffer as any).arrayBuffer === 'function') {
      buffer = await (fileOrBuffer as any).arrayBuffer();
    } else if (fileOrBuffer instanceof ArrayBuffer || (fileOrBuffer && (fileOrBuffer as any).byteLength !== undefined && !(fileOrBuffer as any).buffer)) {
      buffer = fileOrBuffer as ArrayBuffer;
    } else if (fileOrBuffer && (fileOrBuffer as any).buffer) {
      buffer = (fileOrBuffer as any).buffer;
    } else {
      buffer = new ArrayBuffer(0);
    }

    const text = await decompressBundleData(buffer);
    const parsed: AdventureBundle = JSON.parse(text);

    if (!parsed || (typeof parsed !== 'object')) {
      return { valid: false, bundle: null, manifest: null, error: 'Formato de arquivo invalido ou vazio.' };
    }

    if (!Array.isArray(parsed.scenes) && !Array.isArray(parsed.characters) && !Array.isArray(parsed.encounters)) {
      return { valid: false, bundle: null, manifest: null, error: 'O pacote nao contem cenas, personagens ou encontros validos.' };
    }

    const audit = auditBundleAssets(parsed);
    const manifest: BundleManifest = parsed.manifest || {
      version: (parsed.version as any) || '1.0',
      bundleName: parsed.bundleName || 'Aventura Desconhecida',
      system: parsed.system || 'D&D 5e / Custom',
      author: parsed.author || 'Mestre Anonimo',
      description: parsed.description || '',
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      counts: {
        scenes: parsed.scenes?.length || 0,
        encounters: parsed.encounters?.length || 0,
        characters: parsed.characters?.length || 0,
        hasLineage: !!parsed.lineage,
        hasSnapshot: !!parsed.snapshot,
      },
      assetStats: {
        totalUrls: audit.totalUrls,
        imageCount: audit.imageUrls.length,
        audioCount: audit.audioUrls.length,
      }
    };

    return { valid: true, bundle: parsed, manifest };
  } catch (err: any) {
    return { valid: false, bundle: null, manifest: null, error: err?.message || 'Falha ao analisar arquivo .dozero' };
  }
}

/**
 * Exporta um pacote completo de aventura (.dozero) contendo cenarios, fichas, encontros e linhagens
 */
export async function exportAdventureBundle(
  campaignId: string,
  bundleName: string,
  options: AdventureBundleOptions = {},
  userId?: string | null
): Promise<{ blob: Blob; filename: string; manifest: BundleManifest }> {
  try {
    toast.info('Empacotando aventura e auditando assets...');

    const opt: Required<AdventureBundleOptions> = {
      bundleName: bundleName || `Aventura_${campaignId}`,
      system: options.system || 'DOZERO VTT / Pathfinder 2e / D&D 5e',
      author: options.author || 'Mestre DOZERO',
      description: options.description || '',
      exportScenes: options.exportScenes !== false,
      exportCharacters: options.exportCharacters !== false,
      exportEncounters: options.exportEncounters !== false,
      exportLineage: options.exportLineage !== false,
      exportSnapshot: options.exportSnapshot !== false,
      compress: options.compress !== false,
    };

    const [scenes, encounters, characters, lineage] = await Promise.all([
      opt.exportScenes ? getScenesFromCloud(campaignId) : Promise.resolve([]),
      opt.exportEncounters ? getCombatEncounters(campaignId) : Promise.resolve([]),
      opt.exportCharacters ? getCampaignCharacters(campaignId, userId) : Promise.resolve([]),
      opt.exportLineage ? loadLineageAtlas(campaignId) : Promise.resolve(null),
    ]);

    const tempBundle: AdventureBundle = {
      version: '2.0',
      bundleName: opt.bundleName,
      system: opt.system,
      author: opt.author,
      description: opt.description,
      exportedAt: new Date().toISOString(),
      scenes,
      encounters,
      characters,
      lineage,
    };

    const assetAudit = auditBundleAssets(tempBundle);

    const manifest: BundleManifest = {
      version: '2.0',
      bundleName: opt.bundleName,
      system: opt.system,
      author: opt.author,
      description: opt.description,
      exportedAt: tempBundle.exportedAt,
      counts: {
        scenes: scenes.length,
        encounters: encounters.length,
        characters: characters.length,
        hasLineage: !!lineage,
        hasSnapshot: false,
      },
      assetStats: {
        totalUrls: assetAudit.totalUrls,
        imageCount: assetAudit.imageUrls.length,
        audioCount: assetAudit.audioUrls.length,
      }
    };

    const finalBundle: AdventureBundle = {
      ...tempBundle,
      manifest,
    };

    const jsonString = JSON.stringify(finalBundle, null, 2);
    let blob: Blob;

    if (opt.compress) {
      blob = await compressBundleGzip(jsonString);
    } else {
      blob = new Blob([jsonString], { type: 'application/json' });
    }

    const filename = `${opt.bundleName.replace(/[^a-z0-9_-]/gi, '_')}.dozero`;

    // Download trigger no browser
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    toast.success(`Pacote "${filename}" exportado! (${scenes.length} cenas, ${characters.length} criaturas, ${encounters.length} encontros)`);
    return { blob, filename, manifest };
  } catch (err: any) {
    console.error('[AdventureBundle] Erro na exportacao:', err);
    toast.error(`Falha ao exportar pacote: ${err?.message || err}`);
    throw err;
  }
}

/**
 * Importa um pacote de aventura (.dozero) para a campanha de destino
 */
export async function importAdventureBundle(
  fileOrBuffer: File | Blob | ArrayBuffer,
  targetCampaignId: string,
  options: ImportBundleOptions = {},
  userId?: string | null,
  onProgress?: (pct: number) => void
): Promise<{ scenesCount: number; encountersCount: number; charactersCount: number; lineageImported: boolean; snapshotImported: boolean }> {
  try {
    const validation = await validateAdventureBundle(fileOrBuffer);
    if (!validation.valid || !validation.bundle) {
      throw new Error(validation.error || 'Arquivo invalido');
    }

    const bundle = validation.bundle;
    const opt: Required<ImportBundleOptions> = {
      importScenes: options.importScenes !== false,
      importCharacters: options.importCharacters !== false,
      importEncounters: options.importEncounters !== false,
      importLineage: options.importLineage !== false,
      importSnapshot: options.importSnapshot !== false,
      overwriteExisting: options.overwriteExisting === true,
    };

    toast.info(`Importando aventura "${bundle.bundleName || 'Pacote'}"...`);

    let scenesCount = 0;
    let encountersCount = 0;
    let charactersCount = 0;
    let lineageImported = false;
    let snapshotImported = false;

    const totalSteps = 4;
    let currentStep = 0;

    // 1. Cenas
    if (opt.importScenes && Array.isArray(bundle.scenes) && bundle.scenes.length > 0) {
      for (const scene of bundle.scenes) {
        await saveSceneToCloud({
          ...scene,
          id: opt.overwriteExisting ? scene.id : undefined,
          name: opt.overwriteExisting ? scene.name : `${scene.name}`,
          campaign_id: targetCampaignId
        });
        scenesCount++;
      }
    }
    currentStep++;
    onProgress?.(Math.round((currentStep / totalSteps) * 100));

    // 2. Encontros
    if (opt.importEncounters && Array.isArray(bundle.encounters) && bundle.encounters.length > 0) {
      for (const enc of bundle.encounters) {
        await saveCombatEncounter({
          ...enc,
          id: opt.overwriteExisting ? enc.id : undefined,
          campaign_id: targetCampaignId
        });
        encountersCount++;
      }
    }
    currentStep++;
    onProgress?.(Math.round((currentStep / totalSteps) * 100));

    // 3. Criaturas / Personagens
    if (opt.importCharacters && Array.isArray(bundle.characters) && bundle.characters.length > 0) {
      for (const char of bundle.characters) {
        await saveCharacter({
          ...char,
          id: opt.overwriteExisting ? char.id : undefined,
          campaign_id: targetCampaignId
        }, userId);
        charactersCount++;
      }
    }
    currentStep++;
    onProgress?.(Math.round((currentStep / totalSteps) * 100));

    // 4. Linhagem
    if (opt.importLineage && bundle.lineage?.data) {
      const saved = await saveLineageAtlas(targetCampaignId, bundle.lineage.data);
      if (saved) lineageImported = true;
    }
    currentStep++;
    onProgress?.(100);

    toast.success(`Aventura importada com sucesso! (${scenesCount} cenas, ${charactersCount} fichas, ${encountersCount} encontros)`);
    return { scenesCount, encountersCount, charactersCount, lineageImported, snapshotImported };
  } catch (err: any) {
    console.error('[AdventureBundle] Erro na importacao:', err);
    toast.error(`Erro ao importar pacote: ${err?.message || err}`);
    throw err;
  }
}
