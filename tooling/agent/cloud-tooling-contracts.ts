type CloudTool = {
  name: string;
  version: string;
  url: string;
  sha256: string;
  archive: 'tar' | 'zip';
  binaries: string[];
};

type CloudToolLock = {
  tools: CloudTool[];
  semanticModel: { repository: string; revision: string; files: Record<string, string> };
};

export async function runCloudToolWithCleanup(body: () => Promise<void>, cleanup: () => Promise<void>): Promise<void> {
  let bodyFailed = false;
  let bodyError: unknown;
  try {
    await body();
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
  }
  try {
    await cleanup();
  } catch (cleanupError) {
    if (bodyFailed)
      throw new AggregateError([bodyError, cleanupError], 'Cloud tool work and cleanup failed', { cause: bodyError });
    throw cleanupError;
  }
  if (bodyFailed) throw bodyError;
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const sha256 = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const safeName = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(value);
const safeFilename = (value: string): boolean => /^[A-Za-z0-9._-]+$/.test(value) && value !== '.' && value !== '..';

export function parseCloudToolLock(source: string): CloudToolLock {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error('Invalid Cloud tooling lock JSON.');
  }
  if (!record(value) || !Array.isArray(value.tools) || !record(value.semanticModel)) {
    throw new Error('Invalid Cloud tooling lock shape.');
  }
  const tools = value.tools;
  if (
    tools.length === 0 ||
    !tools.every(
      (tool) =>
        record(tool) &&
        safeName(tool.name) &&
        nonempty(tool.version) &&
        typeof tool.url === 'string' &&
        /^https:\/\//.test(tool.url) &&
        sha256(tool.sha256) &&
        (tool.archive === 'tar' || tool.archive === 'zip') &&
        Array.isArray(tool.binaries) &&
        tool.binaries.length > 0 &&
        tool.binaries.every((binary) => typeof binary === 'string' && safeFilename(binary)) &&
        new Set(tool.binaries).size === tool.binaries.length,
    )
  ) {
    throw new Error('Invalid Cloud tooling lock tool entry.');
  }
  if (new Set(tools.map((tool) => (tool as Record<string, unknown>).name)).size !== tools.length) {
    throw new Error('Duplicate Cloud tooling lock tool name.');
  }
  const binaries = tools.flatMap((tool) => (tool as Record<string, unknown>).binaries as string[]);
  if (new Set(binaries).size !== binaries.length) throw new Error('Duplicate Cloud tooling lock binary.');
  const model = value.semanticModel;
  if (
    !nonempty(model.repository) ||
    !nonempty(model.revision) ||
    !record(model.files) ||
    Object.keys(model.files).length === 0 ||
    !Object.entries(model.files).every(([name, digest]) => safeFilename(name) && sha256(digest))
  ) {
    throw new Error('Invalid Cloud tooling lock semantic model.');
  }
  return value as CloudToolLock;
}

export function parseCloudToolReceipt(
  source: string,
): { archiveSha256: string; binaries: Record<string, string> } | null {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return null;
  }
  if (
    !record(value) ||
    !sha256(value.archiveSha256) ||
    !record(value.binaries) ||
    !Object.entries(value.binaries).every(([name, digest]) => nonempty(name) && sha256(digest))
  )
    return null;
  return value as { archiveSha256: string; binaries: Record<string, string> };
}

export type CloudMcpReply = {
  id?: number;
  error?: unknown;
  result?: {
    tools?: { name: string }[];
    content?: { type: string; text?: string }[];
    isError?: boolean;
    structuredContent?: { exitCode?: number };
    instructions?: string;
  };
};

