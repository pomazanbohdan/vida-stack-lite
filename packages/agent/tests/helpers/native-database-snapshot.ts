import type { Database, Statement } from 'bun:sqlite';

type NativeRow = Record<string, unknown>;
type SchemaRow = { type: string; name: string; sql: string | null };

export function nativeDatabaseSnapshotReader(database: Database) {
  const schema = database.query<SchemaRow, []>('SELECT type,name,sql FROM sqlite_master ORDER BY name');
  const readers = new Map<string, { definition: string | null; statement: Statement<NativeRow, []> }>();
  return () => {
    const definitions = schema.all();
    const tables: [string, NativeRow[]][] = [];
    for (const definition of definitions) {
      if (definition.type !== 'table') continue;
      let reader = readers.get(definition.name);
      if (!reader || reader.definition !== definition.sql) {
        const identifier = '"' + definition.name.replaceAll('"', '""') + '"';
        const columns = database.query<NativeRow, []>('SELECT * FROM ' + identifier).columnNames;
        if (columns.length === 0) throw new Error('Native fixture table has no columns: ' + definition.name);
        reader = {
          definition: definition.sql,
          statement: database.query<NativeRow, []>(
            'SELECT * FROM ' + identifier + ' ORDER BY ' + columns.map((_, index) => index + 1).join(','),
          ),
        };
        readers.set(definition.name, reader);
      }
      tables.push([definition.name, reader.statement.all()]);
    }
    return { schema: definitions, tables: Object.fromEntries(tables) };
  };
}
