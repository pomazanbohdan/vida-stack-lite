import { describe, expect, it } from 'bun:test';
import {
  resolveProjectPathMembership,
  resolveSelectedProjectForRepositoryPath,
} from '../src/config/project-context.js';

describe('product context path membership', () => {
  const projects = [
    {
      project_id: 'agent',
      project_root: 'packages/agent',
      product_paths: [
        'packages/agent/src/**',
        'packages/agent/docs/requirements/runtime/system',
        'shared/docs',
        'packages/agent/backlogs',
      ],
    },
    {
      project_id: 'codex',
      project_root: 'packages/codex',
      product_paths: ['packages/codex/src/**', 'shared/docs', 'packages/codex/backlogs'],
    },
  ] as const;

  it('returns every product whose configured code, document, requirements or work path overlaps', () => {
    expect(resolveProjectPathMembership(projects, 'shared/docs/guide.md')).toEqual({
      project_ids: ['agent', 'codex'],
      project_root: null,
      specificity: 2,
    });
    expect(
      resolveProjectPathMembership(projects, 'packages/agent/docs/requirements/runtime/system/test.md').project_ids,
    ).toEqual(['agent']);
    expect(resolveProjectPathMembership(projects, 'packages/codex/src/client.ts').project_ids).toEqual(['codex']);
    expect(resolveProjectPathMembership(projects, 'packages/other/docs/index.md').project_ids).toEqual([]);
  });

  it('keeps cwd out of path identity and requires explicit selection for overlapping products', () => {
    const first = resolveProjectPathMembership(projects, 'shared/docs/guide.md', { platform: 'posix' });
    const second = resolveProjectPathMembership(projects, 'shared/docs/guide.md', { platform: 'posix' });
    expect(first).toEqual(second);
    expect(() => resolveSelectedProjectForRepositoryPath(projects, 'shared/docs/guide.md', ['agent', 'codex'])).toThrow(
      /ambiguous selected project membership/,
    );
    expect(resolveSelectedProjectForRepositoryPath(projects, 'shared/docs/guide.md', ['codex']).project_id).toBe(
      'codex',
    );
  });

  it('matches star within one path segment and double-star across segments', () => {
    const selectors = [
      { project_id: 'one', project_root: 'workspace/one', product_paths: ['packages/one/src/*.ts'] },
      { project_id: 'two', project_root: 'workspace/two', product_paths: ['packages/two/src/**/index.ts'] },
    ] as const;
    expect(resolveProjectPathMembership(selectors, 'packages/one/src/file.ts').project_ids).toEqual(['one']);
    expect(resolveProjectPathMembership(selectors, 'packages/one/src/nested/file.ts').project_ids).toEqual([]);
    expect(resolveProjectPathMembership(selectors, 'packages/one/srcX/file.ts').project_ids).toEqual([]);
    expect(resolveProjectPathMembership(selectors, 'packages/two/src/index.ts').project_ids).toEqual(['two']);
    expect(resolveProjectPathMembership(selectors, 'packages/two/src/nested/deep/index.ts').project_ids).toEqual([
      'two',
    ]);
    expect(resolveProjectPathMembership(selectors, 'packages/two/src/index.tsx').project_ids).toEqual([]);
  });
});
