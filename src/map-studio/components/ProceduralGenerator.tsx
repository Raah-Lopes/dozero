import { useEffect, useRef, useState } from 'react';
import { ProceduralConfig, MapProject } from '../types';
import { MapArtwork } from './MapDrawing';
import { validateConfig } from '../utils/proceduralUtils';

const DEFAULT_CARTOGRAPHY = {
  mode: 'relief' as const,
  relief: 0.75,
  coast: 0.85,
  biomes: 0.7,
  texture: 0.45,
};

export default function ProceduralGenerator({
  onLoadMap,
  initialProject,
}: {
  onLoadMap: (p: Partial<MapProject>) => void;
  initialProject?: MapProject;
}) {
  const [config, setConfig] = useState<ProceduralConfig>(
    initialProject?.generatorConfig || {
      width: 2000,
      height: 1500,
      seed: 'valoria-antiga',
      style: 'fantasy',
      shape: 'island',
      rooms: 12,
      routeStyle: 'natural',
      cartography: { ...DEFAULT_CARTOGRAPHY },
      terrain: {
        waterLevel: 0.35,
        mountainLevel: 0.7,
        forestDensity: 0.5,
        desertChance: 0.1,
        snowLevel: 0.85,
        noiseScale: 4,
        octaves: 6,
      },
      features: {
        cities: 3,
        towns: 5,
        dungeons: 2,
        roads: true,
        rivers: true,
        forests: 8,
        mountains: 5,
      },
    }
  );

  const [mode, setMode] = useState<string>(
    initialProject?.generatorMode ||
      (initialProject?.generatorConfig &&
      initialProject.description.startsWith('Masmorra')
        ? 'dungeon'
        : 'world')
  );
  const [result, setResult] = useState<MapProject | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const worker = useRef<Worker | null>(null);
  const signature = JSON.stringify(config);

  useEffect(() => {
    setResult(null);
    setBusy(false);
    worker.current?.terminate();
    return () => {
      worker.current?.terminate();
    };
  }, [signature, mode]);

  const generateWithConfig = (cfg: ProceduralConfig, currentMode: string = mode) => {
    try {
      validateConfig(cfg);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setBusy(true);
    setError('');
    setResult(null);
    worker.current?.terminate();
    const w = new Worker(
      new URL('../utils/procedural.worker.ts', import.meta.url),
      { type: 'module' }
    );
    worker.current = w;
    w.onmessage = (e) => {
      setBusy(false);
      w.terminate();
      if (e.data.error) setError(e.data.error);
      else
        setResult({
          id: 'preview',
          createdAt: new Date(),
          updatedAt: new Date(),
          gridSize: 50,
          gridEnabled: false,
          ...e.data,
        });
    };
    w.onerror = () => {
      setBusy(false);
      setError(
        'Não foi possível gerar. Reduza as dimensões e tente novamente.'
      );
      w.terminate();
    };
    w.postMessage({ config: cfg, mode: currentMode });
  };

  const generate = () => generateWithConfig(config, mode);

  const generateRandomMap = () => {
    const shapes: ProceduralConfig['shape'][] = [
      'island',
      'continents',
      'archipelago',
      'inland',
    ];
    const styles: ProceduralConfig['style'][] = [
      'fantasy',
      'medieval',
      'sci-fi',
      'nautical',
      'world',
      'dungeon',
    ];

    const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const randomWater = Math.round((0.18 + Math.random() * 0.42) * 100) / 100;
    const randomMountains = Math.round((0.52 + Math.random() * 0.32) * 100) / 100;
    const randomForest = Math.round(Math.random() * 100) / 100;
    const randomArid = Math.round((Math.random() * 0.5) * 100) / 100;
    const randomNoise = Math.round((2 + Math.random() * 5) * 10) / 10;
    const randomOctaves = Math.min(8, Math.max(3, 3 + Math.floor(Math.random() * 5)));

    const newConfig: ProceduralConfig = {
      ...config,
      seed: crypto.randomUUID().slice(0, 10),
      shape: randomShape,
      style: mode === 'cave' ? (Math.random() < 0.6 ? 'dungeon' : randomStyle) : randomStyle,
      terrain: {
        ...config.terrain,
        waterLevel: randomWater,
        mountainLevel: randomMountains,
        forestDensity: randomForest,
        desertChance: randomArid,
        noiseScale: randomNoise,
        octaves: randomOctaves,
      },
      rooms: mode === 'cave' ? 4 + Math.floor(Math.random() * 10) : 6 + Math.floor(Math.random() * 16),
      caveDensity: 38 + Math.floor(Math.random() * 15),
    };

    setConfig(newConfig);
    generateWithConfig(newConfig, mode);
  };

  return (
    <div className="p-6 overflow-auto">
      <h1 className="font-display text-3xl mb-2">Forja de mapas</h1>
      <p className="text-stone-400 mb-6">
        Gere um mapa, confira a prévia e crie um novo projeto. Seu mapa aberto
        permanece preservado.
      </p>
      {initialProject?.generatorConfig && (
        <p className="text-amber-200 mb-4">
          Parâmetros recuperados de {initialProject.name}. Altere a semente ou
          os controles para criar uma variação em um novo projeto.
        </p>
      )}
      <div className="grid grid-cols-[320px_1fr] gap-6">
        <div className="space-y-4">
          <div className="flex gap-2">
            {[
              ['world', 'Mundo'],
              ['dungeon', 'Masmorra'],
              ['cave', 'Caverna'],
            ].map(([id, label]) => (
              <button
                className={
                  'dz-button flex-1 ' + (mode === id ? 'bg-amber-900' : '')
                }
                key={id}
                onClick={() => setMode(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="block">
            Semente{' '}
            <input
              aria-label="Semente"
              value={config.seed}
              onChange={(e) =>
                setConfig((c) => ({ ...c, seed: e.target.value }))
              }
              className="w-full"
            />
          </label>
          <div className="flex gap-2">
            <button
              className="dz-button flex-1"
              aria-label="Semente aleatória"
              onClick={() =>
                setConfig((c) => ({
                  ...c,
                  seed: crypto.randomUUID().slice(0, 10),
                }))
              }
            >
              Sortear semente
            </button>
            <button
              className="dz-button flex-1 bg-amber-950/80 border border-amber-600/70 text-amber-200 hover:bg-amber-900 transition-colors"
              aria-label="Gerar mapa aleatório"
              title="Sorteia semente, forma e parâmetros e forja imediatamente"
              disabled={busy}
              onClick={generateRandomMap}
            >
              🎲 Aleatório
            </button>
          </div>
          <div className="flex gap-2">
            {(['width', 'height'] as const).map((k) => (
              <label key={k}>
                {k === 'width' ? 'Largura' : 'Altura'}
                <input
                  aria-label={k === 'width' ? 'Largura' : 'Altura'}
                  className="w-full"
                  type="number"
                  min="500"
                  max="8000"
                  value={config[k]}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, [k]: +e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            {[
              ['Pequeno', 1000, 750],
              ['Médio', 2000, 1500],
              ['Grande', 4000, 3000],
            ].map(([label, w, h]) => (
              <button
                key={label}
                className="dz-button"
                onClick={() =>
                  setConfig((c) => ({ ...c, width: +w, height: +h }))
                }
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-400">
            Até 32 megapixels na geração. Importação de imagens: até 64
            megapixels.
          </p>
          <label className="block">
            Estilo visual
            <select
              aria-label="Estilo visual"
              className="w-full"
              value={config.style}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  style: e.target.value as ProceduralConfig['style'],
                }))
              }
            >
              {[
                ['fantasy', 'Fantasia'],
                ['medieval', 'Pergaminho medieval'],
                ['sci-fi', 'Ficção científica'],
                ['nautical', 'Carta náutica'],
                ['dungeon', 'Pedra escura'],
                ['world', 'Atlas natural'],
              ].map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {mode === 'world' ? (
            <>
              <fieldset className="border border-stone-700 p-3 space-y-3">
                <legend className="px-1 text-sm">Acabamento do terreno</legend>
                <label className="block text-sm">
                  Aparência
                  <select
                    aria-label="Acabamento do terreno"
                    className="w-full"
                    value={config.cartography?.mode || 'classic'}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        cartography: {
                          ...(c.cartography || DEFAULT_CARTOGRAPHY),
                          mode: e.target.value as 'classic' | 'relief',
                        },
                      }))
                    }
                  >
                    <option value="classic">Clássico</option>
                    <option value="relief">Relevo sombreado</option>
                  </select>
                </label>
                {config.cartography?.mode === 'relief' &&
                  (
                    [
                      ['relief', 'Sombras de relevo'],
                      ['coast', 'Transição das costas'],
                      ['biomes', 'Transição entre biomas'],
                      ['texture', 'Texturas do terreno'],
                    ] as const
                  ).map(([k, label]) => (
                    <label key={k} className="block text-sm">
                      {label}:{' '}
                      {Math.round((config.cartography?.[k] ?? 0) * 100)}%
                      <input
                        aria-label={label}
                        className="w-full"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={config.cartography?.[k] ?? 0}
                        onChange={(e) =>
                          setConfig((c) => ({
                            ...c,
                            cartography: {
                              ...(c.cartography || DEFAULT_CARTOGRAPHY),
                              [k]: +e.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                  ))}
                <p className="text-xs text-stone-400">
                  Muda a pintura, mantendo a geografia da semente. A luz vem do
                  canto superior esquerdo. Clássico reproduz a aparência
                  anterior. Biomas e texturas em zero mantêm o primeiro relevo.
                </p>
              </fieldset>
              <label className="block">
                Forma
                <select
                  aria-label="Forma"
                  className="w-full"
                  value={config.shape}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      shape: e.target.value as ProceduralConfig['shape'],
                    }))
                  }
                >
                  {[
                    ['island', 'Ilha'],
                    ['continents', 'Continentes'],
                    ['archipelago', 'Arquipélago'],
                    ['inland', 'Interior continental'],
                  ].map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {(
                [
                  ['waterLevel', 'Águas', 0, 0.7, 0.01],
                  ['mountainLevel', 'Altitude das montanhas', 0.45, 0.95, 0.01],
                  ['forestDensity', 'Florestas', 0, 1, 0.05],
                  ['desertChance', 'Aridez', 0, 0.8, 0.05],
                  ['snowLevel', 'Linha de neve', 0.5, 1, 0.01],
                  ['noiseScale', 'Escala do relevo', 1, 10, 0.5],
                  ['octaves', 'Detalhamento', 1, 8, 1],
                ] as [
                  keyof ProceduralConfig['terrain'],
                  string,
                  number,
                  number,
                  number,
                ][]
              ).map(([k, label, min, max, step]) => (
                <label key={k} className="block text-sm">
                  {label}: {config.terrain[k]}
                  <input
                    aria-label={label}
                    className="w-full"
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={config.terrain[k]}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        terrain: { ...c.terrain, [k]: +e.target.value },
                      }))
                    }
                  />
                </label>
              ))}
              {(
                [
                  ['cities', 'Cidades'],
                  ['towns', 'Vilas'],
                  ['dungeons', 'Masmorras'],
                  ['forests', 'Símbolos de floresta'],
                  ['mountains', 'Símbolos de montanha'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex justify-between">
                  {label}
                  <input
                    aria-label={label}
                    type="number"
                    min="0"
                    max="30"
                    className="w-20"
                    value={config.features[k]}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        features: {
                          ...c.features,
                          [k]: Math.max(0, Math.min(30, +e.target.value)),
                        },
                      }))
                    }
                  />
                </label>
              ))}
              <label className="block">
                <input
                  type="checkbox"
                  checked={config.features.rivers}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      features: { ...c.features, rivers: e.target.checked },
                    }))
                  }
                />{' '}
                Rios seguindo o relevo
              </label>
              <label className="block">
                <input
                  type="checkbox"
                  checked={config.features.roads}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      features: { ...c.features, roads: e.target.checked },
                    }))
                  }
                />{' '}
                Estradas entre povoações em terra
              </label>
              <label className="block text-sm">
                Traçado dos caminhos
                <select
                  aria-label="Traçado dos caminhos"
                  className="w-full"
                  value={config.routeStyle || 'classic'}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      routeStyle: e.target.value as ProceduralConfig['routeStyle'],
                    }))
                  }
                >
                  <option value="classic">Clássico</option>
                  <option value="natural">Natural</option>
                </select>
              </label>
              <p className="text-xs text-stone-400">
                Natural suaviza rios e procura estradas em terra com menos curvas
                rígidas, considerando o relevo. Preserva os pontos de conexão.
                Clássico reproduz os caminhos anteriores.
              </p>
            </>
          ) : mode === 'dungeon' ? (
            <label className="block">
              Salas desejadas: {config.rooms}
              <input
                aria-label="Salas"
                type="range"
                className="w-full"
                min="3"
                max="40"
                value={config.rooms || 12}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, rooms: +e.target.value }))
                }
              />
            </label>
          ) : (
            <>
              <label className="block">
                Câmaras desejadas: {config.rooms || 6}
                <input
                  aria-label="Câmaras"
                  type="range"
                  className="w-full"
                  min="3"
                  max="20"
                  value={config.rooms || 6}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, rooms: +e.target.value }))
                  }
                />
              </label>
              <label className="block">
                Densidade da rocha: {config.caveDensity || 45}%
                <input
                  aria-label="Densidade"
                  type="range"
                  className="w-full"
                  min="35"
                  max="55"
                  value={config.caveDensity || 45}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, caveDensity: +e.target.value }))
                  }
                />
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="text-red-300">
              {error}
            </p>
          )}
          <button
            className="dz-button w-full bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-100 font-bold border border-amber-500/50 shadow-md py-2.5 flex items-center justify-center gap-2 transition-all"
            disabled={busy}
            onClick={generateRandomMap}
            title="Cria sementes com diferentes formas de mapas e gera automaticamente"
          >
            <span className="text-lg">🎲</span>
            <span>{busy ? 'Forjando Aleatório...' : 'Gerar Mapa Aleatório'}</span>
          </button>
          <button
            className="dz-button w-full"
            disabled={busy}
            onClick={generate}
          >
            {busy ? 'Forjando...' : 'Forjar Preview'}
          </button>
          {busy && (
            <button
              className="dz-button w-full"
              onClick={() => {
                worker.current?.terminate();
                setBusy(false);
              }}
            >
              Cancelar geração
            </button>
          )}
          <button
            className="dz-button w-full"
            disabled={!result || busy}
            onClick={() => {
              if (result) {
                const { id, createdAt, updatedAt, ...p } = result;
                onLoadMap(p);
              }
            }}
          >
            Carregar no Editor
          </button>
        </div>
        <div className="min-w-0">
          <div className="sticky top-0 border border-stone-700 p-4 bg-[#11100d]">
            <h2 className="mb-3">Prévia do novo projeto</h2>
            {result ? (
              <>
                <svg
                  role="img"
                  aria-label="Prévia procedural"
                  viewBox={
                    '0 0 ' + result.imageWidth + ' ' + result.imageHeight
                  }
                  className="w-full max-h-[70vh]"
                >
                  <MapArtwork project={result} />
                </svg>
                <p className="mt-4 text-sm">
                  {result.locations.length} locais · {result.annotations.length}{' '}
                  elementos editáveis
                </p>
                <p className="text-xs text-stone-400 mt-2">
                  Locais são distribuídos em terra. Estradas conectam povoações
                  na mesma massa de terra; rios dependem de nascentes com
                  caminho até o mar. A quantidade final depende do espaço
                  disponível.
                </p>
              </>
            ) : (
              <div className="h-96 flex items-center justify-center text-stone-500">
                {busy
                  ? 'Construindo terreno e elementos...'
                  : 'Configure e clique em Forjar Preview.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
