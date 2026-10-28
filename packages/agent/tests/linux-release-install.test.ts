import { test, expect } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const script = join(import.meta.dir, '../../../install/install.sh');
const manifestName = 'vida-agent-bun-linux-x64.manifest.json';
const executableName = 'vida-agent-bun-linux-x64';
const sumsName = 'SHA256SUMS-linux-x64';
const payload = 'a'.repeat(64);
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

function fixture(version = '1.2.3', failVersion = false, homeName = 'home') {
  const root = mkdtempSync('/tmp/vida-linux-installer-');
  const home = join(root, homeName);
  const output = join(root, 'output');
  const tools = join(root, 'tools');
  const temp = join(root, 'tmp');
  const cache = join(root, 'cache');
  for (const path of [home, output, tools, temp, cache]) mkdirSync(path);
  mkdirSync(join(home, '.vida'));
  writeFileSync(join(home, '.vida', 'state'), 'untouched');
  const binary = join(output, executableName);
  const identity = JSON.stringify({
    schema: 'VidaStandaloneIdentity/v1',
    version,
    pin: '1.3.5',
    target: 'linux-x64',
    payloadId: payload,
    resourceIndexDigest: payload,
  });
  const publicVersion = JSON.stringify({ schema: 'VidaAgentPackage/v1', name: 'vida-agent', version });
  const body = `#!/bin/sh\ncase "$1" in\n--vida-internal-native-identity-v1) printf '%s\\n' '${identity}' ;;\nversion) ${failVersion ? 'exit 1' : `printf '%s\\n' '${publicVersion}'`} ;;\n*) exit 1 ;;\nesac\n`;
  writeFileSync(binary, body);
  chmodSync(binary, 0o755);
  const manifestPath = join(output, manifestName);
  writeFileSync(
    manifestPath,
    JSON.stringify({
      schema: 'VidaStandaloneBuild/v1',
      version,
      target: 'bun-linux-x64',
      asset: { file: executableName, bytes: Buffer.byteLength(body), sha256: digest(body) },
    }),
  );
  const command = join(home, '.local/bin/vida-agent');
  const receipt = join(home, '.local/bin/.vida-agent-installation');
  const env = {
    HOME: home,
    TMPDIR: temp,
    XDG_CACHE_HOME: cache,
    PATH: `${tools}:${process.env.PATH ?? ''}`,
    LANG: 'C',
    FIXTURE: output,
    REQUEST_LOG: join(root, 'requests'),
    TAG: `v${version}`,
    MODE: 'success',
  };
  const raw = (args: string[] = [], extra: Record<string, string> = {}) =>
    spawnSync('bash', [script, ...args], { env: { ...env, ...extra }, encoding: 'utf8', timeout: 30000 });
  function run(args: string[] = [], extra: Record<string, string> = {}) {
    const result = raw(args, extra);
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    return result;
  }
  return { root, home, output, tools, binary, body, manifestPath, command, receipt, env, raw, run };
}

function releaseMock(f: ReturnType<typeof fixture>, mode = 'success') {
  const manifestHash = digest(readFileSync(f.manifestPath, 'utf8'));
  const binaryHash = digest(readFileSync(f.binary, 'utf8'));
  let sums = `${manifestHash}  ${manifestName}\n${binaryHash}  ${executableName}\n`;
  if (mode === 'trailing') sums += 'unexpected';
  if (mode === 'missing-entry') sums = `${manifestHash}  ${manifestName}\n`;
  if (mode === 'duplicate-entry') sums = `${manifestHash}  ${manifestName}\n${manifestHash}  ${manifestName}\n`;
  if (mode === 'traversal') sums = `${manifestHash}  ../${manifestName}\n${binaryHash}  ${executableName}\n`;
  if (mode === 'checksum-mismatch') sums = `${manifestHash}  ${manifestName}\n${'b'.repeat(64)}  ${executableName}\n`;
  if (mode === 'manifest-mismatch') sums = `${'b'.repeat(64)}  ${manifestName}\n${binaryHash}  ${executableName}\n`;
  writeFileSync(join(f.output, sumsName), sums);
  const curl = join(f.tools, 'curl');
  writeFileSync(
    curl,
    `#!/bin/sh\nwhile [ "$#" -gt 0 ]; do case "$1" in https:*) url=$1 ;; esac; shift; done\nprintf '%s\\n' "$url" >> "$REQUEST_LOG"\ncase "$MODE" in offline) exit 7 ;; timeout) exit 28 ;; esac\ncase "$url" in\n*/releases/latest) case "$MODE" in bad-tag) printf '%s' 'https://github.com/pomazanbohdan/vida-stack-lite/releases/tag/../bad' ;; untrusted-url) printf '%s' 'https://example.com/releases/tag/v1.2.3' ;; tag-version) printf '%s' 'https://github.com/pomazanbohdan/vida-stack-lite/releases/tag/v2.0.0' ;; *) printf '%s' "https://github.com/pomazanbohdan/vida-stack-lite/releases/tag/$TAG" ;; esac ;;\n*/${sumsName}) [ "$MODE" != missing-sums ] || exit 22; if [ "$MODE" = oversize-sums ]; then head -c 1048576 /dev/zero; else cat "$FIXTURE/${sumsName}"; fi ;;\n*/${manifestName}) [ "$MODE" != missing-manifest ] || exit 22; if [ "$MODE" = oversize-manifest ]; then head -c 2097152 /dev/zero; else cat "$FIXTURE/${manifestName}"; fi ;;\n*/${executableName}) [ "$MODE" != missing-binary ] || exit 22; cat "$FIXTURE/${executableName}" ;;\n*) exit 1 ;;\nesac\n`,
  );
  chmodSync(curl, 0o755);
  return { ...f.env, MODE: mode };
}

