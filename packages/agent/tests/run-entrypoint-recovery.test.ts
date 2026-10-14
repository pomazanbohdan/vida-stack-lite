import { afterAll, describe, expect, test } from 'bun:test';
import { boundedSpawnSync, executionBudget, pinnedEnvironment } from '../bin/bun.ts';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import type { StateVersion } from '../src/host-state.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import type { FlowIntent, WorkItemKind } from '../src/config/runtime-config.ts';
import {
  isStringArray,
  isTerminalUtf8SpawnResult,
  parseJsonUnknown,
  parseTestRunPayload,
  requireIssuedActions,
  requireNextActions,
  requireRecord,
  requireStateVersion,
} from './helpers/run-entrypoint-test-support.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mutationMode = process.env.AGENT_RUNTIME_MUTATION_PART === 'bun';
const v8CoverageMode = process.env.AGENT_RUNTIME_V8_COVERAGE === '1';
const ordinaryDescribe = mutationMode ? describe.skip : describe;
const liveInstallTest = v8CoverageMode ? test.skip : test;

const phaseBudget = executionBudget(undefined, 30_000);
const copiedEntries = [
  'src',
  'dist',
  'bin',
  'tooling',
  'schemas',
  'instructions',
  'templates',
  'package.json',
  'TESTING.md',
  'bun.lock',
  '.bun-version',
];
let sharedRecoveryBundle: string | undefined;
let sharedRecoveryRoot: string | undefined;
let sharedRecoveryBinding: string | undefined;
let recoveryOutcomeUnknown = false;
let recoveryFixtureFailed = false;

function copiedPackageBinding(bundle: string): string {
  const access = requireSafeRepositoryAccess(bundle);
  const files = copiedEntries
    .flatMap((entry) => {
      if (!lstatSync(path.join(bundle, entry)).isDirectory()) return [entry];
      return readdirSync(path.join(bundle, entry), { recursive: true, encoding: 'utf8' })
        .map((file) => path.posix.join(entry, file.replaceAll(path.sep, '/')))
        .filter((file) => lstatSync(path.join(bundle, file)).isFile());
    })
    .sort();
  const snapshots = [];
  for (let index = 0; index < files.length; index += 512)
    snapshots.push(snapshotDeclaredSources(access, files.slice(index, index + 512)));
  return canonicalJsonDigest(snapshots);
}

