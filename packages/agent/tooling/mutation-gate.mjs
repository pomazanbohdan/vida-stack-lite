import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import { checkManifest, pinnedEnvironment, readPin } from '../bin/bun.mjs';
import { maintainedSourceInventory } from './maintained-source-inventory.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pin = readPin(root);
checkManifest(root, pin);
if (process.versions.bun !== pin) throw new Error('Mutation gate requires the pinned Bun executable.');
const commonTests = ['tests/coverage-completeness.test.mjs'];
const mainSlices = [
  {
    name: 'main-runtime-core',
    sources: ['src/runtime-kernel.ts', 'src/runtime-timing.ts'],
    tests: [
      ...commonTests,
      'tests/runtime-kernel-boundary.test.mjs',
      'tests/configured-workflow.test.mjs',
      'tests/bun-coverage.test.mjs',
      'tests/smoke.test.mjs',
    ],
  },
  {
    name: 'main-config',
    sources: ['src/config/runtime-config.ts', 'src/config/project-context.ts'],
    tests: [
      ...commonTests,
      'tests/project-context-boundary.test.mjs',
      'tests/fuzz.test.mjs',
      'tests/runtime-config-repair-boundary.test.mjs',
    ],
  },
  {
    name: 'main-host',
    sources: ['src/config/host-capability.ts'],
    tests: [...commonTests, 'tests/host-capability-boundary.test.mjs', 'tests/bun-coverage.test.mjs'],
  },
  {
    name: 'main-contracts',
    sources: ['src/contracts/public-ingress.ts', 'src/contracts/envelopes.ts'],
    tests: [...commonTests, 'tests/envelopes-boundary.test.mjs', 'tests/fuzz.test.mjs', 'tests/zombies.test.mjs'],
  },
  {
    name: 'main-cedar',
    sources: ['src/authorization/cedar-boundary.ts'],
    tests: [...commonTests, 'tests/envelopes-boundary.test.mjs', 'tests/fuzz.test.mjs', 'tests/bun-coverage.test.mjs'],
  },
  {
    name: 'main-governance',
    sources: ['src/governance/edictum-boundary.ts'],
    tests: [
      ...commonTests,
      'tests/governance-completeness.test.mjs',
      'tests/edictum-workflow-completeness.test.mjs',
      'tests/smoke.test.mjs',
    ],
  },
  {
    name: 'main-mastra',
    sources: ['src/orchestration/mastra-boundary.ts'],
    tests: [...commonTests, 'tests/runtime-config-yaml.test.mjs', 'tests/smoke.test.mjs', 'tests/zombies.test.mjs'],
  },
  {
    name: 'main-exports',
    environment: 'static',
    sources: ['src/index.ts', 'src/config/index.ts'],
  },
];
const partitions = [
  ...mainSlices
    .filter((slice) => slice.environment !== 'static')
    .map((slice) => ({
      ...slice,
      environment: 'main',
      report: slice.name + '.json',
    })),
  ...mainSlices.filter((slice) => slice.environment === 'static'),
  {
    name: 'bun-host-state',
    environment: 'bun',
    sources: ['src/host-state.ts', 'src/trusted-host.ts'],
    tests: ['tests/bun/host-state.test.mjs'],
    report: 'mutation-bun-host-state.json',
  },
  {
    name: 'bun-session-handoff',
    environment: 'bun',
    sources: [
      'src/orchestration/persistent-session-handoff.ts',
      'src/orchestration/session-handoff.ts',
      'src/orchestration/workflow-plan.ts',
    ],
    tests: ['tests/session-handoff.test.mjs', 'tests/bun/persistent-session-handoff.test.mjs'],
    report: 'mutation-bun-session-handoff.json',
  },
  {
    name: 'bun-runtime-facade',
    environment: 'bun',
    sources: ['src/lifecycle/runtime-facade.ts'],
    tests: ['tests/smoke.test.mjs'],
    report: 'mutation-bun-runtime-facade.json',
  },
  {
    name: 'bun-lifecycle-state',
    environment: 'bun',
    sources: ['src/lifecycle/lifecycle-state.ts'],
    tests: ['tests/bun/lifecycle-state.test.mjs'],
    report: 'mutation-bun-lifecycle-state.json',
  },
  {
    name: 'bun-final-assurance',
    environment: 'bun',
    sources: ['src/orchestration/final-assurance.ts'],
    tests: ['tests/final-assurance.test.mjs', 'tests/final-assurance-public.test.mjs'],
    report: 'mutation-bun-final-assurance.json',
  },
  {
    name: 'bun-runtime-initialization',
    environment: 'bun',
    sources: ['src/runtime-initialization.ts', 'src/workspace-identity.ts'],
    tests: ['tests/bun/runtime-initialization.test.mjs'],
    report: 'mutation-bun-runtime-initialization.json',
  },
  {
    name: 'bun-development-controller',
    environment: 'bun',
    sources: ['bin/development-controller.mjs'],
    tests: ['tests/development-controller.test.mjs'],
    report: 'mutation-bun-development-controller.json',
  },
  {
    name: 'bun-cli-public-entrypoints',
    environment: 'bun',
    sources: ['bin/repair-work-state.mjs', 'bin/scope.mjs', 'bin/vida-agent.mjs'],
    tests: ['tests/run-entrypoint.test.mjs', 'tests/automatic-work-absorption.test.mjs'],
    report: 'mutation-bun-cli-public-entrypoints.json',
  },
  {
    name: 'bun-cli-toolchain',
    environment: 'bun',
    sources: ['bin/bun.mjs'],
    tests: ['tests/bun-toolchain.test.mjs', 'tests/bun-coverage.test.mjs', 'tests/bun-cache-routing.test.mjs'],
    report: 'mutation-bun-cli-toolchain.json',
  },
  {
    name: 'bun-cli-init',
    environment: 'bun',
    sources: ['bin/init-core.mjs', 'bin/init.mjs'],
    tests: ['tests/initialization.test.mjs'],
    report: 'mutation-bun-cli-init.json',
  },
  {
    name: 'bun-cli-run',
    environment: 'bun',
    sources: ['bin/run.mjs'],
    tests: ['tests/run-entrypoint.test.mjs', 'tests/bun-cache-routing.test.mjs'],
    report: 'mutation-bun-cli-run.json',
  },
  {
    name: 'bun-doc-clear',
    environment: 'bun',
    sources: ['src/documentation/clear.ts', 'bin/documentation-clear.mjs'],
    tests: ['tests/documentation-clear.test.mjs'],
    report: 'mutation-bun-doc-clear.json',
  },
  {
    name: 'bun-observed-validation',
    environment: 'bun',
    sources: [
      'src/orchestration/admitted-development-packet.ts',
      'src/orchestration/admitted-implementation-result.ts',
      'src/orchestration/observed-validation.ts',
      'src/orchestration/observed-receipt-evidence.ts',
      'src/orchestration/scoped-source-snapshot.ts',
    ],
    tests: [
      'tests/admitted-development-packet.test.mjs',
      'tests/observed-validation.test.mjs',
      'tests/scoped-source-snapshot.test.mjs',
    ],
    report: 'mutation-bun-observed-validation.json',
  },
  {
    name: 'bun-observed-research',
    environment: 'bun',
    sources: [
      'src/orchestration/observed-research-activation.ts',
      'src/orchestration/observed-research-artifact.ts',
      'src/orchestration/observed-research-binding.ts',
      'src/orchestration/observed-research-result.ts',
      'src/orchestration/observed-synthesis-result.ts',
      'src/research-decision.ts',
      'src/research-source-catalog.ts',
    ],
    tests: [
      'tests/observed-research-result.test.mjs',
      'tests/research-source-catalog.test.mjs',
      'tests/paused-replacement-entrypoint.test.mjs',
      'tests/repair-cli-behavior.test.mjs',
    ],
    report: 'mutation-bun-observed-research.json',
  },
  {
    name: 'main-local-entrypoint',
    environment: 'main',
    sources: [
      'src/orchestration/admitted-session-execution.ts',
      'src/orchestration/configured-context.ts',
      'src/orchestration/inspect-local-session.ts',
      'src/orchestration/local-session-reconciliation.ts',
      'src/orchestration/local-source-authorization.ts',
      'src/orchestration/local-work-admission.ts',
      'src/orchestration/mastra-session-bridge.ts',
      'src/orchestration/observed-delivery.ts',
      'src/orchestration/observed-testing.ts',
      'src/orchestration/resume-paused-local-work.ts',
      'src/orchestration/staged-runtime-witness.ts',
      'src/orchestration/suspend-local-work.ts',
    ],
    tests: [
      'tests/configured-context.test.mjs',
      'tests/run-entrypoint.test.mjs',
      'tests/paused-replacement-entrypoint.test.mjs',
      'tests/staged-runtime-witness.test.mjs',
    ],
    report: 'mutation-main-local-entrypoint.json',
  },
  {
    name: 'bun-dispatch-repair',
    environment: 'bun',
    sources: [
      'bin/reconcile-artifacts.mjs',
      'bin/reconcile-readonly-dispatch.mjs',
      'bin/read-only-dispatch-repair.mjs',
    ],
    tests: [
      'tests/reconcile-readonly-dispatch.test.mjs',
      'tests/read-only-dispatch-repair.test.mjs',
      'tests/paused-replacement-entrypoint.test.mjs',
      'tests/repair-cli-behavior.test.mjs',
    ],
    report: 'mutation-bun-dispatch-repair.json',
  },
  {
    name: 'bun-runtime-code-rebind',
    environment: 'bun',
    sources: ['bin/runtime-code-rebind.mjs', 'bin/forward-review-proof.mjs'],
    tests: ['tests/paused-replacement-entrypoint.test.mjs'],
    report: 'mutation-bun-runtime-code-rebind.json',
  },
  {
    name: 'bun-specialized-repair',
    environment: 'bun',
    sources: [
      'bin/reconcile-synthesis-qualification.mjs',
      'bin/synthesis-observation-correction.mjs',
      'bin/repair-research-records.mjs',
    ],
    tests: ['tests/repair-cli-behavior.test.mjs'],
    report: 'mutation-bun-specialized-repair.json',
  },
  {
    name: 'bun-runtime-config-rebind',
    environment: 'bun',
    sources: ['bin/runtime-config-rebind.mjs'],
    tests: ['tests/runtime-config-rebind.test.mjs'],
    report: 'mutation-bun-runtime-config-rebind.json',
  },
  {
    name: 'bun-documentation-policy-transition',
    environment: 'bun',
    sources: [
      'bin/documentation-policy-transition.mjs',
      'src/documentation/policy-transition.ts',
      'src/documentation/transition-proof.ts',
    ],
    tests: ['tests/documentation-policy-transition.test.mjs'],
    report: 'mutation-bun-documentation-policy-transition.json',
  },
  {
    name: 'bun-forward-candidate-admission',
    environment: 'bun',
    sources: ['bin/forward-candidate-admission.mjs'],
    tests: ['tests/forward-candidate-admission.test.mjs', 'tests/forward-candidate-authority.test.mjs'],
    report: 'mutation-bun-forward-candidate-admission.json',
  },
  {
    name: 'bun-completed-readonly-capture',
    environment: 'bun',
    sources: ['bin/capture-completed-readonly.mjs'],
    // Portable selector proves unadmitted-source denial only. Full capture/CAS
    // behavior is a repository integration lane; mutation completeness is open.
    tests: ['tests/completed-readonly-capture.test.mjs'],
    report: 'mutation-bun-completed-readonly-capture.json',
  },
  {
    name: 'linux',
    environment: 'linux',
    sources: undefined,
    requiredReportedSource: 'src/config/safe-repository-access.ts',
    tests: ['tests/safe-repository-linux-simulation.test.mjs'],
    report: 'mutation-linux.json',
  },
  {
    name: 'windows',
    environment: 'windows',
    sources: undefined,
    requiredReportedSource: 'src/config/safe-repository-access.ts',
    tests: ['tests/safe-repository-completeness.test.mjs'],
    report: 'mutation-windows.json',
  },
];
const sourceInventory = maintainedSourceInventory(root);
const expectedSources = sourceInventory.mutationSources;
const missingPackageSources = sourceInventory.missingPackageSources;
const partitionSources = new Set(
  partitions.flatMap(({ sources, requiredReportedSource }) => sources ?? [requiredReportedSource]),
);
const unassignedSources = expectedSources.filter((source) => !partitionSources.has(source));
const unknownPartitionSources = [...partitionSources].filter((source) => !expectedSources.includes(source));
const zeroMutantSources = new Set(['src/index.ts', 'src/config/index.ts']);
const sourceAssignments = new Map();
for (const { name, sources, requiredReportedSource } of partitions)
  for (const source of sources ?? [requiredReportedSource])
    sourceAssignments.set(source, [...(sourceAssignments.get(source) ?? []), name]);
