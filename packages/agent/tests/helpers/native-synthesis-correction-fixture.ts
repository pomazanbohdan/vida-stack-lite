import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { canonicalJsonDigest, isPlainRecord } from '../../src/contracts/public-ingress.ts';
import { validateAcceptanceManifestSchema } from '../../src/contracts/acceptance-manifest-schema.ts';
import { issueObservedResearchActivation } from '../../src/orchestration/observed-research-activation.ts';
import { currentObservedResearchBinding } from '../../src/orchestration/observed-research-binding.ts';
import { buildObservedResearchResult } from '../../src/orchestration/observed-research-result.ts';
import { commitObservedResearchArtifact } from '../../src/orchestration/observed-research-artifact.ts';
import {
  admittedResearchResultsForSynthesis,
  buildObservedSynthesisResult,
  synthesisSourceCatalog,
} from '../../src/orchestration/observed-synthesis-result.ts';
import { prepareObservedResearchRecord, recordObservedResearchResultAsync } from '../../src/research-decision.ts';
import type { SessionBridgeObservation, SessionBridgeRequest } from '../../src/orchestration/mastra-session-bridge.ts';
import {
  currentJournal,
  hostStore,
  hostLedger,
  hostBridge,
  type InitialWorkFixture,
} from './initial-source-work-fixture.ts';

function observed(
  request: SessionBridgeRequest,
  issueId: string,
  output: unknown,
  evidenceRefs: readonly string[],
  toolCallRef?: string,
): SessionBridgeObservation {
  const summary = JSON.stringify(output);
  return {
    schema: 'VidaSessionObservation/v1',
    action_id: request.action_id,
    issue_id: issueId,
    agent_id: 'fixture:' + request.role,
    tool_call_ref: toolCallRef ?? 'fixture:' + request.stage_id,
    status: 'reported_complete',
    summary,
    output_digest: canonicalJsonDigest(summary),
    evidence_refs: [...evidenceRefs],
  };
}

/** Actual local research lineage and an activated, unnormalized synthesis report.
 * Agent report contents are controlled unit inputs; no external research is claimed.
 * The caller owns this fresh fixture and every cleanup/timeout disposition.
 */
