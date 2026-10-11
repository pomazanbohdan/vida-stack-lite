import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'bun:test';
import {
  publishReleasePreparation,
  readReleasePreparation,
  resumeReleasePreparation,
  runReleasePreparation,
} from '../bin/release-preparation.ts';
import { releaseJSON, withReleaseAdmission } from '../bin/local-release-artifacts.ts';

type PreparedRelease = Parameters<typeof publishReleasePreparation>[1];
type PreparationTarget = { path: string; before: string | null; after: string };
type PreparationIntent = {
  schema: 'VidaReleasePreparation/v1';
  prepared: PreparedRelease;
  targets: PreparationTarget[];
};

const intentPath = '.agent/work/agent-local-release/preparation.json';
const manifestPath = 'packages/agent/package.json';
const pendingPath = '.agent/work/agent-local-release/pending.json';
const byteLimit = 8 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function ownedRoot(): string {
  return mkdtempSync(path.join(tmpdir(), 'vida-release-preparation-v465-'));
}

function writeBytes(root: string, relative: string, bytes: Uint8Array): void {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, bytes);
}

function readJson(root: string, relative: string): unknown {
  const value: unknown = JSON.parse(readFileSync(path.join(root, relative), 'utf8'));
  return value;
}

function makePrepared(operationId: string, version: string): PreparedRelease {
  return {
    schema: 'VidaLocalReleaseState/v1',
    operation_id: operationId,
    version,
    status: 'awaiting_assurance',
  };
}

function makeManifest(version: string): Record<string, unknown> {
  return {
    name: 'vida-agent',
    version,
    bin: { 'vida-agent': './bin/vida-agent.ts' },
    engines: { bun: '1.4.2' },
    packageManager: 'bun@1.4.2',
    private: false,
  };
}

function makeIntent(prepared: PreparedRelease, beforeManifest: Uint8Array, beforeVersion: string): PreparationIntent {
  const operationRoot = `.agent/work/agent-local-release/${prepared.operation_id}`;
  const priorManifest: unknown = JSON.parse(Buffer.from(beforeManifest).toString('utf8'));
  assert.ok(isRecord(priorManifest));
  const nextManifest = { ...priorManifest, version: prepared.version };
  const stateImage = Buffer.from(releaseJSON(prepared)).toString('base64');
  return {
    schema: 'VidaReleasePreparation/v1',
    prepared,
    targets: [
      {
        path: manifestPath,
        before: Buffer.from(beforeManifest).toString('base64'),
        after:
          beforeVersion === prepared.version
            ? Buffer.from(beforeManifest).toString('base64')
            : Buffer.from(releaseJSON(nextManifest)).toString('base64'),
      },
      { path: `${operationRoot}/release.json`, before: null, after: stateImage },
      { path: pendingPath, before: null, after: stateImage },
    ],
  };
}

function writeIntent(root: string, intent: PreparationIntent): Buffer {
  const bytes = Buffer.from(releaseJSON(intent));
  writeBytes(root, intentPath, bytes);
  return bytes;
}

function targetAt(intent: PreparationIntent, index: number): PreparationTarget {
  const target = intent.targets[index];
  assert.ok(target);
  return target;
}

function operationJournalPath(prepared: PreparedRelease): string {
  return `.agent/work/agent-local-release/${prepared.operation_id}/release.json`;
}

