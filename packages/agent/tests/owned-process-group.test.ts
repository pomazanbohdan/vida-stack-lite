import { expect, spyOn, test } from 'bun:test';
import { observeOwnedProcessGroup } from '../tooling/owned-process-group.ts';

test('invalid group leaders never cause a process probe', () => {
  const kill = spyOn(process, 'kill').mockImplementation(() => {
    throw new Error('Unexpected process probe');
  });
  try {
    for (const pid of [null, 0, 1, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
      expect(observeOwnedProcessGroup(pid)).toBe('unknown');
    expect(kill).not.toHaveBeenCalled();
  } finally {
    kill.mockRestore();
  }
});

test.skipIf(process.platform === 'win32')('only native ESRCH proves that the owned group is gone', () => {
  const kill = spyOn(process, 'kill').mockReturnValue(true);
  try {
    expect(observeOwnedProcessGroup(123)).toBe('present');
    expect(kill).toHaveBeenLastCalledWith(-123, 0);
    for (const error of [Object.assign(new Error('Denied'), { code: 'EPERM' }), undefined, 'ESRCH', {}]) {
      kill.mockImplementationOnce(() => {
        throw error;
      });
      expect(observeOwnedProcessGroup(123)).toBe('unknown');
    }
    kill.mockImplementationOnce(() => {
      throw Object.assign(new Error('Gone'), { code: 'ESRCH' });
    });
    expect(observeOwnedProcessGroup(123)).toBe('gone');
    expect(kill).toHaveBeenCalledTimes(6);
    for (const call of kill.mock.calls) expect(call).toEqual([-123, 0]);
  } finally {
    kill.mockRestore();
  }
});

test.skipIf(process.platform !== 'win32')('Windows observations remain unsupported without probing', () => {
  const kill = spyOn(process, 'kill').mockReturnValue(true);
  try {
    expect(observeOwnedProcessGroup(123)).toBe('unknown');
    expect(kill).not.toHaveBeenCalled();
  } finally {
    kill.mockRestore();
  }
});
