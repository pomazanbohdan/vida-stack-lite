# Development lifecycle (canonical owner)

Routes: R0 is read-only and creates neither implementation nor delivery state.
Every tracked R1–R4 mutation uses this assurance cycle. Ponytail is `full` for
executor/debugger, `lite` for implementation planning, and `off` for
requirements, research, reviews, security, verification and reconciliation.
The host records one compact `PonytailPolicyDecision/v1` for each
code-producing dispatch after trusted managed stack/version/skill-hash
validation. The decision is cached by capability epoch and does not contain a
skill dump or prompt. Protocol v4 requires the typed binding before mutation;
v2/v3 remain readable and use typed backfill. No global Ponytail hook is active,
and independent reviewers plus the blind architect always receive `off`.
Agent topology follows `agent-allocation.md`: the current session is the
default writer/orchestrator, logical perspectives stay internal, and only
bounded specialists, disjoint workers or mandatory independent assurance use
separate agents.

## Platform knowledge context and documentation-skill gate

Each new implementation cycle, first correction after review, and every
post-delivery feedback correction records one immutable
`PlatformKnowledgeContext/v1` through `recordPlatformKnowledgeContext`. The
context binds the work, cycle, source revision, scope and BR/SR/AC pointers to
compact official Academy references, local authoritative sources and the exact
skill IDs/hashes used by the role. It stores hashes and pointers, never full
documentation or skill prompts. An unchanged snapshot is reused by capability
epoch; a source change, new lease or new correction cycle requires a new
context.

If an older runtime sealed a VERIFY checkpoint while clearing this context,
do not edit the checkpoint or create a fallback file. Use the typed
`restorePlatformKnowledgeContext` operation with the exact context ID and
digest from `platform_knowledge_context_history`. It performs one lock/CAS
revision, preserves the sealed fingerprint and VERIFY state, and records
`PlatformKnowledgeContextRecovery/v1`; it is valid only when history, source
revision and scope all match.

When the context is marked required, `execute:pre` fails closed without its
current binding. Before freezing an exact-three review packet, the host records
`DocumentationSkillValidation/v1` with Ponytail off. This is a separate
documentation/skill validator, not a fourth reviewer: it checks official
platform behavior, applicable skills and unsupported patterns, and returns
`pass`, `warning` or `changes_required`. A warning is visible evidence and does
not authorize Runtime acceptance; `changes_required` routes to a bounded
correction or a skill-maintenance proposal. Platform documentation controls
platform mechanics, but a conflict with business BR/SR/AC remains an explicit
question/GAP rather than a silent requirement rewrite.

Automatic skill updates are deterministic only. A rule without an unambiguous
skill mapping and source-example, held-out, negative-transfer, regression and
marketplace evidence creates `SkillChangeProposal/v1` and does not patch a
skill. Generated marketplace copies are never edited by hand.

## Change-impact preflight and post-check

Before a new implementation cycle enters `EXECUTE`, record one
`ChangeImpactAssessment/v1` in phase `pre` with
`recordChangeImpactAssessment/v1` (or `recordChangeImpact/v1`). The assessment
is a compact, immutable description of direct/transitive impact edges,
contract/behaviour/security flags, changed paths and the required regression
profile. `unknown_dependency`, dirty overlap, public contracts, security,
migration, destructive and other high-risk flags require the `full` profile;
the runtime does not infer a narrower profile from a partial graph.

After implementation and focused checks, record phase `post` with
`recordChangeImpactPost/v1` and the current implementation fingerprint. The
post assessment must bind the same work/cycle/scope and may only be `pass` or
`warning` with all edge classifications verified. `execute:pre`,
`execute:post`, `sealMutation`, `freezeReviewPacket` and delivery validate this
single binding. The compact impact summary is projected into the scope snapshot,
review preflight/batch and packet; full dependency graphs and source text stay
in attributable evidence files.