export function parseCloudMcpReply(source: string): CloudMcpReply {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error('Malformed MCP reply JSON.');
  }
  if (
    record(value) &&
    value.jsonrpc === '2.0' &&
    value.id === undefined &&
    nonempty(value.method) &&
    value.result === undefined &&
    value.error === undefined &&
    (value.params === undefined || record(value.params))
  )
    return {};
  if (
    !record(value) ||
    value.jsonrpc !== '2.0' ||
    !Number.isSafeInteger(value.id) ||
    (value.error !== undefined && !record(value.error)) ||
    (value.result !== undefined && !record(value.result)) ||
    (value.result === undefined) === (value.error === undefined)
  )
    throw new Error('Malformed MCP reply shape.');
  if (record(value.result)) {
    const result = value.result;
    if (result.isError !== undefined && typeof result.isError !== 'boolean')
      throw new Error('Malformed MCP reply result.');
    if (result.instructions !== undefined && typeof result.instructions !== 'string')
      throw new Error('Malformed MCP reply instructions.');
    if (
      result.tools !== undefined &&
      (!Array.isArray(result.tools) || !result.tools.every((tool) => record(tool) && nonempty(tool.name)))
    ) {
      throw new Error('Malformed MCP reply tools.');
    }
    if (
      result.content !== undefined &&
      (!Array.isArray(result.content) ||
        !result.content.every(
          (item) => record(item) && nonempty(item.type) && (item.text === undefined || typeof item.text === 'string'),
        ))
    ) {
      throw new Error('Malformed MCP reply content.');
    }
    if (
      result.structuredContent !== undefined &&
      (!record(result.structuredContent) ||
        (result.structuredContent.exitCode !== undefined && !Number.isSafeInteger(result.structuredContent.exitCode)))
    ) {
      throw new Error('Malformed MCP reply structured content.');
    }
  }
  return value as CloudMcpReply;
}

export const cloudReplyBufferLimit = 1_048_576;

export function appendBoundedCloudReply(buffer: string, part: string): string {
  let length = buffer.length;
  let start = 0;
  let newline: number;
  while ((newline = part.indexOf('\n', start)) >= 0) {
    if (length + newline - start > cloudReplyBufferLimit) throw new Error('Cloud MCP reply exceeded the buffer limit.');
    length = 0;
    start = newline + 1;
  }
  if (length + part.length - start > cloudReplyBufferLimit)
    throw new Error('Cloud MCP reply exceeded the buffer limit.');
  return buffer + part;
}

export function repairCloudToolProfile(profile: Buffer, marker: string, sourceLine: string): Buffer {
  const text = profile.toString('utf8');
  const markerBytes = Buffer.from(marker);
  const positions: number[] = [];
  for (let offset = 0; (offset = profile.indexOf(markerBytes, offset)) >= 0; offset += markerBytes.length)
    positions.push(offset);
  if (positions.length > 1) throw new Error('Multiple Cloud tooling profile markers are ambiguous.');
  const newline = profile.includes(Buffer.from('\r\n')) ? '\r\n' : '\n';
  if (positions.length === 0)
    return Buffer.concat([profile, Buffer.from(`${newline}${marker}${newline}${sourceLine}${newline}`)]);
  const position = positions[0]!;
  const hasBom = position === 3 && profile.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]));
  if (position > 0 && profile[position - 1] !== 0x0a && !hasBom) {
    throw new Error('Cloud tooling profile marker is embedded in user content; refusing repair.');
  }
  const afterMarker = profile.subarray(position + markerBytes.length);
  const suffix = afterMarker.toString('utf8');
  for (const ending of ['\r\n', '\n']) {
    const expected = `${ending}${sourceLine}`;
    if (suffix.startsWith(expected)) {
      const tail = suffix.slice(expected.length);
      if (tail.length === 0 || tail.startsWith('\r\n') || tail.startsWith('\n')) return profile;
    }
  }
  if (afterMarker.length === 0 && text.endsWith(marker)) {
    return Buffer.concat([profile, Buffer.from(`${newline}${sourceLine}${newline}`)]);
  }
  if (suffix === '\n' || suffix === '\r\n') {
    const ending = suffix;
    return Buffer.concat([profile, Buffer.from(`${sourceLine}${ending}`)]);
  }
  throw new Error('Cloud tooling profile marker has unowned trailing content; refusing repair.');
}
