/* ============================================================
 * Núcleo orientado a objetos do atlas de linhagens.
 * Person  → valor imutável representando um indivíduo.
 * FamilyTree → coleção com operações que retornam novas
 *              instâncias (compatível com React), protegendo
 *              integridade referencial e evitando ciclos.
 * ============================================================ */

export type Status = "vivo" | "falecido" | "desconhecido";

export type RelationType =
  | "amante"
  | "amigo"
  | "inimigo"
  | "rival"
  | "mentor"
  | "discipulo"
  | "jurado";

export interface PersonRelation {
  targetId: string;
  type: RelationType;
  notes?: string;
}

export interface PersonInit {
  id: string;
  name: string;
  epithet?: string;
  affiliation?: string;
  notes?: string;
  era?: string;
  portrait?: string | null;
  coatOfArms?: string | null;
  status?: Status;
  parentIds?: string[];
  partnerIds?: string[];
  relations?: PersonRelation[];
  birthOrder?: number;
  createdAt?: number;
}

export class Person {
  readonly id: string;
  readonly name: string;
  readonly epithet: string;
  readonly affiliation: string;
  readonly notes: string;
  readonly era: string;
  readonly portrait: string | null;
  readonly coatOfArms: string | null;
  readonly status: Status;
  readonly parentIds: readonly string[];
  readonly partnerIds: readonly string[];
  readonly relations: readonly PersonRelation[];
  readonly birthOrder: number;
  readonly createdAt: number;

  constructor(init: PersonInit) {
    this.id = init.id;
    this.name = init.name.trim();
    this.epithet = (init.epithet ?? "").trim();
    this.affiliation = (init.affiliation ?? "").trim();
    this.notes = (init.notes ?? "").trim();
    this.era = (init.era ?? "").trim();
    this.portrait = init.portrait ?? null;
    this.coatOfArms = init.coatOfArms ?? null;
    this.status = init.status ?? "vivo";
    this.parentIds = [...(init.parentIds ?? [])];
    this.partnerIds = [...(init.partnerIds ?? [])];
    this.relations = [...(init.relations ?? [])];
    this.birthOrder = init.birthOrder ?? 0;
    this.createdAt = init.createdAt ?? Date.now();
  }

  /** Cria uma cópia com campos substituídos (imutabilidade). */
  copy(patch: Partial<PersonInit>): Person {
    return new Person({ ...this, ...patch });
  }

  get initials(): string {
    const parts = this.name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  get isDead(): boolean {
    return this.status === "falecido";
  }
}

/* ------------------------------------------------------------ */

export interface TreeJSON {
  kind: "linhagem";
  version: number;
  persons: PersonInit[];
}

export interface TreeStats {
  members: number;
  bonds: number;
  houses: number;
  generations: number;
}

export class FamilyTree {
  private readonly persons: Map<string, Person>;

  private constructor(persons: Map<string, Person>) {
    this.persons = persons;
  }

  static empty(): FamilyTree {
    return new FamilyTree(new Map());
  }

  /** Reconstrói a árvore a partir de JSON, validando a estrutura. */
  static from(data: unknown): FamilyTree {
    if (!data || typeof data !== "object") throw new Error("Arquivo inválido.");
    const json = data as Partial<TreeJSON>;
    if (json.kind !== "linhagem" || !Array.isArray(json.persons)) {
      throw new Error("Este arquivo não é um atlas de linhagens válido.");
    }
    const map = new Map<string, Person>();
    for (const raw of json.persons) {
      if (!raw || typeof raw.id !== "string" || typeof raw.name !== "string") {
        throw new Error("Registro de membro corrompido no arquivo.");
      }
      map.set(raw.id, new Person(raw));
    }
    return new FamilyTree(map);
  }

  /* ---------------- consultas ---------------- */

  has(id: string): boolean {
    return this.persons.has(id);
  }

  get(id: string): Person | undefined {
    return this.persons.get(id);
  }

