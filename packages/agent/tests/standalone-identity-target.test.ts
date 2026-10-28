import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readResource, resourceDigest } from '../bin/standalone-resources.ts';
import { verifyStandalone } from '../tooling/build-standalone.ts';
import { expectedJavascriptFiles, standaloneBuildInputInventory } from '../tooling/maintained-source-inventory.ts';

// A harmless shell probe exercises the real verifier; Windows here is a target simulation, not a Windows execution.
(process.platform === 'linux' && process.arch === 'x64' ? test : test.skip)(
  'verifier maps native host identity and rejects a different target',
  async () => {
    for (const [platform, identityTarget] of [
      ['linux', 'linux-x64'],
      ['win32', 'windows-x64'],
    ] as const) {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-identity-target-'));
      const originalPlatform = process.platform;
      let complete = false;
      try {
        const write = (relative: string, data: string) => {
          const file = path.join(root, relative);
          mkdirSync(path.dirname(file), { recursive: true });
          writeFileSync(file, data);
        };
        write(
          'package.json',
          JSON.stringify({
            version: '1.2.3',
            packageManager: `bun@${Bun.version}`,
            engines: { bun: Bun.version },
            dependencies: {},
            files: ['src/**', 'bin/**'],
            bin: { agent: './bin/main.ts' },
          }),
        );
        write('.bun-version', Bun.version + '\n');
        for (const file of [
          'bun.lock',
          'bunfig.toml',
          'TESTING.md',
          'src/main.ts',
          'bin/main.ts',
          'tooling/maintained-source-inventory.ts',
          'tooling/build-standalone.ts',
          'tooling/pack-sdk.ts',
          'tooling/owned-staging.ts',
          'schemas/source.json',
          'templates/a',
          'instructions/a',
        ])
          write(file, 'fixture');
        for (const file of expectedJavascriptFiles) write('dist/src/' + file, 'fixture');
        write('dist/schemas/source.json', 'fixture');
        const inputs = standaloneBuildInputInventory(root).map((file) => {
          const bytes = readResource(root, file);
          return { path: file, bytes: bytes.length, sha256: resourceDigest(bytes) };
        });
        const folder = path.join(root, 'native');
        mkdirSync(folder);
        const file = 'vida-agent-bun-' + identityTarget + (platform === 'win32' ? '.exe' : '');
        const payloadId = 'a'.repeat(64);
        const writeProbe = (target: string) => {
          const identity = JSON.stringify({
            schema: 'VidaStandaloneIdentity/v1',
            version: '1.2.3',
            pin: Bun.version,
            target,
            payloadId,
            resourceIndexDigest: payloadId,
          });
          const body = `#!/bin/sh\nprintf '%s\\n' '${identity}'\n`;
          writeFileSync(path.join(folder, file), body);
          chmodSync(path.join(folder, file), 0o700);
          writeFileSync(
            path.join(folder, 'manifest.json'),
            JSON.stringify({
              schema: 'VidaStandaloneBuild/v1',
              version: '1.2.3',
              pin: Bun.version,
              target: 'bun-' + identityTarget,
              inputs,
              payloadId,
              asset: { file, bytes: Buffer.byteLength(body), sha256: resourceDigest(body) },
            }),
          );
        };
        Object.defineProperty(process, 'platform', { value: platform, configurable: true });
        writeProbe(identityTarget);
        await verifyStandalone({ root, folder });
        writeProbe(identityTarget === 'linux-x64' ? 'windows-x64' : 'linux-x64');
        await assert.rejects(verifyStandalone({ root, folder }));
        complete = true;
      } finally {
        Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
        if (complete) rmSync(root, { recursive: true, force: true });
      }
    }
  },
);
