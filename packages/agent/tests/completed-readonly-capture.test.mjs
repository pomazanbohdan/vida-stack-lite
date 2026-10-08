import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runCompletedReadOnlyCapture } from '../bin/capture-completed-readonly.mjs';
import { preparedFixture } from './documentation-policy-transition.test.mjs';

test('completed readonly capture denies unadmitted source before observation or owner effects', async () => {
  const { f, baseline } = await preparedFixture();
  const database = path.join(f.root, '.agent/work/session-handoff.v1.sqlite');
  const before = readFileSync(database);
  const baselineBefore = readFileSync(path.join(f.root, baseline.path));
  await Promise.resolve(expect(
    runCompletedReadOnlyCapture({
      root: f.root,
      payloadRoot: path.dirname(f.bundle),
      operationId: 'unapproved-capture',
      requestPath: '.agent/work/unapproved-capture/request.json',
    }),
  ).rejects.toThrow(/forward candidate admission|ENOENT/));
  expect(readFileSync(database).equals(before)).toBe(true);
  expect(readFileSync(path.join(f.root, baseline.path)).equals(baselineBefore)).toBe(true);
  expect(readFileSync(path.join(f.root, f.policyPath), 'utf8')).toBe(f.json(f.oldPolicy));
}, 30000);
