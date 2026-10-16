import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import canonicalize from 'canonicalize';

export const MAX_CANONICAL_DEPTH = 64;
export const MAX_CANONICAL_NODES = 10_000;
export const MAX_CANONICAL_BYTES = 8_388_608;
interface CanonicalBudget {
  nodes: number;
  bytes: number;
  capturedArrays?: unknown[][];
}

function reject(conditions: readonly boolean[], message: string): void {
  if (conditions.some(Boolean)) throw new Error(message);
}
function denseArrayIndex(key: string, length: number): boolean {
  const numeric = Number(key);
  return [String(numeric) === key, Number.isSafeInteger(numeric), numeric >= 0, numeric < length].every(Boolean);
}
function arrayPropertyInvalid(key: PropertyKey, length: number): boolean {
  const text = typeof key === 'string';
  const valid = [key === 'length', denseArrayIndex(String(key), length)].some(Boolean);
  return [true, !valid][Number(text)]!;
}
function arrayElementKey(key: PropertyKey): key is string {
  return [typeof key === 'string', key !== 'length'].every(Boolean);
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasUnsafeSerializationHook(value: Record<string, unknown>): boolean {
  let prototype: object | null = value;
  while (prototype !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'toJSON');
    if (descriptor !== undefined) {
      return descriptor.get !== undefined || descriptor.set !== undefined || typeof descriptor.value === 'function';
    }
    prototype = Object.getPrototypeOf(prototype) as object | null;
  }
  return false;
}
function serializeCanonicalJson(value: unknown): string {
  const serialized = canonicalize(value);
  if (serialized === undefined) throw new Error('canonical JSON serializer returned no output');
  return serialized;
}
export function canonicalJson(value: unknown): string {
  return canonicalJsonAtDepth(value, 0);
}
/** Preserve the ordinary component budget while validating its actual envelope depth. */
export function canonicalJsonAtDepth(value: unknown, depth: number): string {
  return canonicalJsonWithNodeLimit(value, depth, MAX_CANONICAL_NODES);
}
/** Internal typed-component seam. Public ingress always uses the fixed ordinary budget. */
export function canonicalJsonWithNodeLimit(value: unknown, depth: number, maxNodes: number): string {
  return canonicalJsonImageWithNodeLimit(value, depth, maxNodes).json;
}
/** Capture one descriptor-derived image for serialization and downstream validation. */
export function canonicalJsonImageWithNodeLimit(
  value: unknown,
  depth: number,
  maxNodes: number,
): { readonly image: unknown; readonly json: string } {
  reject([!Number.isSafeInteger(depth), depth < 0, depth > MAX_CANONICAL_DEPTH], 'canonical JSON root depth invalid');
  reject([!Number.isSafeInteger(maxNodes), maxNodes < 1], 'canonical JSON node limit invalid');
  const budget: CanonicalBudget = { nodes: 0, bytes: 0, capturedArrays: [] };
  const image = assertValue(value, '$', new WeakSet<object>(), depth, budget, maxNodes);
  const json = serializeCanonicalJson(image);
  for (const array of budget.capturedArrays!) delete (array as unknown[] & { toJSON?: unknown }).toJSON;
  return { image, json };
}
export function canonicalJsonDigest(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function optionalCanonicalJsonDigest(value: unknown): string | null {
  return value ? canonicalJsonDigest(value) : null;
}

/** JSON-only payloads keep the canonical digest one-to-one with the wire value. */
export function assertCanonicalJsonValue(
  value: unknown,
  pointer = '$',
  seen = new WeakSet<object>(),
  depth = 0,
  budget: CanonicalBudget = { nodes: 0, bytes: 0 },
): void {
  assertValue(value, pointer, seen, depth, budget, MAX_CANONICAL_NODES);
}
function assertValue(
  value: unknown,
  pointer: string,
  seen: WeakSet<object>,
  depth: number,
  budget: CanonicalBudget,
  maxNodes: number,
): unknown {
  budget.nodes += 1;
  reject([budget.nodes > maxNodes], `canonical JSON node budget exceeded at ${pointer}`);
  reject([depth > MAX_CANONICAL_DEPTH], `canonical JSON depth budget exceeded at ${pointer}`);
  if (value === null || typeof value === 'boolean') return value;
  const kind = Array.isArray(value) ? 'array' : typeof value;
  const handler = canonicalValidators[kind];
  reject([handler === undefined], `non-canonical JSON value at ${pointer}`);
  return handler!(value, pointer, seen, depth, budget, maxNodes);
}

type CanonicalValidator = (
  value: unknown,
  pointer: string,
  seen: WeakSet<object>,
  depth: number,
  budget: CanonicalBudget,
  maxNodes: number,
) => unknown;

export function isCanonicalJsonNumber(value: unknown): value is number {
  return Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value)) && !Object.is(value, -0);
}

function canonicalNumber(value: unknown, pointer: string): unknown {
  reject([!isCanonicalJsonNumber(value)], `non-canonical JSON number at ${pointer}`);
  return value;
}

function canonicalString(
  value: unknown,
  pointer: string,
  _seen: WeakSet<object>,
  _depth: number,
  budget: CanonicalBudget,
  _maxNodes: number,
): unknown {
  budget.bytes += Buffer.byteLength(value as string, 'utf8');
  reject([budget.bytes > MAX_CANONICAL_BYTES], `canonical JSON byte budget exceeded at ${pointer}`);
  return value;
}

