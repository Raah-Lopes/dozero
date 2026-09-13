import React from 'react';
import { X } from 'lucide-react';
import { MapLocation, LocationType } from '../types';
import LocationIconPicker from './LocationIconPicker';
import { locationTypes, locationIcons } from '../utils/locationIcons';
import Accordion from './Accordion';
interface LocationDetailDrawerProps {
  location: MapLocation;
  onClose: () => void;
  onUpdateLocation: (id: string, updates: Partial<MapLocation>) => void;
  onOpenMap?: (id: string) => void;
  projects?: { id: string; name: string }[]; // minimal shape needed for linked map selector
}

export default function LocationDetailDrawer({
  location,
  onClose,
  onUpdateLocation,
  onOpenMap,
  projects = [],
}: LocationDetailDrawerProps) {
  return (
    <section
      className="w-full min-w-0 h-full overflow-y-auto"
      style={{ background: 'var(--dz-graphite-2)' }}
      aria-label={`Detalhes de ${location.name}`}
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'var(--dz-stone)' }}>
        <h4 className="font-display text-[14px] tracking-wide" style={{ color: 'var(--dz-amber-2)' }}>
          {location.name}
        </h4>
        <button
          onClick={onClose}
          aria-label="Fechar detalhes"
          className="p-1"
          style={{ color: 'var(--dz-ash)' }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <Accordion title="Mapa vinculado" defaultOpen>
        <label className="block text-xs">
          Mapa vinculado{' '}
          <select
            aria-label="Mapa vinculado"
            value={location.linkedMapId || ''}
            onChange={e =>
              onUpdateLocation(location.id, {
                linkedMapId: e.target.value || undefined,
              })
            }
            className="w-full mt-1"
          >
            <option value="">Nenhum</option>
            {projects
              .filter(p => p.id !== location.id)
              .map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        {location.linkedMapId &&
          projects.some(p => p.id === location.linkedMapId) && (
            <button className="dz-button" onClick={() => onOpenMap?.(location.linkedMapId!)}>
              Abrir mapa vinculado
            </button>
          )}

        </Accordion>
<Accordion title="Tipo" defaultOpen>
        <label className="block text-xs">
          Tipo{' '}
          <select
            aria-label="Tipo do local"
            value={location.type}
            onChange={e =>
              onUpdateLocation(location.id, {
                type: e.target.value as LocationType,
              })
            }
            className="w-full mt-1"
          >
            {locationTypes.map(t => (
              <option key={t} value={t}>
                {locationIcons[t].label}
              </option>
            ))}
          </select>
        </label>

        </Accordion>
        <LocationIconPicker
          key={location.id}
          location={location}
          disabled={false}
          onChange={updates => onUpdateLocation(location.id, updates)}
        />
<Accordion title="Visibilidade" defaultOpen={false}>
        <label className="block text-xs flex items-center gap-2">
          <input
            type="checkbox"
            aria-label="Mostrar local no mapa"
            checked={!location.hidden}
            onChange={e =>
              onUpdateLocation(location.id, { hidden: !e.target.checked })
            }
          />{' '}
          Mostrar local no mapa
        </label>

        </Accordion>
        <Accordion title="Tags" defaultOpen={false}>
          <label className="block text-xs">
            Tags (separadas por vírgula){' '}
            <input
              aria-label="Tags do local"
              value={location.tags.join(',')}
              onChange={e =>
                onUpdateLocation(location.id, { tags: e.target.value.split(',') })
              }
              className="w-full mt-1"
            />
          </label>
        </Accordion>

        <Accordion title="Posição & Coordenadas" defaultOpen={false}>
          {/* Position inputs */}
          <div className="flex gap-2">
            {(['x', 'y'] as const).map(axis => (
              <label key={axis} className="text-xs flex flex-col">
                {axis.toUpperCase()} %
                <input
                  aria-label={`Posição ${axis}`}
                  type="number"
                  className="w-24"
                  min="0"
                  max="100"
                  value={location[axis]}
                  onChange={e =>
                    onUpdateLocation(location.id, {
                      [axis]: Math.min(100, Math.max(0, +e.target.value)),
                    })
                  }
                />
              </label>
            ))}
          </div>
          <div className="pt-2 border-t flex items-center gap-2 mt-2" style={{ borderColor: 'var(--dz-stone)' }}>
            <span className="label-caps">Posição</span>
            <span className="font-mono text-[11px]" style={{ color: 'var(--dz-parchment-2)' }}>
              ({Math.round(location.x)}%, {Math.round(location.y)}%)
            </span>
          </div>
        </Accordion>

        <Accordion title="Detalhes & Notas" defaultOpen>
          {/* Name */}
          <div className="mb-3">
            <label className="label-caps block mb-1">Nome</label>
            <input
              type="text"
              value={location.name}
              onChange={e => onUpdateLocation(location.id, { name: e.target.value })}
              className="w-full"
              style={{ fontSize: '12px' }}
            />
          </div>

          {/* Description */}
          <div className="mb-3">
            <label className="label-caps block mb-1">Descrição</label>
            <textarea
              value={location.description}
              onChange={e => onUpdateLocation(location.id, { description: e.target.value })}
              className="w-full resize-none"
              rows={2}
              style={{ fontSize: '12px' }}
            />
          </div>

          {/* Notes */}
          <div className="mb-3">
            <label className="label-caps block mb-1">Notas</label>
            <textarea
              value={location.notes}
              onChange={e => onUpdateLocation(location.id, { notes: e.target.value })}
              className="w-full resize-none"
              rows={2}
              style={{ fontSize: '12px' }}
            />
          </div>

          {/* Color picker */}
          <div className="flex items-center gap-2">
            <label className="label-caps">Cor</label>
            <input
              type="color"
              value={location.color}
              onChange={e => onUpdateLocation(location.id, { color: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer"
              style={{ border: '1px solid var(--dz-stone)' }}
            />
          </div>
        </Accordion>
      </div>
    </section>
  );
}