export async function prepareNativeUnnormalizedSynthesis(
  f: InitialWorkFixture,
  { stopBeforeSynthesisReport = false }: { readonly stopBeforeSynthesisReport?: boolean } = {},
) {
  const store = hostStore(f);
  const ledger = hostLedger(f);
  const admission = f.input;
  const owner = store.readHostStateSnapshot(f.identity).work;
  if (!admission || !owner) throw new Error('Native synthesis fixture requires actual admission');
  const acceptanceBytes = readFileSync(path.join(f.root, owner.contracts.acceptance.path));
  const scopeBytes = readFileSync(path.join(f.root, owner.contracts.scope.path));
  const acceptance: unknown = JSON.parse(acceptanceBytes.toString('utf8'));
  if (
    !validateAcceptanceManifestSchema(acceptance) ||
    !isPlainRecord(acceptance) ||
    !Array.isArray(acceptance.contracts)
  )
    throw new Error('Native synthesis fixture accepted manifest is invalid');
  const contract: unknown = acceptance.contracts[0];
  if (
    !isPlainRecord(contract) ||
    typeof contract.id !== 'string' ||
    typeof contract.sr !== 'string' ||
    typeof contract.definition !== 'string'
  )
    throw new Error('Native synthesis fixture requires its source-backed accepted criterion');
  const question = 'What criterion does the accepted manifest require?';
  const completeness = {
    status: 'pass',
    required_questions: [question],
    answered_questions: [question],
    missing_questions: [],
    material_gaps: [],
    external_validation: {
      required: false,
      source_count: 0,
      minimum_sources: 0,
      status: 'not_required',
      live_check: null,
    },
  };
  const issued = ledger.issueWave(f.identity.work_id, 1, currentJournal(f).version);
  const researchItems = issued.state.items;
  if (
    (researchItems.length !== 1 && researchItems.length !== 2) ||
    researchItems.some((item) => !item.issue_id || item.request.stage_id !== 'research_parallel')
  )
    throw new Error('Native synthesis fixture requires its configured research wave');
  const activations = new Map<string, Awaited<ReturnType<typeof issueObservedResearchActivation>>['use']>();
  let journal = issued;
  for (const research of researchItems) {
    const activated = await issueObservedResearchActivation({
      repositoryRoot: f.root,
      config: f.config,
      ledger,
      identity: f.identity,
      journal,
      actionId: research.request.action_id,
    });
    activations.set(research.request.action_id, activated.use);
    journal = activated.journal;
  }
  journal = ledger.markResearchWaveExposurePossible(f.identity.work_id, 1, journal.version);
  const reports = [];
  const producedResults: ReturnType<typeof buildObservedResearchResult>[] = [];
  for (const [index, research] of researchItems.entries()) {
    const sourceId = researchItems.length === 1 ? 'accepted-contract' : `accepted-contract-${index + 1}`;
    const report = observed(
      research.request,
      research.issue_id!,
      {
        schema: 'VidaResearchObservationOutput/v1',
        topic:
          researchItems.length === 1
            ? 'Initial source acceptance evidence'
            : 'Initial source acceptance evidence: ' + research.request.role,
        objective: 'Trace the admitted criterion to its actual manifest.',
        question,
        source_refs: [
          {
            source_id: sourceId,
            source_kind: 'internal',
            locator: owner.contracts.acceptance.path,
            title: 'Admitted acceptance manifest',
            version_or_date: null,
            claim: `${contract.id} ${contract.sr}: ${contract.definition}`,
            retrieved_at: new Date().toISOString(),
            independence_group: null,
            digest: createHash('sha256').update(acceptanceBytes).digest('hex'),
          },
        ],
        findings: [
          {
            finding_id: 'accepted-criterion',
            statement: contract.definition,
            source_ids: [sourceId],
            evidence_class: 'Static',
            status: 'confirmed',
          },
        ],
        uncertainties: [],
        conflicts: [],
        evidence_classes: ['Static'],
        br_ids: [],
        sr_ids: [contract.sr],
        ac_ids: owner.binding.ac_ids,
        gap_ids: [],
        options: [
          {
            option_id: 'retain-criterion',
            label: 'Retain criterion',
            description: 'Preserve the admitted criterion.',
            evidence_refs: [sourceId],
          },
        ],
        recommendation: {
          option_id: 'retain-criterion',
          rationale: 'Use the actual accepted manifest.',
          evidence_refs: [sourceId],
        },
        completeness,
        readiness: 'informational',
      },
      [sourceId],
      researchItems.length === 1 ? undefined : 'fixture:' + research.request.action_id,
    );
    journal = ledger.report(f.identity.work_id, 1, journal.version, report, f.originalSource);
    const reportedWork = store.readHostStateSnapshot(f.identity).work;
    if (!reportedWork) throw new Error('Native research owner disappeared after its report');
    const bindingInput = {
      repositoryRoot: f.root,
      ledger,
      identity: f.identity,
      workId: f.identity.work_id,
      attempt: 1,
      actionId: research.request.action_id,
    };
    const readCurrent = () => currentObservedResearchBinding(bindingInput);
    const binding = readCurrent();
    const activationUse = activations.get(research.request.action_id);
    if (!activationUse) throw new Error('Native research activation disappeared');
    const result = buildObservedResearchResult({
      config: f.config,
      observation: report,
      request: research.request,
      issueId: research.issue_id!,
      activationUse,
      work: reportedWork,
      scopeBytes,
      acceptanceBytes,
      workItem: admission.workItem,
    });
    const plan = await prepareObservedResearchRecord({
      root: f.root,
      result,
      observation: report,
      binding,
      host_state: store,
      readCurrent,
    });
    journal = ledger.reserveResearchNormalization(
      f.identity.work_id,
      1,
      journal.version,
      research.request.action_id,
      plan,
    );
    await recordObservedResearchResultAsync({
      root: f.root,
      result,
      observation: report,
      binding,
      host_state: store,
      readCurrent,
      plan,
    });
    await commitObservedResearchArtifact({ ...bindingInput, result });
    producedResults.push(result);
    reports.push(report);
  }
  if (new Set(reports.map((report) => report.action_id)).size !== researchItems.length)
    throw new Error('Native synthesis fixture research observations do not cover distinct issued actions');
  const step = journal.state.step_id;
  if (!step) throw new Error('Native research wave lost its engine step');
  await hostBridge(f).resume(step, reports, f.originalSource);
  const synthesisIssue = ledger.issueWave(f.identity.work_id, 1, currentJournal(f).version);
  const synthesis = synthesisIssue.state.items[0];
  if (
    synthesisIssue.state.items.length !== 1 ||
    !synthesis?.issue_id ||
    synthesis.request.stage_id !== 'synthesize_task'
  )
    throw new Error('Native synthesis fixture did not advance to synthesis');
  const synthesisActivation = await issueObservedResearchActivation({
    repositoryRoot: f.root,
    config: f.config,
    ledger,
    identity: f.identity,
    journal: synthesisIssue,
    actionId: synthesis.request.action_id,
  });
  journal = ledger.markResearchWaveExposurePossible(f.identity.work_id, 1, synthesisActivation.journal.version);
  const work = store.readHostStateSnapshot(f.identity).work;
  if (!work) throw new Error('Native synthesis owner disappeared');
  const predecessors = admittedResearchResultsForSynthesis({
    repositoryRoot: f.root,
    config: f.config,
    journal,
    work,
    workflowId: 'task_execution',
  });
  const catalog = synthesisSourceCatalog(predecessors);
  const key = catalog.sources[0]?.key;
  if (
    predecessors.length !== researchItems.length ||
    new Set(predecessors.map((result) => result.result_id)).size !== researchItems.length ||
    new Set(predecessors.map((result) => result.digest)).size !== researchItems.length ||
    predecessors.some(
      (result) =>
        !producedResults.some(
          (produced) => produced.result_id === result.result_id && produced.digest === result.digest,
        ),
    ) ||
    catalog.sources.length === 0 ||
    !key
  )
    throw new Error('Native synthesis predecessors differ from the actual admitted research results');
  const synthesisReport = observed(
    synthesis.request,
    synthesis.issue_id,
    {
      schema: 'VidaSynthesisObservationOutput/v1',
      topic: 'Initial source acceptance synthesis',
      findings: [
        {
          finding_id: 'criterion-summary',
          statement: contract.definition,
          source_refs: [key],
          evidence_class: 'Static',
          status: 'confirmed',
        },
      ],
      uncertainties: [],
      conflicts: [],
      br_ids: [],
      sr_ids: [contract.sr],
      ac_ids: work.binding.ac_ids,
      gap_ids: [],
      options: [
        {
          option_id: 'retain-criterion',
          label: 'Retain criterion',
          description: 'Preserve the admitted criterion.',
          evidence_refs: [key],
        },
      ],
      recommendation: {
        option_id: 'retain-criterion',
        rationale: 'Use the actual admitted predecessor.',
        evidence_refs: [key],
      },
      completeness,
      readiness: 'informational',
    },
    [key],
  );
  const validatedSynthesis = buildObservedSynthesisResult({
    config: f.config,
    observation: synthesisReport,
    request: synthesis.request,
    issueId: synthesis.issue_id,
    activationUse: synthesisActivation.use,
    work,
    scopeBytes,
    acceptanceBytes,
    workItem: admission.workItem,
    researchResults: predecessors,
  });
  if (!stopBeforeSynthesisReport)
    journal = ledger.report(f.identity.work_id, 1, journal.version, synthesisReport, f.originalSource);
  const originalItem = journal.state.items.find((item) => item.request.action_id === synthesis.request.action_id);
  if (
    !originalItem?.research_activation ||
    originalItem.research_normalization ||
    originalItem.host_reservation ||
    (stopBeforeSynthesisReport
      ? originalItem.observation !== null
      : originalItem.observation?.status !== 'reported_complete')
  )
    throw new Error('Native synthesis correction preimage does not match the actual synthesis journal state');
  return {
    journal,
    originalItem,
    catalog,
    predecessor: predecessors[0]!,
    predecessors,
    synthesisReport,
    validatedSynthesis,
  };
}
