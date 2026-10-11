function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`Invalid record: ${label}`);
  return value as Record<string, unknown>;
}

function counter(value: unknown, label: string): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error(`Invalid counter: ${label}`);
}

function validateBranchCoverage(
  file: string,
  id: string,
  branch: Record<string, unknown>,
  counters: Record<string, unknown>,
): void {
  const locations = branch.locations;
  const values = counters[id];
  if (!Array.isArray(locations) || !Array.isArray(values))
    throw new Error(`Branch locations or counters are missing: ${file}.${id}`);
  if (values.length !== locations.length) throw new Error(`Istanbul branch cardinality differs: ${file}.${id}`);
  for (let index = 0; index < values.length; index++) counter(values[index], `${file}.b.${id}.${index}`);
}

/** Validate counter structure against pinned instrumentation; this alone proves no coverage or provenance. */
export function validateIstanbulFileCoverage(file: string, value: unknown, expectedValue: unknown): void {
  const actual = record(value, `${file} coverage`);
  const expected = record(expectedValue, `${file} expected coverage`);
  if (actual.path !== expected.path) throw new Error(`Istanbul file identity mismatch: ${file}`);
  for (const [mapName, counterName] of [
    ['statementMap', 's'],
    ['fnMap', 'f'],
    ['branchMap', 'b'],
  ] as const) {
    const map = record(actual[mapName], `${file}.${mapName}`);
    const counters = record(actual[counterName], `${file}.${counterName}`);
    if (JSON.stringify(map) !== JSON.stringify(expected[mapName]))
      throw new Error(`Istanbul source map changed: ${file}.${mapName}`);
    const mapIds = Object.keys(map).sort();
    if (JSON.stringify(mapIds) !== JSON.stringify(Object.keys(counters).sort()))
      throw new Error(`Istanbul map/counters differ: ${file}.${counterName}`);
    for (const id of mapIds) {
      if (mapName === 'branchMap') {
        const branch = record(map[id], `${file}.${mapName}.${id}`);
        validateBranchCoverage(file, id, branch, counters);
      } else counter(counters[id], `${file}.${counterName}.${id}`);
    }
  }
}