function staged(f: ReturnType<typeof fixture>) {
  const bin = join(f.home, '.local/bin');
  const entry = readdirSync(bin).find((name) => name.startsWith('.vida-agent-install-'));
  expect(entry).toBeDefined();
  return join(bin, entry!);
}

test('rejects local binaries until the build owner can verify them', () => {
  const f = fixture();
  expect(f.run(['--binary', f.binary]).status).not.toBe(0);
  expect(readdirSync(f.home)).toEqual(['.vida']);
});

test('freezes the release tag and installs the two checksum-bound assets', () => {
  const f = fixture('1.2.3', false, 'home\\slash"quote');
  const env = releaseMock(f);
  const result = f.run([], env);
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({
    schema: 'VidaNativeInstallationResult/v1',
    path: f.command,
    version: '1.2.3',
    sha256: digest(f.body),
  });
  expect(readFileSync(f.env.REQUEST_LOG, 'utf8').trim().split('\n')).toEqual([
    'https://github.com/pomazanbohdan/vida-stack-lite/releases/latest',
    `https://github.com/pomazanbohdan/vida-stack-lite/releases/download/v1.2.3/${sumsName}`,
    `https://github.com/pomazanbohdan/vida-stack-lite/releases/download/v1.2.3/${manifestName}`,
    `https://github.com/pomazanbohdan/vida-stack-lite/releases/download/v1.2.3/${executableName}`,
  ]);
  expect(readFileSync(f.command, 'utf8')).toBe(f.body);
  expect(readFileSync(join(f.home, '.vida/state'), 'utf8')).toBe('untouched');
  expect(f.run([], env).status).toBe(0);
  writeFileSync(f.command, 'unrelated');
  expect(f.run([], env).status).not.toBe(0);
  expect(readFileSync(f.command, 'utf8')).toBe('unrelated');
});

test('refuses an unrelated existing executable', () => {
  const f = fixture();
  mkdirSync(join(f.home, '.local/bin'), { recursive: true });
  writeFileSync(f.command, 'unrelated');
  expect(f.run([], releaseMock(f)).status).not.toBe(0);
  expect(readFileSync(f.command, 'utf8')).toBe('unrelated');
});

test('postcheck failure restores owned bytes and retains a retry fence', () => {
  const f = fixture();
  const next = fixture('2.0.0', true);
  const env = releaseMock(f);
  expect(f.run([], env).status).toBe(0);
  const prior = readFileSync(f.receipt, 'utf8');
  const nextEnv = releaseMock(next);
  expect(
    f.run([], {
      PATH: nextEnv.PATH,
      FIXTURE: nextEnv.FIXTURE,
      TAG: nextEnv.TAG,
      REQUEST_LOG: nextEnv.REQUEST_LOG,
      MODE: nextEnv.MODE,
    }).status,
  ).not.toBe(0);
  expect(readFileSync(f.command, 'utf8')).toBe(f.body);
  expect(readFileSync(f.receipt, 'utf8')).toBe(prior);
  expect(readFileSync(join(f.home, '.vida/state'), 'utf8')).toBe('untouched');
  expect(f.run([], env).stderr).toContain('Earlier installation requires inspection');
});

test('release and checksum failures preserve installed bytes and retain evidence', () => {
  for (const mode of [
    'offline',
    'timeout',
    'bad-tag',
    'untrusted-url',
    'tag-version',
    'missing-sums',
    'missing-manifest',
    'missing-binary',
    'trailing',
    'missing-entry',
    'duplicate-entry',
    'traversal',
    'checksum-mismatch',
    'manifest-mismatch',
  ]) {
    const f = fixture();
    expect(f.run([], releaseMock(f)).status).toBe(0);
    const prior = readFileSync(f.receipt, 'utf8');
    expect(f.run([], releaseMock(f, mode)).status, mode).not.toBe(0);
    expect(readFileSync(f.command, 'utf8')).toBe(f.body);
    expect(readFileSync(f.receipt, 'utf8')).toBe(prior);
    expect(readFileSync(join(f.home, '.vida/state'), 'utf8')).toBe('untouched');
    staged(f);
  }
});

