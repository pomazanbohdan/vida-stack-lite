import { afterAll, expect, mock, spyOn, test } from 'bun:test';
import fs, { existsSync, fstatSync, mkdtempSync, readdirSync, realpathSync, rmSync, type BigIntStats } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fsSafePackageManifest } from '../src/config/fs-safe-attestation.js';

// Capture concrete functions before mock.module can rebind node:fs exports.
const realFs = { ...fs };
const realFstat = realFs.fstatSync;
const realLstat = realFs.lstatSync;
const realRead = realFs.readSync;
let activeFstat = realFstat;
let activeLstat = realLstat;
let activeRead = realRead;
const routedFstat = new Proxy(realFstat, {
  apply(_target, receiver, args): unknown {
    return Reflect.apply(activeFstat, receiver, args);
  },
});
const routedLstat = new Proxy(realLstat, {
  apply(_target, receiver, args): unknown {
    return Reflect.apply(activeLstat, receiver, args);
  },
});
const routedRead = new Proxy(realRead, {
  apply(_target, receiver, args): unknown {
    return Reflect.apply(activeRead, receiver, args);
  },
});
if (process.platform === 'win32') {
  void mock.module('node:fs', () => ({
    ...realFs,
    fstatSync: routedFstat,
    lstatSync: routedLstat,
    readSync: routedRead,
    default: { ...realFs, fstatSync: routedFstat, lstatSync: routedLstat, readSync: routedRead },
  }));
}
const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.js');
afterAll(() => {
  activeFstat = realFstat;
  activeLstat = realLstat;
  activeRead = realRead;
  if (process.platform === 'win32') void mock.module('node:fs', () => ({ ...realFs, default: realFs }));
});

type NativeBinding = {
  openBeneath: (rootFd: number, relative: string, flags: number) => { fd: number; containment: string };
  renameNoReplace: (...args: [number, string, number, string]) => void;
  renameReplace: (...args: [number, string, number, string]) => void;
  mkdirBeneath: (rootFd: number, relative: string, mode: number) => void;
  fstatIdentity: (fd: number) => unknown;
  sha256File: (fd: number) => Promise<unknown>;
};
type NativeModule = { getNativeBinding: () => NativeBinding | undefined };

function isBinding(value: unknown): value is NativeBinding {
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

function isNativeModule(value: unknown): value is NativeModule {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('getNativeBinding' in value) ||
    typeof value.getNativeBinding !== 'function'
  )
    return false;
  const binding: unknown = Reflect.apply(value.getNativeBinding, value, []);
  return isBinding(binding);
}

function nativeModule(): NativeModule {
  const require = createRequire(import.meta.url);
  const entry = realpathSync(require.resolve('@openclaw/fs-safe'));
  const value: unknown = require(path.join(path.dirname(entry), 'native.js'));
  if (!isNativeModule(value)) throw new Error('Native binding unavailable');
  return value;
}

const windowsTest = test.skipIf(process.platform !== 'win32');

async function withFixture(run: (root: string) => Promise<void>): Promise<void> {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-windows-live-attestation-')));
  let completed = false;
  try {
    await run(root);
    completed = true;
  } finally {
    if (completed) rmSync(root, { recursive: true, force: false });
    else console.error(`Retained failed Windows attestation fixture: ${root}`);
  }
}

windowsTest('Windows read-only paths capture current single-link fixture bytes', async () => {
  await withFixture(async (root) => {
    const access = requireSafeRepositoryAccess(root);
    const capture = access.readVerifiedCaptureBytes;
    if (!capture) throw new Error('Verified capture unavailable');
    const target = path.join(root, 'value');
    realFs.writeFileSync(target, 'first');
    expect(access.readText('value', 'text')).toBe('first');
    expect(access.readBytes('value', 'bytes')).toEqual(Buffer.from('first'));
    expect(access.readCapturedBytes('value', 'capture', 5)).toEqual(Buffer.from('first'));
    expect(capture('value', 'verified')).toEqual(Buffer.from('first'));
    expect(() => access.readCapturedBytes('value', 'small limit', 4)).toThrow();
    realFs.writeFileSync(target, 'second');
    expect(capture('value', 'fresh')).toEqual(Buffer.from('second'));
    realFs.linkSync(target, path.join(root, 'alias'));
    for (const read of [
      () => access.readText('value', 'hardlink'),
      () => access.readBytes('value', 'hardlink'),
      () => access.readCapturedBytes('value', 'hardlink'),
      () => capture('value', 'hardlink'),
    ])
      expect(read).toThrow();
  });
});

