import { afterAll, expect, mock, spyOn, test } from 'bun:test';
import { createHash } from 'node:crypto';
import fs, { linkSync, mkdtempSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Run this file in a fresh Bun process: mock.module changes process-wide exports.
const realFs = { ...fs };
const realLstat = realFs.lstatSync;
const packageRoot = path.resolve(
  path.dirname(realpathSync(createRequire(import.meta.url).resolve('@openclaw/fs-safe'))),
  '..',
);
const gate = { denied: false, calls: 0 };
const routedLstat = new Proxy(realLstat, {
  apply(target, receiver, args): unknown {
    if (
      gate.denied &&
      typeof args[0] === 'string' &&
      path.resolve(args[0]).toLowerCase() === packageRoot.toLowerCase()
    ) {
      gate.calls++;
      throw new Error('Injected package attestation root refusal');
    }
    return Reflect.apply(target, receiver, args);
  },
});
if (process.platform === 'win32')
  void mock.module('node:fs', () => ({
    ...realFs,
    lstatSync: routedLstat,
    default: { ...realFs, lstatSync: routedLstat },
  }));
const { requireSafeRepositoryAccess, repositoryReadOnlyObservation } =
  await import('../src/config/safe-repository-access.js');
afterAll(() => {
  gate.denied = false;
  if (process.platform === 'win32') void mock.module('node:fs', () => ({ ...realFs, default: realFs }));
});

const windowsTest = test.skipIf(process.platform !== 'win32');
const hash = (bytes: string) => createHash('sha256').update(bytes).digest('hex');
function fixture() {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-readonly-metadata-')));
  writeFileSync(path.join(root, 'value'), 'first');
  const access = requireSafeRepositoryAccess(root);
  const view = repositoryReadOnlyObservation(access);
  const observe = view.observeLargeFile;
  const identity = view.observeFileIdentity;
  if (!observe || !identity || !access.observeLargeFile || !access.observeFileIdentity)
    throw new Error('Windows metadata observers unavailable');
  return { root, access, observe, identity };
}

type Binding = {
  openBeneath: (fd: number, relative: string, flags: number) => { fd: number; containment: string };
  renameNoReplace: (...args: [number, string, number, string]) => void;
  renameReplace: (...args: [number, string, number, string]) => void;
  mkdirBeneath: (fd: number, relative: string, mode: number) => void;
  fstatIdentity: (fd: number) => unknown;
  sha256File: (fd: number) => Promise<unknown>;
};
function isBinding(value: unknown): value is Binding {
  return (
    typeof value === 'object' &&
    value !== null &&
    'openBeneath' in value &&
    typeof value.openBeneath === 'function' &&
    'renameNoReplace' in value &&
    typeof value.renameNoReplace === 'function' &&
    'renameReplace' in value &&
    typeof value.renameReplace === 'function' &&
    'mkdirBeneath' in value &&
    typeof value.mkdirBeneath === 'function' &&
    'fstatIdentity' in value &&
    typeof value.fstatIdentity === 'function' &&
    'sha256File' in value &&
    typeof value.sha256File === 'function'
  );
}
function nativeModule() {
  const require = createRequire(import.meta.url);
  const entry = realpathSync(require.resolve('@openclaw/fs-safe'));
  const key = require.resolve(path.join(path.dirname(entry), 'native.js'));
  const value: unknown = require(key);
  if (!isNativeModule(value)) throw new Error('Invalid native module');
  const binding: unknown = Reflect.apply(value.getNativeBinding, value, []);
  if (!isBinding(binding)) throw new Error('Invalid native binding');
  return { require, key, native: value, binding };
}

function isNativeModule(value: unknown): value is { getNativeBinding: () => unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'getNativeBinding' in value &&
    typeof value.getNativeBinding === 'function'
  );
}

windowsTest(
  'fresh identity and complete digest track bytes and replacement',
  async () => {
    const { root, observe, identity } = fixture();
    const first = await observe('value', 'first');
    expect(first).toEqual({ identity: identity('value', 'first identity'), size: 5, sha256: hash('first') });
    writeFileSync(path.join(root, 'value'), 'other');
    const changed = await observe('value', 'changed');
    expect(changed).toEqual({ identity: first.identity, size: 5, sha256: hash('other') });
    renameSync(path.join(root, 'value'), path.join(root, 'retained'));
    writeFileSync(path.join(root, 'value'), 'other');
    const replacement = await observe('value', 'replacement');
    expect(replacement.sha256).toBe(hash('other'));
    expect(replacement.identity).toBe(identity('value', 'replacement identity'));
    expect(replacement.identity).not.toBe(changed.identity);
  },
  5000,
);

windowsTest(
  'identity describes hardlinks while complete observation rejects them',
  async () => {
    const { root, observe, identity } = fixture();
    linkSync(path.join(root, 'value'), path.join(root, 'alias'));
    expect(identity('value', 'hardlink')).toBe(identity('alias', 'same object'));
    await Promise.resolve(expect(observe('value', 'hardlink')).rejects.toThrow());
    expect(readFileSync(path.join(root, 'alias'), 'utf8')).toBe('first');
  },
  5000,
);