const invalidOverlaps = [...sourceAssignments].filter(
  ([source, owners]) =>
    owners.length > 1 &&
    !(
      source === 'src/config/safe-repository-access.ts' &&
      owners.length === 2 &&
      owners.includes('linux') &&
      owners.includes('windows')
    ),
);
const invalidZeroMutantSources = [];
for (const source of zeroMutantSources) {
  const ast = parse(await readFile(path.join(root, source), 'utf8'), {
    sourceType: 'module',
    plugins: ['typescript'],
  });
  if (!ast.program.body.every((node) => node.type === 'ExportNamedDeclaration' && node.source && !node.declaration))
    invalidZeroMutantSources.push(source);
}
if (process.argv.includes('--inventory')) {
  console.log(
    JSON.stringify({
      schema: 'CandidateMutationInventory/v1',
      expected_sources: expectedSources,
      unassigned_sources: unassignedSources,
      unknown_partition_sources: unknownPartitionSources,
      invalid_overlaps: invalidOverlaps,
      missing_package_sources: missingPackageSources,
      invalid_zero_mutant_sources: invalidZeroMutantSources,
      zero_mutant_sources: [...zeroMutantSources],
      repository_only_sources: sourceInventory.repositoryOnlySources,
      partitions: partitions.map(({ name, environment, sources, requiredReportedSource }) => ({
        name,
        environment,
        sources: sources ?? [requiredReportedSource],
      })),
    }),
  );
  process.exit(
    unassignedSources.length ||
      unknownPartitionSources.length ||
      invalidOverlaps.length ||
      missingPackageSources.length ||
      invalidZeroMutantSources.length
      ? 1
      : 0,
  );
}
if (
  unassignedSources.length ||
  unknownPartitionSources.length ||
  invalidOverlaps.length ||
  missingPackageSources.length ||
  invalidZeroMutantSources.length
)
  throw new Error(
    `Mutation partition inventory is invalid: ${JSON.stringify({ unassignedSources, unknownPartitionSources, invalidOverlaps, missingPackageSources, invalidZeroMutantSources })}`,
  );
