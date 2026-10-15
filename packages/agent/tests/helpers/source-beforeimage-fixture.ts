import { snapshotDeclaredSources } from '../../src/orchestration/scoped-source-snapshot.ts';

type SourceReader = Parameters<typeof snapshotDeclaredSources>[0];

/** Bytes belong to capture A; they never establish a later CAS observation. */
export function captureSourceBeforeimages(reader: SourceReader, paths: readonly string[]) {
  const captured = new Map<string, Buffer>();
  const retain = (target: string, bytes: Buffer | null) => {
    if (Buffer.isBuffer(bytes)) captured.set(target, Buffer.from(bytes));
    return bytes;
  };
  const stableRead = reader.readStableBytes;
  const source = snapshotDeclaredSources(
    {
      ...reader,
      fileExists: (target, label) => reader.fileExists(target, label),
      readBytes: (target, label) => {
        const bytes = reader.readBytes(target, label);
        retain(target, bytes);
        return bytes;
      },
      ...(stableRead === undefined
        ? {}
        : {
            readStableBytes: (target: string, label: string) => retain(target, stableRead.call(reader, target, label)),
          }),
    },
    paths,
  );
  const beforeimages = source.entries.map((entry) => {
    const bytes = captured.get(entry.path);
    if (!entry.exists || bytes === undefined) throw new Error('Source beforeimage capture requires every file.');
    return { path: entry.path, bytes_base64: bytes.toString('base64') };
  });
  return { source, beforeimages };
}
