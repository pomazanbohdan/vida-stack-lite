import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import schema from '../../schemas/test-plan.v1.schema.json' with { type: 'json' };
import { isPlainRecord } from '../contracts/canonical-json-core.js';
import { freezeJsonValue } from '../contracts/public-ingress.js';
import { RuntimeConfigError } from '../config/runtime-config.js';

export interface TestPlanBinding {
  readonly work_id: string;
  readonly attempt: number;
  readonly packet_id: string;
  readonly task_contract_digest: string;
  readonly admitted_scenarios: readonly string[];
}
export interface TestPlan {
  readonly schema: 'TestPlan/v1';
  readonly version: 1;
  readonly work_id: string;
  readonly attempt: number;
  readonly packet_id: string;
  readonly task_contract_digest: string;
  readonly scenarios: readonly Readonly<{ id: string; description?: string }>[];
}
type SchemaValidator = (value: unknown) => value is TestPlan;
type AjvConstructor = new (options: Record<string, unknown>) => { compile<T>(schema: object): ValidateFunction<T> };
const Ajv = Ajv2020 as unknown as AjvConstructor;
let validator: SchemaValidator | undefined;

function refuse(message: string): never {
  throw new RuntimeConfigError(message);
}

function compiledTestPlanValidator(): SchemaValidator {
  if (validator === undefined)
    validator = new Ajv({ strict: true, allErrors: true }).compile<TestPlan>(schema) as SchemaValidator;
  return validator;
}

function assertPacketBinding(value: Record<string, unknown>, binding: TestPlanBinding): void {
  const fields = ['work_id', 'attempt', 'packet_id', 'task_contract_digest'] as const;
  for (const field of fields)
    if (value[field] !== binding[field]) refuse('TestPlan does not match its admitted packet binding: ' + field);
}

function assertNamedScenarios(value: Record<string, unknown>, binding: TestPlanBinding): void {
  const rows = value.scenarios;
  if (!Array.isArray(rows) || binding.admitted_scenarios.length === 0)
    refuse('TestPlan scenarios are empty or unbound.');
  const allowed = new Set(binding.admitted_scenarios);
  const seen = new Set<string>();
  for (const rowValue of rows) {
    if (
      !isPlainRecord(rowValue) ||
      typeof rowValue.id !== 'string' ||
      !allowed.has(rowValue.id) ||
      seen.has(rowValue.id)
    )
      refuse('TestPlan scenario is unknown or duplicated.');
    seen.add(rowValue.id);
  }
}

function assertNoImplementationFingerprint(value: Record<string, unknown>): void {
  const forbidden = ['implementation_fingerprint', 'source_fingerprint', 'code_digest', 'implementation_digest'];
  if (forbidden.some((field) => Object.hasOwn(value, field)))
    refuse('TestPlan cannot bind a pre-code implementation fingerprint.');
}

/** Validate an immutable TestPlan against its issued packet, without a source-digest cycle. */
export function validateTestPlan(input: unknown, binding: TestPlanBinding): TestPlan {
  if (!isPlainRecord(binding) || Object.keys(binding).length !== 5 || !Array.isArray(binding.admitted_scenarios))
    refuse('TestPlan binding is malformed.');
  if (!compiledTestPlanValidator()(input)) refuse('TestPlan does not match its strict schema.');
  const value = input as unknown as Record<string, unknown>;
  assertNoImplementationFingerprint(value);
  assertPacketBinding(value, binding);
  assertNamedScenarios(value, binding);
  return freezeJsonValue(value) as unknown as TestPlan;
}