test('version-only publication records ordered intent images and the exact pending pointer', async () => {
  const root = ownedRoot();
  try {
    const prior = makeManifest('0.1.2');
    const next = { ...prior, version: '0.1.3' };
    const priorBytes = Buffer.from(`{
  "name": "vida-agent",
  "version": "0.1.2",
  "bin": { "vida-agent": "./bin/vida-agent.ts" },
  "engines": { "bun": "1.4.2" },
  "packageManager": "bun@1.4.2",
  "private": false
}\n`);
    writeBytes(root, manifestPath, priorBytes);
    const prepared = makePrepared('preparation-publish', '0.1.3');

    assert.deepEqual(
      await withReleaseAdmission(root, () => publishReleasePreparation(root, prepared, next, null)),
      prepared,
    );

    const publishedManifest = readFileSync(path.join(root, manifestPath));
    assert.deepEqual(publishedManifest, Buffer.from(releaseJSON(next)));
    const publishedValue: unknown = JSON.parse(publishedManifest.toString('utf8'));
    assert.ok(isRecord(publishedValue));
    assert.deepEqual(publishedValue, { ...prior, version: prepared.version });
    assert.deepEqual(readFileSync(path.join(root, pendingPath)), Buffer.from(releaseJSON(prepared)));

    const receipt = readJson(root, `.agent/work/agent-local-release/${prepared.operation_id}/preparation.json`);
    assert.ok(isRecord(receipt));
    assert.ok(Array.isArray(receipt.targets));
    const targets = receipt.targets;
    assert.equal(targets.length, 3);
    const manifestTarget: unknown = targets[0];
    const releaseTarget: unknown = targets[1];
    const pendingTarget: unknown = targets[2];
    assert.ok(isRecord(manifestTarget));
    assert.ok(isRecord(releaseTarget));
    assert.ok(isRecord(pendingTarget));
    assert.equal(manifestTarget.path, manifestPath);
    assert.equal(releaseTarget.path, operationJournalPath(prepared));
    assert.equal(pendingTarget.path, pendingPath);
    assert.equal(manifestTarget.before, priorBytes.toString('base64'));
    assert.equal(manifestTarget.after, publishedManifest.toString('base64'));
    assert.equal(releaseTarget.after, pendingTarget.after);
  } finally {
    assert.ok(path.basename(root).startsWith('vida-release-preparation-v465-'));
    rmSync(root, { recursive: true, force: true });
  }
});

test('four-target publication binds disposition bytes and rejects changed readback', async () => {
  const root = ownedRoot();
  try {
    const prior = makeManifest('0.1.2');
    writeBytes(root, manifestPath, Buffer.from(releaseJSON(prior)));
    const prepared = makePrepared('preparation-publish-disposition', '0.1.3');
    const disposition = { decision: 'defer', reason: 'published disposition' };
    const dispositionPath = `.agent/work/agent-local-release/${prepared.operation_id}/disposition.json`;
    const operationReceipt = `.agent/work/agent-local-release/${prepared.operation_id}/preparation.json`;

    assert.deepEqual(
      await withReleaseAdmission(root, () =>
        publishReleasePreparation(root, prepared, { ...prior, version: prepared.version }, disposition),
      ),
      prepared,
    );
    const receiptBytes = readFileSync(path.join(root, operationReceipt));
    const receipt = readJson(root, operationReceipt);
    assert.ok(isRecord(receipt));
    assert.ok(Array.isArray(receipt.targets));
    assert.deepEqual(
      receipt.targets.map((target: unknown) => {
        assert.ok(isRecord(target));
        return target.path;
      }),
      [manifestPath, dispositionPath, operationJournalPath(prepared), pendingPath],
    );
    assert.deepEqual(readFileSync(path.join(root, dispositionPath)), Buffer.from(releaseJSON(disposition)));
    assert.deepEqual(readReleasePreparation(root, prepared), { priorVersion: '0.1.2', disposition });

    const changedBytes = Buffer.from(releaseJSON({ ...disposition, reason: 'changed externally' }));
    writeBytes(root, dispositionPath, changedBytes);
    assert.throws(() => readReleasePreparation(root, prepared), /preparation disposition receipt changed/);
    assert.deepEqual(readFileSync(path.join(root, dispositionPath)), changedBytes);
    assert.deepEqual(readFileSync(path.join(root, operationReceipt)), receiptBytes);
    assert.deepEqual(readFileSync(path.join(root, pendingPath)), Buffer.from(releaseJSON(prepared)));
    assert.equal(existsSync(path.join(root, intentPath)), false);
  } finally {
    assert.ok(path.basename(root).startsWith('vida-release-preparation-v465-'));
    rmSync(root, { recursive: true, force: true });
  }
});