If a correction or feedback cycle starts, the active assessment is moved to
`change_impact_history`; it is not reused as authority. The next cycle records
a fresh pre assessment. The universal checkpoint upgrader may mark an
unsealed TRACE/PLAN checkpoint as `change_impact_required` and report the exact
typed operation, but it never fabricates impact evidence or edits sealed
VERIFY/DELIVERY/COMPLETE checkpoints. This gate is a regression-routing aid,
not a replacement for exact-three reviews, reverse validation or Runtime
acceptance.

## State transitions and gate invariants

The only lifecycle transitions are `INTAKE → TRACE → PLAN → EXECUTE → VERIFY
→ DELIVERY → COMPLETE`; a checkpoint revision changes atomically and cannot
skip a state. `plan:post` requires source plan, acceptance and test plan.
`execute:pre` requires `PLAN`; `execute:post` requires `EXECUTE` and refreshes
the one implementation fingerprint, invalidating reviews, reverse validation
and delivery/runtime receipts. `verify:pre` requires exactly three clean
ReviewReceipt/v2 records with the fixed lenses, distinct identities,
history isolation, and one packet ID/version and fingerprint. Before dispatch,
 protocol v3/v4 atomically records one `ReviewDispatchReservation/v1` for exactly
three fresh unique platform handle IDs and their lens/task/dispatch/reviewer
identities. Partial, cancelled, duplicate, stale or mismatched reservations
create no authority. The root orchestrator then issues a separate
`DispatchProfileAttestationSet/v1` whose identities exactly match the current
 reservation. Protocol v2 remains compatible without this reservation.
 Protocol v4 also requires `ProjectContext/v1`, a registry-bound ledger/Wiki
 scope, the exact coordination thread, and `tenant:*`/`project:*` contour keys.
 Backlog status is only a projection; provider failure records
 `GAP-BACKLOG-SYNC-001` without authorizing or undoing lifecycle state. The
portable runtime cannot release a platform-owned handle; absent platform
release remains `GAP-AGENT-HANDLE-RELEASE-001` and never weakens this gate.
Before any dispatch, the host adapter must create one immutable
`ReviewPreflight/v1` containing packet identity, source/sealed revisions,
fingerprint, exact source/document hashes, dirty-overlap result, lease,
capability epoch, profile and reviewer-slot availability. A failed or stale
preflight starts no reviewer. `dispatchReviewBatch` delegates the atomic
runtime reservation and host spawning; `waitReviewBatch` returns only compact
completed/running/blocked/cancelled counts. Portable runtime validates typed
receipts and never calls Codex spawn/wait directly or fabricates handle release.
The same snapshot is passed to every reviewer, so reviewers do not re-hash the
repository or read implementation history.
The preflight also carries one derived `RuntimeAssuranceContext/v1` identity;
status-only refreshes use `RuntimeStatusDelta/v1` against that identity, so a
consumer can refresh the next action without rereading or revalidating the
immutable packet, hashes or review scope. These records are derived status
evidence and never authority.
The Ponytail decision is attached to the host execution summary, not to the
reviewer prompt; review batching therefore reuses the same preflight/cache and
does not add spawn, wait, hash or validation passes.
When a host supplies `createPreflightCache()`, reuse is allowed only for the
full packet/source/document/profile/lease/capability key. The cached receipt is
revalidated before use, so an expired lease or changed fingerprint remains
fail-closed. The host may include compact operation/byte/profile telemetry in
`executionSummary`; token telemetry is shown only when the host actually
provides it.
The bundled host verifier uses bounded concurrency, explicit serial barriers and
per-check timeouts; full logs stay in derived artifacts while only compact,
redacted previews reach the orchestrator. Summary mode skips log/evidence
aggregation entirely; evidence/full modes opt into bounded previews. A loaded
bundle manifest is normalized and deeply frozen once, then reused by the host
runner; deserialized or untrusted manifests still take the complete validation
path. Runtime-owned documentation is a runtime-contract change, not a docs-only
shortcut. Internal gate continuity is evaluated once per gate pass and reused
by the full verification subchecks; direct public validation operations still
perform their own complete validation.
Every attestation entry must have `profile_verified=true` plus an
attributable verification source/pointer/timestamp and verified model/reasoning
that exactly match the packet's required profile. Missing, false, stale or
mismatched evidence blocks the gate. A review receipt binds one verified entry;
it never embeds an attestation or claims observed runtime-model metadata.
`verify:post` requires the three typed reverse-validation records
and runs evidence truth validation. `ship:pre` requires those clean reviews,
reverse validation, a complete attributable DeliveryReceipt/v2 and explicit
RuntimeReceipt/v2 disposition; `not_required` is valid only when non-blocking.
Every DeliveryReceipt/v2 decision embeds a closed DeploymentManifest/v1 bound
to the current work/source/seal/fingerprint/acceptance manifest/delivery cycle.
Created and modified repository files are unique, non-overlapping and fully
classified into ordered deployment payload or `do_not_deploy`; post-deployment
checks bind to active ACs. For a blocking RuntimeReceipt, every referenced AC
must be covered by the union of current bound closing Runtime Evidence.
`ship:post` requires `COMPLETE`. Any correction starts a new revision and
invalidates downstream receipts.