function canonicalArray(
  value: unknown,
  pointer: string,
  seen: WeakSet<object>,
  depth: number,
  budget: CanonicalBudget,
  maxNodes: number,
): unknown {
  const target = value as unknown[];
  reject([seen.has(target)], `cyclic JSON value at ${pointer}`);
  const { descriptors } = canonicalArrayEntries(target, pointer);
  seen.add(target);
  const image = new Array<unknown>(descriptors.length);
  for (let index = 0; index < descriptors.length; index += 1) {
    image[index] = assertValue(descriptors[index]!.value, `${pointer}[${index}]`, seen, depth + 1, budget, maxNodes);
  }
  seen.delete(target);
  return ownedArrayImage(image, budget);
}

function ownedArrayImage(image: unknown[], budget: CanonicalBudget): unknown[] {
  if (budget.capturedArrays === undefined) return image;
  Object.defineProperty(image, 'toJSON', {
    value: undefined,
    enumerable: false,
    configurable: true,
    writable: true,
  });
  budget.capturedArrays.push(image);
  return image;
}

function canonicalArrayKeys(target: unknown[], pointer: string): string[] {
  return canonicalArrayEntries(target, pointer).keys;
}

function canonicalArrayEntries(
  target: unknown[],
  pointer: string,
): { keys: string[]; descriptors: PropertyDescriptor[] } {
  reject([Object.getPrototypeOf(target) !== Array.prototype], `non-canonical array prototype at ${pointer}`);
  reject(
    [hasUnsafeSerializationHook(target as unknown as Record<string, unknown>)],
    `serialization hook at ${pointer}`,
  );
  const length = Object.getOwnPropertyDescriptor(target, 'length')?.value as number;
  reject([!Number.isSafeInteger(length)], `non-canonical array length at ${pointer}`);
  const ownKeys = Reflect.ownKeys(target);
  reject([ownKeys.some((key) => arrayPropertyInvalid(key, length))], `non-canonical array property at ${pointer}`);
  const elements = ownKeys.filter(arrayElementKey);
  reject([elements.length !== length], `sparse array at ${pointer}`);
  // Validate every descriptor before any child is inspected; accessors never execute.
  const descriptors = new Array<PropertyDescriptor>(elements.length);
  for (const key of elements) descriptors[Number(key)] = canonicalDescriptor(target, key, `${pointer}[${key}]`);
  return { keys: elements, descriptors };
}

function canonicalDescriptor(target: object, key: PropertyKey, pointer: string): PropertyDescriptor {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  reject(
    [!descriptor?.enumerable, descriptor?.get !== undefined, descriptor?.set !== undefined],
    `non-canonical property descriptor at ${pointer}`,
  );
  return descriptor!;
}

function canonicalObject(
  value: unknown,
  pointer: string,
  seen: WeakSet<object>,
  depth: number,
  budget: CanonicalBudget,
  maxNodes: number,
): unknown {
  const target = value as Record<string, unknown>;
  reject([!isPlainRecord(target)], `non-canonical JSON object at ${pointer}`);
  reject([hasUnsafeSerializationHook(target)], `serialization hook at ${pointer}`);
  reject([seen.has(target)], `cyclic JSON value at ${pointer}`);
  seen.add(target);
  const image = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(target)) {
    reject([typeof key !== 'string'], `symbol property at ${pointer}`);
    const childPointer = `${pointer}.${String(key)}`;
    const descriptor = canonicalDescriptor(target, key, childPointer);
    budget.bytes += Buffer.byteLength(String(key), 'utf8');
    reject([budget.bytes > MAX_CANONICAL_BYTES], `canonical JSON byte budget exceeded at ${childPointer}`);
    Object.defineProperty(image, key, {
      value: assertValue(descriptor.value, childPointer, seen, depth + 1, budget, maxNodes),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  seen.delete(target);
  return image;
}

const canonicalValidators = Object.freeze(
  Object.assign(Object.create(null) as Record<string, CanonicalValidator | undefined>, {
    number: canonicalNumber,
    string: canonicalString,
    array: canonicalArray,
    object: canonicalObject,
  }),
);

/** Compose known immutable components without pooling their ingress node budgets. */
export function canonicalJsonComponents(
  value: unknown,
  depth: number,
  encode: (child: unknown, depth: number, key: string) => string,
  byteLimit = 64 * 1024 * 1024,
): string {
  canonicalJsonAtDepth(null, depth);
  const array = Array.isArray(value);
  reject([!array && !isPlainRecord(value)], 'canonical component envelope must be an object or array');
  const target = value as Record<string, unknown>;
  reject([hasUnsafeSerializationHook(target)], 'serialization hook at component envelope');
  let keys: string[];
  if (array) {
    reject([value.length > byteLimit], 'component array exceeds its byte bound');
    keys = canonicalArrayKeys(value, '$');
  } else {
    const ownKeys = Reflect.ownKeys(target);
    reject([ownKeys.some((key) => typeof key !== 'string')], 'symbol property at component envelope');
    keys = (ownKeys as string[]).sort();
    for (const key of keys) canonicalDescriptor(target, key, '$.' + key);
  }
  let bytes = 2;
  const parts: string[] = [];
  for (const key of keys) {
    const child = Object.getOwnPropertyDescriptor(target, key)!.value as unknown;
    const part = (array ? '' : JSON.stringify(key) + ':') + encode(child, depth + 1, key);
    bytes += Buffer.byteLength(part, 'utf8') + (parts.length ? 1 : 0);
    reject([bytes > byteLimit], 'canonical component envelope exceeds its byte bound');
    parts.push(part);
  }
  return (array ? '[' : '{') + parts.join(',') + (array ? ']' : '}');
}