windowsTest('Windows read-only path denies disabled, foreign and changed live bindings', async () => {
  await withFixture(async (root) => {
    realFs.writeFileSync(path.join(root, 'value'), 'preserved');
    const access = requireSafeRepositoryAccess(root);
    expect(access.readText('value', 'baseline')).toBe('preserved');
    const prior = process.env.FS_SAFE_NATIVE_MODE;
    try {
      process.env.FS_SAFE_NATIVE_MODE = 'off';
      expect(() => access.readBytes('value', 'disabled')).toThrow();
    } finally {
      if (prior === undefined) delete process.env.FS_SAFE_NATIVE_MODE;
      else process.env.FS_SAFE_NATIVE_MODE = prior;
    }
    const native = nativeModule();
    const binding = native.getNativeBinding();
    if (!binding) throw new Error('Native binding unavailable');
    let opens = 0;
    const foreign: NativeBinding = {
      renameNoReplace: binding.renameNoReplace,
      renameReplace: binding.renameReplace,
      mkdirBeneath: binding.mkdirBeneath,
      fstatIdentity: binding.fstatIdentity,
      sha256File: binding.sha256File,
      openBeneath: (fd, relative, flags) => {
        opens++;
        return binding.openBeneath(fd, relative, flags);
      },
    };
    const accessor = spyOn(native, 'getNativeBinding').mockReturnValue(foreign);
    try {
      expect(() => access.readBytes('value', 'foreign')).toThrow();
      expect(accessor).not.toHaveBeenCalled();
      expect(opens).toBe(0);
    } finally {
      accessor.mockRestore();
    }
    const original = binding.openBeneath;
    binding.openBeneath = (fd, relative, flags) => {
      opens++;
      return original(fd, relative, flags);
    };
    try {
      expect(() => access.readBytes('value', 'changed method')).toThrow();
      expect(opens).toBe(0);
    } finally {
      binding.openBeneath = original;
    }
  });
});

windowsTest.each(['js', 'native'] as const)(
  'read-only path denies missing or replaced %s cache entries without loading',
  async (which) => {
    await withFixture(async (root) => {
      realFs.writeFileSync(path.join(root, 'value'), 'preserved');
      const access = requireSafeRepositoryAccess(root);
      expect(access.readText('value', 'baseline')).toBe('preserved');
      const require = createRequire(import.meta.url);
      const packageRoot = path.resolve(path.dirname(realpathSync(require.resolve('@openclaw/fs-safe'))), '..');
      const jsKey = require.resolve(path.join(packageRoot, 'dist', 'native.js'));
      const nativeRequire = createRequire(jsKey);
      const nativeKey = realpathSync(nativeRequire.resolve('@openclaw/fs-safe-win32-x64-msvc'));
      const key = which === 'js' ? jsKey : nativeKey;
      const original = require.cache[key];
      if (!original) throw new Error('Qualified module cache entry unavailable');
      const replacement = { ...original };
      try {
        delete require.cache[key];
        expect(() => access.readBytes('value', 'missing cache')).toThrow();
        expect(require.cache[key]).toBeUndefined();
        require.cache[key] = replacement;
        expect(() => access.readBytes('value', 'replaced cache')).toThrow();
        expect(require.cache[key]).toBe(replacement);
      } finally {
        require.cache[key] = original;
      }
      expect(access.readText('value', 'restored cache')).toBe('preserved');
    });
  },
);

windowsTest('unit guard: read-only module validation never invokes an accessor descriptor', async () => {
  await withFixture(async (root) => {
    realFs.writeFileSync(path.join(root, 'value'), 'preserved');
    const access = requireSafeRepositoryAccess(root);
    const native = nativeModule();
    const originalDescriptor = Object.getOwnPropertyDescriptor;
    let accessorCalls = 0;
    const descriptor = spyOn(Object, 'getOwnPropertyDescriptor').mockImplementation((target, key) => {
      if (target === native && key === 'getNativeBinding')
        return {
          configurable: true,
          enumerable: true,
          get() {
            accessorCalls++;
            return native.getNativeBinding;
          },
        };
      return originalDescriptor(target, key);
    });
    try {
      expect(() => access.readBytes('value', 'accessor descriptor')).toThrow();
      expect(descriptor).toHaveBeenCalled();
      expect(accessorCalls).toBe(0);
    } finally {
      descriptor.mockRestore();
    }
    expect(access.readText('value', 'restored descriptor')).toBe('preserved');
  });
});