1. **BOOT / INTAKE / TRACE.** Load source map, authority and B→S→AC trace;
   read native Graphify freshness and use a fresh graph only as derived impact
   context, with direct-source fallback when absent or stale;
   freeze risk, paths, baseline and source-plan revision. For defects,
   runtime mismatch or unattributed cause, collect a read-only diagnostics
   packet first. A temporary probe requires explicit bounded approval and later
   cleanup/retention decision. New features do tests-first and an observability
   plan; documentation-only changes do contract/link/dedup validation.
2. **PLAN / approval.** Create a frozen work order. Stale approval, changed
   sources, paths or acceptance invalidate it.
3. **EXECUTE current implementation.** Implement the smallest lawful
   root-cause change, then run focused and broader planned tests. Seal one
   current implementation fingerprint.

   In the shared worktree, an execute scope can own some exact files while
   other files are FIFO-queued. The agent may analyze and mutate only active
   claimed resources. It cannot seal, review or hand off until every declared
   resource is current; a typed handoff/adopt/read-only/recover-expired
   disposition is recorded in the coordination ledger rather than inferred.
   If a lease expires, `claimCoordinationResources` retires the overlapping
   same-ticket predecessor before accepting a fresh claim. For an explicit
   recovery, use `recoverCoordinationClaim` with an attributable actor and
   decision pointer, then reclaim the resources. Expired predecessors never
   shadow a current claim during continuity or seal validation.

   If an unsealed PLAN/EXECUTE checkpoint has a stale or missing coordination
   ticket, or an accepted cross-scope correction adds files, use the typed
   `rebindCoordinationScope` operation. It atomically extends the current
    ticket or creates a new ticket. For a same-work, same-thread ticket whose
    source revision is historical, it advances that ticket to the current
    checkpoint source and records the previous source in
    `CoordinationScopeRebind/v1`. It recovers only expired overlapping claims
    and returns the exact resources still
   requiring a normal FIFO claim. A live overlap, stale revision, replay, or
   frozen contour remains fail-closed; do not edit the checkpoint or ledger.

   A test-discovered defect is not a report-only stop. The implementation lane
   automatically preserves a public-boundary regression, classifies the
   finding, applies one smallest shared root-cause fix inside the frozen
   BR/SR/AC and ownership scope, and reruns the focused check plus affected
   contracts before returning to VERIFY. If the fix would change requirements,
   public contract, risk, delivery authority, another workstream's files or
   checkpoint/ledger history, it records a typed GAP and routes the normal
   triage/architect/clarification path instead. Coverage or CRAP findings are
   handled the same way: add a meaningful counterexample, fix any defect it
   reveals, and never lower thresholds or hide code. One coherent fix is the
   stopping point; repeated corrections use the bounded correction and scope
   recovery cadence below rather than an unbounded self-check loop.
