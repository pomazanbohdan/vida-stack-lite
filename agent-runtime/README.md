# Agent Development Runtime

Portable, repository-neutral development assurance for GSD orchestration and
Ponytail implementation lanes. `AGENTS.md` is the compact entry point; this
bundle owns detailed lifecycle, checkpoint schemas, capability and tools.

## Start and operate

From the repository root, install and preflight the capability with one
command:

```powershell
npm run agent-runtime:install
```

This resolves the current stack manifest, installs the repository capability,
renders all eight GSD lifecycle hook points and enables native Graphify. It
does not patch installed GSD/Ponytail files or create root-level GSD project
documents.

The current trusted managed release is `gsd-1.11.0_ponytail-4.9.0` (GSD Core
1.11.0, Ponytail 4.9.0, full profile). The previous release remains installed
as a rollback target but is not accepted by the v1.11 capability pin. The
repository-owned mapping of applicable v1.11 drift, scope and complexity
features is in
[`instructions/gsd-core-v1.11-integration.md`](instructions/gsd-core-v1.11-integration.md).
Native GSD performs those checks; the portable runtime remains the authority
for CAS, ownership, knowledge, review, Runtime and delivery gates.
The installer and launcher also enable the namespaced v1.11 workstream settings
for plan drift, schema drift, per-plan `agent_hint` routing and the advisory
complexity trigger. Native `verification.status` is queried once at a bound
phase/revision and reused only while that binding remains current. Automatic
advance flags stay disabled: GSD cannot invent authority, release handles, or
approve review, Runtime, human-testing or delivery decisions.

The release profile remains strict and reinstalls from the lockfile. For
repeated local runs, the opt-in cached variant fingerprints the tooling
manifest, Node/platform and required executables before reusing an install:

```powershell
npm run agent-runtime:verify:cached
```

This does not weaken the gate: a changed manifest, lockfile, runtime/platform
or missing executable forces a fresh `npm ci`; `agent-runtime:verify` always
performs the clean install.

The lower-level equivalent is:

```powershell
pwsh -NoProfile -File .\script\Install-AgentDevelopmentRuntime.ps1 -EnableGraphify
```

Use the launcher with a work ID for typed lifecycle operations:

```powershell
pwsh -NoProfile -File .\script\Invoke-AgentDevelopmentRuntime.ps1 `
  -WorkId <work-id> -Phase status

pwsh -NoProfile -File .\script\Invoke-AgentDevelopmentRuntime.ps1 `
  -WorkId <work-id> -Phase verify -Point pre `
  -ExpectedRevision <revision> -SourceRevision <source-revision>
