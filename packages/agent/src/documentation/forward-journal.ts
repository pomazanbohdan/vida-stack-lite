import { isRecord } from '../contracts/forward-controller-values.js';

export function parseForwardJournal(text: string): Record<string, unknown>[] {
  return text
    .trim()
    .split('\n')
    .map((line) => {
      const value: unknown = JSON.parse(line);
      if (!isRecord(value)) throw Error('leaf forward journal event is invalid');
      return value;
    });
}
