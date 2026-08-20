'use strict';

const commonRuntime = ['tooling/tests/runtime-critical-profile.test.cjs', 'tooling/tests/runtime-mutation-invariants.test.cjs'];
const lifecycle = [...commonRuntime, 'tooling/tests/runtime-lifecycle-matrix.test.cjs', 'tooling/tests/runtime-replay-matrix.test.cjs'];
const runtimeComplete = [
  ...lifecycle,
  'tooling/tests/derived-directories.test.cjs', 'tooling/tests/fault-seams.test.cjs',
  'tooling/tests/runtime-architect-escalation.test.cjs', 'tooling/tests/runtime-clarification-verbs.test.cjs',
  'tooling/tests/runtime-blind-architect-cycle.test.cjs',
  'tooling/tests/runtime-coordination-v3.test.cjs', 'tooling/tests/runtime-profile-attestation.test.cjs',
  'tooling/tests/runtime-project-context-v4.test.cjs',
  'tooling/tests/runtime-properties.test.cjs', 'tooling/tests/runtime-review-dispatch-reservation.test.cjs',
  'tooling/tests/runtime-scenario-matrix.test.cjs', 'tooling/tests/schema-parity.test.cjs',
  'tooling/tests/workstream-coordination.test.cjs', 'tooling/tests/runtime-post-delivery-feedback.test.cjs',
  'tooling/tests/runtime-acceptance-manifest-repair.test.cjs',
  'tooling/tests/runtime-review-refreeze.test.cjs', 'tooling/tests/runtime-checkpoint-upgrader.test.cjs',
  'tooling/tests/ponytail-policy.test.cjs'
];
const reviewAssuranceTests = ['tooling/tests/review-assurance.test.cjs', 'tooling/tests/review-assurance-cli.test.cjs', 'tooling/tests/schema-parity.test.cjs'];
// The first three domains form one contiguous source range (the range ends at
// the review-assurance boundary). Keep the maintained runtime-complete public
// suite here so every AST node in that range has a counterexample; a smaller
// list would create profile-induced no-coverage rather than a real source gap.
const runtimeFoundation = runtimeComplete;