4. **First blind review set.** `exact-three` is the default and exactly three
   single-use, history-isolated
   reviewers get the same frozen packet and current implementation, never
   implementation chat or each other's
   findings. Fixed lenses are (a) correctness/regression/doc alignment,
   (b) edge/failure/security/data, and (c) BR/SR/AC/test adequacy/evidence
   truthfulness. Each emits `ReviewReceipt/v2`, bound to one packet ID/version
   and the one implementation fingerprint.
   An explicit `single-composite` mode is permitted only after positive
   preflight/policy authorization for low/medium-risk work with no public
   contract, Runtime GAP, dirty-overlap, migration, destructive,
   security/data-loss or operator/API/UID risk. The one composite receipt must
   contain independent `correctness`, `requirements` and `edge_security`
   sections. It never replaces the blind architect diagnostic or any mandatory
   exact-three gate.
   If the source revision or implementation fingerprint drifts after this
   packet has been reviewed but before correction authority is recorded, use
   the typed `refreezeReviewPacket` operation. It is allowed only for a
   reviewed `VERIFY` checkpoint with exactly three receipts, requires a new
   source revision and manifest binding, records `ReviewRefreeze/v1`,
   invalidates the stale packet/receipts/dispatch state, recomputes the
   fingerprint, and leaves the work in unreviewed `VERIFY`. The next action is
   a new packet and fresh exact-three reviews; no old finding or architect
   authority is carried across the refreeze.
 5. **Correction.** Deduplicate only findings proven against the current
    acceptance contract into one correction packet; mutation invalidates all
    downstream receipts. Before the first mutation, bind
    `ImplementationScope/v1` with the current AC IDs, allowed files, changed
    symbols, acceptance/behavior/test/diagnostic traces, attributable thread
    pointer and explicit non-goals. The scope digest is revalidated on every
    checkpoint read and `sealMutation` performs a
    deterministic scope audit: a declared path outside `allowed_paths` or
    outside the fingerprinted scope is a typed blocker. The seal also records
    one immutable `ScopeSnapshot/v1` containing implementation/documentation
    file hashes and absence assertions. It reads the scope twice across a
    bounded settle interval; a changed byte, membership or mode returns
    `GAP-SCOPE-MUTATING-001` instead of sealing a moving target. Repository
    `HEAD` is retained only as audit metadata, so unrelated commits do not
    invalidate the implementation fingerprint. Later gates use the compact
    `ScopeIntegrityReport/v1`: metadata-only or documentation-only changes are
    reported without reopening implementation assurance, while implementation
    drift and incomplete coordination ownership remain typed blockers. This
    prevents a review comment from silently expanding the task and avoids
    unnecessary re-review when only documentation or repository metadata moved.

    Review receipts do not directly authorize correction. After all three
    receipts, record one `ReviewSetTriage/v1` item for each finding disposition:
    `blocking_current_ac`, `critical_regression`, `new_requirement`,
    `follow_up`, `advisory` or `invalid_or_unproven`. Only the first two can
    start correction. A new requirement becomes a TRACE question or a separate
    task; follow-up/advisory items remain evidence and do not block delivery.
