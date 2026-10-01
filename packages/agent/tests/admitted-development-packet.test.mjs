import { afterAll, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConsumerFixture } from './helpers/consumer-fixture.mjs';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { buildAdmittedDevelopmentPacket } from '../src/orchestration/admitted-development-packet.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';

const packageRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const root = createConsumerFixture(packageRoot, 'vida-admitted-packet-');
const config = loadRuntimeConfig(root);
const scratchRoot = path.join(root, '.planning', 'agent-flow');
mkdirSync(scratchRoot, { recursive: true });
const fixture = mkdtempSync(path.join(scratchRoot, 'packet-adapter-'));
afterAll(() => {
  if (!fixture.startsWith(scratchRoot + path.sep)) throw new Error('unsafe packet fixture cleanup');
  rmSync(root, { recursive: true, force: true });
});
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
let fixtureNumber = 0;

function admitted(intent = 'task_execution') {
  const directory = path.join(fixture, String(++fixtureNumber));
  mkdirSync(directory);
  const relative = (name) => path.relative(root, path.join(directory, name)).replaceAll('\\', '/');
  const workItem = {
    schema: 'WorkItem/v1',
    id: 'packet-test-work',
    provider: 'local',
    provider_type: 'Task',
    canonical_kind: intent === 'task_execution' ? 'task' : 'story',
    intent,
    project_id: 'fixture-project',
    title: 'Add one scoped file',
    description: 'Create the agreed scoped file and verify its acceptance.',
    risk_flags: [],
    labels: [],
  };
  const selection = {
    team: 'default-development',
    kind: workItem.canonical_kind,
    intent,
    project: 'fixture-project',
    risk_flags: [],
    labels: [],
  };
  const target = relative('new-file.ts');
  const contextPath = 'vida-agent/TESTING.md';
  const allowedPaths = [target, contextPath].sort((left, right) => left.localeCompare(right));
  const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), allowedPaths);
  const scope = {
    schema: 'ImplementationScope/v1',
    scope_id: 'packet-test-scope',
    work_id: workItem.id,
    source_revision: source.digest,
    ac_ids: ['AC-1'],
    allowed_paths: allowedPaths,
    implementation_paths: [target],
    documentation_paths: [],
    changed_symbols: [],
    non_goals: [],
    acceptance_trace: ['AC-1'],
    behavior_trace: ['Create the scoped file.'],
    test_trace: ['Run the focused acceptance check.'],
    diagnostic_trace: ['Observe the file result.'],
    attribution: { thread_id: 'packet-test-thread', pointer: 'local:packet-test' },
    owner: 'packet-test-owner',
    created_at: '2026-09-25T00:00:00.000Z',
  };
  const acceptance = {
    schema: 'AcceptanceManifest/v1',
    id: 'packet-test-acceptance',
    version: 1,
    ac_ids: ['AC-1'],
    source: 'local:packet-test',
    scope: scope.scope_id,
    source_revision: source.digest,
    contracts: [
      {
        id: 'AC-1',
        definition: 'The scoped file is created.',
        sr: 'Create only the admitted file.',
        evidence: ['focused acceptance check'],
      },
    ],
  };
  const scopePath = relative('scope.json');
  const acceptancePath = relative('acceptance.json');
  writeFileSync(path.join(root, scopePath), JSON.stringify(scope));
  writeFileSync(path.join(root, acceptancePath), JSON.stringify(acceptance));
  const scopeBytes = readFileSync(path.join(root, scopePath));
  const acceptanceBytes = readFileSync(path.join(root, acceptancePath));
  const expiry = new Date(Date.now() + 60_000).toISOString();
  const workflowId = intent;
  const binding = {
    lifecycle_work_id: workItem.id,
    provider_work_item_id: workItem.id,
    work_item_digest: canonicalJsonDigest(workItem),
    team_id: selection.team,
    workflow_id: workflowId,
    project_ids: ['fixture-project'],
    config_digest: runtimeConfigDigest(config),
    scope_id: scope.scope_id,
    scope_contract_digest: digest(scopeBytes),
    acceptance_manifest_digest: digest(acceptanceBytes),
    ac_ids: scope.ac_ids,
    implementation_paths: scope.implementation_paths,
    work_source_revision: source.digest,
  };
  const host = {
    work: {
      schema: 'WorkState/v1',
      workspace_id: 'a'.repeat(64),
      binding,
      contracts: { scope: { path: scopePath }, acceptance: { path: acceptancePath } },
      lease: { ticket_id: 'packet-test-ticket', thread_id: 'packet-test-thread', generation: 1 },
      execution: { run_id: 'packet-test-run' },
      artifacts: [],
    },
    ledger: {
      claims: [
        {
          ticket_id: 'packet-test-ticket',
          thread_id: 'packet-test-thread',
          generation: 1,
          status: 'active',
          lease_expires_at: expiry,
        },
      ],
      tickets: [
        {
          ticket_id: 'packet-test-ticket',
          thread_id: 'packet-test-thread',
          generation: 1,
          status: 'active',
          expires_at: expiry,
        },
      ],
    },
  };
  const state = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: 'a'.repeat(64),
    work_id: workItem.id,
    attempt: 1,
    run_id: 'packet-test-run',
    step_id: 'develop',
    source_scope: source,
    items: [],
    completed: [],
  };
  const ledger = { version: { revision: 1, digest: canonicalJsonDigest(state) }, state };
  return {
    repositoryRoot: root,
    config,
    host,
    ledger,
    workItem,
    selection,
    scopeBytes,
    acceptanceBytes,
    configuredContext: null,
    target,
    allowedPaths,
  };
}