test('same-version preparation preserves the exact manifest bytes in both images', async () => {
  const root = ownedRoot();
  try {
    const manifestValue = makeManifest('0.1.3');
    const manifestBytes = Buffer.from(JSON.stringify(manifestValue));
    writeBytes(root, manifestPath, manifestBytes);
    const prepared = makePrepared('preparation-same-version', '0.1.3');

    assert.deepEqual(
      await withReleaseAdmission(root, () => publishReleasePreparation(root, prepared, manifestValue, null)),
      prepared,
    );
    assert.deepEqual(readFileSync(path.join(root, manifestPath)), manifestBytes);

    const receipt = readJson(root, `.agent/work/agent-local-release/${prepared.operation_id}/preparation.json`);
    assert.ok(isRecord(receipt));
    assert.ok(Array.isArray(receipt.targets));
    const manifestTarget: unknown = receipt.targets[0];
    assert.ok(isRecord(manifestTarget));
    assert.equal(manifestTarget.before, manifestBytes.toString('base64'));
    assert.equal(manifestTarget.after, manifestBytes.toString('base64'));
  } finally {
    assert.ok(path.basename(root).startsWith('vida-release-preparation-v465-'));
    rmSync(root, { recursive: true, force: true });
  }
});

test('resume completes a mixed exact before/after image set and binds the retained receipt identity', () => {
  const root = ownedRoot();
  try {
    const prior = makeManifest('0.1.2');
    const priorBytes = Buffer.from(releaseJSON(prior));
    const prepared = makePrepared('preparation-interrupted', '0.1.3');
    const intent = makeIntent(prepared, priorBytes, '0.1.2');
    const intentBytes = writeIntent(root, intent);
    const manifestAfter = Buffer.from(targetAt(intent, 0).after, 'base64');
    const pendingAfter = Buffer.from(targetAt(intent, 2).after, 'base64');

    writeBytes(root, manifestPath, manifestAfter);
    writeBytes(root, pendingPath, pendingAfter);

    assert.deepEqual(resumeReleasePreparation(root), prepared);
    assert.deepEqual(readFileSync(path.join(root, manifestPath)), manifestAfter);
    assert.deepEqual(readFileSync(path.join(root, operationJournalPath(prepared))), pendingAfter);
    assert.deepEqual(readFileSync(path.join(root, pendingPath)), pendingAfter);
    assert.equal(existsSync(path.join(root, intentPath)), false);
    assert.deepEqual(
      readFileSync(path.join(root, `.agent/work/agent-local-release/${prepared.operation_id}/preparation.json`)),
      intentBytes,
    );
    assert.deepEqual(readReleasePreparation(root, prepared), { priorVersion: '0.1.2', disposition: null });
    assert.throws(
      () => readReleasePreparation(root, { operation_id: prepared.operation_id, version: '0.1.4' }),
      /preparation receipt differs from pending release/,
    );
  } finally {
    assert.ok(path.basename(root).startsWith('vida-release-preparation-v465-'));
    rmSync(root, { recursive: true, force: true });
  }
});

test('third-state drift is rejected before writes and the original intent remains byte-identical', () => {
  const root = ownedRoot();
  try {
    const priorBytes = Buffer.from(releaseJSON(makeManifest('0.1.2')));
    const prepared = makePrepared('preparation-drift', '0.1.3');
    const intent = makeIntent(prepared, priorBytes, '0.1.2');
    writeBytes(root, manifestPath, priorBytes);
    const intentBytes = writeIntent(root, intent);
    const driftBytes = Buffer.from(releaseJSON({ operation_id: 'outside-edit', version: '0.1.3' }));
    writeBytes(root, pendingPath, driftBytes);

    assert.throws(() => resumeReleasePreparation(root), /preparation target changed/);

    assert.deepEqual(readFileSync(path.join(root, intentPath)), intentBytes);
    assert.deepEqual(readFileSync(path.join(root, manifestPath)), priorBytes);
    assert.deepEqual(readFileSync(path.join(root, pendingPath)), driftBytes);
    assert.equal(existsSync(path.join(root, operationJournalPath(prepared))), false);
    assert.equal(existsSync(path.join(root, `.tmp/releases/${prepared.operation_id}`)), false);
  } finally {
    assert.ok(path.basename(root).startsWith('vida-release-preparation-v465-'));
    rmSync(root, { recursive: true, force: true });
  }
});

