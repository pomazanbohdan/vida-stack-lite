import { expect, test } from 'bun:test';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { runtimePackageCodePaths } from '../src/config/runtime-config.js';
import {
  assertAdmittedRuntimeCodeCurrent,
  readAdmittedSessionExecutionContext,
} from '../src/orchestration/admitted-session-execution.js';
import { assertAdmittedRuntimeWithSingleSnapshot } from './helpers/admitted-runtime-snapshot-observer.js';
import { createAutomaticWorkAdmissionFixture as fixture } from './helpers/automatic-work-admission-fixture.js';

test.each(['runtime', 'context'] as const)(
  'admission normalizes a caller runtime subset into one immutable canonical intake without changing raw input: %s',
  (reader) => {
    const f = fixture(false, true);
    try {
      const input = f.prepare('canonical', 'user:canonical');
      input.intakePath = '.agent/work/canonical/raw-intake.json';
      const rawIntake = {
        schema: 'VidaLocalSessionIntake/v1',
        work_item: input.workItem,
        native_session_handle: input.nativeSessionHandle,
        scope_path: input.scopePath,
        acceptance_path: input.acceptancePath,
        runtime_code_paths: input.runtimeCodePaths,
        route: input.route,
        risk: input.risk,
        change_kind: input.changeKind,
      };
      const raw = JSON.stringify(rawIntake);
      writeFileSync(path.join(f.root, input.intakePath), raw);
      const result = f.admit(input);
      if (result.host.work === null) throw new Error('Admitted fixture has no Host work');
      const reference = result.host.work.artifacts.find((artifact) => artifact.artifact_id === 'local-session-intake');
      if (reference === undefined) throw new Error('Canonical intake artifact is missing');
      expect(reference.path).not.toBe(input.intakePath);
      const normalized: unknown = JSON.parse(readFileSync(path.join(f.root, reference.path), 'utf8'));
      if (normalized === null || typeof normalized !== 'object' || !('runtime_code_paths' in normalized))
        throw new Error('Canonical intake inventory is missing');
      expect(normalized.runtime_code_paths).toEqual(runtimePackageCodePaths(f.config.runtime.bundle));
      expect(normalized.runtime_code_paths).toContain('vida-agent/src/runtime-kernel.ts');
      expect(readFileSync(path.join(f.root, input.intakePath), 'utf8')).toBe(raw);
      // The successful runtime/context checks also prove that subsequent caller
      // input changes cannot replace the protected canonical intake.
      writeFileSync(
        path.join(f.root, input.intakePath),
        JSON.stringify({ ...rawIntake, runtime_code_paths: ['vida-agent/bin/scope.ts'] }),
      );
      const work = result.host.work,
        identity = {
          repository_id: work.binding.repository_id,
          project_ids: work.binding.project_ids,
          integrations_digest: work.binding.integrations_digest,
          work_id: 'canonical',
        };
      if (reader === 'runtime') {
        expect(assertAdmittedRuntimeWithSingleSnapshot(f.root, f.store, identity).native_session_handle).toBe(
          input.nativeSessionHandle,
        );
      } else {
        const data = readAdmittedSessionExecutionContext(f.root, f.store, 'sample', 'canonical');
        expect(data.identity).toEqual(identity);
        expect(data.workItem).toEqual(input.workItem);
        expect(Object.hasOwn(data, 'composition')).toBe(false);
      }
      const configPath = path.join(f.root, 'agent-runtime.config.v1.yaml'),
        originalConfig = readFileSync(configPath, 'utf8');
      writeFileSync(configPath, originalConfig.replace(/config_revision: \d+/, 'config_revision: 2'));
      expect(() => readAdmittedSessionExecutionContext(f.root, f.store, 'sample', 'canonical')).toThrow(
        'configuration or project differs',
      );
      writeFileSync(configPath, originalConfig);
      writeFileSync(path.join(f.root, reference.path), raw);
      expect(() => assertAdmittedRuntimeCodeCurrent(f.root, f.store, identity)).toThrow(/intake changed/);
      expect(() => readAdmittedSessionExecutionContext(f.root, f.store, 'sample', 'canonical')).toThrow(
        /intake changed/,
      );
    } finally {
      f.close();
    }
  },
);
