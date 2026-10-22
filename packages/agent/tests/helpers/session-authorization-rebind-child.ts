import { readFileSync } from 'node:fs';
import { canonicalJsonDigest, isPlainRecord } from '../../src/contracts/public-ingress.ts';
import {
  HostStateStore,
  openHostStateDatabase,
  type RuntimeCodeRebindRequest,
  type RuntimeCodeRebindVerifier,
} from '../../src/host-state.ts';
import { loadRuntimeConfig, runtimePackageAccess, runtimePackageCodePaths } from '../../src/config/runtime-config.ts';
import { sessionHandoffDatabaseRelativePath } from '../../src/config/project-paths.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../../src/config/storage-read-admission.ts';
import { completeOwnedCleanup } from '../../tooling/owned-cleanup-completion.ts';
import { deriveWorkspaceId } from '../../src/workspace-identity.ts';
import { isCurrentLocalSourceAuthorizationReference } from '../../src/orchestration/local-source-authorization-reference.ts';
import { snapshotRuntimePackageSources } from '../../src/orchestration/scoped-source-snapshot.ts';
import { parseRuntimeCodeRebindRequest } from '../../src/orchestration/runtime-code-rebind-contract.ts';

interface ChildInput {
  readonly repositoryRoot: string;
  readonly request: RuntimeCodeRebindRequest;
}

function parseChildInput(value: unknown): ChildInput {
  if (
    !isPlainRecord(value) ||
    Object.keys(value).length !== 2 ||
    typeof value.repositoryRoot !== 'string' ||
    value.repositoryRoot.length === 0
  )
    throw new Error('session authorization rebind child input is not a repository/request record');
  return { repositoryRoot: value.repositoryRoot, request: parseRuntimeCodeRebindRequest(value.request) };
}

function requireRecordVersion(value: unknown, label: string): void {
  if (
    !isPlainRecord(value) ||
    !Number.isSafeInteger(value.revision) ||
    typeof value.digest !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(value.digest)
  )
    throw new Error(`session authorization rebind child ${label} is malformed`);
}

/** Complete only the real Host rebind; its injected verifier is Host consistency input. */
export async function runSessionAuthorizationRebindChild(inputPath: string): Promise<void> {
  const inputValue: unknown = JSON.parse(readFileSync(inputPath, 'utf8'));
  const input = parseChildInput(inputValue);
  const config = loadRuntimeConfig(input.repositoryRoot);
  const currentCode = snapshotRuntimePackageSources(
    runtimePackageAccess(),
    config.runtime.bundle,
    runtimePackageCodePaths(config.runtime.bundle),
  );
  if (currentCode.digest !== input.request.newRuntimeCodeDigest)
    throw new Error('session authorization rebind child current package snapshot differs');
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, input.repositoryRoot);
  const principal = 'fixture:session-authorization-count-host-consistency';
  const verifier: RuntimeCodeRebindVerifier = {
    principal,
    verify: (request) => {
      if (canonicalJsonDigest(request) !== canonicalJsonDigest(input.request))
        throw new Error('session authorization rebind child verifier request differs');
      return {
        schema: 'VidaRuntimeCodeRebindAuthorization/v1',
        request_digest: canonicalJsonDigest(request),
        principal,
        forward_operation_id: request.forwardOperationId,
        parent_manifest_digest: request.parentManifestDigest,
        successor_manifest_digest: request.successorManifestDigest,
        owner_no_call_pointer: request.ownerNoCallPointer!,
      };
    },
  };
  const database = openHostStateDatabase(input.repositoryRoot, sessionHandoffDatabaseRelativePath(config), workspaceId);
  let failure: { readonly error: unknown } | undefined;
  let result:
    | {
        readonly authCount: number;
        readonly workVersion: unknown;
        readonly ledgerVersion: unknown;
        readonly journalVersion: unknown;
        readonly runtimeCodeDigest: string;
        readonly receiptDigest: string;
        readonly retiredExecutionApprovalIds: string[];
      }
    | undefined;
  try {
    const store = new HostStateStore(
      database,
      workspaceId,
      undefined,
      undefined,
      undefined,
      undefined,
      input.repositoryRoot,
      verifier,
    );
    await store.rebindRuntimeCode(input.request);
    const after = store.readHostStateSnapshot(input.request.identity);
    const journal = store.readWorkSessionJournal(input.request.identity);
    if (!after.work || !journal) throw new Error('session authorization rebind child afterimage is incomplete');
    const authCount = after.work.lifecycle.references.filter(isCurrentLocalSourceAuthorizationReference).length;
    if (authCount !== 0) throw new Error('session authorization rebind child did not retire the current authorization');
    if (
      journal.version.revision !== input.request.expectedJournal.revision ||
      journal.version.digest !== input.request.expectedJournal.digest
    )
      throw new Error('session authorization rebind child changed the Journal');
    const receiptRow = database
      .query<{ payload: string; digest: string }, [string, string, number, string]>(
        'SELECT payload,digest FROM agent_host_runtime_code_rebind WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
      )
      .get(workspaceId, input.request.identity.work_id, input.request.attempt, input.request.actionId);
    if (!receiptRow) throw new Error('session authorization rebind child receipt is missing');
    const receiptValue: unknown = JSON.parse(receiptRow.payload);
    if (canonicalJsonDigest(receiptValue) !== receiptRow.digest)
      throw new Error('session authorization rebind child receipt is invalid');
    if (!isPlainRecord(receiptValue))
      throw new Error('session authorization rebind child receipt payload is not a record');
    const receipt = receiptValue;
    const retiredExecutionApprovalIds = receipt.retired_execution_approval_ids;
    if (
      !Array.isArray(retiredExecutionApprovalIds) ||
      !retiredExecutionApprovalIds.every((id: unknown) => typeof id === 'string')
    )
      throw new Error('session authorization rebind child retired approval IDs are malformed');
    if (canonicalJsonDigest(receipt.request) !== canonicalJsonDigest(input.request))
      throw new Error('session authorization rebind child receipt request differs');
    requireRecordVersion(receipt.prior_work_version, 'receipt prior work version');
    requireRecordVersion(receipt.journal_version, 'receipt journal version');
    if (
      receipt.schema !== 'VidaRuntimeCodeRebindAuthorization/v1' ||
      receipt.new_runtime_code_digest !== input.request.newRuntimeCodeDigest
    )
      throw new Error('session authorization rebind child receipt fields differ from the request');
    result = {
      authCount,
      workVersion: after.workVersion,
      ledgerVersion: after.ledgerVersion,
      journalVersion: journal.version,
      runtimeCodeDigest: after.work.binding.runtime_code_digest,
      receiptDigest: receiptRow.digest,
      retiredExecutionApprovalIds,
    };
  } catch (error) {
    failure = { error };
  }
  completeOwnedCleanup(
    [
      () => {
        closeWorkspaceDatabaseWithAdmission(database);
        return undefined;
      },
    ],
    failure,
  );
  if (failure) throw failure.error;
  if (!result) throw new Error('session authorization rebind child completed without a result record');
  process.stdout.write(JSON.stringify({ marker: 'SESSION_AUTHORIZATION_REBIND_DONE', result }) + '\n');
}

if (import.meta.main) {
  const inputPath = Bun.argv[2];
  if (!inputPath) throw new Error('session authorization rebind child input path is required');
  await runSessionAuthorizationRebindChild(inputPath);
}