windowsTest(
  'disabled configuration denies both observers',
  async () => {
    const { observe, identity } = fixture();
    const prior = process.env.FS_SAFE_NATIVE_MODE;
    try {
      process.env.FS_SAFE_NATIVE_MODE = 'off';
      expect(() => identity('value', 'disabled')).toThrow();
      await Promise.resolve(expect(observe('value', 'disabled')).rejects.toThrow());
    } finally {
      if (prior === undefined) delete process.env.FS_SAFE_NATIVE_MODE;
      else process.env.FS_SAFE_NATIVE_MODE = prior;
    }
  },
  5000,
);

windowsTest(
  'configuration disabled while native hashing is pending denies its result',
  async () => {
    const { observe, identity } = fixture();
    await observe('value', 'baseline');
    const prior = process.env.FS_SAFE_NATIVE_MODE;
    const pending = observe('value', 'pending hash');
    try {
      process.env.FS_SAFE_NATIVE_MODE = 'off';
      await Promise.resolve(expect(pending).rejects.toThrow('native provider to remain enabled'));
    } finally {
      if (prior === undefined) delete process.env.FS_SAFE_NATIVE_MODE;
      else process.env.FS_SAFE_NATIVE_MODE = prior;
    }
    expect((await observe('value', 'restored')).identity).toBe(identity('value', 'restored identity'));
  },
  5000,
);

windowsTest(
  'replaced getter and foreign binding are denied before invocation',
  async () => {
    const { observe, identity } = fixture();
    const { native, binding } = nativeModule();
    let calls = 0;
    const foreign = {
      ...binding,
      openBeneath: (...args: Parameters<Binding['openBeneath']>) => {
        calls++;
        return binding.openBeneath(...args);
      },
    };
    const getter = spyOn(native, 'getNativeBinding').mockReturnValue(foreign);
    try {
      expect(() => identity('value', 'foreign')).toThrow();
      await Promise.resolve(expect(observe('value', 'foreign')).rejects.toThrow());
      expect(getter).not.toHaveBeenCalled();
      expect(calls).toBe(0);
    } finally {
      getter.mockRestore();
    }
  },
  5000,
);

windowsTest(
  'changed native method is denied before invocation',
  async () => {
    const { observe, identity } = fixture();
    const { binding } = nativeModule();
    const original = binding.openBeneath;
    let calls = 0;
    binding.openBeneath = (...args) => {
      calls++;
      return original(...args);
    };
    try {
      expect(() => identity('value', 'method')).toThrow();
      await Promise.resolve(expect(observe('value', 'method')).rejects.toThrow());
      expect(calls).toBe(0);
    } finally {
      binding.openBeneath = original;
    }
  },
  5000,
);

windowsTest.each(['js', 'native'] as const)(
  'missing or changed %s cache denies metadata',
  async (which) => {
    const { observe, identity } = fixture();
    const { require, key } = nativeModule();
    const nativeRequire = createRequire(key);
    const selected = which === 'js' ? key : realpathSync(nativeRequire.resolve('@openclaw/fs-safe-win32-x64-msvc'));
    const original = require.cache[selected];
    if (!original) throw new Error('Qualified cache entry unavailable');
    const replacement = { ...original };
    try {
      delete require.cache[selected];
      expect(() => identity('value', 'missing cache')).toThrow();
      await Promise.resolve(expect(observe('value', 'missing cache')).rejects.toThrow());
      expect(require.cache[selected]).toBeUndefined();
      require.cache[selected] = replacement;
      expect(() => identity('value', 'changed cache')).toThrow();
      await Promise.resolve(expect(observe('value', 'changed cache')).rejects.toThrow());
      expect(require.cache[selected]).toBe(replacement);
    } finally {
      require.cache[selected] = original;
    }
  },
  5000,
);

windowsTest.each(['large', 'identity', 'creation'] as const)(
  'read-only stays fresh while %s retains full package attestation',
  async (route) => {
    const { root, access, observe, identity } = fixture();
    const oldLarge = access.observeLargeFile;
    const oldIdentity = access.observeFileIdentity;
    if (!oldLarge || !oldIdentity) throw new Error('Full observers unavailable');
    const baseline = await observe('value', 'baseline');
    gate.calls = 0;
    gate.denied = true;
    try {
      writeFileSync(path.join(root, 'value'), 'fresh');
      const fresh = await observe('value', 'fresh');
      expect(fresh).toEqual({ identity: baseline.identity, size: 5, sha256: hash('fresh') });
      expect(identity('value', 'fresh identity')).toBe(fresh.identity);
      expect(gate.calls).toBe(0);
      if (route === 'large') await Promise.resolve(expect(oldLarge('value', 'full')).rejects.toThrow());
      else if (route === 'identity') expect(() => oldIdentity('value', 'full')).toThrow();
      else await Promise.resolve(expect(access.prepareExclusiveCreation()).rejects.toThrow());
      expect(gate.calls).toBeGreaterThan(0);
    } finally {
      gate.denied = false;
    }
  },
  5000,
);
