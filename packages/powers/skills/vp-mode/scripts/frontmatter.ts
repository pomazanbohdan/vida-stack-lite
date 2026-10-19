// Supports flat scalars and block lists; rejects nested maps, tags, aliases, block scalars, and other flow values to stay deterministic without YAML dependencies.
// Plain values keep =, ;, and # literal; unquoted : is rejected; key: followed by a non-indented line means ''.
// defineProperty keeps __proto__ and constructor as ordinary data keys; duplicate keys fail. Only key values accept exact [] (never list items).
// Only \\" and \\\\ escapes are accepted in double-quoted values; opening/closing --- delimiters may have trailing whitespace.
export type Frontmatter = { data: Record<string, unknown>; body: string };

export class FrontmatterError extends Error {
  readonly line: number;

  constructor(message: string, line: number) {
    super(message);
    this.name = 'FrontmatterError';
    this.line = line;
  }
}

type SourceLine = { text: string; end: number; number: number };

function fail(message: string, line: number): never {
  throw new FrontmatterError(message, line);
}

function sourceLines(source: string): SourceLine[] {
  const lines: SourceLine[] = [];
  let start = 0;
  let number = 1;
  while (start < source.length) {
    const newline = source.indexOf('\n', start);
    const end = newline === -1 ? source.length : newline + 1;
    let text = source.slice(start, newline === -1 ? end : newline);
    if (text.endsWith('\r')) text = text.slice(0, -1);
    lines.push({ text, end, number });
    number += 1;
    start = end;
  }
  return lines;
}

function isCommentOrBlank(line: string): boolean {
  return line.trim() === '' || line.trimStart().startsWith('#');
}

function scalar(value: string, line: number, allowEmptyArray: boolean): unknown {
  const text = value.trim();
  if (text.startsWith('"')) {
    let result = '';
    for (let index = 1; index < text.length; index += 1) {
      const character = text[index];
      if (character === '\\') {
        const escaped = text[index + 1];
        if (escaped !== '"' && escaped !== '\\') fail('unsupported escape sequence', line);
        result += escaped;
        index += 1;
      } else if (character === '"') {
        if (index !== text.length - 1) fail('malformed quoted value', line);
        return result;
      } else {
        result += character;
      }
    }
    fail('unterminated quoted value', line);
  }
  if (text.startsWith("'")) fail('unsupported single-quoted value', line);
  if (text.includes('"')) fail('malformed quoted value', line);
  if (text.startsWith('|') || text.startsWith('>')) fail('unsupported block scalar', line);
  if (text.startsWith('&') || text.startsWith('*')) fail('unsupported anchor or alias', line);
  if (text.startsWith('!')) fail('unsupported YAML tag', line);
  if (text === '[]' && allowEmptyArray) return [];
  if (text.startsWith('[') || text.startsWith('{') || text.startsWith('}') || text.startsWith(']')) fail('unsupported flow value', line);
  if (text.startsWith('- ')) fail('unsupported nested list', line);
  if (text.includes(':')) fail('unquoted colon in value', line);
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(text)) return Number(text);
  return text;
}

function put(data: Record<string, unknown>, key: string, value: unknown, line: number): void {
  if (Object.prototype.hasOwnProperty.call(data, key)) fail(`duplicate key: ${key}`, line);
  Object.defineProperty(data, key, { value, enumerable: true, configurable: true, writable: true });
}

function stripLeadingBlankLines(body: string): string {
  let result = body;
  while (result.length > 0) {
    const newline = result.indexOf('\n');
    const end = newline === -1 ? result.length : newline;
    const content = result.slice(0, end).replace(/\r$/, '');
    if (content.trim() !== '') break;
    result = newline === -1 ? '' : result.slice(newline + 1);
  }
  return result;
}

export function parseFrontmatter(text: string): Frontmatter {
  const source = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const lines = sourceLines(source);
  if (lines[0]?.text.trimEnd() !== '---') fail('frontmatter block is missing', 1);
  const closingIndex = lines.findIndex((line, index) => index > 0 && line.text.trimEnd() === '---');
  if (closingIndex === -1) fail('frontmatter block is not closed', Math.max(1, lines.length));

  const data: Record<string, unknown> = {};
  let index = 1;
  while (index < closingIndex) {
    const line = lines[index];
    if (line === undefined) break;
    if (isCommentOrBlank(line.text)) { index += 1; continue; }
    if (line.text !== line.text.trimStart()) fail('nested mappings are unsupported', line.number);

    const match = /^([^:]+):(?:[ \t]+(.*))?$/.exec(line.text);
    if (match === null) fail('invalid frontmatter entry', line.number);
    const key = match[1] ?? '';
    if (!/^[A-Za-z0-9_.-]+$/.test(key)) fail(`invalid frontmatter key: ${key}`, line.number);
    const rawValue = (match[2] ?? '').trim();
    if (rawValue !== '') {
      put(data, key, scalar(rawValue, line.number, true), line.number);
      index += 1;
      continue;
    }

    let probe = index + 1;
    while (probe < closingIndex && lines[probe] !== undefined && isCommentOrBlank(lines[probe]?.text ?? '')) probe += 1;
    const firstItem = lines[probe];
    if (firstItem === undefined || probe >= closingIndex || firstItem.text === firstItem.text.trimStart()) {
      put(data, key, '', line.number);
      index += 1;
      continue;
    }
    if (!/^  -(?:\s|$)/.test(firstItem.text)) {
      if (firstItem.text.trimStart().startsWith('|') || firstItem.text.trimStart().startsWith('>')) fail('unsupported block scalar', firstItem.number);
      fail('nested mappings are unsupported', firstItem.number);
    }

    const items: unknown[] = [];
    let cursor = probe;
    while (cursor < closingIndex) {
      const itemLine = lines[cursor];
      if (itemLine === undefined) break;
      if (isCommentOrBlank(itemLine.text)) { cursor += 1; continue; }
      const itemMatch = /^  -(?:[ \t]+(.*)|[ \t]*)$/.exec(itemLine.text);
      if (itemMatch === null) {
        if (itemLine.text !== itemLine.text.trimStart()) fail('nested mappings or lists are unsupported', itemLine.number);
        break;
      }
      const itemValue = itemMatch[1] ?? '';
      items.push(scalar(itemValue, itemLine.number, false));
      cursor += 1;
    }
    // The first item matched before entering the loop, so every successful pass adds at least one item.
    put(data, key, items, line.number);
    index = cursor;
  }

  const closingLine = lines[closingIndex];
  const rawBody = closingLine === undefined ? '' : source.slice(closingLine.end);
  return { data, body: stripLeadingBlankLines(rawBody) };
}
