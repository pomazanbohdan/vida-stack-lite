import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ErrorObject } from 'ajv';
import authorizationSchema from '../../schemas/authorization-request.v1.schema.json' with { type: 'json' };
import canonicalize from 'canonicalize';
import governedWriteIntentSchema from '../../schemas/governed-write-intent.v1.schema.json' with { type: 'json' };
import governedWriteSchema from '../../schemas/governed-write.v1.schema.json' with { type: 'json' };

export type AuthorizationAction = 'read' | 'invoke' | 'write' | 'approve';
export interface ProjectAuthorizationRequest {
  readonly principal: string;
  readonly role: string;
  readonly action: AuthorizationAction;
  readonly tenant: string;
  readonly project: string;
  readonly resourceTenant: string;
  readonly resourceProject: string;
  readonly registryHash: string;
  readonly operationHash?: string;
}
export interface TrustedProjectIdentity {
  readonly schema: 'TrustedProjectIdentity/v1';
  readonly source: 'authenticated-context';
  readonly principal: string;
  readonly role: string;
  readonly tenant: string;
  readonly project: string;
  readonly registry_hash: string;
}
export interface AuthorizationReceipt {
  readonly schema: 'AuthorizationReceipt/v1';
  readonly source: 'cedar';
  readonly decision: 'allow';
  readonly decision_id: string;
  readonly principal: string;
  readonly role: string;
  readonly action: AuthorizationAction;
  readonly tenant: string;
  readonly project: string;
  readonly resourceTenant: string;
  readonly resourceProject: string;
  readonly registry_hash: string;
  readonly operation_hash: string;
  readonly issued_at: string;
}
export interface ApprovalEvidence {
  readonly decision: 'approved';
  readonly decision_id: string;
  readonly approver: string;
  readonly tenant: string;
  readonly project: string;
  readonly operation_hash: string;
  readonly approved_at: string;
  readonly expires_at: string;
}
export interface VerifiedApprovalEvidence extends ApprovalEvidence {
  readonly verified: true;
  readonly issuer: string;
  readonly verification_id: string;
  readonly verified_at: string;
}
type AjvConstructor = new (options?: Record<string, unknown>) => {
  compile(schema: object): ((value: unknown) => boolean) & { errors?: ErrorObject[] | null };
};
const Ajv2020Constructor = Ajv2020 as unknown as AjvConstructor;
const authorizationValidator = new Ajv2020Constructor({ allErrors: true }).compile(authorizationSchema as object);
const governedWriteIntentValidator = new Ajv2020Constructor({ allErrors: true }).compile(
  governedWriteIntentSchema as object,
);
const governedWriteValidator = new Ajv2020Constructor({ allErrors: true }).compile(governedWriteSchema as object);
const MAX_CANONICAL_DEPTH = 64;
const MAX_CANONICAL_NODES = 10_000;
const MAX_CANONICAL_BYTES = 8_388_608;
interface CanonicalBudget {
  nodes: number;
  bytes: number;
}

function reject(conditions: readonly boolean[], message: string): void {
  conditions.filter(Boolean).forEach(() => {
    throw new Error(message);
  });
}
function defined<T>(values: readonly (T | undefined)[]): T {
  return values.find((value): value is T => value !== undefined) as T;
}
function denseArrayIndex(key: string, length: number): boolean {
  const numeric = Number(key);
  return [String(numeric) === key, Number.isSafeInteger(numeric), numeric < length].every(Boolean);
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
  const nonObject = [typeof value !== 'object', value === null, Array.isArray(value)].some(Boolean);
  const checks = [
    () => false,
    () => {
      const prototype = Object.getPrototypeOf(value);
      return [prototype === Object.prototype, prototype === null].some(Boolean);
    },
  ];
  return checks[Number(!nonObject)]!();
}