6. **Fresh blind review set and architecture diagnosis cadence.** Three new
   reviewers receive only the corrected current packet. They cannot see earlier
   findings or correction narrative. `correction_count` counts every correction;
   `review_failure_count` counts failed review generations and
   `review_failure_streak` counts failures since the last architecture
   diagnosis. After the second ordinary failed review cycle, the second bounded
   correction is completed and resealed. Before another three-review packet can
   be frozen, the runtime requires exactly one fresh history-isolated
   `gpt-5.6-sol`/`high` architect at assurance stage 4 through
   `ArchitectDiagnosticDispatch/v1`.

   If the assigned handle fails history isolation, receives forbidden
   implementation context, has the wrong verified profile, fails before a
   diagnosis, or is explicitly cancelled, the orchestrator records one bound
   `ArchitectDispatchDisqualification/v1` through the typed runtime operation.
   That atomic operation retires only the active dispatch, preserves all used
   identities in the ledger, and requires a new unique dispatch. The retired
   architect cannot submit a diagnosis and no checkpoint may be hand-edited to
   replace it.

   This architect is not a fourth reviewer and does not inspect source, diff,
   implementation history, prior review findings, correction history or agent
   conversation. The dispatch contains only current `BR:`/`SR:`/`AC:` pointers
   plus attributable `observation:`/`runtime:` pointers and attests that
   forbidden implementation context was omitted. `ArchitectureDiagnosis/v1`
   records either `defect_found` with a root-cause hypothesis and correction
   direction, or `no_architectural_defect_found`; it never records a review
   verdict. A diagnosed defect requires an architect-separated correction and
   reseal. Either outcome resets the failure streak but never replaces the next
    full set of three fresh blind reviews. Every next pair of failed cycles
    repeats the same diagnostic cadence. With `scope-triage/v1`, an assurance
    epoch permits at most two bounded corrections. After that, automatic
    correction stops and the runtime requires `CheckpointConvergencePlan/v1`
    through `enterScopeRecovery`. The recovery plan narrows the current scope,
    splits a follow-up, or creates a new task; it resets only epoch counters
    and preserves compact invalidated review/evidence identity history. Only
    one scope recovery is allowed per workstream; a second exhausted epoch is
    a typed follow-up-task stop rather than another automatic loop.

   Independently, a cross-scope finding, or a `persistent` typed finding in
   wave two or later, calls the early architect gate (Ponytail off). The
   default route is one fresh history-isolated blind architect dispatch from
   only current `BR:`/`SR:`/`AC:` pointers, observable behavior and
   `observation:`/`runtime:` evidence pointers. A current frozen review packet
   is an eligible input to this diagnostic; the runtime must not require a
   second failure streak or discard the packet before dispatch. The resulting
   `ArchitectureDiagnosis/v1` may authorize an architect-separated correction
   when it reports `defect_found`. An attributable `ArchitectDecision/v1`
   remains a compatible explicit route when an authorized architect decision is
   supplied externally, but the runtime never fabricates one from a diagnosis.
   The architect cannot be a current reviewer or the named implementer, and
   cannot approve the architect-directed correction. Legacy string findings
   remain valid but do not manufacture an escalation identity.
   Architect-directed mutation produces another corrected current version,
   tests and a fresh full three-review set. Neither architect mechanism can
   advance `DELIVERY`; only three clean current receipts and reverse validation
   can do that.
7. **Reverse validation.** Independently validate (1) B/S/AC trace and scope,
   (2) tests/diff/security/data/rollback, and (3) evidence classification,
   invalidation and receipts. A GSD provider review or an internal perspective
   slot never substitutes for any blind review receipt. When Graphify is active,
   include its current topology diff as supporting architecture-impact evidence
   without replacing source, diff or test review.
