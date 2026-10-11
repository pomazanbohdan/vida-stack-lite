import { expect, test } from 'bun:test';

import { recoverCompletedSourceReport } from '../bin/recover-completed-source-report.ts';

const cases: ReadonlyArray<{ name: string; args: string[]; cause: string }> = [
  {
    name: 'empty argument list',
    args: [],
    cause: 'mode, project root and request are required',
  },
  {
    name: 'unsupported mode',
    args: ['--mode', 'resume', '--project-root', '/tmp/vida-project', '--request', 'request.json'],
    cause: 'mode invalid',
  },
  {
    name: 'duplicate option',
    args: ['--mode', 'inspect', '--mode', 'plan', '--project-root', '/tmp/vida-project'],
    cause: 'argument is duplicated',
  },
  {
    name: 'unknown option set',
    args: ['--mode', 'inspect', '--project-root', '/tmp/vida-project', '--unexpected', 'value'],
    cause: 'unexpected argument set',
  },
  {
    name: 'relative project root',
    args: ['--mode', 'inspect', '--project-root', 'relative/project', '--request', 'request.json'],
    cause: 'project root must be absolute',
  },
  {
    name: 'noncanonical absolute project root',
    args: ['--mode', 'inspect', '--project-root', '/tmp/vida-project/../vida-project', '--request', 'request.json'],
    cause: 'project root must be canonical',
  },
];

test('completed Source report recovery rejects invalid CLI ingress before filesystem or recovery effects', () => {
  for (const { name, args, cause } of cases) {
    let message: string | undefined;
    try {
      recoverCompletedSourceReport(args);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message, name).toBe(`completed Source report recovery: ${cause}`);
  }
});
