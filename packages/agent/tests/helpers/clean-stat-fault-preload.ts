import { mock } from 'bun:test';
import * as fs from 'node:fs/promises';

const original = { ...fs };
const originalLstat = fs.lstat;
const faultTarget = process.env.VIDA_CLEAN_STAT_FAULT;
if (!faultTarget) throw new Error('Clean stat fault target is not configured');
await mock.module('node:fs/promises', () => ({
  ...original,
  default: {
    ...original,
    async lstat(target: Parameters<typeof originalLstat>[0], options?: Parameters<typeof originalLstat>[1]) {
      if (target === faultTarget) throw Object.assign(new Error('fixture lstat I/O failure'), { code: 'EIO' });
      return originalLstat(target, options);
    },
  },
}));