8. **Contour handoff, delivery/runtime.** After tests, the complete review set and reverse
   validation pass, advance to `DELIVERY` automatically and immediately present
   the current version. The delivery presentation contains a deployment
   manifest with separate `created` and `modified` files, the exact subset to
   deploy/import/copy to the target environment, destination and ordering when
   relevant, and an explicit `do_not_deploy` list for tests, documentation,
   work records and other repository-only artifacts. It also reports
   implemented behavior, fingerprint, test and review results, separate
   Development/Static/Runtime/GAP statuses, and exact post-deployment checks.
   This presentation is the delivery action; it does not require prior human
   permission, a copy-confirmation gate, or another workflow-selection prompt.
   When human runtime checking is needed, include exact test steps. Protocol v4
   first records the delivery presentation and projects `Awaiting Testing`;
   `UserTestingReceipt/v1` then records `started`, `accepted`, `feedback`, or
   `rejected`. Only current `accepted` permits v4 `COMPLETE`; feedback returns
   the affected work to `EXECUTE` and projects `Returned for Rework`. The agent
   must make the environment
   payload actionable without requiring the human to infer files from a diff.
   An attributable delivery or testing `feedback` or
   `rejected` receipt
   returns the work to `EXECUTE`, records its sanitized pointer and invalidates
   the old seal/reviews; it never authorizes commit or Runtime acceptance. On
   `approved`, record the post-presentation acceptance and commit is permitted
   at that boundary; push still requires a
   separate explicit command. Development and runtime are separate:
   `not_required`, `deferred`, `pending`, `accepted`, or `failed`. Runtime
   blocks full acceptance only for a blocking AC. A deferred failure creates a
   linked defect and keeps the parent development-complete.

   **Post-delivery feedback is a durable correction loop.** A `feedback` or
   `rejected` DeliveryReceipt/UserTestingReceipt is not itself a correction
   plan. The runtime preserves the receipt in `delivery_history` or
   `testing_history`, opens a `DeliveryFeedbackAnalysis/v1`, and records one
   next action: analyze the observation, affected ACs/files, evidence and
   proposed correction. `recordDeliveryFeedbackAnalysis` closes that analysis
   only after it is bound to the current work, source revision, delivery cycle
   and originating receipt. A clarification classification must create or
   reference a typed `QuestionCandidate/v1`; an open blocking question prevents
   correction until an attributable human answer is recorded. Only then may
   `beginCorrection` run. It increments monotonic `correction_count` and appends
   a `correction_history` record; it does not erase prior delivery/testing
    evidence. For an accepted `defect`/`rework` with `scope=local`, the runtime
    records `CorrectionAuthorization/v1` bound to the feedback receipt,
    affected AC/files and a fresh `PlatformKnowledgeContext/v1`; this bounded
    feedback route does not require pre-correction review triage. Persistent,
    cross-scope, high-risk, migration, destructive, security or public-contract
    work remains on the triage/architect route. The typed
    `recordCorrectionAuthorization` operation performs the context and
    authorization binding in one lock/CAS pass when the context is absent.
    When accepted delivery/testing feedback is explicitly `cross_scope` but
    remains bounded to the same AC set, use the related
    `recordCrossScopeCorrectionAuthorization/v1` operation. It atomically
    validates the accepted file union, expands the implementation scope,
    invalidates active assurance, records compact history and binds a fresh
    knowledge context. This is part of the same universal updater/lifecycle
    surface, not a fallback or a second migration tool;
    `upgradeActiveCheckpoints` remains the sole universal checkpoint converter.
    An accepted clarification still requires its attributable human answer.
    The correction invalidates only active downstream proof and starts
    a fresh review epoch: cumulative `correction_count` and historical
    `review_failure_count` are preserved, but `review_failure_streak` resets to
    zero at the delivery/testing feedback boundary. The new epoch then performs
    a fresh seal, packet, three blind reviewers, reverse validation and delivery
   cycle; it does not inherit the previous cycle's architect cadence. Architect
   escalation remains mandatory for typed persistent/cross-scope findings or
   two failures inside the new epoch; it is never replaced by the feedback
   summary.

   A legacy checkpoint may retain a raw delivery/testing feedback pointer even
   after that receipt was consumed by a completed correction. In that case,
   `reconcileConsumedFeedback/v1` retires the pointer in one CAS write and
   records only a compact `FeedbackReceiptConsumption/v1`; it never reuses the
   old receipt as new authority. If the scope-triage budget is exhausted after
   one recovery and an attributable user request is strictly bounded to the
    same ACs and files, `recordScopeFollowUpAuthorization/v1` opens a new
    assurance epoch with a new scope id. It rejects scope expansion and is not a
    second unbounded scope recovery. The operation accepts either a retired
    `VERIFY` boundary or the `EXECUTE` state produced by a typed
    `beginCorrection`/convergence transition when packet, receipts, triage,
    reverse validation, evidence and sealed markers are already retired. It
    does not insert an artificial `EXECUTE → VERIFY → EXECUTE` hop. Both
    operations require a fresh platform knowledge context before mutation.

   If a mandatory focused verification exposes a stale assertion outside an
   otherwise retired unsealed contour, use the permanent
   `recordVerificationScopeAmendment/v1` operation. It may add only a
   test/spec/check path, keeps the AC set unchanged, binds exact failed-check
   evidence and a fresh `PlatformKnowledgeContext/v1`, and records one
   `VerificationScopeAmendment/v1` history entry in the same checkpoint CAS.
   It does not accept product-path expansion, active assurance, feedback
   substitution or manual coordination edits; its next action is a typed
   coordination rebind.

   When several works share explicit B/S/AC/component/file contour keys, each
   verified work first enters `READY_FOR_HANDOFF`. A frozen contour assembles
   one release batch from the single live version, with a globally ordered
   mixture of copy/import/deploy operations and combined post-deployment
   checks. Individual works do not present competing deliveries. User feedback
   maps to affected work, invalidates that contour generation and starts the
   next live batch; no snapshot or worktree merge path exists.

