import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, existsSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import {
  candidateVersion,
  executeRelease,
  prepareRelease,
  selectedTarball,
  withReleaseAdmission,
  parsePackOutput,
  reserveReleaseWorker,
  claimReleaseWorker,
} from '../../tooling/agent/release-local.mjs';
import { findNpmCli } from '../../packages/agent/bin/bun.mjs';
import { verifyForwardReviewSet } from '../../tooling/agent/controllers/forward-review-proof.mjs';

const json = (value) => JSON.stringify(value);
function admissionChild(root, name, mode = 'hold') {
  const module = new URL('../../tooling/agent/release-local.mjs', import.meta.url).href;
  const code = `import { withReleaseAdmission, prepareRelease } from ${JSON.stringify(module)};
    import { existsSync, writeFileSync } from 'node:fs';
    import path from 'node:path';
    const root=process.argv[1], name=process.argv[2], mode=process.argv[3];
    writeFileSync(path.join(root,name+'-attempt'), 'TEST SETUP attempted');
    if(mode==='prepare') console.log(JSON.stringify(await prepareRelease(root)));
    else await withReleaseAdmission(root,()=>{
      writeFileSync(path.join(root,name+'-entered'),'TEST SETUP entered');
      const deadline=Date.now()+15000;
      while(!existsSync(path.join(root,name+'-release'))){
        if(Date.now()>deadline)throw new Error('TEST SETUP hold deadline');
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);
      }
    });`;
  const child = spawn(process.execPath, ['--input-type=module', '--eval', code, root, name, mode], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '',
    stderr = '',
    finished = false;
  child.stdout.on('data', (bytes) => {
    stdout += bytes;
  });
  child.stderr.on('data', (bytes) => {
    stderr += bytes;
  });
  const completion = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code, signal) => {
      finished = true;
      resolve({ code, signal, stdout, stderr });
    });
  });
  const marker = async (phase) => {
    const deadline = Date.now() + 10000;
    while (!existsSync(path.join(root, name + '-' + phase))) {
      if (finished || Date.now() > deadline)
        throw new Error('Child marker missing: ' + name + '-' + phase + ' ' + stderr);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
  return { child, completion, marker };
}
function workerChild(root, operation, name) {
  const module = new URL('../../tooling/agent/release-local.mjs', import.meta.url).href;
  const code = `import { claimReleaseWorker } from ${JSON.stringify(module)};
    import { existsSync, writeFileSync } from 'node:fs';
    import path from 'node:path';
    const [root,operation,name]=process.argv.slice(1);
    const wait=async(phase)=>{const deadline=Date.now()+10000;
      while(!existsSync(path.join(root,name+'-'+phase))){
        if(Date.now()>deadline)throw new Error('TEST SETUP deadline');
        await new Promise(resolve=>setTimeout(resolve,10));
      }};
    writeFileSync(path.join(root,name+'-attempt'),'TEST SETUP');
    await wait('start');
    const mutex=await claimReleaseWorker(root,operation,process.pid);
    try { writeFileSync(path.join(root,name+'-entered'),'TEST SETUP'); await wait('release'); }
    finally {mutex.close();}`;
  const child = spawn(process.execPath, ['--input-type=module', '--eval', code, root, operation, name], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (bytes) => {
    stderr += bytes;
  });
  const completion = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal, stderr }));
  });
  const marker = async (phase) => {
    const deadline = Date.now() + 10000;
    while (!existsSync(path.join(root, name + '-' + phase))) {
      if (Date.now() > deadline) throw new Error('TEST SETUP child marker missing ' + stderr);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
  return { child, completion, marker };
}
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'vida local Україна '));
  const source = path.join(root, 'packages/agent');
  mkdirSync(path.join(source, 'bin'), { recursive: true });
  mkdirSync(path.join(source, 'instructions'));
  writeFileSync(
    path.join(source, 'package.json'),
    json({
      name: 'vida-agent',
      version: '0.1.0',
      bin: { 'vida-agent': './bin/vida-agent.mjs' },
      engines: { bun: '1.4.2' },
      packageManager: 'bun@1.4.2',
    }),
  );
  writeFileSync(path.join(source, 'bin/vida-agent.mjs'), '// TEST SETUP fake package');
  writeFileSync(path.join(source, 'instructions/development-lifecycle.md'), 'TEST SETUP');
  const prefix = path.join(root, 'global prefix'),
    globalRoot = path.join(prefix, 'node_modules');
  mkdirSync(globalRoot, { recursive: true });
  const shimFolder = process.platform === 'win32' ? prefix : path.join(prefix, 'bin');
  mkdirSync(shimFolder, { recursive: true });
  const calls = [];
  const command = async (_command, args) => {
    calls.push(args);
    const action = args[1];
    if (action === 'pack') {
      const folder = args.at(-1),
        version = JSON.parse(readFileSync(path.join(source, 'package.json'))).version;
      const bytes = Buffer.from('TEST SETUP tarball ' + version),
        filename = `vida-agent-${version}.tgz`;
      writeFileSync(path.join(folder, filename), bytes);
      return json([
        {
          name: 'vida-agent',
          version,
          filename,
          integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64'),
          files: [
            { path: 'package.json' },
            { path: 'bin/vida-agent.mjs' },
            { path: 'instructions/development-lifecycle.md' },
          ],
        },
      ]);
    }
    if (action === 'prefix') return prefix;
    if (action === 'root') return globalRoot;
    if (action === 'install' && args[2] === '--global') {
      cpSync(source, path.join(globalRoot, 'vida-agent'), { recursive: true });
      if (process.platform === 'win32')
        writeFileSync(path.join(prefix, 'vida-agent.cmd'), 'node_modules/vida-agent/bin/vida-agent.mjs');
      else {
        const { symlinkSync } = await import('node:fs');
        symlinkSync(path.join(globalRoot, 'vida-agent/bin/vida-agent.mjs'), path.join(prefix, 'bin/vida-agent'));
      }
      return '';
    }
    const version = JSON.parse(readFileSync(path.join(source, 'package.json'))).version;
    if (action === 'version') return json({ name: 'vida-agent', version });
    if (action === 'instructions')
      return json({ version, path: path.join(globalRoot, 'vida-agent/instructions/development-lifecycle.md') });
    if (action === 'install' && args[2] === '--check') return json({ status: 'prerequisites_valid', bun_pin: '1.4.2' });
    throw new Error('Unexpected TEST SETUP command: ' + args.join(' '));
  };
  return {
    root,
    prefix,
    source,
    calls,
    command,
    env: { PATH: shimFolder },
    qualify: async () => ({ source_binding: 'TEST SETUP exact source binding' }),
    npmCli: path.join(root, 'npm-cli.js'),
  };
}
test('initial candidate 0.1.0 and subsequent successful publications increment patch only', async () => {
  const fixtureValue = fixture();
  try {
    assert.equal(candidateVersion('0.1.0'), '0.1.0');
    const candidate = await prepareRelease(fixtureValue.root);
    assert.equal(candidate.version, '0.1.0');
    await executeRelease({ ...fixtureValue, operation: candidate.operation_id, packOnly: true });
    const result = await executeRelease({ ...fixtureValue, operation: candidate.operation_id });
    assert.equal(result.status, 'successful');
    assert.equal(fixtureValue.calls.filter((args) => args[1] === 'install' && args[2] === '--global').length, 1);
    const install = fixtureValue.calls.find((args) => args[1] === 'install' && args[2] === '--global');
    assert.equal(
      install.at(-1),
      path.join(fixtureValue.root, '.tmp/releases', candidate.operation_id, 'vida-agent-0.1.0.tgz'),
    );
    await executeRelease({ ...fixtureValue, operation: candidate.operation_id });
    assert.equal(fixtureValue.calls.filter((args) => args[1] === 'install' && args[2] === '--global').length, 1);
    assert.ok(fixtureValue.calls.every((args) => !args.includes('publish')));
    rmSync(path.join(fixtureValue.root, '.tmp'), { recursive: true });
    assert.equal((await prepareRelease(fixtureValue.root)).version, '0.1.1');
  } finally {
    rmSync(fixtureValue.root, { recursive: true });
  }
});
test('missing assurance and failed prepack preserve the pending version without install', async () => {
  const fixtureValue = fixture();
  try {
    const candidate = await prepareRelease(fixtureValue.root);
    await assert.rejects(
      executeRelease({
        ...fixtureValue,
        operation: candidate.operation_id,
        qualify: async () => {
          throw new Error('awaiting_assurance: missing real reviews');
        },
      }),
      /awaiting_assurance/,
    );
    assert.equal(fixtureValue.calls.length, 0);
    await assert.rejects(
      executeRelease({
        ...fixtureValue,
        operation: candidate.operation_id,
        packOnly: true,
        command: async () => {
          throw new Error('prepack failed');
        },
      }),
      /prepack failed/,
    );
    assert.deepEqual(await prepareRelease(fixtureValue.root), candidate);
    assert.equal(JSON.parse(readFileSync(path.join(fixtureValue.source, 'package.json'))).version, '0.1.0');
  } finally {
    rmSync(fixtureValue.root, { recursive: true });
  }
});
test('pack metadata refuses multiple archives, traversal and unrelated artifact identity', () => {
  assert.throws(() => selectedTarball([], tmpdir(), '0.1.0'), /exactly one/);
  assert.throws(
    () =>
      selectedTarball(
        [{ name: 'vida-agent', version: '0.1.0', filename: '../vida-agent-0.1.0.tgz' }],
        tmpdir(),
        '0.1.0',
      ),
    /identity differs/,
  );
  assert.throws(
    () => selectedTarball([{ name: 'other', version: '0.1.0', filename: 'vida-agent-0.1.0.tgz' }], tmpdir(), '0.1.0'),
    /identity differs/,
  );
});
test('completed receipt repairs a missing success stamp before allocating the next patch', async () => {
  const fixtureValue = fixture();
  try {
    const candidate = await prepareRelease(fixtureValue.root);
    await executeRelease({ ...fixtureValue, operation: candidate.operation_id, packOnly: true });
    await executeRelease({ ...fixtureValue, operation: candidate.operation_id });
    rmSync(path.join(fixtureValue.root, '.agent/work/agent-local-release/successful.json'));
    assert.equal((await prepareRelease(fixtureValue.root)).version, '0.1.1');
  } finally {
    rmSync(fixtureValue.root, { recursive: true });
  }
});
test('failed admission rolls back its own transaction without removing shared admission or another owner file', async () => {
  const fixtureValue = fixture();
  try {
    await prepareRelease(fixtureValue.root);
    const folder = path.join(fixtureValue.root, '.agent/work/agent-local-release');
    const database = path.join(folder, 'admission.sqlite'),
      otherOwnerFile = path.join(folder, 'admission.json');
    writeFileSync(otherOwnerFile, 'TEST SETUP independent owner bytes');
    const identity = statSync(database).ino;
    await assert.rejects(
      withReleaseAdmission(fixtureValue.root, () => {
        throw new Error('TEST SETUP owner failure');
      }),
      /owner failure/,
    );
    assert.equal(readFileSync(otherOwnerFile, 'utf8'), 'TEST SETUP independent owner bytes');
    assert.equal(statSync(database).ino, identity);
    assert.equal((await prepareRelease(fixtureValue.root)).version, '0.1.0');
  } finally {
    rmSync(fixtureValue.root, { recursive: true });
  }
});
test('worker mutex recovers unrelated live PIDs, rejects startup losers and releases killed owners without replaying uncertain installs', async () => {
  const value = fixture(),
    children = [];
  try {
    const pending = await prepareRelease(value.root),
      operation = pending.operation_id;
    const journal = path.join(value.root, '.agent/work/agent-local-release', operation, 'release.json');
    await executeRelease({ ...value, operation, packOnly: true });
    // TEST SETUP: a live unrelated process occupies the old numeric reservation.
    writeFileSync(
      journal,
      json({ ...JSON.parse(readFileSync(journal)), pid: process.pid, status: 'running', install_started: true }),
    );
    const first = workerChild(value.root, operation, 'worker-first');
    children.push(first);
    await first.marker('attempt');
    const reserved = await reserveReleaseWorker(value.root, operation, () => first.child.pid);
    assert.equal(reserved.pid, first.child.pid);
    const second = workerChild(value.root, operation, 'worker-second');
    children.push(second);
    await second.marker('attempt');
    await reserveReleaseWorker(value.root, operation, () => second.child.pid);
    writeFileSync(path.join(value.root, 'worker-first-start'), 'TEST SETUP');
    const loser = await first.completion;
    assert.equal(loser.code, 1);
    assert.match(loser.stderr, /reservation differs/);
    writeFileSync(path.join(value.root, 'worker-second-start'), 'TEST SETUP');
    await second.marker('entered');
    let launched = false;
    const busy = await reserveReleaseWorker(value.root, operation, () => {
      launched = true;
      return process.pid;
    });
    assert.equal(launched, false);
    assert.equal(busy.pid, second.child.pid);
    second.child.kill('SIGKILL');
    await second.completion;
    const recovered = await reserveReleaseWorker(value.root, operation, () => process.pid);
    assert.equal(recovered.pid, process.pid);
    assert.equal(recovered.install_started, true);
    assert.equal((await prepareRelease(value.root)).operation_id, operation);
    const mutex = await claimReleaseWorker(value.root, operation, process.pid);
    try {
      await assert.rejects(
        executeRelease({ ...value, operation }),
        /Prior install outcome differs or remains uncertain/,
      );
      assert.equal(
        value.calls.some((args) => args.includes('--global') && args.includes('install')),
        false,
      );
    } finally {
      mutex.close();
    }
  } finally {
    for (const child of children) {
      child.child.kill('SIGKILL');
      await child.completion;
    }
    rmSync(value.root, { recursive: true, force: true });
  }
});
test('real process admission stays exclusive across owner handoff and killed-owner rollback', async () => {
  const fixtureValue = fixture(),
    children = [];
  try {
    const candidate = await prepareRelease(fixtureValue.root);
    const database = path.join(fixtureValue.root, '.agent/work/agent-local-release/admission.sqlite');
    const identity = statSync(database).ino;
    const first = admissionChild(fixtureValue.root, 'first');
    children.push(first);
    await first.marker('entered');
    const second = admissionChild(fixtureValue.root, 'second');
    children.push(second);
    await second.marker('attempt');
    writeFileSync(path.join(fixtureValue.root, 'first-release'), 'TEST SETUP release');
    await second.marker('entered');
    assert.equal((await first.completion).code, 0);
    assert.equal(statSync(database).ino, identity);
    const contender = admissionChild(fixtureValue.root, 'contender', 'prepare');
    children.push(contender);
    const denied = await contender.completion;
    assert.notEqual(denied.code, 0);
    assert.match(denied.stderr, /locked|SQLITE_BUSY/);
    second.child.kill('SIGKILL');
    await second.completion;
    const recovered = admissionChild(fixtureValue.root, 'recovered', 'prepare');
    children.push(recovered);
    const result = await recovered.completion;
    assert.equal(result.code, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).operation_id, candidate.operation_id);
    assert.equal(statSync(database).ino, identity);
    assert.equal(JSON.parse(readFileSync(path.join(fixtureValue.source, 'package.json'))).version, '0.1.0');
  } finally {
    for (const child of children) {
      child.child.kill('SIGKILL');
      await child.completion;
    }
    rmSync(fixtureValue.root, { recursive: true });
  }
});
test('verification failure after install resumes exact installed artifact without another install', async () => {
  const fixtureValue = fixture();
  try {
    const candidate = await prepareRelease(fixtureValue.root);
    await executeRelease({ ...fixtureValue, operation: candidate.operation_id, packOnly: true });
    const command = async (cmd, args, options) => {
      if (args[1] === 'version') throw new Error('transient version observation failure');
      return fixtureValue.command(cmd, args, options);
    };
    await assert.rejects(
      executeRelease({ ...fixtureValue, command, operation: candidate.operation_id }),
      /observation failure/,
    );
    assert.equal((await prepareRelease(fixtureValue.root)).operation_id, candidate.operation_id);
    await executeRelease({ ...fixtureValue, operation: candidate.operation_id });
    assert.equal(fixtureValue.calls.filter((args) => args[1] === 'install' && args[2] === '--global').length, 1);
  } finally {
    rmSync(fixtureValue.root, { recursive: true });
  }
});
test('scratch removal after an install effect preserves unknown outcome and prevents replay', async () => {
  const fixtureValue = fixture();
  try {
    const candidate = await prepareRelease(fixtureValue.root);
    await executeRelease({ ...fixtureValue, operation: candidate.operation_id, packOnly: true });
    const command = async (cmd, args, options) => {
      if (args[1] === 'version') throw new Error('observation interrupted');
      return fixtureValue.command(cmd, args, options);
    };
    await assert.rejects(
      executeRelease({ ...fixtureValue, command, operation: candidate.operation_id }),
      /interrupted/,
    );
    rmSync(path.join(fixtureValue.root, '.tmp'), { recursive: true });
    assert.equal((await prepareRelease(fixtureValue.root)).operation_id, candidate.operation_id);
    const retained = JSON.parse(
      readFileSync(
        path.join(fixtureValue.root, '.agent/work/agent-local-release', candidate.operation_id, 'release.json'),
      ),
    );
    assert.equal(retained.install_started, true);
    await assert.rejects(executeRelease({ ...fixtureValue, operation: candidate.operation_id }));
    assert.equal(fixtureValue.calls.filter((args) => args[1] === 'install' && args[2] === '--global').length, 1);
  } finally {
    rmSync(fixtureValue.root, { recursive: true });
  }
});
test('actual structured prepack output followed by one npm array parses without accepting unknown or trailing output', () => {
  const event = {
    schema: 'CandidatePackageBuild/v1',
    production_entrypoints: ['dist/src/index.js'],
    test_issuers_shipped: false,
    schemas: 23,
  };
  const metadata = [{ name: 'vida-agent', version: '0.1.0', filename: 'vida-agent-0.1.0.tgz' }];
  assert.deepEqual(parsePackOutput(json(event) + '\n' + json(metadata)), metadata);
  assert.throws(() => parsePackOutput(json({ ...event, schema: 'Unknown/v1' }) + '\n' + json(metadata)), /Unknown/);
  assert.throws(() => parsePackOutput(json(event) + '\n' + json(metadata) + '\n' + json(metadata)));
  assert.throws(() => parsePackOutput(json(event) + '\n' + json(metadata) + '\ntrailing garbage'));
});
test('interrupted successful pack observation is adopted without a rebuild and rejects packaged source drift', async () => {
  const fixtureValue = fixture();
  try {
    const candidate = await prepareRelease(fixtureValue.root);
    const folder = path.join(fixtureValue.root, '.tmp/releases', candidate.operation_id);
    const npmCli = findNpmCli();
    const tar = createRequire(npmCli)('tar');
    const filename = 'vida-agent-0.1.0.tgz',
      archive = path.join(folder, filename);
    const files = ['package.json', 'bin/vida-agent.mjs', 'instructions/development-lifecycle.md'];
    await tar.c({ gzip: true, cwd: fixtureValue.source, prefix: 'package/', file: archive }, files);
    const metadata = [
      {
        name: 'vida-agent',
        version: '0.1.0',
        filename,
        integrity: 'sha512-' + createHash('sha512').update(readFileSync(archive)).digest('base64'),
        files: files.map((relative) => ({ path: relative })),
      },
    ];
    const event = {
      schema: 'CandidatePackageBuild/v1',
      production_entrypoints: ['dist/src/index.js'],
      test_issuers_shipped: false,
      schemas: 23,
    };
    // TEST SETUP: a terminal npm observation was persisted before its controller interrupted.
    writeFileSync(
      path.join(folder, 'pack.json'),
      json({
        command: process.execPath,
        args: [npmCli, 'pack', '--json', '--pack-destination', folder],
        code: 0,
        signal: null,
        stdout: json(event) + '\n' + json(metadata),
      }),
    );
    const journal = path.join(
      fixtureValue.root,
      '.agent/work/agent-local-release',
      candidate.operation_id,
      'release.json',
    );
    writeFileSync(
      journal,
      json({ ...candidate, status: 'failed', source_binding: 'TEST SETUP prior controller bytes' }),
    );
    const result = await executeRelease({ ...fixtureValue, npmCli, operation: candidate.operation_id, packOnly: true });
    assert.equal(result.status, 'awaiting_assurance');
    assert.equal(fixtureValue.calls.length, 0);
    writeFileSync(path.join(fixtureValue.source, 'bin/vida-agent.mjs'), '// TEST SETUP drift');
    await assert.rejects(
      executeRelease({
        ...fixtureValue,
        npmCli,
        operation: candidate.operation_id,
        packOnly: true,
        qualify: async () => ({ source_binding: 'TEST SETUP changed packaged source' }),
      }),
      /Current packaged bytes differ/,
    );
    assert.equal(fixtureValue.calls.length, 0);
  } finally {
    rmSync(fixtureValue.root, { recursive: true });
  }
});
test('isolated local review receipts use a release namespace while preserving the default cutover contract', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida local review TEST SETUP '));
  try {
    const operation = 'test-setup-release',
      fingerprint = createHash('sha256').update('TEST SETUP sealed source').digest('hex');
    const folder = path.join(root, '.agent/release-assurance', operation);
    mkdirSync(folder, { recursive: true });
    const evidence = ['correctness', 'security', 'assurance'].map((kind) => {
      const relative = `.agent/release-assurance/${operation}/${kind}-review.json`;
      const reverse_path = `.agent/release-assurance/${operation}/${kind}-reverse.json`;
      const review = {
        schema: 'VidaForwardReviewReceipt/v1',
        operation_id: operation,
        kind,
        actor: `TEST SETUP actor ${kind}`,
        history_id: `TEST SETUP history ${kind}`,
        native_tool_ref: `TEST SETUP native ${kind}`,
        sealed_fingerprint: fingerprint,
        fresh_blind: true,
        verdict: 'pass',
        scope_reviewed: 'complete',
      };
      const bytes = JSON.stringify(review, null, 2) + '\n';
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      writeFileSync(path.join(root, relative), bytes);
      const reverse = {
        schema: 'VidaForwardReverseValidation/v1',
        operation_id: operation,
        kind,
        actor: review.actor,
        history_id: review.history_id,
        sealed_fingerprint: fingerprint,
        review_sha256: sha256,
        result: 'pass',
      };
      const reverseBytes = JSON.stringify(reverse, null, 2) + '\n';
      writeFileSync(path.join(root, reverse_path), reverseBytes);
      return {
        kind,
        path: relative,
        reverse_path,
        sha256,
        reverse_sha256: createHash('sha256').update(reverseBytes).digest('hex'),
        status: 'passed',
      };
    });
    verifyForwardReviewSet(root, operation, fingerprint, evidence, '.agent/release-assurance');
    assert.equal(existsSync(path.join(root, '.agent/cutover')), false);
    assert.throws(() => verifyForwardReviewSet(root, operation, fingerprint, evidence), /path invalid/);
    assert.throws(
      () => verifyForwardReviewSet(root, operation, fingerprint, evidence, '.agent/arbitrary'),
      /set invalid/,
    );
  } finally {
    rmSync(root, { recursive: true });
  }
});