function hasUnsafeSerializationHook(value: Record<string, unknown>): boolean {
  let prototype: object | null = value;
  while (prototype !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'toJSON');
    if (descriptor !== undefined) {
      return descriptor.get !== undefined || descriptor.set !== undefined || typeof descriptor.value === 'function';
    }
    prototype = Object.getPrototypeOf(prototype);
  }
  return false;
}
function serializeCanonicalJson(value: unknown): string {
  const serialized = canonicalize(value);
  if (serialized === undefined) throw new Error('canonical JSON serializer returned no output');
  return serialized;
}
export function canonicalJson(value: unknown): string {
  assertCanonicalJsonValue(value);
  return serializeCanonicalJson(value);
}
export function canonicalJsonDigest(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

/** JSON-only payloads keep the canonical digest one-to-one with the wire value. */
export function assertCanonicalJsonValue(
  value: unknown,
  pointer = '$',
  seen = new WeakSet<object>(),
  depth = 0,
  budget: CanonicalBudget = { nodes: 0, bytes: 0 },
): void {
  budget.nodes += 1;
  reject([budget.nodes > MAX_CANONICAL_NODES], `canonical JSON node budget exceeded at ${pointer}`);
  reject([depth > MAX_CANONICAL_DEPTH], `canonical JSON depth budget exceeded at ${pointer}`);
  const validPrimitive = [
    value === null,
    typeof value === 'boolean',
    typeof value === 'number',
    typeof value === 'string',
  ].some(Boolean);
  const primitive = (): void => {
    reject([!validPrimitive], `non-canonical JSON value at ${pointer}`);
  };
  const number = (): void => {
    const invalidUnsafeInteger = [!Number.isSafeInteger(value), Number.isInteger(value)].every(Boolean);
    const valid = [Number.isFinite(value), !invalidUnsafeInteger, !Object.is(value, -0)].every(Boolean);
    reject([!valid], `non-canonical JSON number at ${pointer}`);
  };
  const string = (): void => {
    budget.bytes += Buffer.byteLength(value as string, 'utf8');
    reject([budget.bytes > MAX_CANONICAL_BYTES], `canonical JSON byte budget exceeded at ${pointer}`);
  };
  const array = (): void => {
    const target = value as unknown[];
    reject([seen.has(target)], `cyclic JSON value at ${pointer}`);
    reject(
      [hasUnsafeSerializationHook(target as unknown as Record<string, unknown>)],
      `serialization hook at ${pointer}`,
    );
    seen.add(target);
    const ownKeys = Reflect.ownKeys(target);
    reject(
      [ownKeys.some((key) => arrayPropertyInvalid(key, target.length))],
      `non-canonical array property at ${pointer}`,
    );
    reject([ownKeys.filter(arrayElementKey).length !== target.length], `sparse array at ${pointer}`);
    ownKeys.filter(arrayElementKey).forEach((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(target, key);
      reject(
        [[!descriptor?.enumerable, descriptor?.get !== undefined, descriptor?.set !== undefined].some(Boolean)],
        `non-canonical property descriptor at ${pointer}[${key}]`,
      );
    });
    target
      .map((_, index) => index)
      .forEach((index) => {
        reject([!Object.prototype.hasOwnProperty.call(target, index)], `sparse array at ${pointer}[${index}]`);
        assertCanonicalJsonValue(target[index], `${pointer}[${index}]`, seen, depth + 1, budget);
      });
    seen.delete(target);
  };
  const object = (): void => {
    const target = value as Record<string, unknown>;
    reject([!isPlainRecord(target)], `non-canonical JSON object at ${pointer}`);
    reject([hasUnsafeSerializationHook(target)], `serialization hook at ${pointer}`);
    reject([seen.has(target)], `cyclic JSON value at ${pointer}`);
    seen.add(target);
    Reflect.ownKeys(target).forEach((key) => {
      reject([typeof key !== 'string'], `symbol property at ${pointer}`);
      const descriptor = Object.getOwnPropertyDescriptor(target, key);
      reject(
        [[!descriptor?.enumerable, descriptor?.get !== undefined, descriptor?.set !== undefined].some(Boolean)],
        `non-canonical property descriptor at ${pointer}.${String(key)}`,
      );
      budget.bytes += Buffer.byteLength(String(key), 'utf8');
      reject([budget.bytes > MAX_CANONICAL_BYTES], `canonical JSON byte budget exceeded at ${pointer}.${String(key)}`);
      assertCanonicalJsonValue(descriptor?.value, `${pointer}.${String(key)}`, seen, depth + 1, budget);
    });
    seen.delete(target);
  };
  const objectLike = [typeof value === 'object', value !== null].every(Boolean);
  const arrayLike = Array.isArray(value);
  const numberLike = typeof value === 'number';
  const stringLike = typeof value === 'string';
  const handler = [primitive, number, string, object, array][
    Number(numberLike) + Number(stringLike) * 2 + Number(objectLike) * 3 + Number(arrayLike)
  ];
  handler!();
}
function errorText(errors: ErrorObject[] | null | undefined): string {
  const rows = [errors, []].find((entry) => Array.isArray(entry)) as ErrorObject[];
  return rows.map((error) => `${defined([error.instancePath, '/'])} ${defined([error.message, 'invalid'])}`).join('; ');
}
export function computeWriteOperationHash(input: {
  readonly operation: string;
  readonly payload: Record<string, unknown>;
  readonly principal: string;
  readonly role: string;
  readonly tenant: string;
  readonly project: string;
  readonly resourceTenant: string;
  readonly resourceProject: string;
  readonly registryHash: string;
}): string {
  assertCanonicalJsonValue(input.payload, '$.payload');
  return canonicalJsonDigest({
    operation: input.operation,
    payload: input.payload,
    principal: input.principal,
    role: input.role,
    action: 'write',
    tenant: input.tenant,
    project: input.project,
    resourceTenant: input.resourceTenant,
    resourceProject: input.resourceProject,
    registryHash: input.registryHash,
  });
}
export function validateAuthorizationRequest(value: unknown): ProjectAuthorizationRequest {
  assertCanonicalJsonValue(value, '$');
  reject(
    [!authorizationValidator(value)],
    `authorization request rejected: ${errorText(authorizationValidator.errors)}`,
  );
  return value as ProjectAuthorizationRequest;
}
export interface GovernedWriteIntent {
  readonly operation: string;
  readonly payload: Record<string, unknown>;
  readonly authorization: Pick<
    ProjectAuthorizationRequest,
    'principal' | 'role' | 'action' | 'tenant' | 'project' | 'resourceTenant' | 'resourceProject' | 'registryHash'
  >;
  readonly approval: ApprovalEvidence;
}
export interface GovernedWriteRequest {
  readonly operation: string;
  readonly payload: Record<string, unknown>;
  readonly authorization: AuthorizationReceipt;
  readonly approval: VerifiedApprovalEvidence;
  readonly ingress_token?: string;
}
const UTC_LEAP_SECOND_DATES = new Set([
  '1972-06-30',
  '1972-12-31',
  '1973-12-31',
  '1974-12-31',
  '1975-12-31',
  '1976-12-31',
  '1977-12-31',
  '1978-12-31',
  '1979-12-31',
  '1981-06-30',
  '1982-06-30',
  '1983-06-30',
  '1985-06-30',
  '1987-12-31',
  '1989-12-31',
  '1990-12-31',
  '1992-06-30',
  '1993-06-30',
  '1994-06-30',
  '1995-12-31',
  '1997-06-30',
  '1998-12-31',
  '2005-12-31',
  '2008-12-31',
  '2012-06-30',
  '2015-06-30',
  '2016-12-31',
]);
const RFC3339_TIMESTAMP =
  /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T((?:[01]\d|2[0-3])):([0-5]\d):([0-5]\d|60)(?:\.\d{1,9})?(Z|[+-](?:0\d|1\d|2[0-3]):[0-5]\d)$/;
export function rfc3339TimestampMilliseconds(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = RFC3339_TIMESTAMP.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const zone = match[7];
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
  if (day > daysInMonth) return null;
  const leapSecond = second === 60;
  if (
    leapSecond &&
    (!UTC_LEAP_SECOND_DATES.has(value.slice(0, 10)) || hour !== 23 || minute !== 59 || !['Z', '+00:00'].includes(zone!))
  )
    return null;
  const normalized = leapSecond ? value.replace(':60', ':59') : value;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed + (leapSecond ? 1_000 : 0) : null;
}
export function isStrictRfc3339Timestamp(value: unknown): value is string {
  return rfc3339TimestampMilliseconds(value) !== null;
}
function assertFresh(issuedAt: string, approvedAt: string, expiresAt: string, verifiedAt: string): void {
  const now = Date.now();
  const parsed = [issuedAt, approvedAt, expiresAt, verifiedAt].map(rfc3339TimestampMilliseconds);
  reject([parsed.some((value) => value === null)], 'governed write evidence timestamps invalid');
  const [issued, approved, expires, verified] = parsed as [number, number, number, number];
  reject(
    [[issued > now + 60_000, approved > now + 60_000, verified > now + 60_000].some(Boolean)],
    'governed write evidence is from the future',
  );
  reject([approved < issued], 'approval evidence predates authorization receipt');
  reject([[expires <= now, expires < approved, expires < verified].some(Boolean)], 'approval evidence is expired');
  reject([verified < approved], 'approval verification predates approval evidence');
  reject(
    [[now - issued > 5 * 60_000, now - approved > 5 * 60_000, now - verified > 5 * 60_000].some(Boolean)],
    'governed write evidence is stale',
  );
}
export function validateGovernedWriteRequest(value: unknown): GovernedWriteRequest {
  assertCanonicalJsonValue(value, '$');
  reject(
    [!governedWriteValidator(value)],
    'governed write request rejected: ' + errorText(governedWriteValidator.errors),
  );
  const request = value as GovernedWriteRequest;
  assertCanonicalJsonValue(request.payload, '$.payload');
  const authorization = request.authorization;
  const expectedHash = computeWriteOperationHash({
    operation: request.operation,
    payload: request.payload,
    principal: authorization.principal,
    role: authorization.role,
    tenant: authorization.tenant,
    project: authorization.project,
    resourceTenant: authorization.resourceTenant,
    resourceProject: authorization.resourceProject,
    registryHash: authorization.registry_hash,
  });
  reject(
    [[authorization.operation_hash !== expectedHash, request.approval.operation_hash !== expectedHash].some(Boolean)],
    'authorization and approval are not bound to this operation',
  );
  reject(
    [
      [
        authorization.tenant !== authorization.resourceTenant,
        authorization.project !== authorization.resourceProject,
      ].some(Boolean),
    ],
    'authorization resource is outside the principal tenant/project scope',
  );
  reject(
    [
      [request.approval.tenant !== authorization.tenant, request.approval.project !== authorization.project].some(
        Boolean,
      ),
    ],
    'approval scope does not match authorization scope',
  );
  assertFresh(
    authorization.issued_at,
    request.approval.approved_at,
    request.approval.expires_at,
    request.approval.verified_at,
  );
  return request;
}
export function validateGovernedWriteIntent(value: unknown): GovernedWriteIntent {
  assertCanonicalJsonValue(value, '$');
  reject(
    [!governedWriteIntentValidator(value)],
    `governed write intent rejected: ${errorText(governedWriteIntentValidator.errors)}`,
  );
  const intent = value as GovernedWriteIntent;
  reject(
    [!isStrictRfc3339Timestamp(intent.approval.approved_at), !isStrictRfc3339Timestamp(intent.approval.expires_at)],
    'governed write intent timestamps invalid',
  );
  assertCanonicalJsonValue(intent.payload, '$.payload');
  return intent;
}
export function buildGovernedWriteRequest(
  intent: GovernedWriteIntent,
  authorization: AuthorizationReceipt,
  approval: VerifiedApprovalEvidence,
): GovernedWriteRequest {
  validateGovernedWriteIntent(intent);
  const authorizationFields = [
    authorization.principal === intent.authorization.principal,
    authorization.role === intent.authorization.role,
    authorization.action === intent.authorization.action,
    authorization.tenant === intent.authorization.tenant,
    authorization.project === intent.authorization.project,
    authorization.resourceTenant === intent.authorization.resourceTenant,
    authorization.resourceProject === intent.authorization.resourceProject,
    authorization.registry_hash === intent.authorization.registryHash,
  ];
  reject([!authorizationFields.every(Boolean)], 'authorization receipt is not bound to the governed write intent');
  const approvalFields = [
    approval.decision === intent.approval.decision,
    approval.decision_id === intent.approval.decision_id,
    approval.approver === intent.approval.approver,
    approval.tenant === intent.approval.tenant,
    approval.project === intent.approval.project,
    approval.operation_hash === intent.approval.operation_hash,
    approval.approved_at === intent.approval.approved_at,
    approval.expires_at === intent.approval.expires_at,
  ];
  reject([!approvalFields.every(Boolean)], 'approval evidence is not bound to the governed write intent');
  return freezeJsonValue(
    validateGovernedWriteRequest({ operation: intent.operation, payload: intent.payload, authorization, approval }),
  );
}
export function freezeJsonValue<T>(value: T, seen = new WeakSet<object>()): T {
  const objectLike = [!value, typeof value !== 'object'].some(Boolean) === false;
  const target = value as object;
  const skip = (): T => value;
  const freeze = (): T => {
    const alreadySeen = seen.has(target);
    const visit = [
      skip,
      () => {
        seen.add(target);
        Reflect.ownKeys(target).forEach((key) => {
          const descriptor = Object.getOwnPropertyDescriptor(target, key);
          [descriptor]
            .filter((entry): entry is PropertyDescriptor => entry !== undefined)
            .filter((entry) => Object.hasOwn(entry, 'value'))
            .forEach((entry) => freezeJsonValue(entry.value, seen));
        });
        return Object.freeze(value);
      },
    ];
    return visit[Number(!alreadySeen)]!();
  };
  return [skip, freeze][Number(objectLike)]!();
}
export function computeGovernedWriteRequestDigest(value: GovernedWriteRequest): string {
  const { ingress_token: _ingressToken, ...request } = value;
  return canonicalJsonDigest(request);
}
export function toAuthorizationReceipt(
  request: ProjectAuthorizationRequest,
  decisionId: string,
  issuedAt: string,
): AuthorizationReceipt | undefined {
  const build = (): AuthorizationReceipt => ({
    schema: 'AuthorizationReceipt/v1',
    source: 'cedar',
    decision: 'allow',
    decision_id: decisionId,
    principal: request.principal,
    role: request.role,
    action: request.action,
    tenant: request.tenant,
    project: request.project,
    resourceTenant: request.resourceTenant,
    resourceProject: request.resourceProject,
    registry_hash: request.registryHash,
    operation_hash: request.operationHash as string,
    issued_at: issuedAt,
  });
  return [() => undefined, build][Number(Boolean(request.operationHash))]!();
}
