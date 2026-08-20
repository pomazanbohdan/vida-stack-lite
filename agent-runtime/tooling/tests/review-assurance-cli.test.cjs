'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const cli = path.resolve(__dirname, '../../bin/verify-operator-mode.cjs');
const runner = require(cli);

function tempManifest(checks, extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'review-bundle-'));
  const file = path.join(root, 'bundle.json');
  fs.writeFileSync(file, JSON.stringify({ schema: 'VerifyBundle/v1', artifact_dir: 'artifacts', ...extra, checks }));
  return { root, file };
}

describe('bundled operator verification CLI', () => {
  test('keeps serial checks out of the bounded parallel queue', async () => {
    let active = 0;
    let maximum = 0;
    let serialOverlap = false;
    const results = await runner.runScheduled([
      { id: 'parallel-a', serial: false },
      { id: 'parallel-b', serial: false },
      { id: 'serial-a', serial: true },
      { id: 'serial-b', serial: true },
      { id: 'parallel-c', serial: false }
    ], 2, async spec => {
      active += 1;
      maximum = Math.max(maximum, active);
      if (spec.serial && active > 1) serialOverlap = true;
      await new Promise(resolve => setTimeout(resolve, 5));
      active -= 1;
      return spec.id;
    });
    expect(results).toEqual(['parallel-a', 'parallel-b', 'serial-a', 'serial-b', 'parallel-c']);
    expect(maximum).toBe(2);
    expect(serialOverlap).toBe(false);
  });

  test('runs checks with bounded concurrency and returns compact summary with file artifacts', () => {
    const { root, file } = tempManifest([
      { id: 'pass', command: process.execPath, args: ['-e', 'process.stdout.write("ok")'] },
      { id: 'second', command: process.execPath, args: ['-e', 'process.stdout.write("token=secret")'] }
    ]);
    const result = spawnSync(process.execPath, [cli, '--manifest', file, '--output', 'summary', '--max-parallel', '1'], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    const value = JSON.parse(result.stdout);
    expect(value.summary).toMatchObject({ status: 'pass', passed: 2, failed: 0 });
    expect(fs.readdirSync(path.join(root, 'artifacts'))).toHaveLength(2);
  });

  test('times out a check and retains only bounded previews while artifact keeps output', () => {
    const { root, file } = tempManifest([{ id: 'slow', command: process.execPath, args: ['-e', 'process.stdout.write(JSON.stringify({token:"secret"}));setTimeout(()=>{},1000)'] }]);
    const result = spawnSync(process.execPath, [cli, '--manifest', file, '--output', 'evidence', '--timeout-ms', '500', '--max-evidence-lines', '5'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    const value = JSON.parse(result.stdout);
    expect(value.summary).toMatchObject({ status: 'fail', failed: 1 });
    expect(value.evidence).toContain('timeout');
    expect(value.evidence).not.toContain('secret');
    expect(fs.existsSync(path.join(root, 'artifacts', '01-slow.log'))).toBe(true);
  });

  test('rejects a check working directory outside the manifest root', () => {
    const { file } = tempManifest([{ id: 'escape', command: process.execPath, cwd: '..', args: ['-e', 'process.exit(0)'] }]);
    const result = spawnSync(process.execPath, [cli, '--manifest', file], { encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/outside manifest root|unsafe/);
  });

  test('keeps failures bounded and redacts evidence output', () => {
    const { file } = tempManifest([{ id: 'fail', command: process.execPath, args: ['-e', 'process.stderr.write("token=secret") ; process.exit(1)'] }]);
    const result = spawnSync(process.execPath, [cli, '--manifest', file, '--output', 'evidence', '--max-evidence-lines', '2'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    const value = JSON.parse(result.stdout);
    expect(value.summary).toMatchObject({ status: 'fail', passed: 0, failed: 1 });
    expect(value.evidence).toContain('[REDACTED]');
  });

  test('does not expose raw secrets through the direct bundle result', async () => {
    const { file } = tempManifest([{ id: 'direct', command: process.execPath, args: ['-e', 'process.stdout.write(JSON.stringify({token:"secret"}))'] }]);
    const result = await runner.runBundle(runner.readManifest(file), { output: 'evidence', maxParallel: 1, maxEvidenceLines: 2, maxLogLines: 2 });
    expect(result.summary.status).toBe('pass');
    expect(result.evidence).not.toContain('secret');
    expect(result.logs).not.toContain('secret');
    expect(result.artifacts).toHaveLength(1);
  });

  test('summary mode skips evidence/log aggregation', async () => {
    const { file } = tempManifest([{ id: 'summary-only', command: process.execPath, args: ['-e', 'process.stdout.write("large-output")'] }]);
    const result = await runner.runBundle(runner.readManifest(file), { output: 'summary', maxParallel: 1 });
    expect(result.summary.status).toBe('pass');
    expect(result.evidence).toBe('');
    expect(result.logs).toBe('');
  });

  test('fails closed for missing manifest and invalid output mode', () => {
    const missing = spawnSync(process.execPath, [cli], { encoding: 'utf8' });
    expect(missing.status).toBe(2);
    expect(missing.stderr).toMatch(/bundle manifest required/);
    const invalid = spawnSync(process.execPath, [cli, '--manifest', 'missing.json', '--output', 'wrong'], { encoding: 'utf8' });
    expect(invalid.status).toBe(2);
    expect(invalid.stderr).toMatch(/output mode invalid/);
  });
});