windowsTest('unchanged qualified package supports repeated live creation checks', async () => {
  await withFixture(async (root) => {
    const access = requireSafeRepositoryAccess(root);
    expect(access.attested).toBe(true);
    const creator = await access.prepareExclusiveCreation();
    await creator.writeExclusive('first', 'one', 'first');
    await creator.writeExclusive('second', 'two', 'second');
    expect(readdirSync(root).sort()).toEqual(['first', 'second']);
  });
});

windowsTest('foreign live binding is denied before its native reader is called', async () => {
  await withFixture(async (root) => {
    const creator = await requireSafeRepositoryAccess(root).prepareExclusiveCreation();
    const native = nativeModule();
    const binding = native.getNativeBinding();
    if (!binding) throw new Error('Native binding unavailable');
    let calls = 0;
    const foreign: NativeBinding = {
      renameNoReplace: binding.renameNoReplace,
      renameReplace: binding.renameReplace,
      mkdirBeneath: binding.mkdirBeneath,
      fstatIdentity: binding.fstatIdentity,
      sha256File: binding.sha256File,
      openBeneath: (rootFd, relative, flags) => {
        calls++;
        return binding.openBeneath(rootFd, relative, flags);
      },
    };
    const accessor = spyOn(native, 'getNativeBinding').mockReturnValue(foreign);
    try {
      await Promise.resolve(expect(creator.writeExclusive('denied', 'data', 'foreign binding')).rejects.toThrow());
      expect(accessor).toHaveBeenCalled();
      expect(calls).toBe(0);
      expect(existsSync(path.join(root, 'denied'))).toBe(false);
    } finally {
      accessor.mockRestore();
    }
  });
});

windowsTest('disabled live configuration denies a cached creator without output', async () => {
  await withFixture(async (root) => {
    const creator = await requireSafeRepositoryAccess(root).prepareExclusiveCreation();
    const prior = process.env.FS_SAFE_NATIVE_MODE;
    try {
      process.env.FS_SAFE_NATIVE_MODE = 'off';
      await Promise.resolve(expect(creator.writeExclusive('denied', 'data', 'disabled')).rejects.toThrow());
      expect(existsSync(path.join(root, 'denied'))).toBe(false);
    } finally {
      if (prior === undefined) delete process.env.FS_SAFE_NATIVE_MODE;
      else process.env.FS_SAFE_NATIVE_MODE = prior;
    }
  });
});

windowsTest('replaced native method is denied before the replacement can open a file', async () => {
  await withFixture(async (root) => {
    const creator = await requireSafeRepositoryAccess(root).prepareExclusiveCreation();
    const binding = nativeModule().getNativeBinding();
    if (!binding) throw new Error('Native binding unavailable');
    const original = binding.openBeneath;
    let calls = 0;
    binding.openBeneath = (rootFd, relative, flags) => {
      calls++;
      return original(rootFd, relative, flags);
    };
    try {
      await Promise.resolve(expect(creator.writeExclusive('denied', 'data', 'replaced method')).rejects.toThrow());
      expect(calls).toBe(0);
      expect(existsSync(path.join(root, 'denied'))).toBe(false);
    } finally {
      binding.openBeneath = original;
    }
  });
});

type AttestationFault =
  | 'observe'
  | 'bytes'
  | 'short-eof'
  | 'leaf-identity'
  | 'root-identity'
  | 'postread'
  | 'growth'
  | 'truncation'
  | 'oversize'
  | 'hardlink'
  | 'parent-identity';

