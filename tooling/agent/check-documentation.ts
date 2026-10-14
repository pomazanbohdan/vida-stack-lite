import { readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function markdownText(source: string): string {
  let fence = '';
  return source
    .split(/\r?\n/)
    .filter((line) => {
      const match = /^\s*(`{3,}|~{3,})/.exec(line);
      if (match) {
        const token = match[1]!;
        if (!fence) fence = token;
        else if (token[0] === fence[0] && token.length >= fence.length) fence = '';
        return false;
      }
      return !fence;
    })
    .join('\n');
}

export function headingAnchors(source: string): Set<string> {
  const anchors = new Set<string>();
  for (const match of markdownText(source).matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const stem = match[1]!
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '')
      .replace(/\s/g, '-');
    let anchor = stem;
    for (let index = 1; anchors.has(anchor); index++) anchor = stem + '-' + index;
    anchors.add(anchor);
  }
  return anchors;
}

type DocReader = (file: string) => string | undefined;
export function checkDocumentation(root: string, files: readonly string[], read: DocReader) {
  const cache = new Map<string, string | undefined>();
  const anchors = new Map<string, Set<string>>();
  const failures: string[] = [];
  let links = 0;
  const text = (file: string) => {
    if (!cache.has(file)) cache.set(file, read(file));
    return cache.get(file);
  };
  for (const file of new Set(files)) {
    const absolute = path.resolve(root, file);
    const source = text(absolute);
    if (source === undefined) {
      failures.push(file + ': missing selected document');
      continue;
    }
    for (const match of markdownText(source).matchAll(/\[[^\]\n]*\]\((<[^>\n]*>|[^\s)]+)(?:\s+"[^"\n]*")?\)/g)) {
      const raw = match[1]!.replace(/^<|>$/g, '');
      if (/^[a-z][a-z\d+.-]*:/i.test(raw)) continue;
      links++;
      let target: string;
      try {
        target = decodeURIComponent(raw);
      } catch {
        failures.push(file + ': malformed link ' + raw);
        continue;
      }
      const hash = target.indexOf('#');
      const destination = hash < 0 ? target : target.slice(0, hash);
      const anchor = hash < 0 ? '' : target.slice(hash + 1);
      const resolved = destination.startsWith('/')
        ? path.resolve(root, '.' + destination)
        : path.resolve(path.dirname(absolute), destination || path.basename(absolute));
      if (path.relative(root, resolved).startsWith('..')) {
        failures.push(file + ': link leaves repository ' + raw);
        continue;
      }
      const body = text(resolved);
      if (body === undefined) {
        failures.push(file + ': missing target ' + raw);
        continue;
      }
      if (anchor && /\.md$/i.test(resolved)) {
        if (!anchors.has(resolved)) anchors.set(resolved, headingAnchors(body));
        if (!anchors.get(resolved)!.has(anchor)) failures.push(file + ': missing heading ' + raw);
      }
    }
  }
  return { selectedDocuments: new Set(files).size, localLinks: links, failures };
}

if (import.meta.main) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  let files = process.argv.slice(2);
  if (!files.length) {
    const result = spawnSync('git', ['diff', 'HEAD', '--name-only', '--diff-filter=ACMR', '-z', '--', '*.md'], {
      cwd: root,
    });
    if (result.status !== 0) throw new Error('Cannot select changed documentation.');
    files = result.stdout.toString().split('\0').filter(Boolean);
  }
  const report = checkDocumentation(root, files, (file) => {
    const info = statSync(file, { throwIfNoEntry: false });
    if (!info) return undefined;
    return info.isFile() && /\.md$/i.test(file) ? readFileSync(file, 'utf8') : '';
  });
  console.log(
    JSON.stringify(
      { ...report, evidence: 'current worktree links/headings; external links and runtime receipts not checked' },
      null,
      2,
    ),
  );
  process.exitCode = report.failures.length ? 1 : 0;
}
