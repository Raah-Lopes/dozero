export interface WikiEntry {
  path: string;
  slug: string;
  metadata: Record<string, any>;
}

export class WikiQuery {
  private results: WikiEntry[];

  constructor(index: WikiEntry[]) {
    this.results = [...index];
  }

  where(key: string, value: any): WikiQuery {
    this.results = this.results.filter(entry => entry.metadata[key] === value);
    return this;
  }

  filter(predicate: (meta: Record<string, any>) => boolean): WikiQuery {
    this.results = this.results.filter(entry => predicate(entry.metadata));
    return this;
  }

  containsTag(tag: string): WikiQuery {
    this.results = this.results.filter(entry => {
      const ObjectTags = entry.metadata.tags;
      // Trata tanto arrays de tags quanto string separada por vírgula, caso o usuário tenha digitado errado
      if (Array.isArray(ObjectTags)) {
        return ObjectTags.includes(tag);
      } else if (typeof ObjectTags === 'string') {
        return ObjectTags.split(',').map(t => t.trim()).includes(tag);
      }
      return false;
    });
    return this;
  }

  sortBy(key: string, order: 'asc' | 'desc' = 'asc'): WikiQuery {
    this.results.sort((a, b) => {
      const valA = a.metadata[key];
      const valB = b.metadata[key];
      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });
    return this;
  }

  get(): WikiEntry[] {
    return this.results;
  }
}
