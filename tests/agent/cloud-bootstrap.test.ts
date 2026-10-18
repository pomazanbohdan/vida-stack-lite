import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'bun:test';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pin = readFileSync(path.join(repository, 'packages/agent/.bun-version'), 'utf8').trim();
const patch: unknown = JSON.parse(readFileSync(path.join(repository, '.codex/cloud-environment.patch.json'), 'utf8'));
assert.ok(patch && typeof patch === 'object' && 'script' in patch && typeof patch.script === 'string');
const parts = patch.script.split('bun tooling/agent/cloud-tooling-setup.ts\n');
assert.equal(parts.length, 2);
const prelude = parts[0]!;

for (const mode of ['matching', 'valid', 'bad-checksum', 'wrong-version'] as const) {
  test(`Cloud Bun bootstrap preserves its installation contract for ${mode}`, () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-bun-bootstrap-'));
    const home = path.join(root, 'home');
    const commands = path.join(root, 'commands');
    const scratch = path.join(root, 'scratch');
    const bin = path.join(home, '.local/bin');
    for (const directory of [commands, scratch, bin, path.join(root, 'packages/agent')])
      mkdirSync(directory, { recursive: true });
    const executable = (file: string, source: string) => {
      writeFileSync(file, source);
      chmodSync(file, 0o755);
    };
    const old = `#!/bin/sh\nprintf '%s\\n' '${mode === 'matching' ? pin : 'old-version'}'\n`;
    const staged = `#!/bin/sh\nprintf '%s\\n' '${mode === 'wrong-version' ? 'wrong-version' : pin}'\n`;
    executable(path.join(bin, 'bun'), old);
    writeFileSync(path.join(root, 'staged-bun'), staged);
    writeFileSync(path.join(root, 'archive'), 'owned archive fixture');
    const digest = createHash('sha256').update('owned archive fixture').digest('hex');
    writeFileSync(path.join(root, 'SUMS'), `${mode === 'bad-checksum' ? '0'.repeat(64) : digest}  bun-linux-x64.zip\n`);
    writeFileSync(path.join(root, 'packages/agent/.bun-version'), pin + '\n');
    executable(
      path.join(commands, 'curl'),
      `#!/bin/sh\nset -eu\nwhile [ "$1" != '-o' ]; do shift; done\ncase "$2" in\n */SHASUMS256.txt) cp "$VIDA_BOOTSTRAP_CONTROL/SUMS" "$2" ;;\n */bun-linux-x64.zip) cp "$VIDA_BOOTSTRAP_CONTROL/archive" "$2" ;;\n *) exit 2 ;;\nesac\n`,
    );
    executable(
      path.join(commands, 'unzip'),
      `#!/bin/sh\nset -eu\ntouch "$VIDA_BOOTSTRAP_CONTROL/extracted"\nmkdir -p "$4/bun-linux-x64"\ncp "$VIDA_BOOTSTRAP_CONTROL/staged-bun" "$4/bun-linux-x64/bun"\nchmod 755 "$4/bun-linux-x64/bun"\n`,
    );
    let verified = false;
    try {
      const result = Bun.spawnSync(['bash', '-c', prelude], {
        cwd: root,
        env: {
          ...process.env,
          HOME: home,
          TMPDIR: scratch,
          PATH: commands + ':' + process.env.PATH,
          VIDA_BOOTSTRAP_CONTROL: root,
        },
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 5000,
      });
      assert.equal(result.signalCode, undefined);
      if (mode === 'bad-checksum' || mode === 'wrong-version') {
        assert.notEqual(result.exitCode, 0);
        assert.equal(readFileSync(path.join(bin, 'bun'), 'utf8'), old);
      } else {
        assert.equal(result.exitCode, 0, result.stderr.toString());
        assert.equal(readFileSync(path.join(bin, 'bun'), 'utf8'), mode === 'matching' ? old : staged);
      }
      assert.equal(existsSync(path.join(root, 'extracted')), mode === 'valid' || mode === 'wrong-version');
      if (mode === 'bad-checksum') assert.match(result.stdout.toString() + result.stderr.toString(), /FAILED/);
      verified = true;
    } finally {
      if (verified) rmSync(root, { recursive: true });
    }
  });
}

test('Cloud plugin setup rejects invalid provisioning options before running its installers', () => {
  for (const args of [['--provision-only'], ['--install', '--install'], ['--unknown']]) {
    const result = Bun.spawnSync([process.execPath, 'tooling/agent/cloud-pstack-setup.ts', ...args], {
      cwd: repository,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 5000,
    });
    assert.equal(result.signalCode, undefined);
    assert.notEqual(result.exitCode, 0);
    assert.equal(result.stdout.toString(), '');
    assert.match(result.stderr.toString(), /Use --install/);
  }
});
