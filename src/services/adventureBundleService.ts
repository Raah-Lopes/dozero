import { getScenesFromCloud, saveSceneToCloud, SceneRecord } from './sceneCloudService';
import { getCombatEncounters, saveCombatEncounter, CombatEncounterRecord } from './encounterCloudService';
import { getCampaignCharacters, saveCharacter, CharacterRecord } from './characterRepository';
import { toast } from '../components/UI/Toast';

export interface AdventureBundle {
  version: string;
  bundleName: string;
  exportedAt: string;
  description?: string;
  scenes: SceneRecord[];
  encounters: CombatEncounterRecord[];
  characters: CharacterRecord[];
}

/**
 * Exporta um pacote completo de aventura (.dozero) contendo cenários, monstros e encontros
 */
export async function exportAdventureBundle(campaignId: string, bundleName: string, userId?: string | null): Promise<void> {
  try {
    toast.info('Empacotando aventura...');
    const scenes = await getScenesFromCloud(campaignId);
    const encounters = await getCombatEncounters(campaignId);
    const characters = await getCampaignCharacters(campaignId, userId);

    const bundle: AdventureBundle = {
      version: '1.0',
      bundleName: bundleName || `Aventura_${campaignId}`,
      exportedAt: new Date().toISOString(),
      scenes,
      encounters,
      characters
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `${bundle.bundleName.replace(/[^a-z0-9_-]/gi, '_')}.dozero`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Pacote "${filename}" exportado com sucesso! (${scenes.length} cenas, ${characters.length} criaturas, ${encounters.length} encontros)`);
  } catch (err: any) {
    console.error('[AdventureBundle] Erro na exportação:', err);
    toast.error(`Falha ao exportar pacote: ${err?.message || err}`);
  }
}

/**
 * Importa um pacote de aventura (.dozero) para a campanha atual
 */
export async function importAdventureBundle(
  file: File,
  targetCampaignId: string,
  userId?: string | null
): Promise<{ scenesCount: number; encountersCount: number; charactersCount: number } | null> {
  try {
    const text = await file.text();
    const bundle: AdventureBundle = JSON.parse(text);

    if (!bundle || (!bundle.scenes && !bundle.characters && !bundle.encounters)) {
      throw new Error('Arquivo de pacote de aventura inválido ou corrompido.');
    }

    toast.info(`Importando "${bundle.bundleName || 'Pacote'}"...`);

    let scenesCount = 0;
    let encountersCount = 0;
    let charactersCount = 0;

    // 1. Importar Cenários
    if (bundle.scenes && Array.isArray(bundle.scenes)) {
      for (const scene of bundle.scenes) {
        await saveSceneToCloud({
          ...scene,
          id: undefined, // gera novo ID para não colidir
          campaign_id: targetCampaignId
        });
        scenesCount++;
      }
    }

    // 2. Importar Encontros
    if (bundle.encounters && Array.isArray(bundle.encounters)) {
      for (const enc of bundle.encounters) {
        await saveCombatEncounter({
          ...enc,
          id: undefined,
          campaign_id: targetCampaignId
        });
        encountersCount++;
      }
    }

    // 3. Importar Criaturas / NPCs
    if (bundle.characters && Array.isArray(bundle.characters)) {
      for (const char of bundle.characters) {
        await saveCharacter({
          ...char,
          id: undefined,
          campaign_id: targetCampaignId
        }, userId);
        charactersCount++;
      }
    }

    toast.success(`Pacote importado com sucesso! (${scenesCount} cenas, ${charactersCount} criaturas, ${encountersCount} encontros)`);
    return { scenesCount, encountersCount, charactersCount };
  } catch (err: any) {
    console.error('[AdventureBundle] Erro na importação:', err);
    toast.error(`Erro ao importar pacote: ${err?.message || err}`);
    return null;
  }
}
