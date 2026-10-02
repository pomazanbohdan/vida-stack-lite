import { describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { configuredTestContext } from './configured-context.mjs';
import {
  assertLoadedRuntimeConfig,
  loadRuntimeConfig,
  parseRuntimeConfigYaml,
  runtimeConfigDigest,
  validateRuntimeConfigRepairTargetBytes,
} from '../src/config/runtime-config.ts';

const { repositoryRoot } = configuredTestContext();
const sourceBytes = readFileSync(path.join(repositoryRoot, 'agent-runtime.config.v1.yaml'));

describe('current-v1 exact-byte config repair boundary', () => {
  test('accepts current YAML and BOM bytes without granting runtime authority', () => {
    const loaded = loadRuntimeConfig(repositoryRoot);
    const target = validateRuntimeConfigRepairTargetBytes(sourceBytes, repositoryRoot);
    const bomTarget = validateRuntimeConfigRepairTargetBytes(
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), sourceBytes]),
      repositoryRoot,
    );
    expect(runtimeConfigDigest(target)).toBe(runtimeConfigDigest(loaded));
    expect(runtimeConfigDigest(bomTarget)).toBe(runtimeConfigDigest(loaded));
    expect(target).not.toBe(loaded);
    expect(() => assertLoadedRuntimeConfig(target, repositoryRoot)).toThrow(/must come from loadRuntimeConfig/);
  });

  test('rejects malformed bytes, oversized input, a relative root and another schema', () => {
    const malformedComment = Buffer.concat([sourceBytes, Buffer.from([0x23, 0x20, 0xc3, 0x28, 0x0a])]);
    expect(() => validateRuntimeConfigRepairTargetBytes(malformedComment, repositoryRoot)).toThrow();
    expect(() => validateRuntimeConfigRepairTargetBytes(Buffer.alloc(4 * 1024 * 1024 + 1), repositoryRoot)).toThrow(
      /too large/,
    );
    const oversizedMalformed = Buffer.alloc(4 * 1024 * 1024 + 1, 0x20);
    oversizedMalformed[0] = 0xc3;
    oversizedMalformed[1] = 0x28;
    expect(() => validateRuntimeConfigRepairTargetBytes(oversizedMalformed, repositoryRoot)).toThrow(/too large/);
    expect(() => validateRuntimeConfigRepairTargetBytes(sourceBytes, '.')).toThrow(/absolute/);
    expect(() =>
      validateRuntimeConfigRepairTargetBytes(
        Buffer.from(sourceBytes.toString('utf8').replace('AgentRuntimeConfig/v1', 'AgentRuntimeConfig/v2')),
        repositoryRoot,
      ),
    ).toThrow();
  });

  test('accepts the exact four-megabyte byte boundary', () => {
    const padded = Buffer.concat([sourceBytes, Buffer.alloc(4 * 1024 * 1024 - sourceBytes.byteLength, 0x20)]);
    expect(padded.byteLength).toBe(4 * 1024 * 1024);
    expect(validateRuntimeConfigRepairTargetBytes(padded, repositoryRoot).schema).toBe('AgentRuntimeConfig/v1');
  }, 20_000);

  test('reloads changed root bytes and binds the new authorized object to that repository', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'config-repair-cache-'));
    const yaml = sourceBytes.toString('utf8');
    const config = parseRuntimeConfigYaml(yaml);
    try {
      for (const marker of config.repository.root_markers) {
        const target = path.join(root, marker);
        mkdirSync(path.dirname(target), { recursive: true });
        if (marker === '.git') mkdirSync(target);
        else writeFileSync(target, 'fixture marker\n');
      }
      for (const source of config.knowledge.sources.filter((item) => item.kind === 'local')) {
        const target = path.join(root, source.location);
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, 'fixture source\n');
      }
      const configFile = path.join(root, 'agent-runtime.config.v1.yaml');
      writeFileSync(configFile, sourceBytes);
      const first = loadRuntimeConfig(root);
      const changed = yaml.replace(
        /^config_revision: (\d+)$/m,
        (_, revision) => `config_revision: ${Number(revision) + 1}`,
      );
      expect(changed).not.toBe(yaml);
      writeFileSync(configFile, changed);
      const next = loadRuntimeConfig(root);
      expect(next).not.toBe(first);
      expect(next.config_revision).toBe(first.config_revision + 1);
      expect(runtimeConfigDigest(next)).not.toBe(runtimeConfigDigest(first));
      expect(loadRuntimeConfig(root)).toBe(next);
      expect(Object.isFrozen(next)).toBe(true);
      expect(() => assertLoadedRuntimeConfig(next, root)).not.toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