```

The launcher resolves the current GSD stack rather than a pinned release path.
All `.planning/agent-flow/**` content is derived and namespaced by Workstream.
`.agent/work/**` is the durable audit record. A Backlog.md ledger is optional,
derived and never authorizes lifecycle transitions.

Implementation fingerprints exclude runtime-owned `.agent/**` and derived
`.planning/**` control state, including when an older checkpoint or broad glob
names those paths. Persisting reviews, reverse-validation receipts,
coordination state, or projections therefore cannot invalidate the sealed
implementation. A scope containing only runtime control state fails closed.

`sealMutation` records one immutable `ScopeSnapshot/v1` for the declared
implementation and documentation paths. The snapshot stores per-file hashes,
size/mode metadata, absence assertions and the repository `HEAD` only as audit
metadata; `HEAD` is not part of the implementation fingerprint. The seal uses
two bounded reads and returns `GAP-SCOPE-MUTATING-001` if bytes or scope
membership change between them. A later gate compares the current snapshot via
`ScopeIntegrityReport/v1`: unchanged, metadata-only and documentation-only
changes keep the current assurance set, while implementation drift, missing
evidence or incomplete coordination ownership remain typed blockers. The
read-only `inspectScopeIntegrity` API exposes this compact report without
including source text or full logs.

### Configured subtask routing

The main thread is the manager, not the default researcher. The checked-in
`agent-runtime/config/agent-profiles.v1.json` registry controls each bounded
role's enabled state, model, reasoning level, blind/independent policy, reuse
rule, assurance stage, context budget, and output schema. `agent-runtime/lib/agent-routing.cjs`
resolves these settings into `AgentRoutingDecision/v1` and a bounded
`AgentTaskContract/v1` for the host adapter.

The registry has exactly three reasoning levels: `high`, `xhigh`, and `max`.
Every research, mapping, planning, implementation, debugging, synthesis and
ordinary review role is `gpt-5.6-luna`; the only `gpt-5.6-sol` profile is the
optional blind architect at `high`, explicitly marked assurance stage 4. Luna
research and implementation occupy stages 1-2, and Luna plan/review/document
checks occupy stage 3. The architect is a fourth assurance contour only when a
policy trigger requires independent diagnosis; it is not a fourth review
receipt and does not replace the exact-three Luna reviews.

The resolver reuses an existing agent only when the same scope, source
revision, and context digest are still active. Otherwise it selects the
configured specialist. Blind reviews, security, plan checks, documentation
validation, and architect diagnostics always receive a fresh independent route;
they never inherit the parent conversation or prior findings. The resolver
does not call spawn/wait and cannot bypass reservation, exact-three, Runtime,
or delivery gates. The host adapter is responsible only for materializing its
typed contract and returning compact completion evidence.

### Shared-worktree coordination

All sessions use one live worktree. Before mutation, a work registers explicit
BR/SR/AC/component/file keys in the untracked local
`.agent/coordination/ownership.v1.json` ledger. Exact files use FIFO claims
and show owner work/thread notices; unrelated claimed files may progress in
parallel. A work may not seal or review until all of its declared resources
are current. Verified linked works enter `READY_FOR_HANDOFF`; one frozen
contour creates one mixed copy/import/deploy release batch for user testing.
The ledger is runtime control state, not B/S/AC/GAP authority or a deployment
artifact.

An expired claim never remains authoritative over a later lawful claim. A
same-ticket `claimCoordinationResources` call atomically retires overlapping
expired predecessors and records a recovery disposition before creating the
fresh claim. When an explicit decision is needed, the typed
`recoverCoordinationClaim` operation requires an actor and decision pointer;
the caller then reclaims the released resources. `validateCoordination` and
`sealMutation` select only a current, non-expired claim, so stale claim order
cannot shadow a fresh one.

For an unsealed PLAN/EXECUTE checkpoint whose binding is stale, missing from
the ledger, or whose accepted cross-scope correction adds files, use the typed
`rebindCoordinationScope` operation. It performs one checkpoint-CAS plus
ledger-lock route: it preserves the current work/thread binding, advances a
same-work stale ticket source revision to the current checkpoint source (recording
the previous source in `CoordinationScopeRebind/v1`), and extends
the existing ticket or creates a new ticket, recovers only expired overlapping
claims with an attributable decision, and records `CoordinationScopeRebind/v1`
history. A live foreign claim, stale CAS, replay, or frozen contour fails before
either file is written. The operation changes coordination scope only; the
caller still explicitly claims the returned unclaimed resources before
mutation. This is the permanent upgrader route, not a fallback or manual ledger
edit.

For protocol v3 and v4, review dispatch also has a host/runtime boundary. After the
packet is frozen, `recordReviewDispatchReservation` atomically binds exactly
three fresh platform handle IDs to the three fixed lenses and their
task/dispatch/reviewer identities. Only an exactly linked profile attestation
can then authorize receipts. Partial, cancelled, duplicate or stale
reservations fail without changing the checkpoint. The host still owns handle
release; because no attributable release operation is exposed here,
`GAP-AGENT-HANDLE-RELEASE-001` remains open rather than being simulated.

### Review preflight and host batches

Before any reviewer is started, the host adapter creates one immutable
`ReviewPreflight/v1`. It binds the packet, source/sealed revisions,
implementation fingerprint, exact source/document hashes, dirty-overlap result,
lease, capability epoch, profile and available reviewer slots. A failed or
stale preflight creates no reviewer handle. The snapshot is passed unchanged to
every reviewer; reviewers do not re-hash the repository or read implementation
history.

Each preflight also carries one derived `RuntimeAssuranceContext/v1` identity.
Status-only refreshes use `RuntimeStatusDelta/v1` against that identity, so the
host can update the next action without rereading or revalidating the immutable
packet, hashes or review scope. These records are compact status evidence only;
they never authorize mutation, review or delivery.

The host-facing operations are `dispatchReviewBatch` and
`waitReviewBatch(batch_id, timeout_ms)`. The first performs the preflight,
delegates atomic runtime reservation and starts the host-owned handles, then
returns a compact `ReviewBatch/v1` summary. The second returns only batch
counts (`completed`, `running`, `blocked`, `cancelled`, `next_poll_ms`). It never
pretends that a handle was released: unavailable host capacity or an
unreleasable handle is a typed GAP.

The bundled operator verifier is bounded as well: it defaults to two concurrent
non-serial checks, applies a per-check timeout, honors `serial: true` as a
barrier queue for heavy checks, streams complete check artifacts to the
derived artifact directory and retains only bounded redacted previews in memory.
Summary mode (the default) skips evidence/log aggregation; `--output evidence`
or `--output full` opts into bounded aggregation from derived artifacts. Use
`--max-parallel`, `--timeout-ms`, `--max-evidence-lines` and
`--max-output-tokens` to tighten a run. Summary/evidence output redacts both
key-value and structured JSON secrets. `agent-runtime/**` changes always select
the full runtime profile, including when the changed file is Markdown.

`exact-three` is the default and remains mandatory for public contracts,
security/data-loss, migration/destructive, dirty-overlap, Runtime GAP, high-risk
and current operator/API/UID scopes. `single-composite` is an explicit,
policy-authorized low/medium-risk mode only when none of those conditions is
present. Its one receipt must contain separate `correctness`, `requirements`
and `edge_security` sections; it never replaces the independent blind
architect diagnostic. Architect prompts contain only current BR/SR/AC,
observable behavior and evidence pointers. They omit implementation notes,
prior findings, correction history, QD3 history and broad repository context.

Capability discovery is cached per session by model, reasoning effort, profile
attestation, reviewer slots and host capability epoch. A profile, lease, quota
or host-epoch change invalidates the relevant cache entry; an unconfirmed
capability blocks dispatch before correction/review begins. The cache is a
bounded LRU with a short TTL, so long-lived hosts cannot retain unbounded or
stale capability entries.

Review preflight may use `createPreflightCache()` for the same packet only. Its
key includes packet/generation/seal/fingerprint, source and document hashes,
profile, lease, capability epoch, impact digest and review mode. A cache hit
still validates the current lease and all bindings; it only avoids rereading
an unchanged immutable snapshot. `executionSummary()` accepts optional
operation counts, byte counts, profile/model/reasoning, evidence pointers and
host-provided token telemetry; token values are never invented.

Runtime log analysis remains read-only and incremental. The normal command
does not inspect checkpoints; `--include-checkpoints` explicitly adds
`.agent/work/**` and emits only compact documentation/skill pointers. It never
copies prompts, transcripts or raw logs into the report.

Feedback correction has two typed entry points over the same CAS core:
`beginAuthorizedCorrection` for bounded local feedback and
`beginCrossScopeCorrection` for an already-authorized cross-scope union. They
do not add a lifecycle phase or bypass knowledge, scope, review, reverse or
delivery gates.

Native GSD Core Graphify is the optional relationship-index lane. Its artifacts
remain derived under `.planning/graphs/`; the sidecar and canonical B/S/C
sources remain authoritative. The runtime does not install or maintain a
parallel `@opengsd/gsd-graph` store. The default first-stage build is local
code extraction and local clustering; it does not send human documentation to
an LLM.

The Backlog adapter performs a pre-read, local write lock, and post-read, but
its provider revision is advisory optimistic-concurrency detection rather than
cross-provider prevention. The authoritative checkpoint CAS remains local;
Backlog status can never authorize delivery or Runtime acceptance.

### Tenant/project context (protocol v4)

New project-aware work uses `agent-development-runtime/v4`. A closed
`ProjectContext/v1` binds the checkpoint to the schema-validated repository
registry, one primary tenant/project ledger, affected projects, current
provider revision and authored Wiki roots. The exact Codex thread ID remains
in the coordination binding. Registration verifies the official Backlog task,
adds `tenant:*` and `project:*` contour keys without creating a second ticket,
and projects `In Development`. Protocol v2/v3 checkpoints remain readable;
their migration is the explicit `registerProjectWork` operation rather than an
implicit rewrite.

`BacklogProjection/v1` is an outbox/read model. Lifecycle changes compute the
desired status, while `syncBacklogProjection` performs the pinned official CLI
write with provider OCC. A failed write keeps the checkpoint lifecycle result,
sets `GAP-BACKLOG-SYNC-001`, and never invents delivery authority. Protocol v4
completion additionally requires an attributable current
`UserTestingReceipt/v1` with `decision=accepted`; `feedback` or `rejected`
returns only that work to `EXECUTE` and projects `Returned for Rework`.

### Active checkpoint protocol upgrades

`agent-runtime:upgrade:checkpoints` is the permanent typed upgrader for active
`.agent/work/*/resume.json` files. It defaults to a read-only plan; `--apply`
uses one per-file locked read/plan/validate/CAS pass, writes one
`CheckpointProtocolMigration/v1` history entry, and validates the resulting
checkpoint against the current schema before the atomic replace. It recognizes
the legacy `agent-development-runtime/v2.2.0` aliases and maps each checkpoint
to the highest protocol that its existing bindings can prove: v2 for ordinary
work, v3 for an existing coordination binding, and v4 only when the complete
tenant/project, Backlog, user-testing and implementation-policy bindings are
already present. It never invents a project, acceptance contract, lease,
review, approval or delivery authority.

```powershell
npm run agent-runtime:upgrade:checkpoints
npm run agent-runtime:upgrade:checkpoints -- --apply
npm run agent-runtime:upgrade:checkpoints -- --work-id <work-id> --apply
```

`COMPLETE` checkpoints are immutable and excluded. Current canonical protocol
checkpoints are idempotent. Ambiguous, malformed or missing bindings remain
unchanged and are returned as typed `GAP-CHECKPOINT-UPGRADE-001` items in the
compact report. Every item also preserves the checkpoint `next_action`, except
for a typed architect-escalation normalization that points an active task to
the current blind-diagnosis operation. An already-aligned task waiting for an
attributable authority is not mistaken for a migration failure. On unsealed
`TRACE`/`PLAN` checkpoints the converter also removes the checkpoint's own
mutable `resume.json` from `fingerprint_paths`; sealed/active execution scopes
remain a typed GAP and require explicit retag. Run the
upgrader after a runtime schema/protocol release and before dispatching work; it
is a migration operation, not a hidden fallback.

## Optional provider projection

The runtime includes a small provider adapter for repositories that choose to
project work into a human-readable task ledger. The adapter is deliberately
optional: its pinned package manifest is `agent-runtime/backlog-package.json`,
and no provider, tenant, project, board, dashboard, port or ledger data is
configured in this source distribution.

Provider status is a derived coordination signal only. Local checkpoint CAS,
typed lifecycle state, review evidence, delivery authority and Runtime
acceptance remain authoritative. A missing or unavailable provider records a
typed GAP and never fabricates a task, approval or completion state. A
consuming repository may add its own provider launcher and source map in its
sidecar; those host files are intentionally outside this portable bundle.

The runtime never treats Code/Static evidence as Runtime proof. Passing internal
assurance advances work to `DELIVERY` automatically. The agent immediately
reports a deployment manifest: created files, modified files, the exact payload
and destination/order for the target environment, repository-only artifacts
that must not be deployed, and post-deployment validation steps. It also reports
behavior, tests/reviews and separate Runtime GAPs.
No human permission is requested merely to enter `DELIVERY` or present/copy the
delivery package. For protocol v4, presentation approval and subsequent user
testing are separate: the shared contour is delivered once, the task projects
`Awaiting Testing`/`Testing`, and only current attributable testing acceptance
can complete it. Feedback includes sanitized logs/evidence and returns the
affected work to correction. Commit follows current-version testing acceptance;
push is always a separate explicit command.

Feedback is not a lost transition. The runtime keeps the prior delivery and
testing receipts in `delivery_history`/`testing_history`, opens a typed
`DeliveryFeedbackAnalysis/v1`, and exposes the one next action. The agent must
classify the observation, bind affected ACs/files and evidence to the current
delivery cycle, then call `recordDeliveryFeedbackAnalysis` before
`beginCorrection`. A clarification creates or references a typed question and
cannot be silently guessed while it is blocking. Each correction increments
`correction_count` and appends `correction_history`; the old proof remains
historical while the active seal/reviews are invalidated. Failed review
generations also increment `review_failure_count` and the current
`review_failure_streak`. Delivery/testing feedback starts a fresh review epoch:
the cumulative correction/failure counts remain historical, but the streak is
reset to zero before the new correction cycle. After every two ordinary failed
review cycles within that new epoch, the second correction is resealed and the
runtime blocks a new review packet until one fresh history-isolated
`gpt-5.6-sol`/`high` architect performs a blind requirements-and-observations
diagnosis. A typed `persistent` finding in wave two or later, or any typed
`cross_scope` finding, opens the same diagnostic route immediately, even when
the streak is zero and the current review packet is frozen. The architect
receives no code, diff,
prior findings, correction history or agent conversation and is not a fourth
reviewer. A diagnosed defect requires an architect-separated correction; a
no-defect result allows the next review packet. Both paths still require three
fresh blind reviewers and reverse validation before delivery. Typed
`ArchitectDispatchDisqualification/v1` handles a failed isolation/profile or
dispatch attempt: it retires the active assignment with attributable evidence,
does not erase its identities, rejects any later diagnosis from it, and permits
only a new unique blind-architect dispatch. For the early typed-finding route,
`ArchitectureDiagnosis/v1` is the normal authority for an architect-separated
correction. `ArchitectDecision/v1` remains an explicit compatibility route for
an attributable external architect decision; the runtime never synthesizes
  that decision from a diagnosis.

For new or upgraded work with `assurance_policy.scope_triage=true`, review
receipts are evidence, not correction commands. Bind one
`ImplementationScope/v1` before mutation, then record one `ReviewSetTriage/v1`
after the three receipts. Only `blocking_current_ac` and
`critical_regression` can authorize a bounded correction. `new_requirement`
opens TRACE or a separate task; `follow_up`, `advisory` and
`invalid_or_unproven` do not expand the current implementation. Each assurance
epoch allows two corrections. The scope contract also carries behavior,
test, diagnostic and attributable thread traces, and its digest is checked on
every read/seal. A third attempt is refused until the typed
`CheckpointConvergencePlan/v1` is submitted through `enterScopeRecovery`, which
preserves compact invalidated review/evidence identities while resetting only
the epoch counters. A second exhausted recovery becomes a follow-up-task
stop, not another automatic correction loop.
The active-checkpoint upgrader reports legacy/unbound evidence,
`authority_required`, `scope_audit_required`, `scope_recovery_required` and
`scope_follow_up_required`, whose next operation is the typed
`recordScopeFollowUpAuthorization/v1` same-AC/file route, plus
`knowledge_context_recovery_available` when a sealed VERIFY checkpoint has a
matching compact knowledge-history entry. That status points to the typed
`restorePlatformKnowledgeContext/v1` operation and never auto-applies a
context, fabricates contracts, or changes product files.
The follow-up route also accepts the retired `EXECUTE` boundary emitted by a
typed `beginCorrection` when convergence is exhausted and all current
assurance fields are cleared. It does not rely on `next_action` text, create a
second scope recovery, or add an artificial VERIFY round-trip; the same AC/file
subset, CAS, fresh knowledge and downstream exact-three gates remain required.

When source drift is detected after a packet has already been reviewed but
before correction authority exists, use `refreezeReviewPacket` with the
current source revision and acceptance-manifest binding. This typed transition
is the permanent recovery path from reviewed `VERIFY`: it records a
`ReviewRefreeze/v1` history entry, recomputes the implementation fingerprint,
invalidates the stale packet, receipts and dispatch state, and returns to an
unreviewed `VERIFY` packet boundary. A new packet, exact-three reviews and any
required fresh architect authority must be produced; old reviews and architect
authority are never reused.

Malformed legacy checkpoints with a missing acceptance-manifest contract list
have one narrow migration path: `repairAcceptanceManifest` operates only in
unsealed `TRACE`/`PLAN`, preserves the manifest id/version/AC set, requires a
complete contract per AC, records the repair history, and increments the
revision. For protocol v3/v4, the same typed operation may initialize an
absent managed reservation ledger to an empty list when the checkpoint is
otherwise an unsealed `TRACE`/`PLAN` state; malformed present values and all
active/sealed states still fail closed. It never authorizes hand-editing a
checkpoint or bypassing the normal manifest gate.

Every `DeliveryReceipt/v2` embeds a closed `DeploymentManifest/v1` bound to the
same work, source, seal, fingerprint, acceptance manifest and delivery cycle.
Its unique repository-relative `created` and `modified` files are classified
exactly once between ordered `deploy`/`import`/`copy` entries and
`do_not_deploy`; every manifest includes attributable post-deployment checks.
Unknown properties, stale bindings, overlap, missing classification and unsafe
paths fail closed. For a blocking Runtime receipt, every referenced AC must be
covered by the union of current bound Runtime Evidence whose `closes_runtime`
flag is true. Code, Static, nonclosing, stale or differently bound evidence
cannot satisfy that gate.

## Adaptive agent allocation

The runtime is session-first. Logical roles normally run as steps or internal
perspective slots; they do not justify a new process by themselves. Dispatch a
bounded specialist when it can work independently while the parent progresses,
parallelize only disjoint ownership, and reserve fresh single-use agents for
independent plan/review/security/architect gates. Every child receives a frozen
packet and exact stop condition; the parent validates source revision, scope and
output at join. See `instructions/agent-allocation.md` for the normative modes,
clarification decisions and minimal allocation telemetry.

## Human clarification

Before asking the user, the current session classifies the gap and chooses
`ask`, `retrieve`, `infer`, `proceed` or `block`. `retrieve`, `infer`,
`proceed` and `block` remain orchestrator decisions recorded in the ordinary
B/S/AC/GAP trace. Only a material `ask` is stored as a derived
`QuestionCandidate/v1`: it binds one decision to the current work/source,
names the exact evidence and owner, gives the consequence of every option and
states what happens without an answer. It never becomes a competing BR/SR/AC
source. `recordQuestionCandidate` records an open candidate and
`recordHumanAnswer` imports an attributable answer; an open blocking candidate
prevents mutation sealing and delivery. A new source revision or correction
invalidates stale active clarification state. See
`instructions/request-clarification.md` for analysis and the user-facing
question template.

## Resuming work from a retired runtime

Use `bin/legacy-import.cjs` only as a read-only semantic inventory. Reconcile
its BR/SR/AC/GAP, defect and evidence projections with the repository's current
authoritative sources, then create a fresh Backlog task and
`.agent/work/<work-id>/WORK.md`/`resume.json`. Preserve historical provenance,
but obtain fresh authority for approval, review, leases, delivery and Runtime
acceptance. Resume at `TRACE/PLAN`, `VERIFY` or runtime-pending according to the
latest state supported by current evidence; never execute the retired runtime.

Select the smallest historical corpus before importing it: use the repository
source map and `rg` to locate relevant files, then pass their narrow common root
to the importer. A defensive full-root call is bounded by file, directory-entry,
file-size and a one-second default processing budget (two seconds maximum), and returns a typed truncated
    inventory instead of continuing an unbounded scan. The CLI stores only a
rebuildable repository-root projection in
`.planning/agent-flow/cache/legacy-import.v1.json`, regardless of caller cwd;
subsequent processes reuse it, while `--refresh` forces a new bounded read.
Cache corruption or write contention is a cache miss, never a lifecycle failure.
The cache contains no authority: approvals, leases, reviews, delivery and
Runtime evidence must always be obtained by the current runtime.

```powershell
# Prefer a selected product/workstream subtree.
node agent-runtime/bin/legacy-import.cjs artifacts/quick-dev/<selected-root>

