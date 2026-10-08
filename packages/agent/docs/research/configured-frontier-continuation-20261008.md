# Same-run continuation after the prewriter configuration change

Status: functional receipt repair installed. Host producer, retained reader and
full-wave lookup implemented in Source. Live runtime continuation is pending.

The [system specification](../system-specification.md) owns the product contract.
The installed development lifecycle owns repair and delivery sequencing.

## Confirmed cause

An original suspended attempt retains its old configuration and an unissued
developer request. The current configuration inserts `review_source_prewrite`
before that developer stage. The existing snapshot reader rejects the old
configuration. The bridge rejects its changed root configuration and a producer
ledger bound to a different configuration. These VIDA guards fail before the
public Mastra resume call. They do not prove that Mastra cannot resume the run.

The isolated probe uses the existing Bun 1.4.2 and Mastra Core 1.71.0 pins.
Its evidence is under
`.tmp/core-windows-resume-20261002/same-run-frontier-feasibility/`.
No live Host or engine state was changed.

## Required continuation behavior

Preserve the original work, attempt, run ID and completed observations. Retain
the old unissued developer request as evidence. Do not issue it or mark it
complete. Offer the full current prewriter wave before any developer action.
The wave can contain both the source planner and security reviewer.

Bind the existing closed configuration transitions in order, followed by the
qualified runtime code lineage. Do not rewrite a closed transition or fabricate
an issue ID for an action that was never issued. Continuation supplies no new
Source rights or Runtime acceptance.

Before the first active receipt uses a changed shape, ship its functional
bundle-owned artifact repair. Source now supports configured-frontier repair
inspect, plan, apply and resume under the existing fences. Historical review
receipts retain their existing contract.

## Framework evidence and implementation decision