// Synthetic metadata and read faults exercise guards, not physical Windows race containment.
function instrumentAttestation(fault: AttestationFault, fixture?: { root: string; relative: string }) {
  const require = createRequire(import.meta.url);
  const packageRoot =
    fixture?.root ?? path.resolve(path.dirname(realpathSync(require.resolve('@openclaw/fs-safe'))), '..');
  const relative = fixture?.relative ?? fsSafePackageManifest.find((file) => file !== 'package.json');
  if (!relative) throw new Error('No attested runtime file');
  const leafPath = path.join(packageRoot, relative);
  const leaf = realLstat(leafPath, { bigint: true });
  const directories = fixture
    ? [realLstat(packageRoot, { bigint: true }), realLstat(path.dirname(leafPath), { bigint: true })]
    : [];
  const directoryFds = new Set<number>();
  if (!leaf.isFile() || leaf.size === 0n) throw new Error('Expected a nonempty regular attested leaf');
  let leafFd: number | undefined;
  let leafStats = 0;
  let reads = 0;
  let injected = false;
  const isBigStats = (value: unknown): value is BigIntStats =>
    typeof value === 'object' &&
    value !== null &&
    'dev' in value &&
    typeof value.dev === 'bigint' &&
    'ino' in value &&
    typeof value.ino === 'bigint';
  const modify = (stats: BigIntStats, key: 'ino' | 'nlink' | 'ctimeNs' | 'size'): BigIntStats =>
    new Proxy(stats, {
      get(target, property, receiver): unknown {
        if (property === key) {
          injected = true;
          if (key === 'nlink') return 2n;
          if (key === 'size' && fault === 'oversize') return 64n * 1024n * 1024n + 1n;
          return target[key] + (fault === 'truncation' ? -1n : 1n);
        }
        return Reflect.get(target, property, receiver);
      },
    });
  activeFstat = new Proxy(realFstat, {
    apply(target, receiver, args): unknown {
      const value: unknown = Reflect.apply(target, receiver, args);
      if (
        isBigStats(value) &&
        typeof args[0] === 'number' &&
        directories.some((directory) => directory.dev === value.dev && directory.ino === value.ino)
      ) {
        directoryFds.add(args[0]);
        if (fault === 'parent-identity' && directories[1]?.ino === value.ino) return modify(value, 'ino');
      }
      if (!isBigStats(value) || value.dev !== leaf.dev || value.ino !== leaf.ino || typeof args[0] !== 'number')
        return value;
      leafFd = args[0];
      leafStats++;
      if (fault === 'hardlink') return modify(value, 'nlink');
      if (fault === 'oversize' || ((fault === 'growth' || fault === 'truncation') && leafStats === 2))
        return modify(value, 'size');
      if (fault === 'postread' && leafStats === 2) return modify(value, 'ctimeNs');
      return value;
    },
  });
  activeLstat = new Proxy(realLstat, {
    apply(target, receiver, args): unknown {
      const value: unknown = Reflect.apply(target, receiver, args);
      if (leafFd === undefined || !isBigStats(value) || typeof args[0] !== 'string') return value;
      if (fault === 'root-identity' && path.resolve(args[0]) === packageRoot) return modify(value, 'ino');
      if (path.resolve(args[0]) !== leafPath) return value;
      if (fault === 'leaf-identity') return modify(value, 'ino');
      if (fault === 'hardlink') return modify(value, 'nlink');
      if (fault === 'oversize') return modify(value, 'size');
      return value;
    },
  });
  activeRead = new Proxy(realRead, {
    apply(target, receiver, args): unknown {
      if (leafFd !== undefined && args[0] === leafFd) {
        reads++;
        if (fault === 'short-eof') {
          injected = true;
          return 0;
        }
        const result: unknown = Reflect.apply(target, receiver, args);
        if (
          fault === 'bytes' &&
          !injected &&
          typeof result === 'number' &&
          result > 0 &&
          Buffer.isBuffer(args[1]) &&
          typeof args[2] === 'number'
        ) {
          args[1].writeUInt8(args[1].readUInt8(args[2]) ^ 1, args[2]);
          injected = true;
        }
        return result;
      }
      return Reflect.apply(target, receiver, args);
    },
  });
  return {
    observed: () => ({ leafFd, leafStats, reads, injected, directoryFds: [...directoryFds] }),
    restore: () => {
      activeRead = realRead;
      activeLstat = realLstat;
      activeFstat = realFstat;
    },
  };
}

