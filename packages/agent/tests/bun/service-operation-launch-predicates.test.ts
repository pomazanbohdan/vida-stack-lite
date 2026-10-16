import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import * as fc from 'fast-check';
import { expectReturned } from '../helpers/expect-rejection.js';
import {
  serviceOperationLaunchCapabilityDigest,
  serviceOperationLaunchCapabilityMatches,
  serviceOperationLaunchClaimMatches,
} from '../../src/config/service-operation-launch-capability.js';

const workspaceId = 'a'.repeat(64);
const requestDigest = 'b'.repeat(64);
const operationId = 'release-operation';
const capability = '11111111-1111-4111-8111-111111111111';
const otherCapability = '22222222-2222-4222-8222-222222222222';
const pid = 7312;
const issuedDigest = 'bd7662a5eeb41614e720d477abfcb2272e19a8a70a93b7e3bc8560d44ad326e9';

type ClaimImage = NonNullable<Parameters<typeof serviceOperationLaunchClaimMatches>[0]>;

function launchingImage(overrides: Partial<ClaimImage> = {}): ClaimImage {
  return {
    workspace_id: workspaceId,
    owner_kind: 'release-pack-worker',
    operation_id: operationId,
    request_digest: requestDigest,
    owner_token: issuedDigest,
    phase: 'launching',
    launch_pid: pid,
    ...overrides,
  };
}