test('malformed paths and noncanonical base64 are rejected without changing fixture bytes', () => {
  const root = ownedRoot();
  try {
    const priorBytes = Buffer.from(releaseJSON(makeManifest('0.1.2')));
    const prepared = makePrepared('preparation-malformed', '0.1.3');
    const intent = makeIntent(prepared, priorBytes, '0.1.2');
    const malformedPath = {
      ...intent,
      targets: [{ ...targetAt(intent, 0), path: '../../outside/package.json' }, ...intent.targets.slice(1)],
    };
    const malformedPathBytes = writeIntent(root, malformedPath);

    assert.throws(() => resumeReleasePreparation(root), /target path or shape differs/);
    assert.deepEqual(readFileSync(path.join(root, intentPath)), malformedPathBytes);
    assert.equal(existsSync(path.join(root, operationJournalPath(prepared))), false);

    const malformedImage = {
      ...intent,
      targets: [{ ...targetAt(intent, 0), after: 'YQ' }, ...intent.targets.slice(1)],
    };
    const malformedImageBytes = writeIntent(root, malformedImage);
    assert.throws(() => resumeReleasePreparation(root), /preparation image encoding differs/);
    assert.deepEqual(readFileSync(path.join(root, intentPath)), malformedImageBytes);
    assert.equal(existsSync(path.join(root, operationJournalPath(prepared))), false);
  } finally {
    assert.ok(path.basename(root).startsWith('vida-release-preparation-v465-'));
    rmSync(root, { recursive: true, force: true });
  }
});

test('oversized persisted intent is refused before any prepared target is published', () => {
  const root = ownedRoot();
  try {
    const priorBytes = Buffer.from(releaseJSON(makeManifest('0.1.2')));
    const prepared = makePrepared('preparation-oversized', '0.1.3');
    writeBytes(root, manifestPath, priorBytes);
    const oversized = Buffer.alloc(byteLimit + 1, 0x20);
    writeBytes(root, intentPath, oversized);

    assert.throws(() => resumeReleasePreparation(root), /release file unsafe or oversized/);

    assert.deepEqual(readFileSync(path.join(root, intentPath)), oversized);
    assert.deepEqual(readFileSync(path.join(root, manifestPath)), priorBytes);
    assert.equal(existsSync(path.join(root, operationJournalPath(prepared))), false);
    assert.equal(existsSync(path.join(root, pendingPath)), false);
  } finally {
    assert.ok(path.basename(root).startsWith('vida-release-preparation-v465-'));
    rmSync(root, { recursive: true, force: true });
  }
});

test('oversized manifest beforeimages fail before the intent is published', () => {
  const root = ownedRoot();
  try {
    const oversizedManifest = Buffer.alloc(byteLimit + 1, 0x20);
    writeBytes(root, manifestPath, oversizedManifest);
    const prepared = makePrepared('preparation-oversized-manifest', '0.1.3');

    assert.throws(
      () => publishReleasePreparation(root, prepared, makeManifest('0.1.3'), null),
      /release file unsafe or oversized/,
    );

    assert.deepEqual(readFileSync(path.join(root, manifestPath)), oversizedManifest);
    assert.equal(existsSync(path.join(root, intentPath)), false);
    assert.equal(existsSync(path.join(root, pendingPath)), false);
  } finally {
    assert.ok(path.basename(root).startsWith('vida-release-preparation-v465-'));
    rmSync(root, { recursive: true, force: true });
  }
});

test('linked manifest paths fail closed before publishing an intent', () => {
  const root = ownedRoot();
  try {
    const target = path.join(root, 'manifest-target.json');
    writeFileSync(target, releaseJSON(makeManifest('0.1.2')));
    mkdirSync(path.dirname(path.join(root, manifestPath)), { recursive: true });
    symlinkSync(target, path.join(root, manifestPath));
    const prepared = makePrepared('preparation-linked-manifest', '0.1.3');

    assert.throws(
      () => publishReleasePreparation(root, prepared, makeManifest('0.1.3'), null),
      /linked or non-regular path/,
    );

    assert.equal(existsSync(path.join(root, intentPath)), false);
    assert.equal(existsSync(path.join(root, pendingPath)), false);
    assert.deepEqual(readFileSync(target), Buffer.from(releaseJSON(makeManifest('0.1.2'))));
  } finally {
    assert.ok(path.basename(root).startsWith('vida-release-preparation-v465-'));
    rmSync(root, { recursive: true, force: true });
  }
});