const reportDirectory = await mkdtemp(path.join(tmpdir(), 'agent-runtime-mutation-'));

try {
  const runs = [];
  for (const partition of partitions) {
    if (partition.environment === 'static') continue;
    const environment = {
      ...process.env,
      AGENT_RUNTIME_TEST_REPOSITORY_ROOT: path.resolve(root, '..'),
      AGENT_RUNTIME_MUTATION_DIRECTORY: reportDirectory,
      AGENT_RUNTIME_MUTATION_REPORT: partition.report,
    };
    if (partition.environment === 'main' || partition.environment === 'bun') {
      if (partition.environment === 'main') delete environment.AGENT_RUNTIME_MUTATION_PART;
      else environment.AGENT_RUNTIME_MUTATION_PART = partition.environment;
      environment.AGENT_RUNTIME_MUTATION_SOURCE = partition.sources.join(',');
      environment.AGENT_RUNTIME_MUTATION_TESTS = partition.tests.join(',');
      environment.AGENT_RUNTIME_SKIP_PACKAGE_TEST = '1';
    } else {
      environment.AGENT_RUNTIME_MUTATION_PART = partition.environment;
      delete environment.AGENT_RUNTIME_MUTATION_SOURCE;
      delete environment.AGENT_RUNTIME_MUTATION_TESTS;
    }
    const result = Bun.spawnSync({
      cmd: [process.execPath, 'x', 'stryker', 'run', 'stryker.config.mjs'],
      cwd: root,
      stdout: 'inherit',
      stderr: 'inherit',
      env: pinnedEnvironment(process.execPath, environment),
    });
    runs.push({ ...partition, result });
  }

  const reports = [];
  const reportErrors = [];
  for (const run of runs) {
    try {
      reports.push({ ...run, reportData: JSON.parse(await readFile(path.join(reportDirectory, run.report), 'utf8')) });
    } catch (error) {
      reportErrors.push({ partition: run.name, error: String(error) });
    }
  }

  const normalizeFile = (file) => file.replaceAll('\\', '/');
  const normalizedSourcePath = (file) =>
    path.relative(root, path.isAbsolute(file) ? file : path.resolve(root, file)).replaceAll('\\', '/');
  // Every partition must kill its own mutants. Merging the same mutation from
  // Linux and Windows could otherwise hide a survivor in one platform lane.
  const mutants = [];
  const partitionStatuses = {};
  const emptyPartitions = [];
  const missingPartitionSources = [];
  const extraPartitionSources = [];
  for (const { name, reportData, requireMutants = true, requiredReportedSource, sources } of reports) {
    const statuses = {};
    const expectedPartitionSources = sources ?? [requiredReportedSource];
    const reportedPartitionSources = new Map(
      Object.entries(reportData.files ?? {}).map(([file, value]) => [normalizedSourcePath(file), value]),
    );
    for (const source of expectedPartitionSources)
      if (!zeroMutantSources.has(source) && !reportedPartitionSources.get(source)?.mutants?.length)
        missingPartitionSources.push({ partition: name, source });
    for (const source of reportedPartitionSources.keys())
      if (!expectedPartitionSources.includes(source)) extraPartitionSources.push({ partition: name, source });
    for (const [fileName, value] of Object.entries(reportData.files ?? {})) {
      const file = normalizeFile(fileName);
      for (const mutant of value.mutants ?? []) {
        statuses[mutant.status] = (statuses[mutant.status] ?? 0) + 1;
        mutants.push({ partition: name, file, ...mutant });
      }
    }
    if (requireMutants && Object.values(statuses).reduce((count, value) => count + value, 0) === 0)
      emptyPartitions.push(name);
    partitionStatuses[name] = statuses;
  }
  const statuses = mutants.reduce((values, mutant) => {
    values[mutant.status] = (values[mutant.status] ?? 0) + 1;
    return values;
  }, {});
  const nonKilled = mutants.filter((mutant) => mutant.status !== 'Killed');
  const reportedSources = [...new Set(reports.flatMap(({ reportData }) => Object.keys(reportData.files ?? {})))]
    .map(normalizedSourcePath)
    .sort((left, right) => left.localeCompare(right));
  const missingSources = expectedSources.filter(
    (file) => !zeroMutantSources.has(file) && !reportedSources.includes(file),
  );
  const extraSources = reportedSources.filter((file) => !expectedSources.includes(file));
  const runnerExitCodes = runs.map(({ name, result }) => ({ partition: name, exit_code: result.exitCode }));
  const killed = mutants.filter((mutant) => mutant.status === 'Killed').length;
  const effectiveScore = mutants.length === 0 ? 0 : killed / mutants.length;
  const pass =
    runs.every(({ result }) => result.exitCode === 0) &&
    reportErrors.length === 0 &&
    emptyPartitions.length === 0 &&
    missingPartitionSources.length === 0 &&
    extraPartitionSources.length === 0 &&
    mutants.length > 0 &&
    effectiveScore === 1 &&
    nonKilled.length === 0 &&
    missingSources.length === 0 &&
    extraSources.length === 0;
  const summary = {
    schema: 'CandidateMutationReport/v1',
    required_effective_score: 1,
    effective_score: effectiveScore,
    required_survived: 0,
    required_non_killed: 0,
    status: pass ? 'pass' : 'fail',
    runner_exit_codes: runnerExitCodes,
    report_errors: reportErrors,
    empty_partitions: emptyPartitions,
    missing_partition_sources: missingPartitionSources,
    extra_partition_sources: extraPartitionSources,
    maintained_sources: expectedSources,
    missing_package_sources: missingPackageSources,
    reported_sources: reportedSources,
    missing_sources: missingSources,
    extra_sources: extraSources,
    mutants: mutants.length,
    killed,
    statuses,
    partition_statuses: partitionStatuses,
    non_killed: nonKilled,
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  if (!pass) process.exitCode = 1;
} finally {
  await rm(reportDirectory, { recursive: true, force: true });
}