`execute:post` is a typed atomic seal, rather than a read-only validation: it
recomputes the one fingerprint and clears all downstream receipts before the
legal `EXECUTE → VERIFY` transition. Other gate checks remain read-only.

Missing/corrupt/stale checkpoints, duplicate reviewer identities, mixed
fingerprints, unverified required profiles, or evidence-class substitution fail
the relevant gate closed.

## Revision and completion safety

Every mutation supplies `expectedRevision` and `sourceRevision`. `beginTrace`
is the only `INTAKE → TRACE` verb; `replanWork` accepts only `TRACE` or `PLAN`.
Risk is closed to `low`, `medium`, or `high`; migration and destructive work
is always `high`. A correction is a typed return
from `VERIFY` or `DELIVERY` to `EXECUTE`; it clears downstream evidence and
requires a fresh seal. `VERIFY`, `DELIVERY`, and `COMPLETE` require the sealed
fingerprint. `ship:post` repeats the full ship contract, so a direct completion
cannot bypass delivery, runtime, reviews, reverse validation, recovery, or
evidence checks. A required absence assertion fails when its target exists.

If an otherwise valid unsealed `TRACE`/`PLAN` checkpoint predates the current
acceptance-contract shape and its manifest is missing `contracts`, use the
typed `repairAcceptanceManifest` operation. It must preserve the manifest
identity and exact AC set, supply one complete `{id, definition, sr, evidence}`
entry per AC, bind to the current work/source revision, and record an audit
entry while incrementing the checkpoint revision. It is the only supported
repair for this narrow schema migration. If a protocol v3/v4 checkpoint in
the same unsealed `TRACE`/`PLAN` state is also missing its managed reservation
ledger property, that typed repair initializes the ledger to `[]` in the same
lock/CAS operation; a malformed present ledger or any active/sealed checkpoint
remains blocked. Do not edit `resume.json` manually or relax `assertCheckpoint`
for normal operations.

