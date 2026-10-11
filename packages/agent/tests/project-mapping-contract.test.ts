import { describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectMappings } from '../bin/project-mapping-contract.js';
import { initializeProjectFromBundle } from '../bin/init-core.ts';
import { createInitializationBundle } from './helpers/init-bundle.js';

// Pure parser contracts reach private guards through the public API. Filesystem
// identity, persistence and replay belong to the initializer, not this parser.
describe('explicit project mapping contract', () => {
  test.each([
    { label: 'null', value: null },
    { label: 'object', value: {} },
    { label: 'empty', value: [] },
    { label: 'mixed', value: ['alpha', 1] },
    { label: 'sparse', value: new Array<unknown>(1) },
  ])('rejects missing, malformed or sparse mapping sets: %j', ({ value }) => {
    expect(() => projectMappings(value)).toThrow('Projects must be a non-empty explicit project mapping set');
  });

  test('one bare project selects the repository root', () => {
    expect(projectMappings(['alpha'])).toEqual([{ id: 'alpha', root: '.' }]);
    expect(projectMappings(['alpha=.'])).toEqual([{ id: 'alpha', root: '.' }]);
  });

  test('splits only the first separator, normalizes trailing separators and sorts without mutating input', () => {
    const input = ['zeta=dir=segment///', 'alpha=child/nested/'];
    expect(projectMappings(input)).toEqual([
      { id: 'alpha', root: 'child/nested' },
      { id: 'zeta', root: 'dir=segment' },
    ]);
    expect(input).toEqual(['zeta=dir=segment///', 'alpha=child/nested/']);
  });

  test('accepts the maximum project ID length and rejects the next character', () => {
    const id = 'a'.repeat(64);
    expect(projectMappings([id])).toEqual([{ id, root: '.' }]);
    expect(() => projectMappings([id + 'a'])).toThrow('Project id must be a lowercase slug of 1–64 characters');
  });

  test.each(['', '=child', 'Alpha=child', '-alpha=child', 'alpha_child=child'])(
    'rejects invalid mapping %s',
    (entry) => {
      expect(() => projectMappings([entry])).toThrow(
        entry === '' ? 'Project mapping must be PROJECT_ID=RELATIVE_ROOT' : 'Project id must be a lowercase slug',
      );
    },
  );

  test('rejects a hole even when an inherited numeric property supplies a string', () => {
    const sparse = new Array<unknown>(1);
    const inheritedIndex: object = Object.create(Array.prototype) as object;
    Object.defineProperty(inheritedIndex, '0', { value: 'alpha' });
    Object.setPrototypeOf(sparse, inheritedIndex);
    expect(() => projectMappings(sparse)).toThrow('Projects must be a non-empty explicit project mapping set');
  });

  test('captures actual entries instead of dispatching an inherited mapping method', () => {
    let invoked = 0;
    const input = ['alpha'];
    const prototype = Object.create(Array.prototype) as object;
    Object.defineProperty(prototype, 'map', {
      value: () => {
        invoked += 1;
        return [{ id: 'alpha', root: '../outside' }];
      },
    });
    Object.setPrototypeOf(input, prototype);
    expect(projectMappings(input)).toEqual([{ id: 'alpha', root: '.' }]);
    expect(invoked).toBe(0);
  });

  test('rejects accessor entries without invoking the getter', () => {
    let invoked = 0;
    const input = ['alpha'];
    Object.defineProperty(input, '0', {
      get() {
        invoked += 1;
        return 'alpha';
      },
    });
    expect(() => projectMappings(input)).toThrow('Projects must be a non-empty explicit project mapping set');
    expect(invoked).toBe(0);
  });

  test.each([
    '',
    '/',
    '/outside',
    '///',
    'C:',
    'C:/outside',
    'C:outside',
    'c:outside',
    '//server/share',
    '../outside',
    'child/../outside',
    './child',
    'child/./nested',
    'child//nested',
    'child\\nested',
  ])('rejects unsafe explicit root %s', (root) => {
    expect(() => projectMappings(['alpha=' + root])).toThrow(
      'Project root must be a non-empty safe repository-relative path',
    );
  });

  test('every root is explicit for multiple projects, and IDs are unique after normalization', () => {
    expect(() => projectMappings(['alpha', 'beta=child'])).toThrow(
      'Multi-project initialization requires every --project',
    );
    expect(() => projectMappings(['alpha=one', 'alpha=two/'])).toThrow('Project ids must be unique');
  });

  test('the initializer rejects a parsed unsupported root before publishing authority', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-mapping-native-'));
    const packageRoot = fileURLToPath(new URL('..', import.meta.url));
    let completed = false;
    try {
      const bundleRoot = createInitializationBundle(packageRoot, root);
      mkdirSync(path.join(root, 'dir=segment'));
      await Promise.resolve(
        expect(
          initializeProjectFromBundle(
            { projectRoot: root, repository: 'mapping-repository', projectMappings: ['alpha=dir=segment'] },
            bundleRoot,
          ),
        ).rejects.toThrow('/projects/0/project_root must match pattern'),
      );
      for (const entry of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml', '.agent'])
        expect(existsSync(path.join(root, entry))).toBe(false);
      completed = true;
    } finally {
      if (completed) rmSync(root, { recursive: true, force: true });
      else process.stderr.write(`Retained failed native mapping fixture: ${root}\n`);
    }
  });
});
