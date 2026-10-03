import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  boundedSpawnSync,
  commandOutcomeUnknown,
  executionBudget,
  pinnedEnvironment,
  requireTerminalCommand,
} from '../bin/bun.mjs';
import { developmentControllerBinding } from '../bin/development-controller.mjs';

// Actual controller qualification is package preparation, never consumer authority.
export function containedControllerFixture(bundle) {
  const budget = executionBudget(undefined, 30000);
  const root = mkdtempSync(path.join(tmpdir(), 'vida-contained-tests-'));
  const target = path.join(root, 'source'),
    controllerRoot = path.join(root, 'controller');
  mkdirSync(target);
  const repository = path.resolve(bundle, '../..');
  for (const name of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml', 'docs'])
    cpSync(path.join(repository, name), path.join(target, name), { recursive: true });
  mkdirSync(path.join(target, 'packages/agent'), { recursive: true });
  cpSync(path.join(bundle, 'docs'), path.join(target, 'packages/agent/docs'), { recursive: true });
  const driver = path.join(root, 'prepare.mjs');
  writeFileSync(
    driver,
    `import {prepareDevelopmentController, verifyDevelopmentController} from ${JSON.stringify(pathToFileURL(path.join(bundle, 'bin/development-controller.mjs')).href)};
await prepareDevelopmentController(${JSON.stringify({ target, controllerRoot })});
console.log(JSON.stringify(await verifyDevelopmentController(${JSON.stringify({ controllerRoot })})));\n`,
  );
  let retained = false;
  const execute = (executable, packageRoot, args, allowance, childBudget, label) => {
    const result = boundedSpawnSync(
      spawnSync,
      executable,
      ['--no-env-file', '--no-install', '--config=' + path.join(packageRoot, 'bunfig.toml'), ...args],
      {
        cwd: packageRoot,
        encoding: 'utf8',
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024,
        env: { ...pinnedEnvironment(executable, process.env, packageRoot), VIDA_CONTROLLER_DIAGNOSTICS: 'true' },
        timeout: allowance,
        budget: childBudget,
        diagnostics: true,
      },
      label,
    );
    if (commandOutcomeUnknown(result)) retained = true;
    return requireTerminalCommand(result, label);
  };
  let prepared;
  try {
    const result = execute(process.execPath, bundle, [driver], Infinity, budget, 'contained package prepare+verify');
    if (result.stderr) process.stderr.write(result.stderr);
    assert.equal(result.status, 0, result.stderr);
    prepared = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
    assert.equal(prepared.status, 'ready');
    assert.equal(prepared.qualification.status, 'pass');
    assert.equal(prepared.qualification.package_binding, prepared.package_binding.digest);
  } catch (error) {
    console.error('Failed contained package preparation retained: ' + root);
    throw error;
  }
  const assertUnchanged = () => {
    try {
      assert.equal(developmentControllerBinding(prepared.package_root), prepared.package_binding.digest);
    } catch (error) {
      retained = true;
      throw error;
    }
  };
  const cleanupTimeout = budget.cleanupTimeout();
  if (cleanupTimeout <= 0) {
    retained = true;
    console.error('Contained package cleanup reserve exhausted; retained: ' + root);
    throw new Error('Contained package cleanup requires its existing report-preserving reserve.');
  }
  let closed = false;
  return {
    binding: prepared.package_binding.digest,
    cleanupHookOptions: { timeout: cleanupTimeout },
    assertUnchanged,
    retain() {
      retained = true;
    },
    get retained() {
      return retained;
    },
    run(args, childBudget) {
      assert.equal(retained, false, 'Contained package cannot be reused after drift or unknown child outcome.');
      const result = execute(
        prepared.engine,
        prepared.package_root,
        [path.join(prepared.package_root, 'bin/run.mjs'), ...args],
        60000,
        childBudget,
        'contained public run',
      );
      const text = result.status === 0 ? result.stdout : result.stderr;
      return { ...result, payload: JSON.parse(text.trim().split(/\r?\n/).at(-1)) };
    },
    caseBudget() {
      return budget.child(60000);
    },
    async close() {
      if (closed) return;
      if (retained) {
        console.warn('Contained package and consumer state retained: ' + root);
        return;
      }
      try {
        assert.ok(budget.cleanupTimeout() >= cleanupTimeout, 'Contained package cleanup reserve was spent.');
        assertUnchanged();
        assert.ok(budget.cleanupTimeout() >= cleanupTimeout, 'Contained package binding check spent cleanup reserve.');
      } catch (error) {
        retained = true;
        console.error('Contained package cleanup denied; retained: ' + root);
        throw error;
      }
      // Bun hook timeouts are uncatchable. Keep custody visible before deletion
      // starts, and never retry an interrupted or deferred cleanup.
      retained = true;
      console.warn('Contained package cleanup pending; outcome unknown until completion: ' + root);
      try {
        await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        closed = true;
        retained = false;
        console.warn('Contained package cleanup completed: ' + root);
      } catch (error) {
        if (error.code !== 'EBUSY' && error.code !== 'EPERM') {
          console.error('Contained package cleanup failed; outcome unknown: ' + root);
          throw error;
        }
        console.warn('Terminal contained package cleanup deferred: ' + root);
      }
    },
  };
}