After a runtime schema or protocol release, run the universal active-checkpoint
upgrader before dispatching work. `upgradeActiveCheckpoints` (or the root
`agent-runtime:upgrade:checkpoints` command) first produces a read-only plan,
then `--apply` performs one locked CAS migration per active checkpoint: the
apply path reads, plans, validates and atomically replaces each file inside the
same lock rather than dry-scanning and rereading it. Legacy
`agent-development-runtime/v2.2.x` aliases are mapped to v2 unless existing
coordination proves v3 or complete tenant/project bindings prove v4. Current
canonical checkpoints are idempotent; `COMPLETE` checkpoints are immutable.
If a sealed `VERIFY` checkpoint has lost its active knowledge context but its
source/scope-matching compact history remains, the audit reports
`knowledge_context_recovery_available` and points to
`restorePlatformKnowledgeContext/v1`; even `--apply` leaves that checkpoint
unchanged because the upgrader cannot fabricate the immutable context payload.
Every applied conversion records `CheckpointProtocolMigration/v1`. Missing
project context, acceptance contracts, leases, review authority or malformed
state produces `GAP-CHECKPOINT-UPGRADE-001` and leaves that checkpoint
unchanged. The upgrader never invents authority and never rewrites product
source, scope, fingerprint or delivery evidence. On an unsealed `TRACE` or
`PLAN` checkpoint it may remove the mutable checkpoint's own `resume.json` from
`fingerprint_paths`, recording that normalization in migration history;
sealed/active execution scopes with that path remain a typed GAP and require
the explicit retag operation.

After every confirmed portable-runtime or host-runtime fix, create one
`RuntimeFixNotification/v1` and deliver the same compact immutable record to
each affected developer thread. Resolve recipients from active checkpoints;
never infer or fabricate a thread ID. The notification names changed runtime
paths, old/expected behavior, bounded validation, exact next typed operation
and evidence pointers, but contains no full logs or private reasoning. Missing
host delivery capability or a missing thread is the typed
`GAP-HOST-DEVELOPER-NOTIFICATION-001` and must remain visible; it is not a
reason to claim delivery or silently continue a developer on the old route.
The notification is derived evidence only and cannot authorize mutation,
correction, review, delivery or Runtime acceptance. See
`instructions/runtime-fix-notifications.md` for the command and message
contract.

Runtime defect handling is root-cause-first. Do not add a one-off fallback,
manual checkpoint/ledger edit, identity reuse or task-specific hotfix to make
one developer proceed. Correct the shared portable-runtime behavior and add a
public-boundary regression; when the defect is a schema/protocol mismatch,
extend the universal typed upgrader/converter and migrate all affected active
checkpoints with locked CAS. When the behavior spans several lifecycle states,
implement the complete compatible route and its fail-closed negative cases.
Diagnostic workarounds may be used only for bounded reproduction and must be
marked non-authoritative; they never close the defect or change delivery
authority.

## Typed mutation surface

The runtime exposes no generic checkpoint replacement operation. A caller uses
one named compare-and-swap verb for one lawful intent:
`replanWork`, `beginExecution`, `sealMutation`, `freezeReviewPacket`,
`recordReviewDispatchReservation`, `recordDispatchAttestationSet`, `recordReviewReceipt`,
`recordReverseValidationReceipt`, `recordRecoveryEvidence`, `recordEvidence`,
`recordImportAttribution`, `recordQuestionCandidate`, `recordHumanAnswer`,
`repairAcceptanceManifest`, `upgradeCheckpoint`, `upgradeActiveCheckpoints`,
`advanceToDelivery`, `recordDeliveryReceipt`, `recordDeliveryFeedbackAnalysis`, `recordCorrectionAuthorization`, `recordRuntimeReceipt`,
`recordScopeFollowUpAuthorization`, `reconcileConsumedFeedback`, `completeWork`, `recordArchitectDecision`, or `beginCorrection`. Each verb rereads under the checkpoint
lock, checks revision and source revision, validates its exact state/binding
set, writes atomically, and records precisely one next action. The one
implementation fingerprint freezes the implementation scope only; ordinary
revision tokens provide concurrency control elsewhere. Runtime-owned
`.agent/**` and derived `.planning/**` control state are excluded from that
fingerprint, even when an older checkpoint or broad glob lists them. A scope
that resolves only to control state is invalid.

For an already recorded feedback authorization, hosts may use
`beginAuthorizedCorrection` for bounded local feedback or
`beginCrossScopeCorrection` for a pre-authorized cross-scope union. These are
aliases over the shared correction CAS core, not replacement gates; replay,
stale knowledge, scope expansion and review/architect requirements remain
fail-closed.