# Or freeze exact relative JSON paths in a small JSON-array selection file.
node agent-runtime/bin/legacy-import.cjs artifacts/quick-dev --selection-file .agent/work/<work-id>/legacy-selection.json

# Deliberate bounded refresh; still read-only and non-authoritative.
node agent-runtime/bin/legacy-import.cjs artifacts/quick-dev --refresh

# Equivalent root entry point; append the historical root after `--`.
npm run agent-runtime:legacy:import -- artifacts/quick-dev/<selected-root>
```

The repository sidecar points to its product-specific migration map. A
migration is complete only after every substantive legacy item maps to a
current canonical record or an explicit historical-only disposition and the
imported transition passes equivalence validation.

## Verification

Run `npm run agent-runtime:verify` at the repository root for the normal
manual release gate, or `npm run agent-runtime:deep` for 100,000 deterministic
property cases. `npm run agent-runtime:test` is a focused Vitest diagnostic and
cannot stand in for the release gate. `TESTING.md` owns the complete test-level
matrix, 100/100/100/95 coverage profile, per-function CRAP below 5, complexity limits, 100% effective
mutation target, fail-fast order and retained evidence. Installed
GSD/Workstream/Graphify preflight and sidecar-routed product tests remain
separate evidence domains.

Mutation JSON is projected outside `agent-runtime/**` under
`.planning/agent-flow/test-output/mutation/mutation.json`. `npm run mutation`
owns the complete gate: an Espree-generated semantic manifest binds every
source domain to the current Git revision and content digest, runs its relevant
public tests, and publishes one no-gap/no-overlap aggregate plus receipt.
Focused partitions remain diagnostic only. A diagnostic override is resolved
from the repository root and rejected when it targets `agent-runtime/**`. A
genuine source directory named `reports` remains in the implementation
fingerprint and a reparse point at that name still blocks.

If a complete mutation run needs more host time, double only the per-mutant
timeout for that invocation:
`$env:AGENT_RUNTIME_MUTATION_TIMEOUT_MS='10000'; npm run agent-runtime:mutation`.
The runtime tooling accepts only 5,000–60,000 ms and keeps the same target,
thresholds, partition ownership and fail-closed aggregation.

The full orchestrator has an independent 24-hour wall budget
(`AGENT_RUNTIME_MUTATION_WALL_TIMEOUT_MS`, default `86400000`). This is a
command budget, not a per-mutant allowance: the normal 5,000 ms mutant timeout
still prevents an infinite-loop mutant from occupying a worker indefinitely.
Mutation output is compact by default; use `AGENT_RUNTIME_MUTATION_OUTPUT=full`
only when diagnosing a bounded failure. These controls do not alter mutation
scope, thresholds, ownership, or the zero-survivor requirement.

Stryker uses six workers by default. An explicitly monitored external run may
set `AGENT_RUNTIME_MUTATION_CONCURRENCY` from 1 through 12. The partition
Vitest dry-run timeout defaults to 30 seconds and may be raised for one run
with `AGENT_RUNTIME_MUTATION_TEST_TIMEOUT_MS` up to 3,600,000 ms; neither
setting changes mutation targets, thresholds, or per-mutant safety timeout.

Use `npm run agent-runtime:scenarios` for a fast synthetic end-to-end check of
the public lifecycle API across R0-R4, typed `ask` clarification, correction
waves, architect escalation, delivery feedback and Runtime dispositions. It
uses temporary repositories and does not mutate product state. Retrieval and
inference orchestration, external linked-defect target-platformn and project probe
authority remain project/orchestrator concerns rather than synthetic runtime
claims.

A nonblocking deferred, pending or failed Runtime receipt carries a
`gap_or_defect_pointer`. The runtime validates and preserves that pointer; the
project's living specification or Backlog ledger creates the linked defect when
needed. The pointer is not external-task target-platformn or Runtime acceptance.

After any confirmed runtime defect, add a public-boundary regression test that
fails on the defective behavior, a fault/replay case when state can be stale or
duplicated, and mutation evidence for the changed guard. A focused or
line-range Stryker run is diagnostic evidence only. The repository may claim
the configured 100% mutation gate only after one current full-target run
completes with no survived or no-coverage mutants.

### Bundled verification and compact output

For a bounded host bundle, prepare a repository-local `VerifyBundle/v1` manifest
and run:

```powershell
npm run agent-runtime:verify:operator -- `
  --manifest .agent/work/<work-id>/verify-bundle.v1.json `
  --output summary
```

The runner executes the declared checks without a shell, limits concurrent
non-serial children to two by default, honors serial check barriers, applies a
per-check timeout, streams check output to the manifest's derived artifact
directory, and keeps only bounded redacted previews in memory. It returns one compact JSON summary. `--output evidence` adds
bounded redacted findings; `--output full` is for local diagnosis only.
`--max-parallel`, `--timeout-ms`, `--max-evidence-lines` and
`--max-output-tokens` bound host work and output. Structured JSON secrets are
redacted before evidence reaches the host. Token telemetry is never invented
when the host does not provide it.

`readManifest` returns a branded, deeply frozen normalized manifest. The host
runner reuses that validated object instead of reparsing and revalidating every
check; deserialized or unbranded manifests still take the complete fail-closed
validation path.

Changed-only planning is conservative: docs-only, launcher-only and test-only
changes select their narrow link/contract checks; runtime, schema, public
contract, unknown or mixed scope selects the full runtime profile. A narrow
classification can never skip a mandatory public-boundary or delivery gate.

Derived evidence may be reviewed with a dry-run retention plan:

```powershell
npm run agent-runtime:cleanup:derived -- --days 7
npm run agent-runtime:cleanup:derived -- --days 7 --apply
```

The first command is the default. The second is an explicit bounded cleanup
of only known derived roots. It never removes `.agent/work`, receipts, source
maps, checkpoint history or other authoritative evidence, and it refuses
reparse points.

For bounded mutation diagnosis, select one or more complete execution groups:

```powershell
npm run agent-runtime:mutation:profile -- runtime-foundation,legacy
```

Selected groups run serially and write isolated reports. This is diagnostic
only; the canonical mutation report is published only by the full
`agent-runtime:mutation` run after every group is current and complete.

### Periodic runtime-log analysis

The read-only incremental analyzer is available for a Codex cron automation:

```powershell
npm run agent-runtime:analyze:runtime -- --output summary --days 14
```

It scans only portable runtime/host-runtime derived roots, stores its
watermark and report under `.planning/agent-flow/runtime-analysis/`, and
returns `RuntimeLogAnalysisReport/v1`. It does not read product logs or thread
transcripts, start reviewers, edit skills, change checkpoints, or authorize
delivery. Re-running an unchanged snapshot is idempotent; a snapshot that
changes while it is being read returns `blocked` and does not advance the
watermark. The automation prompt and scheduling/management instructions are
maintained in `prompts/scheduled-runtime-reliability.md` and
`instructions/scheduled-runtime-analysis.md`.

Every confirmed runtime or host-runtime fix also produces one compact
`RuntimeFixNotification/v1` for all affected developer work/thread pairs. Use
`instructions/runtime-fix-notifications.md` and
`npm run agent-runtime:notify:runtime-fix -- --input <json> --output summary`.
If separate bounded lanes prepare partial fan-out records for the same fix,
merge them with `runtimeFixNotification.mergeNotifications` before writing;
the helper rejects mixed source revisions or fix identities. The record is
derived and immutable; the host sends it to the attributable threads. Missing thread IDs or host send capability remain the explicit
`GAP-HOST-DEVELOPER-NOTIFICATION-001`, never an invented “sent” status.

### No hotfix camouflage

Do not close a runtime defect with a one-off fallback, special-case checkpoint
edit, manual ledger change, identity reuse or a task-specific workaround. When
the runtime behavior is wrong, fix the shared root cause in the portable
runtime and add a public-boundary regression. When an already-active task is
on an older schema/protocol, extend the universal typed upgrader/converter and
apply it to every affected active checkpoint through locked CAS. If the
problem spans several lifecycle states, implement the complete compatible
operation and migration path instead of patching the current example. Keep the
old route fail-closed, preserve authority and evidence, run the relevant
contracts/coverage/CRAP/lint/typecheck gates, and notify every affected
developer with `RuntimeFixNotification/v1`. A workaround is allowed only as a
clearly recorded, bounded diagnostic experiment; it never closes the defect or
authorizes the developer to continue.

## Derived directory policy

Fingerprint scope ignores directory segments named `node_modules`, `coverage`,
`.vitest`, or `.stryker-tmp` at any depth. These are the only
derived-directory exclusions and are checked after a no-follow reparse-point
inspection: a symlink/junction with one of those names is still rejected.
Package manifests, lockfiles, tooling configuration, source and tests remain
part of the sealed scope.

## Layout

- `instructions/` — single-owner portable contracts.
- `schemas/` — versioned checkpoint and receipt JSON schemas.
- `lib/runtime.cjs` — atomic checkpoint, clarification and gate validator API.
- `bin/runtime.cjs` and `bin/legacy-import.cjs` — thin manually testable CLI
  entrypoints over the maintained library APIs.
- `lib/backlog-adapter.cjs` — optional CLI-ledger adapter.
- `backlog-package.json` — single Backlog.md package/version pin.
- `instructions/knowledge-graph.md` — native Graphify authority, freshness and
  lifecycle integration contract.
- `capability/` — project GSD overlay source.
- `../script/Install-AgentDevelopmentRuntime.ps1` — idempotent installation
  and eight-point lifecycle preflight.
- `../script/Invoke-AgentDevelopmentRuntime.ps1` — typed checkpoint gate and
  native Graphify launcher.
## Role-scoped Ponytail

The portable runtime resolves `PonytailPolicyDecision/v1` from the trusted
managed GSD/Ponytail release. Planner lanes use `lite`, code-producing lanes
use `full`, the optional final complexity audit uses `review`, and requirements,
research, verification, security, documentation, correctness reviewers and the
blind architect use `off`. The resolver records only stack/version/hash,
capability epoch, role, mode, cache state and a bounded pointer; it never stores
the skill text or a full prompt.

The host reuses the existing capability cache and review preflight. Code lanes
must carry a trusted policy binding (mandatory for protocol v4); v2/v3 can be
backfilled through the typed runtime operation. Missing or tampered capability
blocks mutation with a typed GAP, while read-only lanes may report degraded
capability. Ponytail never changes requirements, independent assurance,
architect diagnosis, Runtime evidence, acceptance or delivery gates, and no
global Ponytail hook is enabled.

## Platform knowledge and skill validation

Every implementation cycle can bind one immutable `PlatformKnowledgeContext/v1`
through `recordPlatformKnowledgeContext`. It records compact official Academy
URLs, local authoritative source hashes, applicable domain skill hashes,
role/phase, cache epoch and warnings. It never copies full documentation or
skill prompts into a checkpoint or reviewer prompt. A delivery rejection or
testing feedback invalidates the context and starts a new cycle.

If a pre-fix runtime cleared the active context while sealing VERIFY, use the
typed `restorePlatformKnowledgeContext` operation with the exact context ID and
digest already present in compact history. It performs one lock/CAS revision,
preserves the sealed fingerprint and VERIFY state, and records a
`PlatformKnowledgeContextRecovery/v1` receipt. Manual checkpoint edits and
one-off fallback files are not supported.

When `platform_knowledge_required` is true, `execute:pre` cannot pass without
the current context. Before a review packet is frozen, the host records the
Ponytail-free `DocumentationSkillValidation/v1`; it is a separate validator,
not a fourth reviewer, and exact-three remains unchanged. `pass` permits the
review flow, `warning` remains visible evidence, and `changes_required` routes
to bounded correction or a `SkillChangeProposal/v1`. The deterministic skill
updater may apply only a clearly mapped official rule after source-example,
held-out, negative-transfer, regression and marketplace checks. Generated
marketplace files are never edited manually.

Post-delivery `feedback`/`rejected` receipts open a fresh correction cycle.
For an accepted bounded local `defect`/`rework`,
`recordCorrectionAuthorization` binds the feedback analysis, affected AC/files
and a fresh `PlatformKnowledgeContext/v1` in one lock/CAS operation.
`beginCorrection` consumes that authorization without pre-correction review
triage; review-origin, persistent and high-risk work retains the strict
`ReviewSetTriage/v1`/architect route. Accepted delivery/testing feedback that
is explicitly `cross_scope` but keeps the same AC set uses the typed
`recordCrossScopeCorrectionAuthorization/v1` operation. That operation is an
atomic scope-union/CAS transition: it preserves feedback provenance, expands
the scope only to the accepted files, invalidates stale assurance and binds a
fresh knowledge context before correction. It is part of the same universal
updater/lifecycle surface, not a fallback updater. Clarification feedback
remains blocked until its attributable human answer is recorded. The new cycle
clears old reviews and requires fresh knowledge, seal, exact-three review and
reverse validation evidence.

If a legacy checkpoint still contains a raw feedback pointer after its receipt
was consumed, `reconcileConsumedFeedback/v1` retires that pointer atomically
and records compact `FeedbackReceiptConsumption/v1` history; it never reuses
the old receipt. When one scope recovery has already been used and the next
request is explicitly bounded to a strict subset of the same AC/file contour,
`recordScopeFollowUpAuthorization/v1` opens a new assurance epoch with a new
scope id. This typed follow-up is the bounded route for a lawful same-scope
continuation from either retired VERIFY or typed post-correction EXECUTE; it
rejects expansion and is not a repeated automatic recovery. A plain EXECUTE
checkpoint without a current typed correction boundary remains blocked.

When a mandatory focused verification discovers a stale assertion outside the
current unsealed scope, use `recordVerificationScopeAmendment/v1` instead of
reusing feedback or editing the checkpoint. It accepts only one additive
test/spec/check path, preserves the same AC set, requires failure evidence and
a fresh `PlatformKnowledgeContext/v1`, and records one CAS-bound
`VerificationScopeAmendment/v1` history entry. The next action is a typed
coordination rebind; the operation never changes the coordination ledger.

## Change impact assessment and regression routing

`ChangeImpactAssessment/v1` is the reusable pre/post boundary for changes that
can affect more than the named acceptance case. It is not a second dependency
graph and it does not replace the implementation scope or review packet. The
pre assessment records the current scope, changed paths, direct and transitive
impact edges, contract/behaviour/security flags and a selected test profile
(`focused`, `expanded` or `full`). Unknown dependencies, dirty overlap,
public-boundary changes and other high-risk flags select `full`; the runtime
never silently downgrades that profile.

Use `recordChangeImpactAssessment/v1` (or the phase-dispatching
`recordChangeImpact/v1`) once in TRACE/PLAN before execution. After the code and
tests are stable, use `recordChangeImpactPost/v1` with the current implementation
fingerprint. `execute:pre`, `execute:post`, seal, review freeze and delivery all
check the same immutable binding. A post assessment may be `pass` or `warning`;
unverified/unknown/unexpected edges are fail-closed and require the full profile.
The compact binding is carried into `ScopeSnapshot/v1`, `ReviewPreflight/v1`,
`ReviewBatch/v1` and `BlindReviewPacket/v2` without copying dependency graphs or
source dumps.

When a correction starts, the active assessment is moved to compact
`change_impact_history` and a fresh pre assessment is required for the new
cycle. The universal checkpoint upgrader can mark an unsealed TRACE/PLAN task
as `change_impact_required` and reports the exact record operation; it never
invents impact evidence or rewrites sealed VERIFY/DELIVERY/COMPLETE state. This
boundary reduces duplicate scans and makes regression breadth explicit, but it
does not authorize mutation, delivery or Runtime acceptance by itself.