windowsTest.each([
  'short-eof',
  'leaf-identity',
  'root-identity',
  'postread',
  'growth',
  'truncation',
  'oversize',
  'hardlink',
] as const)('unit guard: fixture read rejects %s and closes root, parent and leaf FDs', async (fault) => {
  await withFixture(async (root) => {
    realFs.mkdirSync(path.join(root, 'nested'));
    realFs.writeFileSync(path.join(root, 'nested/value'), 'fixture bytes');
    const access = requireSafeRepositoryAccess(root);
    const probe = instrumentAttestation(fault, { root, relative: 'nested/value' });
    let fd: number | undefined;
    let directories: readonly number[] = [];
    try {
      expect(() => access.readCapturedBytes('nested/value', 'fixture fault')).toThrow();
      const observed = probe.observed();
      fd = observed.leafFd;
      directories = observed.directoryFds;
      expect(observed.injected).toBe(true);
      expect(fd).toBeDefined();
      expect(directories.length).toBe(2);
    } finally {
      probe.restore();
    }
    if (fd === undefined) throw new Error('Fixture leaf FD was not observed');
    expect(() => fstatSync(fd)).toThrow();
    for (const directory of directories) expect(() => fstatSync(directory)).toThrow();
  });
});

windowsTest(
  'unit guard: parent admission failure closes both opened directory FDs before a leaf is opened',
  async () => {
    await withFixture(async (root) => {
      realFs.mkdirSync(path.join(root, 'nested'));
      realFs.writeFileSync(path.join(root, 'nested/value'), 'fixture bytes');
      const access = requireSafeRepositoryAccess(root);
      const probe = instrumentAttestation('parent-identity', { root, relative: 'nested/value' });
      let directories: readonly number[] = [];
      try {
        expect(() => access.readBytes('nested/value', 'partial admission')).toThrow();
        const observed = probe.observed();
        directories = observed.directoryFds;
        expect(observed.injected).toBe(true);
        expect(observed.leafFd).toBeUndefined();
        expect(directories.length).toBe(2);
      } finally {
        probe.restore();
      }
      for (const directory of directories) expect(() => fstatSync(directory)).toThrow();
    });
  },
);

windowsTest('unit guard: each repeated qualified check reads current attested leaf bytes', async () => {
  await withFixture(async (root) => {
    const creator = await requireSafeRepositoryAccess(root).prepareExclusiveCreation();
    const probe = instrumentAttestation('observe');
    try {
      await creator.writeExclusive('first', 'one', 'first');
      const first = probe.observed().reads;
      await creator.writeExclusive('second', 'two', 'second');
      expect(first).toBeGreaterThan(0);
      expect(probe.observed().reads).toBeGreaterThan(first);
    } finally {
      probe.restore();
    }
  });
});

windowsTest.each([
  'bytes',
  'short-eof',
  'leaf-identity',
  'root-identity',
  'postread',
  'growth',
  'truncation',
  'oversize',
] as const)('unit guard: %s attestation fault denies output and closes the leaf FD', async (fault) => {
  await withFixture(async (root) => {
    const creator = await requireSafeRepositoryAccess(root).prepareExclusiveCreation();
    const probe = instrumentAttestation(fault);
    let fd: number | undefined;
    try {
      await Promise.resolve(expect(creator.writeExclusive('denied', 'data', fault)).rejects.toThrow());
      const observed = probe.observed();
      fd = observed.leafFd;
      expect(observed.injected).toBe(true);
      expect(fd).toBeDefined();
      expect(existsSync(path.join(root, 'denied'))).toBe(false);
    } finally {
      probe.restore();
    }
    if (fd === undefined) throw new Error('Attestation leaf FD was not observed');
    expect(() => fstatSync(fd)).toThrow();
  });
});

windowsTest('unit guard: consistent hardlink metadata remains allowed', async () => {
  await withFixture(async (root) => {
    const creator = await requireSafeRepositoryAccess(root).prepareExclusiveCreation();
    const probe = instrumentAttestation('hardlink');
    try {
      await creator.writeExclusive('allowed', 'data', 'hardlink metadata');
      expect(probe.observed().injected).toBe(true);
      expect(existsSync(path.join(root, 'allowed'))).toBe(true);
    } finally {
      probe.restore();
    }
  });
});