test('limits streaming responses before they fill staging', () => {
  for (const [mode, name, limit] of [
    ['oversize-sums', sumsName, 1024],
    ['oversize-manifest', manifestName, 1048576],
  ] as const) {
    const f = fixture();
    expect(f.run([], releaseMock(f, mode)).status).not.toBe(0);
    expect(statSync(join(staged(f), name)).size).toBeLessThanOrEqual(limit + 1);
  }
});

test('detects executable and receipt drift during backup without replacing them', () => {
  for (const part of ['command', 'receipt'] as const) {
    const f = fixture();
    const env = releaseMock(f);
    expect(f.run([], env).status).toBe(0);
    const copy = join(f.tools, 'cp');
    writeFileSync(
      copy,
      '#!/bin/sh\nfor arg do last=$arg; done\n/usr/bin/cp "$@" || exit\ncase "$last" in */previous) printf user-drift > "$TARGET" ;; esac\n',
    );
    chmodSync(copy, 0o755);
    const target = part === 'command' ? f.command : f.receipt;
    expect(f.run([], { ...env, TARGET: target }).status).not.toBe(0);
    expect(readFileSync(target, 'utf8')).toBe('user-drift');
    if (part === 'receipt') expect(readFileSync(f.command, 'utf8')).toBe(f.body);
    staged(f);
  }
});

test('rejects a release with an incompatible native identity', () => {
  const f = fixture();
  const env = releaseMock(f);
  expect(f.run([], env).status).toBe(0);
  writeFileSync(f.binary, f.body.replace('linux-x64', 'linux-arm64'));
  expect(f.run([], releaseMock(f)).status).not.toBe(0);
  expect(readFileSync(f.command, 'utf8')).toBe(f.body);
  staged(f);
});

test('uncertain publish or receipt effects retain state and block retry', () => {
  for (const target of ['first-publish', 'update-publish', 'receipt']) {
    const f = fixture();
    const env = releaseMock(f);
    if (target !== 'first-publish') expect(f.run([], env).status).toBe(0);
    const operation = target === 'first-publish' ? 'ln' : 'mv';
    const command = join(f.tools, operation);
    writeFileSync(
      command,
      `#!/bin/sh\nfor arg do last=$arg; done\n/usr/bin/${operation} "$@" || exit\n[ "$last" != "$FAIL_DEST" ] || exit 1\n`,
    );
    chmodSync(command, 0o755);
    const result = f.run([], { ...env, FAIL_DEST: target === 'receipt' ? f.receipt : f.command });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('UNKNOWN');
    expect(readFileSync(join(staged(f), 'phase'), 'utf8').trim()).toBe(
      target === 'receipt' ? 'committing' : 'publishing',
    );
    expect(f.run([], env).stderr).toContain('Earlier installation requires inspection');
  }
});

test('a killed installer retains its in-flight marker and refuses a new operation', () => {
  for (const part of ['publish', 'receipt'] as const) {
    const f = fixture();
    const env = releaseMock(f);
    expect(f.run([], env).status).toBe(0);
    const move = join(f.tools, 'mv');
    writeFileSync(
      move,
      '#!/bin/sh\nfor arg do last=$arg; done\n/usr/bin/mv "$@" || exit\n[ "$last" != "$TARGET" ] || kill -KILL "$PPID"\n',
    );
    chmodSync(move, 0o755);
    const result = f.raw([], { ...env, TARGET: part === 'publish' ? f.command : f.receipt });
    expect(result.error).toBeUndefined();
    expect(result.signal).toBe('SIGKILL');
    expect(readFileSync(join(staged(f), 'phase'), 'utf8').trim()).toBe(
      part === 'publish' ? 'publishing' : 'committing',
    );
    expect(f.run([], env).stderr).toContain('Earlier installation requires inspection');
  }
});

test('rejects an unsupported architecture before creating installer state', () => {
  const f = fixture();
  const uname = join(f.tools, 'uname');
  writeFileSync(uname, '#!/bin/sh\n[ "$1" = -s ] && echo Linux || echo aarch64\n');
  chmodSync(uname, 0o755);
  expect(f.run([], releaseMock(f)).stderr).toContain('Only Linux x86_64');
  expect(readdirSync(f.home)).toEqual(['.vida']);
});

test('limits native identity output while the command is running', () => {
  const f = fixture();
  writeFileSync(f.binary, '#!/bin/sh\nhead -c 1048576 /dev/zero\n');
  const result = f.run([], releaseMock(f));
  expect(result.status).not.toBe(0);
  expect(statSync(join(staged(f), 'probe.out')).size).toBeLessThanOrEqual(4096);
});