The official [suspend and resume guide](https://mastra.ai/docs/workflows/suspend-and-resume)
and [Run.resume reference](https://mastra.ai/reference/workflows/run-methods/resume)
document opening an existing run with `createRun({ runId })`, then resuming its
suspended step with data that satisfies `resumeSchema`. The documentation does
not establish configuration or workflow-graph adoption for VIDA.

The raw public-API probe confirms the following behavior under the pinned
packages:

- Resume without data is rejected. The old developer suspension stays intact.
- Resume at the same `wave-1`, with both complete current prewriter observations,
  succeeds. The run ID and storage remain the same.
- The old successful `wave-0` synthesis output stays exactly the same. The current
  graph does not execute synthesis again.
- The prewriter step completes. Current developer `wave-2` then suspends with one
  developer-orchestrator request and the three accumulated observations.

The corrected probe records submitted and accepted report calls separately.
Its stdout and preserved no-data failure are in `raw-public-framework/stdout.log`
and `raw-public-framework/no-data-reoffer-failure.log` under the evidence root.
Fixture reports establish framework behavior only. They are not actual agent
results, Host issuance or native Runtime acceptance.

Use the existing Host journal to offer and record the full current prewriter
wave first. Do not call Mastra with missing reports to request a new offer.
After all actual prewriter reports are accepted, use public same-run resume to
advance the engine. The adapter must allow the exact receipt-bound configuration
change at that suspended step and preserve the old successful prefix.

The current-wave projection preserves the old developer request and completed
prefix. The shared package repair module separates immutable receipt structure
from exact live dependencies. Its live validator compares all successor reviewer
requests with the derived wave. History checks do not require current configuration
or an unexpired old lease. Focused checks cover changed Source scope with its exact
authorized bridge, omitted security reviewers, duplicate or old developer
requests, attempted lowering of the protected lifecycle risk, expired repair
leases, and advanced Work state. The CLI re-exports the shared validators.

The Host reads immutable frontier history after later Work progress. Its repair
inspector derives the full current reviewer wave from loaded configuration and
the protected original intake. Public repair checks cover successful plan/apply/
resume, changed intake denial before reservation, interrupted digest update,
retained UNKNOWN, producer fencing and exact recovery. Repair preserves the
Work, Ledger, Journal and receipt payload.

The task completion run reports 17 passing cases and one stale scope-equality
assertion. Its corrected full-request assertion passes in the selected follow-
through. Both results are retained under the existing scratch evidence root.
Independent review added exact-diff and successor-projection guards. Six affected
cases and six direct historical/immutable callers pass after those corrections.
These checks reject unused authorization entries and changes to the successor
run, risk, scope, contracts or retained artifacts. The original aggregate failure
remains recorded; selected passing follow-through does not rewrite it.
The final review accepts the prerequisite repair in Source. Further checks join
the old Work run and Source scope to its Journal, require the Ledger increment
to be exactly one, and bind the expected maintenance generation to the closed
transition fence. Original AMEND evidence remains retained.

The qualified repair checkpoint is now installed from Source e91055d,
CI37715093124 and artifact11523515818. The current Source adds a read-only old
engine reader, an atomic full-wave Host producer and a multi-item lookup. Their
selected joined checks pass seven cases, including immutable old prefix and
denial of issued/UNKNOWN, substituted, foreign or malformed snapshot data.
These producer changes are not installed. Source now also has a receipt-bound
bridge, current-suffix reader and public consumer branch. The joined check uses
the pinned public Mastra APIs in owned child processes. It preserves the original
run and successful prefix, submits the full current reports, reaches developer
wave2, and reopens at the same suspended frontier. Eight selected joined cases
pass with104 assertions. The earlier failures and LibSQL EBUSY fixtures remain
retained. Completed Mastra steps may omit suspendPayload; their Journal request
bindings, resume observations and output chain remain exact.

Authoritative endpoint inspection corrects the earlier research draft: this
Work is bound to C1, and its protected intake has152 runtime paths. The17 paths
are its Source scope. Immutable artifact11515506966 reconstructs the protected
old runtime digest exactly. The installed153-path endpoint adds only the shared
repair module. Normal applied/released C1-to-current config proof and the exact
old/new runtime endpoint adapter remain required before live continuation.

The current Source endpoint helper reconstructs both retained inventories from
their declared manifest inputs. It validates exact input fields, canonical unique
paths, byte bounds and digests. A temporary union represents appeared or removed
files without changing the endpoint aggregates or ordinary task-scope checks.
Three selected cases pass with33 assertions; independent finite review passed.
The retained observation frontier-endpoint-helper-observation-1791429864257.json
under the evidence root reconstructs the protected152-file endpoint and the
installed153-file endpoint. Five files changed and one module appeared; no file
disappeared. The normal applied/released config operation baseline matches the
protected Work. The earlier scratch projection selected only bin/src and omitted
schema/package files; it is superseded and supplies no endpoint evidence.
This observation binds bytes only. It creates no active receipt, update chain,
execution rights or Runtime acceptance. The planner still needs the truthful
normal-config proof branch before actual continuation.

The independent plan check accepts one separate normal-config proof branch for
configured_frontier only. Preserve the existing historical delivery proof.
Resolve the exact applied/released config operation, current configuration and
receipt from safe repository readers. Its operation ID remains separate from the
actual native system-update ID. Bind the protected original inventory and the
canonical target inventory to their exact manifests, installation observation
and current native self-attestation. Reconcile their byte diff with the published
causal Source correction. Package-byte evidence remains separate from the task's
authorized Source scope and grants no rights.
Use current Host maintenance CAS; do not substitute the generic configuration
operation's historical release generation. Preserve Work/Ledger/Journal CAS,
owner/FIFO, original engine and UNKNOWN fencing. The planner selects the retained
wholly unissued request before the historical capture branch. Qualify the repair
validator and public inspect/plan/apply/resume/UNKNOWN path, then install that
whole checkpoint before producing the first active receipt. This is an accepted
implementation plan. The normal proof branch is implemented in Source and is not
yet delivered.

The current contract separates the generic config edge from the native update
operation. Both normal and historical fixture branches pass public receipt
repair, interrupted UNKNOWN recovery and same-run Mastra resume: six cases with
84 assertions. The existing config reader also verifies an actual typed Host
maintenance release against the complete normal operation plan. A coherent
forged plan with a recomputed digest is rejected; its selected case passes with
44 assertions. A read-only Source observation of the real repository confirms
the released core-prewriter-configuration-repair and its full two-project set.
The task keeps its original one-project subset.

Independent review found that scratch JSON statuses and self-hashed inventories
did not prove publication or operation provenance. The correction now retains
the original Host-bound human Source authorization, matches the actual typed
config release, resolves the registered pending native operation, and checks
changed Source against real regular Git blobs. Native self-attestation separately
proves the current executable endpoint. The real Git fixture passes13 assertions
and rejects forged hashes/sizes, missing commits and symlink modes. This does not
prove remote publication or an external installation invocation. Those claims
must never be inferred from the scratch report.

The ordinary admitted-runtime caller previously rejected the protected old
inventory after the prewriter. Its new Source branch uses the existing Host
journal and retained continuation receipt APIs, validates the complete immutable
receipt, and joins protected intake/owner/prior bytes with the current runtime,
configuration, schema and ProjectContext. The old intake stays byte-identical.
The focused case passes6 assertions, including coherently rebound invalid
receipt references. Review follow-through and applicable completion remain next.

Primary references: [Git object reading](https://git-scm.com/docs/git-cat-file)
and [local-only object access](https://git-scm.com/docs/git). Use literal paths,
disable replacements and lazy fetch, and distinguish commit-byte evidence from
publication authority. [Node path resolution](https://nodejs.org/api/path.html#pathresolvepaths)
explains the canonical-root normalization used for the Source observation.

Joined caller review found two additional reachable gaps. The configured-frontier
short path now runs the admitted current-runtime guard before any returned offer,
report, issue or resume. The normal planner and Host transaction also limit the
scope bridge to original implementation paths or explicit accepted documentation
paths. Allowed read/evidence paths do not authorize changes. The focused scope
case permits code/doc maintenance and rejects foreign or widened paths; four
selected normal/caller/scope cases pass with26 assertions. Documentation CLEAR
remains a final delivery check; no early checkpoint or approval was fabricated.

The remaining review AMEND concerns authority for package-runtime changes outside
the task's implementation/documentation scope. Do not force the package update
into that narrower task scope. Bind it to the applicable existing runtime
self-development/delivery authority and its exact accepted paths. Native bytes,
local Git objects and operation identity remain separate from authorization.
The normal planner must not be activated until this join is qualified.

Independent authority review resolves that boundary through the existing
self-development permission and native release owner. Package-runtime union
entries are qualification/attribution evidence for an already installed whole
package, separate from task-source authoring paths. Do not invoke the expired-
lease recovery operation or synthesize its CoordinationScopeRebind receipt;
the original Work has no lease and its tickets are already released.

The captured real Work execution phase is implementation. The configured
planner, Host and receipt-repair predicates now accept only implementation or
awaiting_followup for the suspended unissued frontier. The historical terminal
predicate stays unchanged. Real-phase fixtures cover Host/same-run bridge,
public repair, UNKNOWN recovery and denial of an unrelated review phase.
Eight selected cases pass with90 assertions. No active original-work effect
or installed checkpoint is claimed by these checks.

Installed checkpoint cef7cc6, CI37728025626/artifact11529190114, exposed one
further real continuation denial: dist/src/runtime.js is generated and absent
from the Source Git inventory. The new helper retains all generated outputs in
the endpoint digest but uses their manifest/installed-package evidence. Only
the four maintained JavaScript export paths get this classification. Copied
schemas join exact Source paths and bytes; unknown dist outputs deny.
Independent review found a stale-copy case when only Source changed. The helper
now verifies every target schema pair, including unchanged output and Source
deletion. Three selected cases pass47 assertions. Retained manifest metadata
also produces11 Source targets with no missing published entry; this is not a
new live installed observation or Runtime acceptance.

The next delivery combines installer-result parsing and the PATH observation in
one script. It preserves terminal/error custody and writes the same result from
the one parsed installer record. No separate installation observer repeats the
checks. The maintained policy now makes step reduction ongoing and keeps target
installation independent from development paths and Host state. The same target
may reuse its result; another environment must provide its own observation.

The direct ordinary-admission check also exposed a retained fixture defect:
the fixture constructs HostStateStore without a canonical Host root, then calls
the existing TaskSource reader that requires it. HEAD already contains that
reader call; this is not caused by the new inventory branch. Preserve the failed
caller log and use the fixture's existing publicStore mode for that check.