describe('admitted development packet', () => {
  test('keeps an absent new file truthful and derives stable task content', () => {
    const input = admitted();
    const first = buildAdmittedDevelopmentPacket(input);
    const second = buildAdmittedDevelopmentPacket(input);
    expect(first).toEqual(second);
    expect(first.in_scope).toEqual([input.target]);
    expect(first.owned_paths).toEqual(input.allowedPaths);
    expect(first.code_evidence_refs).toEqual([]);
    expect(first.skill_refs).toEqual([]);
    expect(first.documentation_refs).toEqual([]);
    expect(first.acceptance).toEqual(['AC-1: The scoped file is created.']);
    expect(first.expected_tests).toEqual(['Run the focused acceptance check.']);
  });

  test('rejects changed accepted bytes and missing substantive research artifact', () => {
    const input = admitted();
    expect(() => buildAdmittedDevelopmentPacket({ ...input, acceptanceBytes: Buffer.from('{}') })).toThrow(
      /scope or acceptance bytes differ/,
    );
    const research = admitted('implementation_change');
    expect(() => buildAdmittedDevelopmentPacket(research)).toThrow(/typed research artifact/);
    const researchStage = config.workflows.implementation_change.stages.find((stage) =>
      stage.produces.includes('ResearchResult/v1'),
    );
    const researchState = {
      ...research.ledger.state,
      completed: [
        {
          step_id: researchStage.id,
          items: [
            {
              request: {
                stage_id: researchStage.id,
                workflow_id: 'implementation_change',
                scope_digest: research.host.work.binding.work_source_revision,
                config_digest: research.host.work.binding.config_digest,
                action_id: 'research-action',
              },
              issue_id: 'research-issue',
              observation: {
                issue_id: 'research-issue',
                action_id: 'research-action',
                status: 'reported_complete',
                evidence_refs: [`artifact://research/foreign-result/${'a'.repeat(64)}`],
              },
            },
          ],
        },
      ],
    };
    const foreign = {
      ...research,
      ledger: {
        version: { revision: 2, digest: canonicalJsonDigest(researchState) },
        state: researchState,
      },
    };
    expect(() => buildAdmittedDevelopmentPacket(foreign)).toThrow(/canonical normalization reservation/);
  });

  test('accepts the observed sanctioned write and keeps identity after later validator reports', () => {
    const input = admitted();
    writeFileSync(path.join(root, input.target), 'export const created = true;');
    const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), input.allowedPaths);
    const state = { ...input.ledger.state, source_scope: source };
    const afterWrite = {
      ...input,
      ledger: {
        version: { revision: 2, digest: canonicalJsonDigest(state) },
        state,
      },
    };
    const packet = buildAdmittedDevelopmentPacket(afterWrite);
    expect(packet.source_revision).toBe(input.host.work.binding.work_source_revision);
    expect(packet.code_evidence_refs).toEqual([input.target]);
    const validatorState = {
      ...state,
      completed: [
        {
          step_id: 'validate_parallel',
          items: [
            {
              request: { stage_id: 'validate', action_id: 'validator-action' },
              issue_id: 'validator-issue',
              observation: { status: 'reported_complete' },
            },
          ],
        },
      ],
    };
    const later = {
      ...afterWrite,
      ledger: {
        version: { revision: 3, digest: canonicalJsonDigest(validatorState) },
        state: validatorState,
      },
    };
    const repeated = buildAdmittedDevelopmentPacket(later);
    expect(repeated.packet_id).toBe(packet.packet_id);
    expect(repeated.digest).toBe(packet.digest);
  });
});
