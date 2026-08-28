import { describe, expect, it } from "vitest";
import { seedState } from "../../Soundboard/data/seed";
import { migrateLegacyAudio } from "../../Soundboard/migration";

describe("migração do Audio Director legado", () => {
  it("usa o áudio real da Taverna do Javali", () => {
    expect(seedState.sounds.snd1).toMatchObject({
      name: "Taverna do Javali",
      synth: "file:legacy-amb-tavern",
      fileUrl: "/audio/ambience/tavern.wav",
    });
  });

  it("importa playlist, soundboard, favoritos e presets sem duplicar", () => {
    const legacy = {
      state: {
        playlist: [{ id: "old-track", title: "Trilha antiga", url: "/audio/old.mp3", category: "music", isFavorite: true }],
        soundboard: [{ id: "old-hit", title: "Impacto antigo", url: "/audio/hit.mp3", category: "sfx", volume: 0.5 }],
        scenePresets: [{ id: "old-scene", name: "Cena antiga", musicTrackId: "old-track", ambienceTrackId: "old-hit" }],
      },
    };

    const migrated = migrateLegacyAudio(seedState, legacy);
    expect(migrated.sounds["legacy-old-track"].name).toBe("Trilha antiga");
    expect(migrated.sounds["legacy-old-hit"].volume).toBe(50);
    expect(migrated.pads.find((pad) => pad.id === "pad-legacy-audio")?.soundIds).toEqual(
      expect.arrayContaining(["legacy-old-track", "legacy-old-hit"]),
    );
    expect(migrated.favorites).toContain("legacy-old-track");
    expect(migrated.scenes.find((scene) => scene.id === "legacy-scene-old-scene")?.layers).toHaveLength(2);

    const repeated = migrateLegacyAudio(migrated, legacy);
    expect(repeated.pads.filter((pad) => pad.id === "pad-legacy-audio")).toHaveLength(1);
    expect(repeated.pads.find((pad) => pad.id === "pad-legacy-audio")?.soundIds.filter((id) => id === "legacy-old-track")).toHaveLength(1);
  });

  it("registra novos sintetizadores procedurais de RPG e pad de SFX do Mestre com atalhos", () => {
    const rpgPad = seedState.pads.find((p) => p.id === "pad-rpg-sfx");
    expect(rpgPad).toBeDefined();
    expect(rpgPad?.name).toBe("Arsenal do Mestre (SFX)");
    expect(rpgPad?.soundIds.length).toBeGreaterThanOrEqual(10);

    const sounds = Object.values(seedState.sounds);

    // Mísseis Mágicos
    const missile = sounds.find((s) => s.synth === "magicMissile");
    expect(missile).toBeDefined();
    expect(missile?.hotkey).toBe("1");
    expect(missile?.type).toBe("SFX");

    // Cura Divina
    const heal = sounds.find((s) => s.synth === "divineHeal");
    expect(heal).toBeDefined();
    expect(heal?.hotkey).toBe("2");

    // Bola de Fogo
    const fireball = sounds.find((s) => s.synth === "fireball");
    expect(fireball).toBeDefined();
    expect(fireball?.hotkey).toBe("3");

    // Golpe Crítico
    const crit = sounds.find((s) => s.synth === "criticalHit");
    expect(crit).toBeDefined();
    expect(crit?.hotkey).toBe("4");

    // Bloqueio de Escudo
    const shield = sounds.find((s) => s.synth === "shieldHit");
    expect(shield).toBeDefined();
    expect(shield?.hotkey).toBe("5");

    // Armadilha Ativada
    const trap = sounds.find((s) => s.synth === "trapSpring");
    expect(trap).toBeDefined();
    expect(trap?.hotkey).toBe("6");

    // Porta de Masmorra
    const door = sounds.find((s) => s.synth === "stoneDoor");
    expect(door).toBeDefined();
    expect(door?.hotkey).toBe("7");

    // Rugido de Dragão
    const dragon = sounds.find((s) => s.synth === "dragonRoar");
    expect(dragon).toBeDefined();
    expect(dragon?.hotkey).toBe("8");

    // Vitória Triunfal
    const victory = sounds.find((s) => s.synth === "victorySting");
    expect(victory).toBeDefined();
    expect(victory?.hotkey).toBe("9");
  });
});
