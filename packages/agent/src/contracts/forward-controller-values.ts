import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

/** Hash the supplied text or bytes directly, as the forward controllers historically did. */
export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Preserve the forward-controller on-disk encoding, including its trailing newline. */
export function prettyJSON(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

/** Generic controller record guard; intentionally accepts non-array object instances. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Match the forward-controller error rendering contract. */
export function errorMessage(value: unknown): string {
  try {
    if (value instanceof Error) {
      const message = Object.getOwnPropertyDescriptor(value, 'message');
      return message === undefined
        ? ''
        : typeof message.value === 'string'
          ? message.value
          : '[unprintable thrown value]';
    }
    return String(value);
  } catch {
    return '[unprintable thrown value]';
  }
}
