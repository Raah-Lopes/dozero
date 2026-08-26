import type { Person } from "../model/tree";
import { hashString, houseColors } from "../lib/utils";

/**
 * Retrato heráldico: usa a imagem enviada quando existe;
 * caso contrário gera um sigilo procedural nas cores da casa.
 */
export function Sigil({
  person,
  className = "",
  rounded = false,
}: {
  person: Person;
  className?: string;
  rounded?: boolean;
}) {
  const { accent, deep } = houseColors(person.affiliation || person.name);
  const variant = hashString(person.id) % 4;

  return (
    <div className={`relative h-full w-full overflow-hidden ${rounded ? "rounded-full" : ""} ${className}`}>
      {person.portrait ? (
        <img
          src={person.portrait}
          alt={`Retrato de ${person.name}`}
          draggable={false}
          className={`h-full w-full object-cover object-top select-none ${
            person.isDead ? "grayscale contrast-[.92] brightness-90" : ""
          }`}
        />
      ) : (
        <div
          className={`relative flex h-full w-full items-center justify-center overflow-hidden select-none ${
            person.isDead ? "grayscale brightness-90" : ""
          }`}
          style={{ background: `linear-gradient(150deg, ${deep} 0%, #10150f 130%)` }}
        >
          {/* trama diagonal */}
          <svg className="absolute inset-0 h-full w-full opacity-[0.16]" aria-hidden>
            <defs>
              <pattern id={`hatch-${person.id}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="10" stroke={accent} strokeWidth="1.4" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#hatch-${person.id})`} />
          </svg>
          {/* moldura em losango */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
            <rect x="24" y="24" width="52" height="52" transform="rotate(45 50 50)" fill="none" stroke={accent} strokeOpacity="0.5" strokeWidth="1.2" />
            {variant === 0 && <path d="M50 14l4 7h-8z" fill={accent} fillOpacity="0.65" />}
            {variant === 1 && <circle cx="50" cy="17" r="3.2" fill="none" stroke={accent} strokeOpacity="0.65" strokeWidth="1.2" />}
            {variant === 2 && <path d="M46 14h8l-4 6z" fill={accent} fillOpacity="0.65" />}
            {variant === 3 && <path d="M44 17h12M50 12v10" stroke={accent} strokeOpacity="0.65" strokeWidth="1.2" />}
          </svg>
          <span
            className="font-display font-bold tracking-wider"
            style={{ color: accent, fontSize: "1.9em", textShadow: `0 2px 12px ${deep}` }}
          >
            {person.initials}
          </span>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: `inset 0 0 0 1px ${accent}33, inset 0 -24px 30px rgba(0,0,0,0.45)` }}
          />
        </div>
      )}

      {/* Brasão Heráldico da Família (se houver imagem de brasão) */}
      {person.coatOfArms && (
        <div
          className="absolute bottom-1 left-2 z-10 h-7 w-7 overflow-hidden rounded-full border border-brass/80 bg-ink-950/90 shadow-md backdrop-blur-sm"
          title={`Brasão da ${person.affiliation || "Família"}`}
        >
          <img
            src={person.coatOfArms}
            alt="Brasão"
            className="h-full w-full object-contain p-0.5"
          />
        </div>
      )}
    </div>
  );
}