function recoveryBundle(): string {
  if (recoveryOutcomeUnknown) throw new Error('Prior recovery child outcome prevents shared fixture reuse.');
  if (sharedRecoveryBundle) {
    if (copiedPackageBinding(sharedRecoveryBundle) !== sharedRecoveryBinding) {
      recoveryOutcomeUnknown = true;
      throw new Error('Shared copied package changed before recovery route.');
    }
    return sharedRecoveryBundle;
  }
  const started = performance.now();
  sharedRecoveryRoot = mkdtempSync(path.join(tmpdir(), 'vida-recovery-package-'));
  sharedRecoveryBundle = path.join(sharedRecoveryRoot, 'tools', 'agents');
  mkdirSync(sharedRecoveryBundle, { recursive: true });
  for (const entry of copiedEntries)
    cpSync(path.join(packageRoot, entry), path.join(sharedRecoveryBundle, entry), {
      recursive: true,
      dereference: false,
      filter: (source) => path.resolve(source) !== path.join(packageRoot, 'dist', 'standalone'),
    });
  symlinkSync(
    path.join(packageRoot, 'node_modules'),
    path.join(sharedRecoveryBundle, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  sharedRecoveryBinding = copiedPackageBinding(sharedRecoveryBundle);
  phaseBudget.remaining();
  process.stderr.write(
    JSON.stringify({ stage: 'shared recovery package preparation', elapsed_ms: performance.now() - started }) + '\n',
  );
  return sharedRecoveryBundle;
}
afterAll(() => {
  if (sharedRecoveryRoot && !recoveryOutcomeUnknown && !recoveryFixtureFailed)
    rmSync(sharedRecoveryRoot, { recursive: true, force: true });
});

ordinaryDescribe('vida-agent run entrypoint', () => {
  const researchFirstRoutes: readonly {
    readonly workflow: string;
    readonly kind: WorkItemKind;
    readonly intent: FlowIntent;
  }[] = [
    { workflow: 'information_research_light', kind: 'research', intent: 'information_research' },
    { workflow: 'implementation_new', kind: 'feature', intent: 'implementation_new' },
    { workflow: 'implementation_change', kind: 'task', intent: 'implementation_change' },
    { workflow: 'bug_fix', kind: 'bug', intent: 'bug_fix' },
  ];
  for (const route of researchFirstRoutes)
    liveInstallTest(
      `copied bundle recovers interrupted ${route.workflow} research preparation by CAS`,
      async () => {
        const budget = phaseBudget.child(180_000);
        const root = mkdtempSync(path.join(tmpdir(), 'vida-run-session-'));
        let recoveryFailure: unknown;
        let recoveryFailed = false;
        let finalizationFailure: unknown;
        try {
          const bundle = recoveryBundle();
          mkdirSync(path.join(root, 'tools', 'agents'), { recursive: true });
          const externalConfig = path.join(root, 'source-config.yaml');
          writeFileSync(
            externalConfig,
            readFileSync(path.join(packageRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
              .replaceAll('{{REPOSITORY}}', 'ignored-repository')
              .replaceAll('{{PROJECT}}', 'ignored-project')
              .replaceAll('{{BUNDLE}}', 'ignored-runtime'),
          );
          const invokeCopy = (args: readonly string[], env: NodeJS.ProcessEnv = {}) => {
            const commandPath = args[0];
            if (typeof commandPath !== 'string') throw Error('recovery command path is missing');
            const result: unknown = boundedSpawnSync(
              spawnSync,
              process.execPath,
              args,
              {
                cwd: bundle,
                encoding: 'utf8',
                windowsHide: true,
                env: pinnedEnvironment(process.execPath, { ...process.env, ...env }, bundle),
                timeout: 180_000,
                budget,
                diagnostics: true,
              },
              `recovery ${route.workflow}/${path.basename(commandPath)}`,
            );
            if (!isTerminalUtf8SpawnResult(result)) {
              recoveryOutcomeUnknown = true;
              throw Error(`recovery ${route.workflow}/${path.basename(commandPath)} has an uncertain process outcome`);
            }
            return result;
          };
          const initialized = invokeCopy(
            [
              path.join(bundle, 'bin/init.ts'),
              '--project-root',
              root,
              '--repository',
              'different-repository',
              '--project',
              'different-project',
            ],
            { AGENT_RUNTIME_CONFIG: externalConfig },
          );
          expect(initialized.status, initialized.stderr).toBe(0);
          expect(loadRuntimeConfig(root).runtime.bundle).toBe('vida-agent');
          expect(
            requireRecord(
              parseJsonUnknown(readFileSync(path.join(root, '.agent/runtime-initialization.v1.json'), 'utf8')),
              'initialization receipt',
            ).bundle,
          ).toBe('vida-agent');
          const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']);
          const workDir = path.join(root, '.agent', 'work', 'session-work');
          mkdirSync(workDir, { recursive: true });
          const relative = (name: string) => `.agent/work/session-work/${name}`;
          const put = (name: string, value: unknown) => writeFileSync(path.join(workDir, name), JSON.stringify(value));
          put('scope.json', {
            schema: 'ImplementationScope/v1',
            scope_id: 'session-scope',
            work_id: 'session-work',
            source_revision: source.digest,
            ac_ids: ['AC-RESEARCH-1'],
            allowed_paths: ['AGENT.sidecar.md'],
            implementation_paths: ['AGENT.sidecar.md'],
            documentation_paths: [],
            changed_symbols: [],
            non_goals: ['Source mutation'],
            acceptance_trace: ['AC-RESEARCH-1'],
            behavior_trace: ['SR-RESEARCH-1'],
            test_trace: ['parallel wave and CAS fixture'],
            diagnostic_trace: ['fixture'],
            attribution: { thread_id: 'fixture-native-session', pointer: relative('intake.json') },
            owner: 'fixture',
            created_at: new Date().toISOString(),
          });
          put('acceptance.json', {
            schema: 'AcceptanceManifest/v1',
            id: 'session-acceptance',
            version: 1,
            ac_ids: ['AC-RESEARCH-1'],
            source: 'AGENT.sidecar.md',
            scope: 'session-scope',
            source_revision: source.digest,
            contracts: [
              {
                id: 'AC-RESEARCH-1',
                definition: 'Inspect the fixture without source mutation.',
                sr: 'SR-RESEARCH-1',
                evidence: ['fixture'],
              },
            ],
          });
          put('intake.json', {
            schema: 'VidaLocalSessionIntake/v1',
            native_session_handle: 'fixture-native-session',
            work_item: {
              schema: 'WorkItem/v1',
              id: 'session-work',
              provider: 'local',
              provider_type: 'Research',
              canonical_kind: route.kind,
              intent: route.intent,
              project_id: 'different-project',
              title: 'Read-only parallel research fixture',
              description: '',
              labels: [],
              risk_flags: [],
            },
            scope_path: relative('scope.json'),
            acceptance_path: relative('acceptance.json'),
            runtime_code_paths: ['vida-agent/bin/run.ts'],
            route: 'R2',
            risk: 'low',
            change_kind: 'fix',
          });
          const args = [
            path.join(bundle, 'bin/run.ts'),
            '--project-root',
            root,
            '--repository',
            'different-repository',
            '--project',
            'different-project',
            '--work-path',
            'tools/agents',
            '--work-id',
            'session-work',
            '--attempt',
            '1',
            '--scope-digest',
            source.digest,
            '--team',
            'default-development',
            '--kind',
            route.kind,
            '--intent',
            route.intent,
            '--workflow',
            route.workflow,
          ];
          const call = (extra: readonly string[] = []) => {
            const result = invokeCopy([...args, ...extra]);
            const output = result.status === 0 ? result.stdout : result.stderr;
            if (typeof output !== 'string') throw Error('run output is not UTF-8 text');
            return {
              ...result,
              payload: parseTestRunPayload(
                parseJsonUnknown(
                  output
                    .split('\n')
                    .filter((line) => !line.startsWith('runtime call: '))
                    .join('\n'),
                ),
              ),
            };
          };
          const prepared = call(['--intake', path.join(workDir, 'intake.json')]);
          expect(prepared.status, prepared.stderr).toBe(0);
          const preparedActions = requireNextActions(prepared.payload);
          const preparedVersion = requireStateVersion(prepared.payload.state_version);
          const admittedIntake = requireRecord(
            parseJsonUnknown(readFileSync(path.join(workDir, 'local-session-intake.v1.json'), 'utf8')),
            'admitted intake',
          );
          if (!isStringArray(admittedIntake.runtime_code_paths)) throw Error('admitted runtime paths are invalid');
          expect(admittedIntake.runtime_code_paths).toContain('vida-agent/bin/run.ts');
          expect(admittedIntake.runtime_code_paths.every((file: string) => file.startsWith('vida-agent/'))).toBe(true);
          expect(preparedActions.length).toBeGreaterThan(1);
          const expected = (version: StateVersion) => [
            '--expected-revision',
            String(version.revision),
            '--expected-digest',
            version.digest,
          ];
          // Fail after durable issue reservation but before activation history append.
          // A live lock owner simulates a local preparation interruption without
          // making the external issued_actions response possible.
          const activationHistory = path.join(root, '.agent/work/session-work/instruction-activation-history.jsonl');
          writeFileSync(
            `${activationHistory}.lock.lock`,
            JSON.stringify({
              schema: 'SafeRepositoryAccessLock/v1',
              owner_pid: process.pid,
            }),
          );
          const interrupted = call([...expected(preparedVersion), '--issue-wave', 'true']);
          expect(interrupted.status, interrupted.stderr).toBe(1);
          unlinkSync(`${activationHistory}.lock.lock`);
          const { openConfiguredMastraSessionLedger } =
            await import('../src/orchestration/persistent-session-handoff.ts');
          const interruptedLedger = openConfiguredMastraSessionLedger(root);
          const interruptedSnapshot = interruptedLedger.resume('session-work', 1);
          interruptedLedger.close();
          if (!interruptedSnapshot) throw Error('interrupted session snapshot is missing');
          expect(interruptedSnapshot.state.research_wave_exposure).toBe('preparing');
          const reservedIssues = interruptedSnapshot.state.items
            .filter((item) => item.issue_id !== null)
            .map((item) => ({ action_id: item.request.action_id, issue_id: item.issue_id }));
          expect(reservedIssues).toHaveLength(preparedActions.length);
          expect(interruptedSnapshot.state.items.filter((item) => item.research_activation)).toHaveLength(1);
          expect(existsSync(activationHistory)).toBe(false);
          // The shared readonly incomplete-status branch has one copied-bundle
          // witness; every route retains its interrupted state and recovery CAS.
          if (route.workflow === researchFirstRoutes[0]?.workflow) {
            const preparationStatus = call();
            expect(preparationStatus.status, preparationStatus.stderr).toBe(0);
            expect(preparationStatus.payload.research_preparation_status).toBe('preparation_incomplete');
            const preparationActionStatuses = preparationStatus.payload.action_statuses;
            if (!preparationActionStatuses) throw Error('preparation action statuses are missing');
            expect(preparationActionStatuses.every((item) => item.status === 'research_preparation_incomplete')).toBe(
              true,
            );
          }

          const issued = call([...expected(interruptedSnapshot.version), '--issue-wave', 'true']);
          expect(issued.status, issued.stderr).toBe(0);
          const issuedActions = requireIssuedActions(issued.payload);
          const issuedVersion = requireStateVersion(issued.payload.state_version);
          expect(issued.payload.status).toBe('wave_recovered');
          expect(issued.payload.research_preparation_status).toBe('exposure_possible');
          if (!issued.payload.action_statuses) throw Error('issued action statuses are missing');
          expect(issued.payload.action_statuses.every((item) => item.status === 'issued_outcome_uncertain')).toBe(true);
          expect(
            issuedActions.every(
              (item) =>
                item.action.resolved_profile?.schema === 'ResolvedAgentProfile/v1' &&
                item.action.resolved_profile.enforcement_status === 'not_asserted',
            ),
          ).toBe(true);
          expect(issuedActions.map((item) => item.request.action_id)).toEqual(
            preparedActions.map((item) => item.request.action_id),
          );
          expect(issuedActions.map(({ request, issue_id }) => ({ action_id: request.action_id, issue_id }))).toEqual(
            reservedIssues,
          );
          expect(issuedActions.every((item) => item.instruction_activation)).toBe(true);
          expect(new Set(issuedActions.map((item) => item.issue_id)).size).toBe(issuedActions.length);
          const stale = call([...expected(issuedVersion), '--issue-wave', 'true']);
          expect(stale.status).toBe(1);
          const reportFile = path.join(root, 'report.json');
          // Shared CLI/report byte ingress needs one copied-bundle witness.
          // Duplicate issuance and action/issue/CAS denials remain in every route.
          if (route.workflow === researchFirstRoutes[0]?.workflow) {
            const mixed = call([...expected(issuedVersion), '--issue-wave', 'true', '--report', reportFile]);
            expect(mixed.status).toBe(1);
            expect(mixed.payload.code).toBe('GAP-VIDA-RUN-CLI-001');
            writeFileSync(reportFile, 'x'.repeat(32769));
            const oversized = call([...expected(issuedVersion), '--report', reportFile]);
            expect(oversized.status).toBe(1);
            expect(oversized.payload.code).toBe('GAP-VIDA-RUN-REPORT-001');
            writeFileSync(reportFile, '{');
            const malformed = call([...expected(issuedVersion), '--report', reportFile]);
            expect(malformed.status).toBe(1);
            expect(malformed.payload.code).toBe('GAP-VIDA-RUN-REPORT-001');
            writeFileSync(reportFile, '{}');
            const secondLink = path.join(root, 'report-hardlink.json');
            linkSync(reportFile, secondLink);
            const linked = call([...expected(issuedVersion), '--report', reportFile]);
            expect(linked.status).toBe(1);
            expect(linked.payload.code).toBe('GAP-VIDA-RUN-REPORT-001');
            unlinkSync(secondLink);
          }
          let version = issuedVersion;
          let final: ReturnType<typeof call> | undefined;
          for (const item of issuedActions) {
            const action = item.request;
            if (typeof item.issue_id !== 'string') throw Error('issued action lacks its issue identity');
            const sourceEntry = source.entries[0];
            if (!sourceEntry) throw Error('fixture source entry is missing');
            const sourceId = `fixture-source-${action.assignment_index}`;
            const summary = JSON.stringify({
              schema: 'VidaResearchObservationOutput/v1',
              topic: `Read-only fixture research ${action.assignment_index}`,
              objective: 'Inspect fixture source without changing code.',
              question: 'What does the fixture show?',
              source_refs: [
                {
                  source_id: sourceId,
                  source_kind: 'internal',
                  locator: `AGENT.sidecar.md#fixture-${action.assignment_index}`,
                  title: 'Fixture sidecar',
                  claim: 'AC-RESEARCH-1 SR-RESEARCH-1: this fixture is read-only research.',
                  retrieved_at: '2026-09-30T00:00:00Z',
                  version_or_date: '2026-09-30',
                  independence_group: 'fixture',
                  digest: sourceEntry.sha256,
                },
              ],
              findings: [
                {
                  finding_id: `fixture-${action.assignment_index}`,
                  statement: 'The fixture source is present.',
                  source_ids: [sourceId],
                  evidence_class: 'Code',
                  status: 'confirmed',
                },
              ],
              evidence_classes: ['Code'],
              uncertainties: [],
              conflicts: [],
              br_ids: [],
              sr_ids: ['SR-RESEARCH-1'],
              ac_ids: ['AC-RESEARCH-1'],
              gap_ids: [],
              options: [
                {
                  option_id: 'retain',
                  label: 'Retain evidence',
                  description: 'Preserve the read-only finding.',
                  evidence_refs: [sourceId],
                },
              ],
              recommendation: {
                option_id: 'retain',
                rationale: 'Fixture source supports the finding.',
                evidence_refs: [sourceId],
              },
              completeness: {
                status: 'pass',
                required_questions: ['What does the fixture show?'],
                answered_questions: ['What does the fixture show?'],
                missing_questions: [],
                material_gaps: [],
                external_validation: {
                  required: false,
                  source_count: 0,
                  minimum_sources: 0,
                  status: 'not_required',
                  live_check: null,
                },
              },
              readiness: 'informational',
            });
            const outcome = {
              schema: 'VidaSessionObservation/v1',
              action_id: action.action_id,
              issue_id: item.issue_id,
              agent_id: `test-${action.assignment_index}`,
              tool_call_ref: `tool-${action.assignment_index}`,
              status: 'reported_complete',
              summary,
              output_digest: canonicalJsonDigest(summary),
              evidence_refs: [sourceId],
            };
            if (action.assignment_index === 0) {
              writeFileSync(reportFile, JSON.stringify({ ...outcome, action_id: 'wrong-action' }));
              const mismatched = call([...expected(version), '--report', reportFile]);
              expect(mismatched.status).toBe(1);
            }
            writeFileSync(reportFile, JSON.stringify(outcome));
            final = call([...expected(version), '--report', reportFile]);
            expect(final.status, final.stderr).toBe(0);
            expect(final.payload.status).not.toBe('report_retrieved');
            const reportedVersion = requireStateVersion(final.payload.state_version);
            expect(reportedVersion.revision).toBeGreaterThan(version.revision);
            version = reportedVersion;
          }
          if (!final) throw Error('report sequence produced no final result');
          const finalActions = requireNextActions(final.payload);
          expect(final.payload.resume_status).toBe('ready');
          expect(finalActions.length).toBeGreaterThan(0);
          expect(finalActions[0]?.request.wave_index).toBe(1);
          const replay = call([...expected(version), '--report', path.join(root, 'report.json')]);
          expect(replay.status).toBe(0);
          expect(replay.payload.status).toBe('report_retrieved');
          expect(replay.payload.state_version).toEqual(requireStateVersion(final.payload.state_version));
          expect(requireIssuedActions(replay.payload)).toEqual([]);
        } catch (error) {
          recoveryFailed = true;
          recoveryFixtureFailed = true;
          recoveryFailure = error;
        } finally {
          try {
            if (sharedRecoveryBundle && !recoveryOutcomeUnknown) {
              const started = performance.now();
              const observedBinding = copiedPackageBinding(sharedRecoveryBundle);
              if (sharedRecoveryBinding === undefined) {
                finalizationFailure = Error('shared recovery package binding is missing');
              } else if (observedBinding !== sharedRecoveryBinding) {
                recoveryOutcomeUnknown = true;
                finalizationFailure = Error('recovery package binding changed during the test');
              } else {
                process.stderr.write(
                  JSON.stringify({
                    stage: `recovery ${route.workflow} package immutability`,
                    elapsed_ms: performance.now() - started,
                  }) + '\n',
                );
              }
            }
          } catch (error) {
            finalizationFailure = error;
          }
          if (finalizationFailure !== undefined) recoveryFixtureFailed = true;
          if (recoveryFailed || finalizationFailure !== undefined || recoveryOutcomeUnknown) {
            process.stderr.write(`Retained failed or nonterminal recovery fixture: ${root}\n`);
          } else {
            try {
              rmSync(root, { recursive: true, force: true });
            } catch (error) {
              finalizationFailure = error;
              recoveryFixtureFailed = true;
              process.stderr.write(`Retained failed recovery fixture after cleanup error: ${root}\n`);
            }
          }
        }
        if (recoveryFailed) {
          if (finalizationFailure !== undefined)
            throw new AggregateError(
              [recoveryFailure, finalizationFailure],
              'recovery test and finalization both failed',
            );
          throw recoveryFailure;
        }
        if (finalizationFailure !== undefined) throw finalizationFailure;
      },
      180_000,
    );
});