  all(): Person[] {
    return [...this.persons.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  get size(): number {
    return this.persons.size;
  }

  parentsOf(id: string): Person[] {
    const p = this.persons.get(id);
    if (!p) return [];
    return p.parentIds.map((x) => this.persons.get(x)).filter((x): x is Person => !!x);
  }

  partnersOf(id: string): Person[] {
    const p = this.persons.get(id);
    if (!p) return [];
    return p.partnerIds.map((x) => this.persons.get(x)).filter((x): x is Person => !!x);
  }

  childrenOf(id: string): Person[] {
    return this.all().filter((p) => p.parentIds.includes(id));
  }

  siblingsOf(id: string): Person[] {
    const p = this.persons.get(id);
    if (!p || p.parentIds.length === 0) return [];
    const parentSet = new Set(p.parentIds);
    return this.all().filter(
      (o) => o.id !== id && o.parentIds.some((x) => parentSet.has(x)),
    );
  }

  /** Verifica se `candidate` é descendente de `ancestorId`. */
  isDescendant(candidateId: string, ancestorId: string): boolean {
    const seen = new Set<string>();
    const stack = [ancestorId];
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const child of this.childrenOf(cur)) {
        if (child.id === candidateId) return true;
        stack.push(child.id);
      }
    }
    return false;
  }