test('public CLI resumes exact pending state, retains intent on route errors, and rejects non-resume modes', async () => {
  const root = ownedRoot();
  try {
    const priorBytes = Buffer.from(releaseJSON(makeManifest('0.1.2')));
    const prepared = makePrepared('preparation-cli', '0.1.3');
    const intent = makeIntent(prepared, priorBytes, '0.1.2');
    const intentBytes = writeIntent(root, intent);
    writeBytes(root, manifestPath, Buffer.from(targetAt(intent, 0).after, 'base64'));
    writeBytes(root, pendingPath, Buffer.from(targetAt(intent, 2).after, 'base64'));
    const args = ['--kind', 'release-preparation', '--mode', 'resume', '--project-root', root];

    assert.throws(
      () => runReleasePreparation(['--kind', 'release-preparation', '--mode', 'apply', '--project-root', root]),
      /release preparation options differ from declaration/,
    );
    assert.deepEqual(readFileSync(path.join(root, intentPath)), intentBytes);
    assert.deepEqual(await runReleasePreparation(args), prepared);
    assert.deepEqual(
      readFileSync(path.join(root, operationJournalPath(prepared))),
      Buffer.from(targetAt(intent, 2).after, 'base64'),
    );
    assert.deepEqual(await runReleasePreparation(args), { status: 'settled' });
  } finally {
    assert.ok(path.basename(root).startsWith('vida-release-preparation-v465-'));
    rmSync(root, { recursive: true, force: true });
  }
});

// These isolated Source fixtures cover the release-preparation image protocol and public CLI route.
// They do not qualify power-loss durability, native platform locking, worker effects, or installed Runtime behavior.

function makeDispositionIntent(
  prepared: PreparedRelease,
  beforeManifest: Uint8Array,
  beforeVersion: string,
  disposition: unknown,
): PreparationIntent {
  const base = makeIntent(prepared, beforeManifest, beforeVersion);
  const operationRoot = `.agent/work/agent-local-release/${prepared.operation_id}`;
  const dispositionTarget: PreparationTarget = {
    path: `${operationRoot}/disposition.json`,
    before: null,
    after: Buffer.from(releaseJSON(disposition)).toString('base64'),
  };
  const journal = targetAt(base, 1);
  const pending = targetAt(base, 2);
  return {
    schema: 'VidaReleasePreparation/v1',
    prepared,
    targets: [targetAt(base, 0), dispositionTarget, journal, pending],
  };
}

function assertTargetImage(root: string, target: PreparationTarget, expected: string | null): void {
  const file = path.join(root, target.path);
  if (expected === null) {
    assert.equal(existsSync(file), false, `${target.path} should remain absent`);
    return;
  }
  assert.deepEqual(readFileSync(file), Buffer.from(expected, 'base64'), target.path);
}

test('release preparation resumes each exact 3/4-target prefix and retains its complete receipt', async () => {
  const disposition: unknown = { decision: 'defer', reason: 'prepared disposition image' };
  const cases: Array<{ count: 3 | 4; withDisposition: boolean }> = [
    { count: 3, withDisposition: false },
    { count: 4, withDisposition: true },
  ];

  for (const scenario of cases) {
    for (let prefix = 0; prefix <= scenario.count; prefix += 1) {
      const root = ownedRoot();
      try {
        const priorBytes = Buffer.from(releaseJSON(makeManifest('0.1.2')));
        const prepared = makePrepared(`preparation-v473-${scenario.count}-${prefix}`, '0.1.3');
        const intent = scenario.withDisposition
          ? makeDispositionIntent(prepared, priorBytes, '0.1.2', disposition)
          : makeIntent(prepared, priorBytes, '0.1.2');
        assert.equal(intent.targets.length, scenario.count);
        const expectedPaths = scenario.withDisposition
          ? [
              manifestPath,
              `.agent/work/agent-local-release/${prepared.operation_id}/disposition.json`,
              operationJournalPath(prepared),
              pendingPath,
            ]
          : [manifestPath, operationJournalPath(prepared), pendingPath];
        assert.deepEqual(
          intent.targets.map((target) => target.path),
          expectedPaths,
        );

        writeBytes(root, manifestPath, priorBytes);
        const unrelatedPath = 'unrelated/keep.bin';
        const unrelatedBytes = Buffer.from([0, 17, 128, 255]);
        writeBytes(root, unrelatedPath, unrelatedBytes);
        const intentBytes = writeIntent(root, intent);
        for (let index = 0; index < prefix; index += 1) {
          const target = targetAt(intent, index);
          writeBytes(root, target.path, Buffer.from(target.after, 'base64'));
        }

        assert.deepEqual(
          await runReleasePreparation(['--kind', 'release-preparation', '--mode', 'resume', '--project-root', root]),
          prepared,
        );

        for (const target of intent.targets) assertTargetImage(root, target, target.after);
        const operationReceipt = `.agent/work/agent-local-release/${prepared.operation_id}/preparation.json`;
        assert.equal(existsSync(path.join(root, intentPath)), false);
        assert.deepEqual(readFileSync(path.join(root, operationReceipt)), intentBytes);
        assert.deepEqual(readFileSync(path.join(root, unrelatedPath)), unrelatedBytes);
        assert.deepEqual(readReleasePreparation(root, prepared), {
          priorVersion: '0.1.2',
          disposition: scenario.withDisposition ? disposition : null,
        });
        assert.deepEqual(
          await runReleasePreparation(['--kind', 'release-preparation', '--mode', 'resume', '--project-root', root]),
          { status: 'settled' },
        );
        assert.deepEqual(readFileSync(path.join(root, operationReceipt)), intentBytes);
        assert.deepEqual(readFileSync(path.join(root, unrelatedPath)), unrelatedBytes);
      } finally {
        assert.ok(path.basename(root).startsWith('vida-release-preparation-v465-'));
        rmSync(root, { recursive: true, force: true });
      }
    }
  }
});

