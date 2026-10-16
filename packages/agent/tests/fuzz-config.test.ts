import { describe, expect, test } from 'bun:test';
import fc from 'fast-check';
import path from 'node:path';
import { assertProperty } from './helpers/assert-property.js';
import { outcome, parameters, unknownValue } from './helpers/fuzz-boundary.ts';
import { fileURLToPath } from 'node:url';
import { validateProjectContext, validateResolvedPathProfile } from '../src/config/project-context.ts';
import { resolveConfigPath, validateRuntimeConfig } from '../src/config/runtime-config.ts';

const repositoryRoot =
  process.env.AGENT_RUNTIME_TEST_CONTEXT_ROOT ??
  process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ??
  path.resolve(fileURLToPath(new URL('..', import.meta.url)), '..', '..');
const validators = [
  (value: unknown) => validateRuntimeConfig(value, repositoryRoot),
  (value: unknown) => validateProjectContext(value, repositoryRoot),
  (value: unknown) => validateResolvedPathProfile(value, repositoryRoot),
];

describe('deterministic config fuzz boundaries', () => {
  test('config/context unknown-value validators preserve identity or fail closed', () => {
    assertProperty(
      fc.property(unknownValue, fc.integer({ min: 0, max: validators.length - 1 }), (value, index) => {
        const result = outcome(() => validators[index]!(value));
        if (result.returned) expect(result.value !== undefined && Object.is(result.value, value)).toBe(true);
      }),
      parameters,
    );
  });

  test('repository paths never resolve outside the trusted root', () => {
    assertProperty(
      fc.property(fc.string({ maxLength: 512 }), (relative) => {
        const result = outcome(() => resolveConfigPath(repositoryRoot, relative, 'fuzz path'));
        if (result.returned) {
          const normalizedRoot = path.resolve(repositoryRoot);
          const normalizedTarget = path.resolve(result.value);
          expect(path.relative(normalizedRoot, normalizedTarget).startsWith('..')).toBe(false);
        }
      }),
      parameters,
    );
  });
});