  affiliations(): string[] {
    const set = new Set<string>();
    for (const p of this.persons.values()) {
      if (p.affiliation) set.add(p.affiliation);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  stats(): TreeStats {
    let parentBonds = 0;
    let partnerBonds = 0;
    for (const p of this.persons.values()) {
      parentBonds += p.parentIds.filter((x) => this.persons.has(x)).length;
      partnerBonds += p.partnerIds.filter((x) => this.persons.has(x)).length;
    }
    return {
      members: this.persons.size,
      bonds: Math.round(parentBonds + partnerBonds / 2),
      houses: this.affiliations().length,
      generations: this.generations(),
    };
  }

  generations(): number {
    if (this.persons.size === 0) return 0;
    const gen = new Map<string, number>();
    const resolve = (id: string, trail: Set<string>): number => {
      if (gen.has(id)) return gen.get(id)!;
      if (trail.has(id)) return 0; // ciclo — protege a recursão
      const p = this.persons.get(id);
      if (!p) return 0;
      trail.add(id);
      const parents = p.parentIds.filter((x) => this.persons.has(x));
      let g = 0;
      if (parents.length > 0) {
        g = Math.max(...parents.map((x) => resolve(x, trail))) + 1;
      } else {
        const partners = p.partnerIds.filter((x) => this.persons.has(x));
        if (partners.length > 0) {
          g = Math.max(...partners.map((x) => resolve(x, trail)));
        }
      }
      trail.delete(id);
      gen.set(id, g);
      return g;
    };
    let max = 0;
    for (const id of this.persons.keys()) max = Math.max(max, resolve(id, new Set()));
    return max + 1;
  }

  /* ---------------- mutações (retornam nova instância) ---------------- */

  private mutate(fn: (draft: Map<string, Person>) => void): FamilyTree {
    const draft = new Map(this.persons);
    fn(draft);
    return new FamilyTree(draft);
  }

  add(person: Person): FamilyTree {
    return this.mutate((d) => d.set(person.id, person));
  }

  update(id: string, patch: Partial<PersonInit>): FamilyTree {
    const p = this.persons.get(id);
    if (!p) return this;
    return this.mutate((d) => d.set(id, p.copy(patch)));
  }

  remove(id: string): FamilyTree {
    if (!this.persons.has(id)) return this;
    return this.mutate((d) => {
      d.delete(id);
      for (const [key, other] of d) {
        if (other.parentIds.includes(id) || other.partnerIds.includes(id) || other.relations.some((r) => r.targetId === id)) {
          d.set(
            key,
            other.copy({
              parentIds: other.parentIds.filter((x) => x !== id),
              partnerIds: other.partnerIds.filter((x) => x !== id),
              relations: other.relations.filter((r) => r.targetId !== id),
            }),
          );
        }
      }
    });
  }

  /** Vincula um progenitor a um indivíduo (impede ciclos). */
  linkParent(childId: string, parentId: string): FamilyTree {
    if (childId === parentId) return this;
    if (this.isDescendant(parentId, childId)) return this; // criaria ciclo
    const child = this.persons.get(childId);
    if (!child || !this.persons.has(parentId)) return this;
    if (child.parentIds.includes(parentId)) return this;
    return this.mutate((d) =>
      d.set(childId, child.copy({ parentIds: [...child.parentIds, parentId] })),
    );
  }

  unlinkParent(childId: string, parentId: string): FamilyTree {
    const child = this.persons.get(childId);
    if (!child) return this;
    return this.mutate((d) =>
      d.set(childId, child.copy({ parentIds: child.parentIds.filter((x) => x !== parentId) })),
    );
  }

  /** Vínculo de parceria/conjugal — simétrico nos dois lados. */
  linkPartner(a: string, b: string): FamilyTree {
    if (a === b) return this;
    const pa = this.persons.get(a);
    const pb = this.persons.get(b);
    if (!pa || !pb) return this;
    if (pa.partnerIds.includes(b)) return this;
    return this.mutate((d) => {
      d.set(a, pa.copy({ partnerIds: [...pa.partnerIds, b] }));
      d.set(b, pb.copy({ partnerIds: [...pb.partnerIds, a] }));
    });
  }

  unlinkPartner(a: string, b: string): FamilyTree {
    const pa = this.persons.get(a);
    const pb = this.persons.get(b);
    if (!pa || !pb) return this;
    return this.mutate((d) => {
      d.set(a, pa.copy({ partnerIds: pa.partnerIds.filter((x) => x !== b) }));
      d.set(b, pb.copy({ partnerIds: pb.partnerIds.filter((x) => x !== a) }));
    });
  }

  /** Adiciona ou atualiza um vínculo social / interpessoal (amante, amigo, inimigo, etc.) */
  linkRelation(sourceId: string, targetId: string, type: RelationType, notes?: string): FamilyTree {
    if (sourceId === targetId) return this;
    const source = this.persons.get(sourceId);
    const target = this.persons.get(targetId);
    if (!source || !target) return this;

    return this.mutate((d) => {
      // atualiza no lado source
      const filteredSource = source.relations.filter((r) => r.targetId !== targetId);
      d.set(sourceId, source.copy({ relations: [...filteredSource, { targetId, type, notes }] }));

      // se for recíproco por padrão (amigo, inimigo, rival, amante)
      if (type === "amigo" || type === "inimigo" || type === "rival" || type === "amante") {
        const filteredTarget = target.relations.filter((r) => r.targetId !== sourceId);
        d.set(targetId, target.copy({ relations: [...filteredTarget, { targetId: sourceId, type, notes }] }));
      } else if (type === "mentor") {
        // recíproco de mentor é discípulo
        const filteredTarget = target.relations.filter((r) => r.targetId !== sourceId);
        d.set(targetId, target.copy({ relations: [...filteredTarget, { targetId: sourceId, type: "discipulo", notes }] }));
      } else if (type === "discipulo") {
        const filteredTarget = target.relations.filter((r) => r.targetId !== sourceId);
        d.set(targetId, target.copy({ relations: [...filteredTarget, { targetId: sourceId, type: "mentor", notes }] }));
      }
    });
  }

  unlinkRelation(sourceId: string, targetId: string): FamilyTree {
    const source = this.persons.get(sourceId);
    const target = this.persons.get(targetId);
    return this.mutate((d) => {
      if (source) {
        d.set(
          sourceId,
          source.copy({ relations: source.relations.filter((r) => r.targetId !== targetId) }),
        );
      }
      if (target) {
        d.set(
          targetId,
          target.copy({ relations: target.relations.filter((r) => r.targetId !== sourceId) }),
        );
      }
    });
  }

  relationsOf(id: string): { target: Person; type: RelationType; notes?: string }[] {
    const p = this.persons.get(id);
    if (!p) return [];
    const results: { target: Person; type: RelationType; notes?: string }[] = [];
    for (const r of p.relations) {
      const target = this.persons.get(r.targetId);
      if (target) {
        results.push({ target, type: r.type, notes: r.notes });
      }
    }
    return results;
  }

  /* ---------------- serialização ---------------- */

  toJSON(): TreeJSON {
    return {
      kind: "linhagem",
      version: 1,
      persons: this.all().map((p) => ({
        id: p.id,
        name: p.name,
        epithet: p.epithet,
        affiliation: p.affiliation,
        notes: p.notes,
        era: p.era,
        portrait: p.portrait,
        coatOfArms: p.coatOfArms,
        status: p.status,
        parentIds: [...p.parentIds],
        partnerIds: [...p.partnerIds],
        relations: [...p.relations],
        birthOrder: p.birthOrder,
        createdAt: p.createdAt,
      })),
    };
  }

  serialize(): string {
    return JSON.stringify(this.toJSON());
  }
}