test('release preparation rejects third-state drift at every target without disturbing any image', () => {
  const disposition: unknown = { decision: 'defer', reason: 'prepared disposition image' };
  const scenarios: Array<{ count: 3 | 4; withDisposition: boolean }> = [
    { count: 3, withDisposition: false },
    { count: 4, withDisposition: true },
  ];

  for (const scenario of scenarios) {
    for (let driftIndex = 0; driftIndex < scenario.count; driftIndex += 1) {
      const root = ownedRoot();
      try {
        const priorBytes = Buffer.from(releaseJSON(makeManifest('0.1.2')));
        const prepared = makePrepared(`preparation-v473-drift-${scenario.count}-${driftIndex}`, '0.1.3');
        const intent = scenario.withDisposition
          ? makeDispositionIntent(prepared, priorBytes, '0.1.2', disposition)
          : makeIntent(prepared, priorBytes, '0.1.2');
        assert.equal(intent.targets.length, scenario.count);
        writeBytes(root, manifestPath, priorBytes);
        const unrelatedPath = 'unrelated/keep.bin';
        const unrelatedBytes = Buffer.from([32, 0, 91, 255]);
        writeBytes(root, unrelatedPath, unrelatedBytes);
        const intentBytes = writeIntent(root, intent);
        const driftTarget = targetAt(intent, driftIndex);
        const driftBytes = Buffer.from(`third-state-${driftIndex}`, 'utf8');
        writeBytes(root, driftTarget.path, driftBytes);

        assert.throws(() => resumeReleasePreparation(root), /preparation target changed/);

        assert.deepEqual(readFileSync(path.join(root, intentPath)), intentBytes);
        for (let index = 0; index < intent.targets.length; index += 1) {
          const target = targetAt(intent, index);
          if (index === driftIndex) {
            assert.deepEqual(readFileSync(path.join(root, target.path)), driftBytes, target.path);
          } else {
            assertTargetImage(root, target, target.before);
          }
        }
        assert.deepEqual(readFileSync(path.join(root, unrelatedPath)), unrelatedBytes);
        assert.equal(
          existsSync(path.join(root, `.agent/work/agent-local-release/${prepared.operation_id}/preparation.json`)),
          false,
        );
        assert.equal(
          existsSync(path.join(root, operationJournalPath(prepared))),
          driftTarget.path === operationJournalPath(prepared),
        );
        assert.equal(existsSync(path.join(root, pendingPath)), driftTarget.path === pendingPath);
        assert.equal(existsSync(path.join(root, `.tmp/releases/${prepared.operation_id}`)), false);
      } finally {
        assert.ok(path.basename(root).startsWith('vida-release-preparation-v465-'));
        rmSync(root, { recursive: true, force: true });
      }
    }
  }
});