describe('service operation launch predicates', () => {
  test('digest matches an independent fixed SHA-256 vector', () => {
    expect(expectReturned(() => serviceOperationLaunchCapabilityDigest(capability))).toBe(issuedDigest);
    expect(issuedDigest).toBe(createHash('sha256').update(capability, 'utf8').digest('hex'));
  });

  test('accepts lowercase UUID-shaped tokens at the zero and nonzero boundaries', () => {
    expect(expectReturned(() => serviceOperationLaunchCapabilityDigest('00000000-0000-0000-0000-000000000000'))).toBe(
      '12b9377cbe7e5c94e8a70d9d23929523d14afa954793130f8a3959c7b849aca8',
    );
    expect(
      expectReturned(() => serviceOperationLaunchCapabilityDigest('ffffffff-ffff-ffff-ffff-ffffffffffff')),
    ).toMatch(/^[a-f0-9]{64}$/u);
  });

  test('rejects uppercase and malformed UUID-shaped capability inputs', () => {
    expect(() => serviceOperationLaunchCapabilityDigest('11111111-1111-4111-8111-11111111111A')).toThrow(
      'Service operation launch capability is invalid.',
    );
    expect(() => serviceOperationLaunchCapabilityDigest('11111111111141118111111111111111')).toThrow(
      'Service operation launch capability is invalid.',
    );
    expect(() => serviceOperationLaunchCapabilityDigest('11111111-1111-4111-8111-111111111111-')).toThrow(
      'Service operation launch capability is invalid.',
    );
  });

  const uuidSegments = capability.split('-');
  const malformedCapabilityBoundaries: readonly (readonly [string, string])[] = [
    ['prefixed token', `x${capability}`],
    ['suffixed token', `${capability}x`],
    ...uuidSegments.flatMap((segment, index) => {
      const short = [...uuidSegments];
      short[index] = segment.slice(1);
      const long = [...uuidSegments];
      long[index] = `${segment}0`;
      return [
        [`short UUID segment ${index + 1}`, short.join('-')] as const,
        [`long UUID segment ${index + 1}`, long.join('-')] as const,
      ];
    }),
    ['uppercase token', `A${capability.slice(1)}`],
  ];

  for (const [label, malformed] of malformedCapabilityBoundaries) {
    test(`rejects ${label} for digest creation and matching`, () => {
      const independentlyHashed = createHash('sha256').update(malformed, 'utf8').digest('hex');
      expect(() => serviceOperationLaunchCapabilityDigest(malformed)).toThrow(
        'Service operation launch capability is invalid.',
      );
      expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(issuedDigest, malformed))).toBe(false);
      expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(independentlyHashed, malformed))).toBe(false);
    });
  }

  const trailingLineEndings = [
    ['LF', '\n'],
    ['CR', '\r'],
    ['CRLF', '\r\n'],
    ['Unicode line separator', '\u2028'],
    ['Unicode paragraph separator', '\u2029'],
  ] as const;

  for (const [label, ending] of trailingLineEndings) {
    test(`rejects trailing ${label} in capability and expected digest`, () => {
      const malformed = `${capability}${ending}`;
      const malformedDigest = `${issuedDigest}${ending}`;
      const independentlyHashed = createHash('sha256').update(malformed, 'utf8').digest('hex');

      expect(() => serviceOperationLaunchCapabilityDigest(malformed)).toThrow(
        'Service operation launch capability is invalid.',
      );
      expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(issuedDigest, malformed))).toBe(false);
      expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(independentlyHashed, malformed))).toBe(false);
      expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(malformedDigest, capability))).toBe(false);
    });
  }

  test('capability matching accepts only the exact token for the exact lowercase digest', () => {
    expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(issuedDigest, capability))).toBe(true);
    expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(issuedDigest, otherCapability))).toBe(false);
    expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(issuedDigest.toUpperCase(), capability))).toBe(
      false,
    );
  });

  test('capability matching rejects null, short, long, and non-hex expected digests', () => {
    expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(null, capability))).toBe(false);
    expect(expectReturned(() => serviceOperationLaunchCapabilityMatches('a'.repeat(63), capability))).toBe(false);
    expect(expectReturned(() => serviceOperationLaunchCapabilityMatches('a'.repeat(65), capability))).toBe(false);
    expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(`${'a'.repeat(63)}g`, capability))).toBe(false);
    for (const prefix of ['x', '!', '\u0000', ' ', '\n']) {
      expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(prefix + issuedDigest, capability))).toBe(
        false,
      );
    }
  });

  test('capability matching rejects malformed and wrong-runtime-type capability values', () => {
    expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(issuedDigest, 'UPPERCASE-UUID'))).toBe(false);
    expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(issuedDigest, null))).toBe(false);
    expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(issuedDigest, 7312))).toBe(false);
    expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(issuedDigest, {}))).toBe(false);
  });

  test('deterministic bounded UUID property: the issued token matches and a distinct token does not', () => {
    const hex = '0123456789abcdef'.split('');
    const uuid = fc
      .array(fc.constantFrom(...hex), { minLength: 32, maxLength: 32 })
      .map(
        (digits) =>
          `${digits.slice(0, 8).join('')}-${digits.slice(8, 12).join('')}-${digits.slice(12, 16).join('')}-${digits.slice(16, 20).join('')}-${digits.slice(20).join('')}`,
      );

    fc.assert(
      fc.property(uuid, uuid, (issued, other) => {
        fc.pre(issued !== other);
        const digest = expectReturned(() => serviceOperationLaunchCapabilityDigest(issued));
        expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(digest, issued))).toBe(true);
        expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(digest, other))).toBe(false);
      }),
      { seed: 20261010, numRuns: 50 },
    );
  });

  test('exact launching reservation accepts its one-shot child capability', () => {
    expect(
      expectReturned(() =>
        serviceOperationLaunchClaimMatches(
          launchingImage(),
          workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          pid,
          capability,
        ),
      ),
    ).toBe(true);
  });

  test('null prior reservation denies a claim', () => {
    expect(
      expectReturned(() =>
        serviceOperationLaunchClaimMatches(
          null,
          workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          pid,
          capability,
        ),
      ),
    ).toBe(false);
  });

  test('workspace mismatch alone denies a claim', () => {
    expect(
      expectReturned(() =>
        serviceOperationLaunchClaimMatches(
          launchingImage(),
          'c'.repeat(64),
          'release-pack-worker',
          operationId,
          requestDigest,
          pid,
          capability,
        ),
      ),
    ).toBe(false);
  });

  test('owner-kind mismatch alone denies a claim', () => {
    expect(
      expectReturned(() =>
        serviceOperationLaunchClaimMatches(
          launchingImage(),
          workspaceId,
          'release-worker',
          operationId,
          requestDigest,
          pid,
          capability,
        ),
      ),
    ).toBe(false);
  });

  test('operation mismatch alone denies a claim', () => {
    expect(
      expectReturned(() =>
        serviceOperationLaunchClaimMatches(
          launchingImage(),
          workspaceId,
          'release-pack-worker',
          'different-operation',
          requestDigest,
          pid,
          capability,
        ),
      ),
    ).toBe(false);
  });

  test('request digest mismatch alone denies a claim', () => {
    expect(
      expectReturned(() =>
        serviceOperationLaunchClaimMatches(
          launchingImage(),
          workspaceId,
          'release-pack-worker',
          operationId,
          'd'.repeat(64),
          pid,
          capability,
        ),
      ),
    ).toBe(false);
  });

  test('non-launching phase alone denies a claim', () => {
    expect(
      expectReturned(() =>
        serviceOperationLaunchClaimMatches(
          launchingImage({ phase: 'prepared' }),
          workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          pid,
          capability,
        ),
      ),
    ).toBe(false);
  });

  test('PID mismatch alone denies a claim', () => {
    expect(
      expectReturned(() =>
        serviceOperationLaunchClaimMatches(
          launchingImage(),
          workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          pid + 1,
          capability,
        ),
      ),
    ).toBe(false);
  });

  test('owner-token mismatch alone denies a claim', () => {
    expect(
      expectReturned(() =>
        serviceOperationLaunchClaimMatches(
          launchingImage({ owner_token: 'a'.repeat(64) }),
          workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          pid,
          capability,
        ),
      ),
    ).toBe(false);
  });

  test('consumed reservation denies replay of its previously issued capability', () => {
    expect(
      expectReturned(() =>
        serviceOperationLaunchClaimMatches(
          launchingImage({ owner_token: otherCapability, phase: 'in_flight', launch_pid: null }),
          workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          pid,
          capability,
        ),
      ),
    ).toBe(false);
  });
});
