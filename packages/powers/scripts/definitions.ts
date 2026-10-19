/**
 * Normative definition markers of the Vida Powers documentation.
 *
 * A BR/SR/AC/NFR item must be defined exactly once in the bundle: duplicates
 * are a real defect (a silently repeated block contradicts the trace between
 * research, requirements, specification and acceptance).
 */

const DEFINITION_PATTERNS: Array<[RegExp, string]> = [
  [/^-\s+\*\*(BR-\d+)\.\*\*/, 'BR'],
  [/^-\s+\*\*(SR-\d+[a-z]?)\.\*\*/, 'SR'],
  [/^-\s+\*\*(NFR-\d+)\.\*\*/, 'NFR'],
  [/^\|\s*(AC-\d+[a-z]?)\s*\|/, 'AC'],
];

export interface Definition {
  id: string;
  kind: string;
  file: string;
  line: number;
}

/** Collect normative definitions from markdown text (definition markers only). */
export function collectDefinitions(file: string, text: string): Definition[] {
  const found: Definition[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    for (const [pattern, kind] of DEFINITION_PATTERNS) {
      const match = pattern.exec(line);
      if (match) found.push({ id: match[1]!, kind, file, line: index + 1 });
    }
  });
  return found;
}

/** Group definitions that share an id; an id must be defined exactly once. */
export function findDuplicateDefinitions(definitions: Definition[]): Map<string, Definition[]> {
  const grouped = new Map<string, Definition[]>();
  for (const definition of definitions) {
    const bucket = grouped.get(definition.id) ?? [];
    bucket.push(definition);
    grouped.set(definition.id, bucket);
  }
  const duplicates = new Map<string, Definition[]>();
  for (const [id, bucket] of grouped) if (bucket.length > 1) duplicates.set(id, bucket);
  return duplicates;
}