module.exports = {
  schema: 'MutationPartitionDefinition/v1',
  sources: [
    {
      file: 'lib/runtime.cjs',
      domains: [
        { id: 'runtime-checkpoint-core', start: '$start', tests: [...commonRuntime, 'tooling/tests/runtime-properties.test.cjs', 'tooling/tests/schema-parity.test.cjs'] },
        { id: 'runtime-clarification-contract', start: 'questionKeys', tests: [...commonRuntime, 'tooling/tests/runtime-clarification-verbs.test.cjs'] },
        { id: 'runtime-coordination-scope', start: 'coordinationManaged', tests: [...commonRuntime, 'tooling/tests/runtime-coordination-v3.test.cjs', 'tooling/tests/runtime-project-context-v4.test.cjs', 'tooling/tests/workstream-coordination.test.cjs', 'tooling/tests/derived-directories.test.cjs'] },
        { id: 'runtime-review-assurance', start: 'packetCore', tests: [...lifecycle, 'tooling/tests/runtime-architect-escalation.test.cjs', 'tooling/tests/runtime-blind-architect-cycle.test.cjs', 'tooling/tests/runtime-profile-attestation.test.cjs', 'tooling/tests/runtime-review-dispatch-reservation.test.cjs'] },
        { id: 'runtime-evidence-delivery', start: 'evidenceCore', tests: [...lifecycle, 'tooling/tests/runtime-scenario-matrix.test.cjs', 'tooling/tests/runtime-post-delivery-feedback.test.cjs'] },
        { id: 'runtime-gates-checkpoint-io', start: 'gateState', tests: [...commonRuntime, 'tooling/tests/fault-seams.test.cjs', 'tooling/tests/runtime-lifecycle-matrix.test.cjs', 'tooling/tests/runtime-replay-matrix.test.cjs', 'tooling/tests/runtime-clarification-verbs.test.cjs', 'tooling/tests/runtime-acceptance-manifest-repair.test.cjs'] },
        { id: 'runtime-planning-coordination-verbs', start: 'beginTrace', tests: [...commonRuntime, 'tooling/tests/runtime-coordination-v3.test.cjs', 'tooling/tests/workstream-coordination.test.cjs'] },
        { id: 'runtime-review-recording-verbs', start: 'reviewUnstarted', tests: [...lifecycle, 'tooling/tests/runtime-architect-escalation.test.cjs', 'tooling/tests/runtime-blind-architect-cycle.test.cjs', 'tooling/tests/runtime-profile-attestation.test.cjs', 'tooling/tests/runtime-review-dispatch-reservation.test.cjs'] },
        { id: 'runtime-clarification-delivery-verbs', start: 'candidateForRecord', tests: [...lifecycle, 'tooling/tests/runtime-blind-architect-cycle.test.cjs', 'tooling/tests/runtime-clarification-verbs.test.cjs', 'tooling/tests/runtime-scenario-matrix.test.cjs', 'tooling/tests/runtime-post-delivery-feedback.test.cjs'] },
        { id: 'runtime-public-cli', start: 'checkpointPath', tests: [...commonRuntime, 'tooling/tests/runtime-lifecycle-matrix.test.cjs'] }
      ]
    },
    {
      file: 'lib/review-assurance.cjs',
      domains: [
        { id: 'runtime-review-assurance-host', start: '$start', tests: reviewAssuranceTests }
      ]
    },
    {
      file: 'lib/workstream-coordination.cjs',
      domains: [
        { id: 'coordination-ledger-core', start: '$start', tests: ['tooling/tests/workstream-coordination.test.cjs', 'tooling/tests/runtime-coordination-v3.test.cjs', 'tooling/tests/runtime-project-context-v4.test.cjs'] },
        { id: 'coordination-claims', start: 'requestedResources', tests: ['tooling/tests/workstream-coordination.test.cjs', 'tooling/tests/runtime-coordination-v3.test.cjs', 'tooling/tests/runtime-project-context-v4.test.cjs'] },
        { id: 'coordination-contour-release', start: 'handoffFifo', tests: ['tooling/tests/workstream-coordination.test.cjs', 'tooling/tests/runtime-coordination-v3.test.cjs'] }
      ]
    },
    {
      file: 'lib/project-context.cjs',
      domains: [
        { id: 'project-context-registry', start: '$start', tests: ['tooling/tests/runtime-project-context-v4.test.cjs', 'tooling/tests/schema-parity.test.cjs'] },
        { id: 'project-context-projection', start: 'projectionBindingValid', tests: ['tooling/tests/runtime-project-context-v4.test.cjs', 'tooling/tests/schema-parity.test.cjs'] }
      ]
    },
    {
      file: 'lib/backlog-adapter.cjs',
      domains: [
        { id: 'backlog-read-invocation', start: '$start', tests: ['tooling/tests/backlog-adapter.test.cjs', 'tooling/tests/adapter-legacy-branches.test.cjs', 'tooling/tests/adapter-legacy-mutation.test.cjs'] },
        { id: 'backlog-locked-mutations', start: 'acquireLedgerLock', tests: ['tooling/tests/backlog-adapter.test.cjs', 'tooling/tests/adapter-legacy-branches.test.cjs', 'tooling/tests/adapter-legacy-mutation.test.cjs', 'tooling/tests/fault-seams.test.cjs'] }
      ]
    },
    {
      file: 'lib/legacy-import.cjs',
      domains: [
        { id: 'legacy-bounded-selection', start: '$start', tests: ['tooling/tests/legacy-import-edge.test.cjs', 'tooling/tests/legacy-import-cache-performance.test.cjs', 'tooling/tests/legacy-import-mutation-survivors.test.cjs'] },
        { id: 'legacy-normalization', start: 'present', tests: ['tooling/tests/legacy-contracts-under-v8.test.cjs', 'tooling/tests/legacy-import-edge.test.cjs', 'tooling/tests/legacy-import-mutation-survivors.test.cjs'] },
        { id: 'legacy-cache-concurrency', start: 'cacheKey', tests: ['tooling/tests/adapter-legacy-mutation.test.cjs', 'tooling/tests/legacy-import-cache-performance.test.cjs', 'tooling/tests/legacy-import-mutation-survivors.test.cjs'] },
        { id: 'legacy-public-import-cli', start: 'importLegacy', tests: ['tooling/tests/legacy-import-edge.test.cjs', 'tooling/tests/legacy-import-cache-performance.test.cjs', 'tooling/tests/legacy-import-mutation-survivors.test.cjs'] }
      ]
    }
  ],
  execution_groups: [
    { id: 'runtime-foundation', domain_ids: ['runtime-checkpoint-core', 'runtime-clarification-contract'], tests: runtimeFoundation },
    { id: 'runtime-coordination-boundary', domain_ids: ['runtime-coordination-scope'], tests: [...new Set([
      ...commonRuntime,
      'tooling/tests/runtime-coordination-v3.test.cjs', 'tooling/tests/runtime-project-context-v4.test.cjs',
      'tooling/tests/workstream-coordination.test.cjs', 'tooling/tests/derived-directories.test.cjs'
    ])] },
    { id: 'runtime-assurance-delivery', domain_ids: ['runtime-review-assurance', 'runtime-evidence-delivery'], tests: runtimeComplete },
    { id: 'runtime-review-assurance-host', domain_ids: ['runtime-review-assurance-host'], tests: reviewAssuranceTests },
    { id: 'runtime-operations', domain_ids: ['runtime-gates-checkpoint-io', 'runtime-planning-coordination-verbs', 'runtime-review-recording-verbs', 'runtime-clarification-delivery-verbs', 'runtime-public-cli'], tests: runtimeComplete },
    { id: 'backlog', domain_ids: ['backlog-read-invocation', 'backlog-locked-mutations'] },
    { id: 'legacy', domain_ids: ['legacy-bounded-selection', 'legacy-normalization', 'legacy-cache-concurrency', 'legacy-public-import-cli'] },
    { id: 'coordination', domain_ids: ['coordination-ledger-core', 'coordination-claims', 'coordination-contour-release'] },
    { id: 'project-context', domain_ids: ['project-context-registry', 'project-context-projection'] }
  ]
};
