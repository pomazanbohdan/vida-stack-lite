import { expect, test } from 'bun:test';
import { checkDocumentation, headingAnchors } from '../../tooling/agent/check-documentation.ts';

test('documentation anchors preserve Unicode and duplicate heading identity', () => {
  expect([...headingAnchors('# Привіт світ\n## Policy\n## Policy\n```md\n# Ignored\n```')]).toEqual([
    'привіт-світ',
    'policy',
    'policy-1',
  ]);
});

test('documentation check detects lost headings and targets without rereading shared targets', () => {
  const files = new Map([
    [
      '/repo/a.md',
      '[good](b.md#policy) [lost](b.md#old) [missing](missing.md) [external](https://example.test/)\n```md\n[x](ignored.md)\n```',
    ],
    ['/repo/b.md', '## Policy'],
  ]);
  const reads: string[] = [];
  const report = checkDocumentation('/repo', ['a.md', 'a.md'], (file) => {
    reads.push(file);
    return files.get(file);
  });
  expect(report.selectedDocuments).toBe(1);
  expect(report.localLinks).toBe(3);
  expect(report.failures).toEqual(['a.md: missing heading b.md#old', 'a.md: missing target missing.md']);
  expect(reads.filter((file) => file === '/repo/b.md')).toHaveLength(1);
});

test('documentation check bounds local references and handles encoded spaces', () => {
  const files = new Map([
    ['/repo/a.md', '[same](#here) [space](<my%20doc.md#title>) [outside](../private.md) [invalid](%QQ.md)'],
    ['/repo/my doc.md', '## Title'],
  ]);
  files.set('/repo/a.md', '# Here\n' + files.get('/repo/a.md'));
  const report = checkDocumentation('/repo', ['a.md'], (file) => files.get(file));
  expect(report.failures).toEqual(['a.md: link leaves repository ../private.md', 'a.md: malformed link %QQ.md']);
});
