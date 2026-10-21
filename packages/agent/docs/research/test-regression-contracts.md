# Maintained test regression contracts

This reference holds detailed, scenario-specific regression contracts that are too large for the main [testing guide](../../TESTING.md). The guide remains the owner of shared gates and execution policy. Treat every retained scenario as required evidence for its contract; this catalog does not claim current qualification.

## Required agent regressions

### Request-transition repair retains its actual restored postimage

Reuse the existing work-state repair case for both planned cancellation and
applied restoration. Planned cancellation preserves exact Work/Journal bytes
and revisions; a repeated restore returns the identical persisted operation.
An applied restore retains the original Work except its required advancing
Work/lifecycle revisions. Keep the original stale dependency CAS refusal.
Change only the fixture's stored restored list to neither valid frozen transform,
recompute its digest, require the owning refusal and closed transaction with
unchanged Host/Journal, conditionally restore the exact row and retry normally.
Old contradictory v1 records remain fail-closed; this is no state replay or
authority to infer whether a historical application happened.

### Exact terminal history and native synthesis correction

Configured-frontier receipts require an exact terminal attempt prefix. Report
recovery completes only its own started attempt; it cannot replace a terminal
prefix entry. Both original and configured-frontier readers share the native-row
negative oracle: change result and result digest together, require the owning
history guard, preserve rows, then conditionally restore exact original bytes
through owned cleanup. Supported terminal history needs no recovery exception.

The opt-in Initial Source fixture configures its research/synthesis graph before
admission. Issue, activate and report research through the native ledger,
normalize/admit its artifact, then resume synthesis against that predecessor.
Leave its real activated report unnormalized. The Host case suspends, applies
and retries a controlled typed correction plan, resumes, denies a changed
correction digest without effects, then performs the real runtime rebind.
Preserve research artifacts, execution, lease, Journal and correction/receipt
history while retiring current approvals. Controlled report content and the Host
verifier are unit seams, not CLI planner, external research, endpoint formation
or Runtime acceptance. Keep the default5s deadline and functional scratch custody.

Historical capture checks both request-bound reads and direct exact producer
retry. A separate real same-owner queued ticket stays queued and claimless after
capture releases the original owner; continuation still denies FIFO with exact
Host/Journal/receipt preservation. TaskSource inspection issues only the fixed
read commands without mutation policy or lease replacement. Preserve actual
issue/report/retry observations and unchanged rows; do not execute Git argv.

### Consumer migration rejects incomplete beforeimages before effects

Use a real baseline under its held maintenance fence. Change only its private
beforeimage and recompute the actual payload digest: null, array, each missing
table, a non-array table and an extra table must deny before a file callback or
plan change. A populated beforeimage also rejects a foreign SQL workspace and
duplicate valid primary keys before callback entry. The duplicate-key SQL failure
retains restoring progress, rolls back rows and never calls the inert callback.
Restore original plan bytes through conditional owned cleanup, preserving
primary and cleanup errors; the valid restore must then succeed. Negative callbacks
are inert counters, so these controls perform no real consumer effects. Retain
the existing Journal/history, interruption/retry, prepared-admission, foreign-row,
UNKNOWN and aggregate-governance cases and their original limits.

The wrapper's release-freshness variants use actual committed baseline state.
One filtered public release wrapper moves its operation key, changes payload
without digest, or changes binding/status with matching digest through a private
peer connection. Delegate the real verifier and require closure refusal, held
fence and unchanged workflow main/WAL/SHM. Restore exact rowid/key/payload/digest
under CAS, close the peer, restore the wrapper and converge the same operation.
Preserve the original refusal and cleanup errors. This component fault injector
establishes no public SQL admission, consumer effect or native disk-failure proof.
Keep the default5s case bound and the other wrapper matrix controls.

### Historical continuation retains actual completed Host attempts

The existing Host historical-terminal continuation case opts into
`continuationFixture({ completedAttempt: true })`. Setup claims and completes an
implementation attempt through the public Host APIs before the original fixture
releases ownership and captures its historical terminal body. Ordinary callers
keep the empty-history default. The case checks the completed result, unchanged
Host/Journal after stale CAS denial, exact history retention after continuation,
persisted lookup and an idempotent retry with one receipt and no reissued action.
This is fresh fixture evidence, not replay or Runtime acceptance.

Once the actual initial or delivered continuation creates its receipt table,
reuse its successful request with current Host/Ledger/Journal versions and an
absent attempt. Require the owning public refusal, exact unchanged state and
receipt bytes, then preserve the original positive retry. Keep verifier-count
observations separate where the existing fixture exposes no counter. These
checks add no producer, authority, fixture family or extended deadline.

The optional implementation-scope reference is backed by schema-validated,
canonical bytes written before initial Host admission. Bind its exact SHA to
Work, contract and current lifecycle reference. A Source-changing continuation
retires/rebases that reference while preserving the original artifact bytes and
the prior Work in its receipt. It grants no approval. Before the original capture,
the optional refusal callback checks malformed provenance, omitted release images,
stale Work/Ledger/Journal/generation, changed owner/history and release operations.
Every refusal preserves exact native Host/Journal rows and the complete SQLite
catalog; then the original valid capture and continuation still succeed.

Reuse the helper's exact `captureInput` to check the persisted request-bound read:
same request returns the receipt and released snapshot; missing action returns
null; nested, changed-body and post-continuation reads deny without altering
Host/Journal. This is read-only receipt recovery, not a new capture or replay.

The successor-admission case claims a real Host attempt and proves a started
effect blocks absorption. After public completion, it retains the exact attempt
and cooperative unreserved readonly Journal history through admission and retry.
Its configured fixture supplies a schema-valid scope digest. A native ledger
update trigger fails after predecessor/successor Work writes; assert full rollback,
closed transaction and unchanged Journal, drop the trigger through owned cleanup,
then perform healthy admission. The cooperative report grants no provider or
Runtime acceptance. All cases keep the default5s deadline and private root.

Completed Source report recovery separates rollback, terminal-history integrity
and commit into three independent20s cases. Each forms its own native fixture.
Commit checks stale CAS and live-owner refusal before expiry, then healthy
commit and exact retry; rollback checks the native Journal abort, exact preserved
rows, cleanup and healthy same-fixture retry. This balances their independent
obligations without removing an assertion or increasing a deadline. The builder
uses the Journal/version already returned in continuationState; both callers use
that one owner. Live verifyCurrent Source/package rereads stay unchanged.
After the commit case's reopen and exact retry, expire that actual readonly lease
and recover with current Work/Ledger/Journal/maintenance CAS. Its controlled verifier
checks exact state/root and keeps the current runtime digest. Preserve the accepted
Source report, execution, artifacts and immutable receipt; require a read_only old
ticket/recovered old claim, one active replacement claim linked to its ticket with
identical resources, and one Journal revision bump without body/digest change.
A stale retry must preserve exact rows. This exercises accepted-report recovery
inside the same20s case; it executes neither archived UNKNOWN nor a writer argv.

The rollback and terminal-history cases add a completed Host readonly preparation
before writer issue. Rollback preserves it through the native abort and healthy
retry. Terminal-history performs healthy recovery, then changes only the prior
attempt's result and matching digest in the persisted Work preimage.
Require the completed-report continuity refusal, unchanged Host/Journal and
recovery receipt rows, conditional exact restoration and healthy public reads.
Keep the commit/expiry case's native writer history unchanged: a Host unit result
without an accepted Journal item cannot satisfy expired-execution recovery.
Both retain an actual active disjoint peer and its exact Work/ticket/claim/
file preservation oracle. The existing native legacy frontier case owns the
full active/queued peer pair, earlier nonoverlapping FIFO assertion and TaskSource
prepare/retry/inspect no-effect probe. Reuse its setup rather than duplicate that
independent proof inside the long recovery body. Each keeps its existing20s bound.
Commit recovery retains both peers so its queued-resource predicate executes;
rollback and terminal-history retain the active peer. Assert absence of the recovering Work's active
file claims while preserving foreign peer claims. Peer verification resolves
the current fixture DB/store after an actual reopen, retaining original row,
ticket, claim and file beforeimages rather than closed prepared handles.

Historical continuation lookup reuses the existing Journal CAS/restoration owner
for controlled issued/reported states, empty issue ID and mismatched observation
action/issue IDs or summary digest. The digest-only corruption must be valid hex
and guaranteed different from the actual summary digest. Preserve complete lookup, native rows, separate immutable
receipt, original unissued lookup and healthy continuation retry. These synthetic
Journal inputs test the reader; they do not attest executor or reviewer effects.

Retired Source capture's existing real later-writer fixture rejects its sole
Journal witness with an altered stored digest. Save exact raw Host/Journal rows
while the digest is invalid, require the owning missing-terminal-evidence refusal,
closed transaction and unchanged rows/schema, then conditionally restore the row.
The original workspace/Journal checks and healthy capture/retry follow. This is
a negative missing-valid-witness proof, not a positive unrelated-row skip.

A separate synthetic legacy Source reconciliation component case reuses the
Initial Source builder and existing20s composite bound: admission, issuance,
actual Host unit completion, report rollback and reconciliation require that
bound rather than the default5s. Capture the public report-generated candidate
with its real verifier, abort the atomic transaction and prove exact rollback.
Only then install the conditional fixture-only legacy Journal split. Foreign
owner and changed Source must refuse with unchanged native rows and a closed
transaction. Restore exact private Source bytes before the healthy retry.
Preserve nonlease Work and completed result, release every original file claim,
require an execution-only handoff and prove repeated reconciliation writes
nothing. Keep owned spy/clock/store cleanup and retained failed roots. Synthetic
authorization, observation and split state prove component behavior only; they
do not attest native writer invocation, producer crash or Runtime acceptance.

After observed TaskSource inspect, a separate proposal with distinct request and
operation IDs may issue under current policy. Preserve inspection argv/no-policy/
unchanged-lease checks before the proposal, then assert replacement ownership,
unchanged prior report/Journal, exact issue retry and no Source directory creation.
The returned proposal argv is never executed; retain its issued, unobserved root
even on PASS. No synthetic completion authorizes deleting that evidence.

TaskSource FIFO promotion uses separate Work identities. Queue the target behind
an active peer, release that idle peer with public suspension and current CAS,
then queue a later Work with its own Journal and execution-only reservation.
Promote the original ticket in place, preserving its sequence/resources; require
one linked active claim and an unchanged later queued ticket without claims.
Exact issue retry exposes no argv; retrying the later waiter changes no native
rows. Retain every issued, unobserved root. The fixture's optional waiter scope
matches its persisted Journal; default peer identities/resources stay unchanged.
Two simultaneous queued proposals on one Work do not establish this contract:
the original continuation requires exactly one Work revision advance.
After an observed inspect creates the action table, inspecting a separately
prepared proposal must still return prepared/null action/null argv without
changing the earlier observation or Host ownership.

Absent-Work continuation, recovery, historical capture and corrective-authorization
readers return no authority without creating lazy tables or changing workspace
rows. Compare both native schema and workspace beforeimages in the same case.
TaskSource prepare, operation inspection and action inspection likewise reject
an absent Work before the trusted verifier or lazy table creation. Exercise this
with a distinct missing identity in the existing preparation fixture, comparing
all native rows and the schema catalog before healthy preparation continues.
Continuation checks reuse the caller's already resolved predecessor from the
same snapshot. Preserve each caller's prior/ticket/resource guards and the exact
original Work reconstruction; the lookup simplification grants no new authority.
The Source-backed historical binding fixture accepts a maintained snapshot of
real private Host bytes while preserving default callers. Drive prepare/issue/
observed report through public Host operations, using explicit cooperative Git
observations. Inspect-only actions and an additional unissued preparation grant
no current binding. After an observed proposal, differing task bytes still deny
current reads; matching bytes return the exact binding without changing Host or
Journal. Restore differing bytes even when a healthy-read assertion fails, retain
the primary error and restoration failure together, and keep corrupted-history
denials. This unit seam does not attest Git execution or Runtime acceptance.

The separate configured-frontier suffix case remains unqualified. Its first
bounded child timed out inside the existing default5s case; a fresh traced run
reached `beginSessionProducer` before its deadline. Both original roots and logs
remain retained. Do not add a larger timeout, synthetic accepted suffix or
public-only test outside the active Host selection to claim its coverage.

### Public CLI and diagnostics

`tests/documentation-clear.test.ts` executes the package Source TS CLI with the
pinned Bun in isolated consumer roots. Its default CLI package root is this
package; `VIDA_CLEAR_BUNDLE` remains an optional absolute package-root override.
No build, package copy or installation is required. These are development CLI
and package-schema checks, not native formation or installed Runtime acceptance.
The coverage preload does not propagate to spawned CLI children, so their
behavioral assertions do not establish instrumented function execution.

CLEAR and public CLI fixture runners share the synchronous child-outcome
classifier. An error, signal or missing integer status is UNKNOWN: fail the
case with its child diagnostic and retain the consumer root. Integer exit 1
remains an ordinary terminal denial. `tests/documentation-clear-custody.test.ts`
checks the actual CLEAR fixture cleanup and public runner receipts in isolated
mocked-child namespaces; it does not qualify real process interruption or CLI
coverage. Keep the existing child and case bounds.

The run-entrypoint shared-root control uses a real inert timer-only Bun child
and the same close owner as afterAll. Confirm its startup marker, UNKNOWN
classification, root retention and unchanged config bytes. Keep the selected
root latch after the passing negative assertion, preserve caller notices and
do not interpret direct termination as product or descendant quiescence.

The same private public-CLI timing owner also records parent phase starts for
the corrective fixtures, including setup and in-process runs, to attribute the
intervals between CLI children. `PrivatePublicCliFixturePhaseTiming/v1` carries
fixed caller labels and monotonic total/since-previous elapsed milliseconds;
it records no arguments, bodies, environment or success status. A row starts
its named phase: only the next row closes that interval, and the final row
does not prove completion. Receipt writes are synchronous and their overhead
is part of instrumented time. `tests/public-cli-fixture-timing.test.ts` checks
ordered intervals and visible write failure without a real workflow/CLI run.
Use these observations to locate cost, never as uninstrumented speed, coverage,
mutation or Runtime evidence. Preserve failed/UNKNOWN custody and all bounds.

For a missing CPU profile, check the mechanism with an inert control on the
package-selected current Bun before another expensive test. The historical
Bun1.4.2 profiling controls and issue references are retained in
[their original Source record](https://github.com/pomazanbohdan/vida-stack-lite/blob/a443545dce0495d0e7a90affebcb81d0c19b9ae7/packages/agent/docs/research/test-regression-contracts.md#public-cli-and-diagnostics).
They prove neither support nor failure on the current runtime.
Programmatic `node:inspector/promises` Session Profiler commands retain their
existing owner; a changed runtime requires the relevant inert qualification.
An explicit ignored preload may bracket one selected case with global
beforeEach/afterEach hooks; disconnect in finally, use an exclusive private
output and report capture failure separately from the test outcome. Do not
inherit profiling environment into CLI children. Require a nonempty observed
artifact, not merely exit zero. Profiles cover the parent, not child execution.
Stack samples are candidate attribution, not invocation counts or reliable
wall/CPU self time. Keep actual phase/child elapsed receipts separate. No profiling result
waives live checks, durable syncs, custody or numerical gates.

For upgrade package-byte optimization, qualify the optional Linux verified
reader separately from guarded reads. Check exact BOM/binary bytes, the 8 MiB
boundary, overflow, unsafe file kinds and paths, actual CAS ownership,
reclaim/quarantine/private backups with unchanged bytes and identities, and
controlled leaf/inode/ancestor/root drift during a real descriptor read. Retain
both original moved root and replacement root on failure. Accepted captures
perform no writes or fsync; existing write/recovery providers remain unchanged.
Use isolated child module mocks for read-boundary mutation, require that the
mutation actually happened and assert the specific denial boundary. Then check
real interrupted first/last publication and ordinary same-ID resume with their
existing quarantine/child limits. Every bundle digest remains fresh; optional
reader absence uses the existing guarded path, never a cache or weaker reader.
Opt-in read profiling distinguishes guarded and verified byte methods and
reports only its actual JS filesystem scope, not native helper syscalls.

For the runtime-package snapshot adapter, also verify fresh capture on every
invocation, bound receiver and logical/physical paths, required missing-file
denial without fallback, and unchanged mutable TaskSource and unsupported-provider
reader selection. Reuse the qualified primitive race controls; the adapter's
native controls must observe actual CAS/reclaim/quarantine/backup denial and
retained identities. Scope zero-write/fsync claims to verified byte capture,
not package identity, inventory, authorization or the complete admission flow.

Upgrade image controls require exact BOM-preserving text, twice-observed absence,
changed bytes on the next call, strict invalid-UTF-8 denial and propagation of
verified-reader failures without a guarded-reader fallback. Original-YAML memo
controls use fresh JSON reparses, exact changed bytes, invalid YAML, single-entry
eviction and frozen nested data. Keep operation schema, plan/progress and
independent artifact validation controls. SQLite sidecar controls distinguish
read-only CAS-name probes from O_CREAT, test all three suffixes, preserve active
CAS/reclaim/quarantine evidence and reject a journal created during image capture.
Then run the existing actual same-ID publication, activation, release and
retirement reconciliation controls. Focused passes do not close a contour.

Keep root help, per-command help and parsing declarations in parity. The CLI
contract gate must detect an unlisted public command, alias or option, and a
documented option that its parser cannot accept. Cover argument types, required
values, defaults, allowed values and conflicting combinations. Enumerate the
supported commands from their shared declarations, not a copied test list.
Invoke root, command and nested-mode help in an isolated empty workspace with
no credentials or network. Require exit zero, no project initialization or file
mutation, and the same help for compatibility aliases. Measure response time
against the lifecycle's two-second target; retain the actual slow result for
optimization. Test invalid input separately from informational help requests.

The native help owner derives canonical nested cases from actual public help,
checks their kind/mode/basis and option contracts, and invokes every declared
compatibility executable as well as its dispatcher alias. Command aliases are
exhaustive; nested alias cases are representative per alias, not a claim of the
full alias-by-route Cartesian product. Reject surplus selectors before runtime
loading. Informational direct entrypoints must work without a rebuilt dist;
defer operational runtime imports until an actual operation is requested.

Bundle freshness checks continue to use locked byte reads at every existing
upgrade barrier. Linux locked reads may reuse their owned parent descriptor for
the target read, retaining CAS exclusion, no-follow/single-link bounds, unresolved
backup denial and cleanup ownership. Unlocked capture is not a replacement for
that contract. Report operation-count savings separately from measured latency;
retain failed fixtures and the unchanged recovery bound when a case times out.

Check actual public envelopes, exit codes and empty stdout on denial. Preserve the supported next action and redact unknown error details. Recognized CLI argument codes must not acquire misleading lease, CAS or Source messages from usage text. Pair each negative with a real positive boundary control.

Controller-root diagnostics must distinguish unavailable roots from missing controller metadata. Reject file, link, junction and noncanonical roots. The absent-root public call must leave the root absent and return the expected path-free denial.

Use inert JavaScript children for command diagnostics. Do not use compilers or installers. Check stdout-only, stderr-only and combined nonzero failures, plus success trimming. The diagnostic body labels each bounded 2048-character tail. The saved terminal receipt retains full streams, command identity, exit code and signal.

The ordinary command observer uses one pinned environment, owned working root and absolute log path. Its four inert commands share the existing 4000ms observation deadline. A missing or partial receipt is UNKNOWN. The observation deadline does not terminate the child. Do not reuse or delete its fixture until the outcome is known.

Check source, extracted and unrelated-working-directory routes where applicable. A public command result must come from the actual route under test.

### Configuration and configured context

Check YAML schema, project identity, integration mapping, storage and safe references. Deny literal credentials and unsafe paths. A repair-validated configuration remains unbranded. Ordinary current context must use a loader-owned, root-bound configuration.

Check canonical JSON wire equivalence and legal shared references. Deny getters, descriptors, prototypes, `toJSON`, cycles and malformed limits. Preserve finite node, depth and byte bounds. Cache digests only for loader-owned deeply frozen values. Recheck inherited serialization hooks on every read. New YAML or mutable caller data needs fresh validation.
Scalar guard simplifications preserve exact rejection messages and expression
evaluation. Keep multiple conditions eager and ordered where the original guard
evaluates a complete array; do not substitute short-circuit operators without a
separate equivalence proof. Run the complete canonical contract selection and
the affected native caller. Reduced allocations or sampled hot frames alone do
not establish end-to-end speedup, timeout repair or coverage qualification.

Captured object images retain a null prototype and ordinary writable, enumerable,
configurable data properties. Exercise `__proto__`, `constructor` and non-callable
`toJSON` data on that image; their canonical bytes and descriptors stay exact.
Direct stores on the owned null-prototype image must not weaken input descriptor,
Proxy/getter/hook checks or change traversal order. Micro timing is diagnostic;
native recovery, deadlines and current-input coverage remain separate checks.

Contour progress v3 preserves every v1 attempt and evidence field while interning
distinct path/SHA256 pairs and retaining the existing canonical list identities.
Check complete v1/v2/v3 round trips, many near-equal lists, changed hashes for the
same path, malformed indices/entries/references, duplicate or unused entries,
reordered/duplicate-path lists and conflicting metadata. Keep the32MiB cap and
both prior files unchanged on over-limit publication. Snapshot-only repack does
not scan or admit observation files; the normal publisher still rejects an invalid
pending observation. Verify byte-idempotence and unchanged rendered Markdown.

Timestamp controls include trailing LF, CR, CRLF and Unicode line separators.
Check whole-input rejection separately from native parser failure. A scoped
Date.parse fault proves fail-closed handling of NaN for an otherwise valid
timestamp; restore the parser in finally and check real parsing afterward.
The month lookup relies on the regex's 01..12 capture, alongside real calendar
and leap-second controls. Do not fabricate an out-of-range matched month.

Coordination schema rejection preserves all Ajv diagnostics, their paths and
messages, leaves the input unchanged, and remains usable across invalid-valid-
invalid calls. The private synchronous ledger validator enables allErrors and
messages explicitly. Its failure branch can rely on the generated errors and
messages; a future validator/configuration change must requalify this contract.

Cedar contour selection includes its existing native validation tests. Keep
real parser, semantic-error and applicability-warning controls at the exported
policy validator; prove a warning-only case has zero semantic errors before
checking rejection. For non-Error authorization failures, use an unknown input
whose descriptor traversal throws, observe that traversal, and assert the
exact deny diagnostic in the measured process. Reuse this boundary case instead
of a child-only validator replacement; a child assertion cannot cover the
parent's error-normalization branch.

Governance contour selection retains the approval-consumption contract tests.
Test HostState adapter wiring with a real file-backed SQLite capability and
actual emitted records, not callback-only persistence. Check duplicate reserve,
request digest, wrong-store rejection, reserved/commit_unknown/applied/aborted
transitions and reopen through the public adapter. Native workflow composition
uses the config-selected workspace DB, proof-bound root/principal/store/config,
invalid-binding no-effect, one applied callback and unchanged replay denial.
These are facade/SQLite behavior checks; they do not qualify OS-crash durability
or physical provider authority. Enroll a new async fixture before its first
suspension, retain it by default, and admit removal only after successful close
and a fresh monotonic case-deadline check. Successful close with intentional
body-failure retention is not an additional cleanup failure.

Property tests generate supported and unsupported values separately and require
acceptance or refusal for every sample. Do not condition the acceptance oracle
on the production validator accepting a value. A general JSON arbitrary may
generate numbers outside the canonical contract: exclude unsafe integers and
negative zero from the known-good model, and test them in the rejection model.
Bound generated depth, collection size and strings independently of production
validation; compare wire values with native JSON rather than copying canonical
sorting or traversal. Keep legal shared-reference fixtures explicit.

Historical recovery preserves original request, engine, work, journal and initialization identity. Without retained body custody, validate through current configured context and deny mismatches. For recovery review, check the bounded caller-history `originalContexts` path with populated local-source and repository-skill bodies, exact action/wave/stage/work/attempt binding, selected-source/skill and file bindings, body digest, UTF-8/byte/excerpt/reference limits, duplicates, foreign/extra/missing entries and tampering. Confirm bodies stay out of the returned request and persisted Host state, current declared Source is snapshotted separately and rechecked at begin/complete, retries resupply the same body, and lost custody after begin preserves UNKNOWN without reissue. Keep topology and extra-profile drift denial, source/skill drift and absence without bodies, and public owner inspection controls. No body grants native dispatch, Source rights or Runtime acceptance.

Classify each denial at its real boundary. A bootstrap refusal does not alone prove a configured-context reader check. Recovery preparation may reserve review. It grants no reviewer success, Source rights, execution rights or native dispatch.

### Admission, ownership and reporting

Require exact repository, sorted project set, work, attempt, thread, lease, ticket, claim, generation and resource identity. Check future ticket and claim expiry. Native handles must be nonblank, at most 256 characters and free of control characters.

CLI and SDK use the same canonical runtime inventory and complete expected exports. Check source/generated omissions before construction. Reject incomplete inventories. Do not fall back to a subset engine or convert artifacts from another engine.

Read-only intake owns only its execution resource. Acquire exact file ownership before the writer is issued. Release those files after accepted terminal completion. Tests, reviews and Runtime waiting hold no implementation files.

A new writer terminal report checks current Source before binding `source_scope`. Cleanup of already durable success checks matching Host and journal completion, issue, reservation, generation and CAS. Valid own-file release may survive expiry or permitted later drift. Expiry alone, agent completion text or old Code proof is insufficient.

Check faults, stale races, peer FIFO, sequential writers and exact retry. Corrections use fresh scope/FIFO and invalidate affected proof. Preserve work, phase, results, journals and pending acceptance. Release creates no new Source authority.

An identical lost-acknowledgement intake or report retry returns persisted current state. A changed payload conflicts. This does not deduplicate external effects. A null suspended step alone is not completion. Preserve stable assignment indexes and graph-declared terminal outputs.

Successor admission and eligible predecessor release use one immediate work/shared-ledger CAS. Preserve same-pointer parallel contours and foreign sessions or projects. Reject ambiguity, stale state, reservations and unknown effects. Preserve original phase and evidence.

### Recovery, repair and migration

Use the strict current v1 contracts. Ship and qualify a functional bundle-owned repair before changing active artifacts or readers. Check dependency drift, atomic application boundaries, interruption, exact resume and owned-field restore. Preserve monotonic versions. Caller fields do not create approval or new rights.

Continuation digest repair must recognize an exact peer APPLIED operation after
its empty deferred reservation read and before its immediate writer transaction.
Use two connections to the same fresh fixture database and public reserve/apply
operations at that boundary; do not insert a synthetic APPLIED record. Preserve
the immediate producer, maintenance and pending-repair fences before the recheck.
An exact completed retry returns the retained operation; a changed plan conflicts,
and a peer RESERVED/UNKNOWN remains fenced. Check the continuation payload/digest,
governance and linked Host rows after success and refusal. Retain unresolved roots
and the original failing reproduction. Configured recovery readers separately
check original-only and recovered views, frozen return values and unchanged rows.
Exercise missing positive-attempt receipts after their real table is populated,
as well as missing tables with current Work. Reuse the existing producer fixtures
and unchanged-row oracles; do not create an empty success table just for a branch.
Frozen repair-plan retries preserve the stored plan for the same actor and
reject changed attribution without changing Host, Journal or governance rows.
For malformed retained Journal controls, reuse the genuinely issued UNKNOWN
fixture and change one persisted field with a matching digest and exact row CAS.
Null receipt/attempt/item/container shapes must fail in the codec; nullable
authorization must fail the issued-approval binding. Check all native rows,
governance, continuation history and absence of a repair table before restoring
the original Journal bytes through owned cleanup. Preserve the subsequent real
apply/rollback/reopen/resume/restore sequence and original case budget. Such
refusals neither settle UNKNOWN nor prove acceptance of malformed authority.

The same UNKNOWN repair fixture also admits a disjoint peer with its own declared
intake through public admission. Its actual configured bridge prepares a nonempty
suspended first wave; close that bridge with no issued action, observation or
reservation before repair. Keep the genuine foreign Work Journal in the native
table through inspect/plan/apply/reopen/restore. Only the original legacy Work
and Journal change; assert exact peer rows during maintenance and public peer
snapshots after restore, plus unchanged owner rights and original UNKNOWN approval.
This is a distinct fixture Work, not same-Work attempt history or provider execution.
Preserve both bridge and fixture cleanup errors within the unchanged case bound.

Corrective authorization retries use actual product-written candidate artifacts.
An owned Journal-update fault occurs after file writes: verify exact Host/Journal
and recovery-table rollback, no accepted authorization, and transaction closure.
Conflicting recovery bytes deny before native publication and are restored through
owned cleanup. An exact retry preserves all three files, engine ID and issue time.
An optional corrective-execution absence probe changes only an actual authorized
Journal's fixture payload/digest at its retained revision; use conditional exact
restoration and never claim a public version transition or minted authority.

TaskSource projection repair initializes absent storage through its public
held-fence operation, preserving empty operation rows, exact receipt retry and
no Work admission. Protected no-effect retry controls target the retained
attempt's stage and current authorized retry lease; a changed digest conflicts
and an exact retry without a trusted approval verifier denies without new rows.
These are Host component seams, not kernel issuance or provider observations.
Queued TaskSource stale-policy controls reuse the actual callback's typed
prepared operation/CAS and native queued snapshot; change only ephemeral expected
Work revision/digest and preserve native rows, prepared metadata and absent root.
Omitted-resource probes remove each actual added branch/worktree resource from
a cloned Work scope with a stale expected digest. Prove the resource was present
and was removed; never persist the adverse DTO. Preserve the queued reservation,
peer, Journal and exact retry/FIFO oracles without another fixture.
Absent Work/Ledger and a malformed cloned predecessor with no ticket ID plus
a null Work lease are pure-builder refusal inputs only. Prove the ID removal,
retain the actual own queued ticket and never persist these DTOs or claim valid
Host authority. The existing file-backed readonly fixture separately requires
empty qualified-code history on a real no-Work workspace in number/bigint modes,
with the full open-to-close database bytes and catalog preserved.
The same pure refusal matrix removes each Work identity field individually,
proves actual deletion and checks its domain refusal. A sorted project list with
one extra project must fail exact ticket identity matching. Retain the real
queued lease and ticket; do not apply own-ticket predecessor filtering to this
direct lease-lookup route or change Source behavior to fit a guessed message.
The existing paired-Host admission case separately rejects unsorted project and
request-transition predecessor IDs through public CAS. Keep these malformed
proposals out of persistence, preserve exact Host rows and schema catalog, and
assert transaction closure before the original positive claim/retry sequence.
Its empty initial database has no Journal table; use prepared native queries
instead of a snapshot helper that requires that table to exist.
An exact current Work version with a mismatching prepared-record revision is a
separate pure CAS denial. A foreign execution-only peer may use the existing
fixture's real Journal and public preparation; preparation alone creates neither
an action nor a Source root. Check its absent current binding alongside the
original Work's drift denial and historical snapshot, preserving all native and
prepared rows. Fixture verifier callbacks remain component seams, not external
authorization or provider-execution proof.

The canonical workspace inspector first observes the real empty Host database
before its existing populated governance proof. Require exact empty
Work/Journal/governance/admission lists and null Ledger/version, with unchanged
database bytes and catalog. Empty rows are distinct from absent storage and from
unrelated positive-attempt history; do not create a fake success table.

Historical TaskSource snapshots cover direct observed reporting and a fresh
UNKNOWN followed by observed recovery in separate real fixtures. Issue only once;
report recovery through the supported CAS API without reissuing the effect.
Require refusal while UNKNOWN and preserve the original unknown report after
recovery. Check each retained report's own digest and the unknown-to-observed
status relation, even when the outer action digest is correct. Corrupt original
and recovery digests separately, and test a digest-correct invalid report pair
and malformed action timestamp. Restore exact action bytes conditionally through
owned cleanup, preserving both the primary assertion and restoration failure.
These component scenarios do not establish provider execution or Runtime proof.

Current writer report atomically persists the Journal and releases Source
ownership. It cannot create the older split state needed to test the final
retained-report reconciliation delegation. That branch needs its own qualified
legacy fixture; a subsequent current report/reconcile pair does not cover it.

The public delivered-work repair and qualified runtime continuation cases in
`tests/delivered-work-continuation.test.ts` inject a native source-close failure
after a genuine plan-read/parse failure. Both causes must survive in order, and
the exact failed handle/admission must remain with its close retry owner. Restore
the fault before retry, preserve unchanged plan/Host state on pre-effect refusal,
and retain unresolved cleanup. Reuse the shared close accumulator; an awaited
body may keep its original try/returns with a tagged outcome and synchronous
finisher when its exact cleanup owner is synchronous. These are Source regressions,
not installation, Runtime or complete numeric evidence.

The native-delivery repair planning regression rejects a foreign repair namespace
under both release locks before reservation or plan publication. Its real Bun
close spies inject errors after closing each connection. Preserve the UNKNOWN
body cause, worker-close cause and admission-close cause in that order, attempt
both closes, and retain the expected-UNKNOWN fixture even after assertions pass.
The shared `withReleaseRepairLocks` controls also preserve `throw undefined`
and a sole cleanup error by identity. Planning, custody and apply share that
owner; planning releases its pair before custody reacquires it. These controls
qualify error aggregation and ordering, not native SQLite I/O failure behavior.

Public research repair regressions retain initial plan write/close failures,
undefined lock-write plus close failure, journal fsync plus close failure and
pending write/close/unlink failures. Assert pre-effect or exact partial effects,
unchanged plan bytes, and retained lock/journal custody. Denied exclusive creation
preserves foreign pending bytes. Successful rename releases pending-path ownership
and preserves a foreign recreation while completing the exact target records and
changelog. A `record_0` interruption plus admitted source-close failure preserves
both causes, the first transformed record, unchanged next record/changelog and
held maintenance fence. Restore the native spy before shared close retry and a
new observer; retain the interrupted fixture. Named filesystem-import interception
uses the qualified awaited module mock/restoration pattern in TESTING.

Controller `writeDurable` controls preserve undefined write, descriptor-close and
pending-unlink causes, and fsync plus close causes after successful unlink.
Exercise real exclusive creation and native descriptor close through scoped named
filesystem mocks; assert unchanged prior target bytes and exact pending custody.
Keep fault roots even after passing assertions. An ordinary write after module
restoration must publish exact JSON bytes with no pending file. The shared
descriptor accumulator preserves existing rename, afterimage and outer cleanup
behavior; these controls do not qualify native I/O errors or whole-controller flow.

Read-only dispatch repair replay checks the exact persisted payload and digest.
The existing Host-backed idempotence case rejects conflicting strings and BLOBs
in either column with the same generation-conflict diagnostic, preserves Host,
Journal and the conflicting row, then restores the exact original receipt.
Reuse the rebuilt plan's serialization only within this validated transaction;
preserve caller-plan serialization before rebuilt-plan serialization and keep
every producer fence, current-version check and deterministic rebuild fresh.

### Coordination history and expired recovery

The existing file-backed/recoverable case exercises its actual empty workspace
through native readonly Bun number and safeIntegers bigint handles. Require
native COUNT0/0n and matching empty public workspace snapshots, retain Host/schema
and write-denial controls, and compare main DB bytes from before open through
close. Close each handle through owned cleanup preserving primary/close/assertion
errors; keep failure retention and default5s. This proof grants no populated
bigint snapshot support and changes no default operational mode.

Readonly workspace inspection retains its existing populated governance case.
For optional admission-table absence, first require zero admission rows and no
consumer baseline, then drop only the known-empty fixture table. Require the
same complete public observation, explicit empty admissions, unchanged variant
database bytes/catalog, journal mode and native Host/governance rows. Restore
only the saved exact table SQL while it remains absent; validate the original
catalog/rows through owned cleanup preserving primary/restoration errors. Keep
failure retention before setup and default5s. This models optional schema for
readonly inspection without recreating old operational state.

The Desktop adapter's exported unknown-input validator checks project ID shape,
strict ordering and uniqueness using the actual opaque Host capability and full
service closure. Keep its two-project positive identity-return oracle and
nonarray/empty/duplicate/reversed refusals in the existing contract case. This
is structural validation, not project registration or authorization.

The existing prepared-admission migration fixture repeats the same actual
recordAdmissionAttempt in its current maintenance generation, then refuses the
same identity with a changed request digest. Require one exact native admission
row and unchanged admission/Host/governance/catalog snapshots through both
paths. Keep the original no-Work restore refusal before the file callback;
do not create a Journal to use an incompatible row helper. Arm retention before
setup and preserve the default5s bound. No external consumer effect is tested.

The existing assured ReleaseBatch Host-CAS fixture covers accepted, feedback and
rejected decisions with distinct native case names. Preserve its actual frozen
contour and assurance operation; first persist the ready batch, then retain it
unchanged through a benign paired CAS. Acceptance releases the ticket; feedback
and rejection queue its full exclusive resource set. All decisions clear ticket
expiry and active claim resources. Refuse a terminal batch on insertion, absent assurance,
and a decision without its matching ticket transition. Preserve exact Host rows,
Journal-table absence and governance on denial and stale retry; compare the full
successful Work/Ledger and decoded Host. This fixture never creates a Journal or
executes a release/deployment effect. Arm failure retention before setup and keep
the existing default5s bound.
Before the positive freeze, use the same genuine ready predecessor to refuse a
new digest-correct frozen-contour proposal with empty ticket/work lists. Preserve
exact Host rows, explicitly absent Journal and governance, a closed transaction
and the decoded predecessor. The schema/reference checks permit empty lists;
the progress seed guard must remain and provide the exact domain denial.

The retired-source capture case pairs the active overlapping-writer denial
with a genuine active disjoint peer admitted through the same fixture's public
admission. Require a nonempty active claim outside the captured file resource.
Build fresh Work/ledger CAS after that admission; preserve the original retirement,
later-grant denials and successful exact retry. The peer's Work and Source bytes
remain unchanged. Do not start another bridge/producer for the unissued peer or
extend the existing case budget to create this control.

The maintained TaskSource preparation case initializes the current projection
schema while its operation table is still absent, then prepares and inspects
one exact retry-stable operation with the projected Work ID. Preserve no-action
effects, missing/changed-request denials and exact Host/Journal equality. This
is a fresh fixture initialization, not an active consumer schema upgrade.

The policy-denial case retains all three no-effect refusals with an admitted
peer sharing branch/root resources. A subsequent controlled policy allow creates
only a queued FIFO ticket with null action/version/argv and no active claim.
An exact retry preserves that ticket, Host, peer Work, original lease, Journal
and prepared operation. Use the existing peer admission CAS and private root;
do not fabricate a successful ticket or execute the returned Git proposal.
Preserve the default5s deadline through connection close and failed-root retention.

TaskSource fixtures may include already allowed non-file resources in the original
Work, ticket and claim through `retainedResources`; the empty default stays unchanged.
The queued case preserves those exact resources and the predecessor's active
ticket/claim. The issued/UNKNOWN case requires the exact replacement resource set,
released predecessor ticket/claim, retry-stable reservation and no created Source
directory. Keep policy denials, null retry argv and retained UNKNOWN roots real.
An active resource outside Work scope is rejected by the existing Host pair
validator; carrying a prior resource does not bypass that admission rule.

For newest-predecessor retry, use `rotateOwnerReservation()` before actual
TaskSource prepare/issue. It releases the genuine target ticket/claim and admits
its successor through paired public Host CAS with release history and fresh
request versions. The operation then releases that successor, leaving two
matching predecessors. Check both released ticket/claim pairs, exact replacement
resources, unchanged retry and no Source effect. A disjoint peer or one-element
sort does not exercise this choice. After real issue, reconstruct the policy
request through `createTaskSourceMutationPolicyRequest` using the original
verified operation/prepared version and current reserved Host snapshot. Check
the original prepared CAS, current reservation lease, unchanged Host and single
policy authorization. Ordinary inspect/retry short-circuits before that
reconstruction; it alone does not prove comparator execution. Default fixture
callers remain unchanged.

Initial-source continuation and readonly frontier rebind share one disjoint-peer
control. Prepare each peer's separate scope, acceptance and authorization from
the admitted fixture, then use public admission and writer-lease acquisition.
Require one active peer and one actually queued behind it, nonempty resources
and exact active ticket/claim agreement. Refresh the target's CAS only after
admission. Preserve both peers' Work versions, tickets and Source bytes through
target success and exact retry. Do not start an extra peer engine or issue a peer
effect. These later disjoint peers reach the guards that compare against
`ledger.next_sequence`; they do not exercise an earlier-than-target FIFO guard.

Interrupted-source retirement retries reuse the exact original typed request,
including its original CAS. Rebuilding the request from the retired Host would
produce a different operation ID. Require an equal receipt and unchanged native
Host/Journal, with the retained attempt still uncertain and null result/digest.
This retry disposes no UNKNOWN effect and issues no new Source action.

An opt-in stopped-Source fixture admits a disjoint owner and actual queued
waiter on the existing `AGENTS.md` before primary admission. Require its lower
sequence, disjoint nonempty resources and exact active claim, then unchanged
peer Work/version/tickets/claims after retirement and retry. No peer engine or
Source effect is needed.

For later-grant chronology, move the existing released later claim before the
retired claim while preserving every record and operation order. Encode/checksum
the ledger through its own canonical owner, conditionally update only that row,
and confirm the supported reader accepts the representation. A foreign later
actor must still fail at the exact terminal-evidence guard, proving chronological
release evidence cannot be hidden by claim-array order. Keep Workspace, Journal,
DDL and the changed row unchanged through denial, then conditionally restore
exact original bytes with primary/cleanup error retention before success/retry.

The native readonly-dispatch Host case sets the fixture synthesis profile to
no-egress before real admission, issues one actual unobserved Mastra action and
cooperatively suspends its same owner. Build the repair plan from the supported
Host session reader. Check all four CAS/generation boundaries, deterministic
rebuild, nested transaction denial, empty repair rows before refusal, exact
generation/payload/digest persistence and replay, and text/BLOB conflicts in both
receipt columns. Restore exact original rows with primary/cleanup error retention.
The original issue remains uncertain and unchanged; retain its fresh fixture
even on PASS. This tests Host intent persistence, not active-caller authentication
or replacement dispatch/execution.

A separate native readonly-replacement case reuses the paused-fixture builder
with its own private root and default5s deadline. Activate only the prepared
replacement through the ledger owner, resume through the supported lease owner,
and rebind its exact uncalled replacement issue through Host. The injected
runtime verifier and successor digest are consistency-only unit inputs. Require
the real admitted scope approval, its exact retirement IDs, unchanged execution,
lease and ledger, exact generated receipt/history, preserved original UNKNOWN
repair/activation/Journal and unchanged state after wrong issue or stale retry.
No external replacement call, Source effect or installed-code attestation occurs.
Retain both fixtures even on PASS. The independently isolated cases share setup
code, never a live root or ordered cross-test state.

The configured-frontier Host consumer case creates a task-only legacy graph
before fresh admission, runs actual synthesis and acquires its implementation
resources before same-owner suspension. Restore the current template, project
the real retained developer wave1 into current reviewer wave1 and keep the
completed synthesis prefix. Only the external transition-verifier input is a
synthetic dependency seam. Host creates the receipt itself. Check stale CAS and
null authorization before effects, native successor/receipt/lookup, exact retry
without another verifier invocation and untouched disjoint peers. Never seed
successful Host, Journal or physical engine history. A current already-planned
wave2 fails this legacy action's index/prefix contract; that is not proof its
INTAKE producer phase guard is defective.

Extend that same low-risk native case through target-config bridge initialization,
actual Source-planner issue/report and bridge resume. Assert its one selected
reviewer role explicitly, complete original synthesis/reviewer history, an
unissued developer suffix, lookup returning null after frontier advancement and
the unchanged retained receipt. Close the continuation bridge before original
fixture resources. The external runtime endpoint remains a synthetic dependency
seam; this does not qualify security-prewriter attachment, runtime-code adoption
or native endpoint formation. A high-risk extension needs a genuinely eligible
different runtime endpoint; equal prior/target runtime digests are ineligible.

For nonempty terminal Host history, claim a separately labeled fixture-only
readonly preparation through the public Host API, actually load/check the current
config and complete that Host attempt. This is not a configured Mastra-stage
execution or Source effect. Add it after the initial zero-attempt continuation
prerequisite, or after legacy synthesis. Preserve the actual completed attempt
through continuation/rebind and retry. After readonly frontier code adoption,
deliberately alter the persisted terminal result and its digest together;
require exact historical-prefix rejection and unchanged corrupt rows, then
restore exact original bytes with primary/cleanup error retention. The original
assignment remains bound to its old runtime while later attempts use current
binding; neither allowance can authorize an active historical attempt.

After completed Source recovery's successful commit, close and reopen its native
ledger on the retained fixture root. Require exact Work/Journal/ledger snapshot,
receipt and unchanged idempotent retry through the fresh Host instance. Cached
same-instance reads alone do not establish durable history reconstruction.
An unchanged runtime binding can legitimately take the transaction-local
projection path and miss the history-reconstruction loop even after reopen.
The Host-only recovery variant therefore controls exactly the external new-code,
manifest and attestation proof fields. Its wrapper still invokes the maintained
verifier for actual Source, package, report, permission, reservation and CAS
checks; only the corresponding returned endpoint fields are replaced. Host
creates the real transition/receipt. Require a different successor code digest
and exact reopen/retry/history preservation. This unit proof is fixture-only,
with no installed runtime change or native endpoint qualification.
In the recovery composite, admit the real disjoint active/queued peers after
frontier preparation and before writer issue. Keep first before/after API reads,
receipt lookups and fresh reopen validation. Repeated no-write checks use exact
Host, Journal, recovery-receipt and governance rows from the current connection.
Retain the same expiry, queue, rollback, retry and per-case deadline checks.

Host-component progress may retain a started readonly attempt with an actual
execution-only ticket and claim. Use public assignment admission, then a benign
paired Host CAS. Preserve attempt, lease, governance and native Journal rows.
The missing-Journal reader must still refuse retained effects before and after
that commit; this fixture does not establish a kernel-issued action.

Historical terminal continuation also carries a disjoint active peer through
public Host CAS. Its execution-only ticket/claim is separate from its allowed
file authority; preserve full peer state across native capture/continue/retry.
Corrupt only the resulting receipt digest, inspect repair twice without applying,
check exact overlay, Work/Ledger/Journal and unchanged corrupt receipt, then
restore the original digest before normal lookup. Do not seed a repair success.

Unprepared release admits its execution-only disjoint peer before the target.
Require a lower sequence, nonempty active resources and matching claim, then
preserve exact peer Work/version/ticket/claims across target rollback/release/retry.

For completed Source recovery's earlier-FIFO control, admit disjoint owner/waiter
before the initial-source continuation creates its successor ticket. Require the
waiter sequence to be lower than that target and exact resource disjointness;
a later waiter cannot execute the same predicate. Shared peer oracles compare
exact native Work bytes/revisions/digests already validated at admission, then
the current target's supported API and all peer tickets/claims/file bytes after
success. Avoid decoding each unchanged peer through the full Host reader again.
Before writer issue, prepare and inspect one TaskSource `inspect` intent under
the current native CAS. Its trusted fixture verifier checks exact Work/Ledger/
Journal and binds the retained authorization-file hash and current Source scope.
Require equal preparation retry and unchanged Host/Journal and peers. No Git
command, proposed Source tree or actual TaskSource execution belongs to this
control; it exercises live-owner FIFO admission without adding writer effects.

The configured continuation lookup case keeps its stored-row issue/report and
corruption/restoration controls, then issues the native reviewer wave and reports
one Source planner through `MastraSessionLedger.report`. Reuse the maintained
`createPrewriterPreparationObservation` builder and original contract references.
Assert actual Work PLAN before lookup, mixed reported/issued status, exact current
Journal version, unchanged completed prefix and step, immutable receipt, preserved
binding/lease and idempotent report retry. Lifecycle attachment changes Host
revisions legitimately; an unchanged Host beforeimage is the wrong oracle here.
Lookup accepts only configured INTAKE/TRACE/PLAN and historical INTAKE, preserving
active review, lease, resource, FIFO and report guards. This reports no engine
advancement, Source execution, independent reviewer authentication or Runtime
acceptance. Keep issued unresolved roots and the original5s fixture deadline.

The corrective authorization case retrieves an original completed observation
using its complete retry identity, rejects changed/foreign archive identities,
and claims/completes one genuinely authorized corrective attempt. Preserve prior
attempt history, consumed authority bytes and unchanged Host/Journal on replay.
Do not fabricate a successful report or authorize the original failed assignment.
Reuse the fixture's already configured ledger and original typed producer input
to acquire and settle initialization at the fresh corrective run ID. Require
unchanged Host/Journal and an applied native producer result bound to the exact
Journal and absent corrective engine. Borrow the actual ledger without reopening
or closing it separately. Initialization does not prove start or engine execution;
retain the original fixture deadline and all corrective authority/retry oracles.
After those original oracles, real corrective bridge preparation passes the
persisted correctiveExecution, original configured input and retained source
scope. Start once at the new corrective run ID; require a suspended, nonempty
unissued wave with exact run/Journal/request agreement and unchanged Host
assignment history. Both new producer operations must settle as applied; the
start result digest binds its actual engine snapshot and Journal version. Close
the bridge through the async dual-error owner before fixture-owned ledger close.
Do not issue/report/resume these requests or claim provider/Runtime execution.

Focused runtime rebind's existing real receipt also gets a current-row corruption
control: omit binding_history with a recomputed outer digest and require public
Host reading to deny assignment binding. Keep native Host/Journal unchanged and
conditionally restore the exact receipt key/payload/digest through owned cleanup
before original stale-retry and correction checks continue. This proves refusal
of corrupted current history, not genuine legacy baseline or accepted authority.

The selected Host assurance case reuses the existing passing final-correction
fixture and its real admitted writer, focused reports and terminal Journal. The
fixture's readonly validator/tester reports use public native Journal report and
conditional engine resume, rejecting Host reservations; writer completion and
delivery preparation retain their public CLI effects. The case persists all six
review/reverse actions and commits eight bound references atomically. Preserve
stale Work/ledger/assurance refusals, foreign binding, incomplete evidence, actual
Source/packet/report/manifest byte changes with exact restoration, and unchanged
Host/assurance/Journal beforeimages. Synthetic reviewer inputs and fixture DELIVERY
do not establish independent native review, deployment or Runtime acceptance.
Keep the existing20s composite fixture bound and retain every failed setup.

The migration baseline/restore case keeps a completed cooperative readonly
Journal wave plus an unissued current wave. Baseline clears its rows; successful
restore returns their exact revision/payload/digest after an interrupted restore
under the original held fence. Keep its file, admission-denial and Host beforeimage
checks. This is isolated fixture behavior, not consumer effects or UNKNOWN replay.

The file-backed database case constructs inspection through an actual read-only
connection with the existing schema, rejects native writes without changing
Host/schema, and closes that connection before changing journal mode. A separate
empty fixture rejects inspection without creating schema. The configured-root
case binds the observed native file identity to an explicitly opaque test
sentinel and rejects absent row, different binding and wrong inode. That storage-
only sentinel is not a genuine bootstrap operation/receipt or Runtime evidence.
Keep same-root ownership,5s case limits, primary/cleanup error preservation and
failed-root retention, including the TaskSource fixture's after-close predicate.

The existing no-effect retry case keeps its different-thread predecessor route,
then creates a second public Host attempt and reconciles it through the existing
typed unit verifier with a same-thread, newer-generation lease. Before advancing
the ticket/claim/Work fence, claim must deny without changing state. After the
exact authorized CAS transition, one retry links to that no-effect predecessor,
old completion denies and both earlier histories remain unchanged. This unit
verifier grants no provider attestation or additional Source authority.

The native code-only continuation fixture also checks the direct guarded plan
refresh API with one owned prepared-plan file. Before adoption, success returns
the callback value without rollback; a write-then-throw restores exact file bytes,
retains the primary error and leaves Host/Journal rows unchanged. After adoption,
the stale original request denies before action/rollback. A request with fresh
Work CAS and its actual adopted old-code digest may refresh the successor plan
while retaining the original receipt and all rows. This reaches the receipt
predicate without fabricating a receipt newer than current Work. Plan endpoint
formation, installation and accepted Source results remain outside this proof.
Both existing cases keep5s monotonic deadlines and failed-root retention.

Use the existing real-SQLite notice and retirement cases for positive history
transitions. A claim disposition cannot resolve a notice; the exact authorized
notice disposition can. Preserve acknowledged history and check unchanged state
after refusal. An owned ticket retirement must bind the exact Work and Ledger
revision transition; stale input denies, corrected input persists, and stale
retry changes nothing. Keep the original negative and partial-release controls.

After successful expired recovery, use public Host claim/complete calls to prove
that an inflight attempt blocks another recovery, and that a completed Host
result absent from accepted Journal observations still blocks it before current
authority verification. Compare exact Host/Journal rows after both denials.
Advance only the serial fixture clock beyond each actual lease deadline, restore
it for ordinary completion, and restore the original clock in finally. This is
native Host-history guard proof, not accepted Source observation or Runtime proof.
The maintenance verifier control also rejects a Promise rejected with undefined;
the synchronous verification owner must consume its rejection. Keep all four
existing cases within5s, retaining failed roots until complete success.

### Failed prewriter recovery

The live-heartbeat case admits an independent active peer with the actual shared
ledger CAS version and proves its Work, ticket and claim survive renewal. Its
validator-accepted queued ledger controls distinguish earlier disjoint, later
overlapping and earlier overlapping intents: the first two reach current-authority
verification, the last denies before it. Exact row beforeimages and exact-CAS
restoration retain Host/Journal state on every denial. These injected preimages
prove guard behavior, not native queue admission. Keep the same private root and5s
case bound, with retention armed before setup and cleared only after success.

The held-maintenance inspection case checks terminal snapshot reads outside the
inspection transaction, under the exact held receipt and suspended closed ownership.
Ordinary reads and nested transactions remain denied. Compare actual Host rows
without assuming a Journal table exists; preserve wrong-generation, thrown-scope
and released-receipt denials and the supported post-release read. Keep the5s
monotonic deadline and failed-root retention.

Use the Host cases in `tests/bun/host-state.test.ts` for owner recovery and
atomic failed-wave correction, with public CLI/reader cases in
`tests/delivered-work-continuation.test.ts`. These are development behavior checks. They do not
form or install a package.

Owner recovery restores only the original expired owner. Check the exact
Work/Ledger/Journal and maintenance versions, full accepted resource set,
retained human scope and FIFO. Keep failed observations, Source bindings,
completed history and the original continuation receipt unchanged. Deny a
foreign owner, started writer, unknown outcome, reservation or competing claim.
Recovery grants no Source execution or Runtime acceptance.

Failed-wave correction has a separate recovery receipt. Check fresh current
Source requests, stale CAS denial, the immutable original receipt and exact
archived failed reports. Read the actual suspended Mastra run. Keep its original
run identity and completed prefix. Check that Host, engine, packet and admission
readers join the original receipt with the explicit recovery view. Reject a
changed archived report or invalid successor state. Status and exact retry
return the stored result without reissuing an uncertain effect.
In the existing post-transition fixture, read the archived report, reject a
foreign issue, and return null for a demonstrably absent action or attempt.
Preserve exact native Host, Journal and archive rows plus the original receipt.
Inject a journal SQL failure after receipt and Host writes. The transaction must
restore all three beforeimages and leave no recovery receipt. Reject a failed or
asynchronous current-proof callback. The callback sees frozen request data.
Exercise the public Source handler's recorded-result path for status, inspect
and exact apply retry; all return the same result without Host or journal writes.
Changed retry intent must deny.
Use `tests/helpers/configured-frontier-fixture.ts` for complete continuation
receipts in engine and packet tests. Keep one constructor. Packet cases retain
their real accepted contract bytes and every configured completed assignment.
Derive research results from the filtered workflow wave; raw assignment lists
can include disabled roles. Synthesis references every retained result. A partial
mock receipt is invalid setup, not permission to weaken the runtime reader.
Research fixtures use unique record IDs and exclusive creation at the configured
library path. Track and remove only paths created by that fixture. Never replace
or delete an existing record to prepare or clean a test.
Resume the recovered wave through the actual persisted Mastra run and reopen it.
Require the same run/attempt, the new reviewer cohort, one developer suffix and
retained failed reports. Synthetic seeded reports isolate engine continuation;
they do not prove public report admission or native endpoint qualification.
Check the shared accepted-contract revision resolver for ordinary admissions,
configured continuations and failed-wave recovery. Preserve original Scope and
Acceptance bytes while current Source changes. Deny a missing recovery view,
foreign run or changed contracts. Prewriter and preparation evidence stays
current-bound. Trusted policy contexts re-read continuation custody after awaits.
Recovery receipt serialization checks each Work, Ledger, journal and original
receipt component with ordinary canonical limits at its actual nested depth.
The complete recovery receipt and continuation view have a 64MiB byte bound.
Their canonical v1 bytes and full-body digests stay unchanged for small records.
Use a valid unrelated shared-ledger cohort to exceed the aggregate 10,000-node
limit while each component remains valid. Check write, reopen, view, status/retry,
archive and tamper denial. Ordinary untrusted canonical JSON keeps its existing
node, depth and byte bounds.

A Host fixture with a supplied endpoint callback proves the Host transition
only. It does not prove native endpoint qualification, installed public CLI
behavior or developer admission. Keep those gaps explicit until observed.

Recovery regression checks cover an accepted Source report before engine
advancement, repeated execution-lease recovery, historical code updates around
Source recovery, and later lifecycle-reference admission. Preserve the original
writer/report and run. Exercise separate Host/TaskSource roots during renewal,
unresolved file ownership during generic CAS, and asynchronous proof rejection
before writes. Windows replacement checks include hardlinks and same-byte target,
staging and result substitution. Git hook checks retain unrelated index entries.

`native-delivery-evidence-repair.test.ts` covers the fixed stale qualification
reset. It checks the original uninstalled operation and archive, review, reverse,
scope and CLEAR bytes and directory membership, complete protected dependency
closure, three exact beforeimages or absences, custody, source and path drift,
unsafe targets, late-evidence preservation, each proof writer and reset under
both release locks, active and UNKNOWN writer denial, every removal interruption
and exact retry. It also checks the immutable-package command route on a
synthetic target. These cases prove repair consistency only. They do not qualify
or install an artifact.

The same suite checks the typed package-relative inputs in
`VidaStandaloneBuild/v1` manifests. It rejects malformed fields and unsafe
paths, while every other `inputs` array remains string-only.

Optional journal absence is read-only only for fresh contexts with no retained Host assignment. A missing journal for a started or uncertain effect fails closed. It does not prove quiescence or permit ownership release.

Read-only dispatch planning reuses its factory-issued project context for the
coherent Host snapshot and plan builder. Validate issuance, root, exact ordered
project IDs, repository and config digest; keep the direct builder's context-free
fallback. A planning context is not commit authority: rebuild from current
configuration, context and declared sources inside the Host producer fence.
Check identical plan bytes, forged/foreign/stale context denial, noncanonical
project sets, and config or declared-source drift between plan and apply with
no repair row published. Preserve original UNKNOWN issues and CAS checks.

For unprepared recovery, check the accepted baseline, exact repository/project/integration/storage identity and current registry. Preserve the original Work binding, run and intake. Check inspect, apply, reopen and identical lost-acknowledgement retry. Require a calendar-valid RFC3339 timestamp and exact renewed-at equality. Deny impossible dates and identity drift with all Host, engine and YAML state unchanged.

Keep independent identity and evidence-denial rows as separate fresh cases.
The dependent public sequence keeps one attempt and the documented8s exception
in TESTING. Its fixture marks completion only after all assertions and closes
its owned raw database before deciding removal against the outer case deadline.
Pending, failed or expired completion retains the exact root. Preserve a body
error, including undefined, alongside cleanup errors through the existing close
finisher. A fault after real native close proves cause aggregation, not SQLite
I/O failure. Test incomplete retention, completed cleanup, expired retention
and ordered body/close causes separately.

Release state-save and bounded-read controls preserve the body and descriptor
close causes in order, including undefined write errors. Keep read fixtures
regular with one link so an injected read failure reaches that boundary.
Restoring filesystem aliases precedes byte and identity observations. Retain
fault roots and owned save temps; rename follows successful write, fsync and
close. A close fault injected after native close proves aggregation only.

Compare the public recovery request to a model from the actual pre-inspect
Work/Ledger rows and declared fixture identity, owner and decision. Bind both
versions, original Work, ticket, claims and maintenance generation. Preserve
every fresh post-call state comparison and lost-ack retry check; the public
request builder cannot also serve as the expected-value oracle.

Use actual SQLite JSONB fixtures. Cover unrelated valid state, matching run ID, same-work alias, malformed BLOB, NULL and JSON5. A record within the 8 MiB storage bound whose decoded JSON exceeds 8 MiB must deny before projected payload fetch. Preserve physical/count preflight and bounded decoding. Text-only records do not prove store-codec behavior.

Configuration rebind uses `runtime-config` and `ConfigRebindOperation/v1`. Keep YAML and initialization schemas unchanged. Check the exact executor-only target, read-only inspect/plan, maintenance before owner YAML authoring and receipt-only CAS. Preserve provenance and stale work. Deny queued/active ownership and issued/uncertain effects. Check own-fence release, interruption, no-effect abandonment and forbidden rollback. Verify exact two-file ownership retirement and deny partial or unrelated omissions. Keep parent proof and the current changelog path valid.

Correction-generation repair must use an actual isolated admitted Source attempt with an issued action, started Host state, `commit_unknown` approval and null observation. Remove only the coupled correction fields from the Host and mirrored receipts. Check inspect/plan/apply/resume/restore. All other semantic fields must stay unchanged. Deny partial fields, conflicting history, foreign receipts, competing ownership and dependency drift. Inject a transaction failure. Strict readers reject the unrepaired shape. Repair grants no replay, outcome or ownership transition.

For queued-intent FIFO controls around that original writer, validate the complete
current Ledger before seeding it. A queued ticket with no activated or blocked
resources remains distinct from native admission. Earlier overlapping exclusive
intent denies repair; earlier disjoint or later overlapping intent does not.
Preserve existing ticket order, claims, lease and approvals, and restore the
exact native row after each inspect. Join restoration errors with the primary
failure and retain every failed fixture. No synthetic ticket grants rights.
Continuation digest-repair plan controls cover both reserve and apply before
effects: malformed keys/schema/branch, actor/ID/time bounds, retained branch
mismatch and invalid checksums. Recompute otherwise valid body digests so the
intended guard owns each denial. Preserve every linked row and operation.

Keep raw repair beforeimages separate from normalized current Work and journal
types. Validate the permitted normalization and exact afterimage before any
plan retry, applied resume or restore returns. Reject null records, invalid
arrays, extra fields, foreign identity, invalid actor/status and changed frozen
transformations without modifying Host state or the stored operation.
Request-transition repair does not supply missing correction authority.
Private Work validators receive explicit history and assignment authority from
their maintained callers. Narrow pending receipts to the three actually supplied
variants; initial-source and completed-report receipts still validate through
persisted history. Removing unused private defaults is not execution evidence.
Bind a nonempty Journal with completed history to the repair plan. Advance only
its native revision after planning; applying that stale plan must preserve the
Host rows, concurrent Journal and stored operation. A fresh plan may apply and
restore while retaining that exact Journal history and ledger. Terminal
correction repair also preserves the actual completed Host attempt and released
ownership through apply, resume and restore. These fixtures are distinct from
the genuine issued-UNKNOWN repair above.
For terminal correction repair, cover restore directly from planned and after
apply. Both retain normalized terminal results and completed Journal history;
Work and Lifecycle revisions advance once or twice respectively. Repeated
restore must preserve the exact stored result without a further write.
In that terminal fixture, inspect an explicit null reservation authorization
without applying it. Preserve the real receipt and exact Host, Journal,
governance and schema rows. Restore the original Journal bytes through identity,
revision, payload and digest CAS before continuing the normal repair lifecycle.
This legacy reader control grants no authority or native producer qualification.
Use the same CAS/restoration control to reject a malformed non-null corrective
execution context before repair planning. This proves schema refusal, not valid
corrective-context admission or recovered execution rights.
Remove a required stored change and recompute its operation checksum in a
fixture. The reader must deny the incomplete set. A matching checksum does not
prove complete repair or permit an early plan/resume result.

Writer fixtures follow the configured graph. Report the required source-plan
prewriter through the normal journal and bridge before reserving a Source
writer. Use the fixture's actual scope and acceptance evidence. Do not insert
lifecycle references directly or relax production approval to make setup pass.

Stopped-source capture uses a physically contained, qualified immutable controller and separate consumer fixtures. Fresh pinned processes call the copied public route for their own target. Do not use controller execution for a foreign target. Recheck package binding before and after each case. Preserve the mutable-package drift control, the original missing/null completion denial and unchanged Host. Fixture review manifests are setup data, not real independent review or Runtime proof.

Its constructor registers each opened ledger/bridge handle before the next
setup operation. A setup failure drains acquired handles in reverse order,
retains the failed consumer root and preserves primary plus cleanup causes,
including thrown undefined. The constructor control uses real native SQLite
handles and verifies that new statements fail after close; this is handle
custody evidence, not a bridge fault, disk recovery or mutation result.
Bun documents [strict SQLite close](https://bun.com/reference/bun/sqlite/Database/close)
and its [uncatchable test timeout](https://bun.com/docs/test/writing-tests#timeouts),
so establish ownership before construction can fail rather than relying only
on a caller's finally block after successful setup.
Writer setup reuses the existing real in-process preparation helper and keeps
public writer issue/capture calls; readonly fixtures preserve synthesis-only
setup. The complete and suspended wave-chain corruption matrices use separate
fresh native fixtures under their existing30s bounds. Retain all8+6mutations,
both snapshot/open denials, unchanged operation rows and exact snapshot restore.

Release-retarget checks use inert data. Cover same operation/version, bounded release-field changes, pointer absence, sealed archive/log custody, active/failed/UNKNOWN/install-started denial, admission/worker exclusion, planning reservation and source/path/archive drift. Check known-phase interruption, lost ACK and legitimate later worker progress. Local logs cannot replace trusted delivery evidence.

Consumer migration keeps canonical DB/WAL/SHM paths and a consistent backup. Partition work children. Restore semantic beforeimages under maintenance/CAS with synchronous idempotent callbacks. Deny inflight or UNKNOWN state before callbacks. Exact retry receives no new initial backup. Keep the fence through interrupted restore.
The public wrapper also accepts absent workflow storage without creating a
workflow triplet. Reuse its existing case matrix for a throwing callback followed
by exact normal retry. For close faults, reuse the filename-filtered native-close
component seam and existing retained-close owner: capture exactly one receiver,
check transaction/operation-row rollback or commit, restore the spy before retrying
close, preserve workflow triplet bytes, then prove same-operation convergence.
Assert exact nested error identities and order for body Error, thrown undefined
and successful body outcomes. Carry assertion failures through owned cleanup.
Keep5s cases and distinguish this component proof from a native disk failure.

The first admitted new-work attempt closes rollback, even if preparation fails. Initialization alone does not. A cutoff witness and current bindings must prove that boundary. Verify writer/verifier integrity against the same persisted JSON bytes. Do not claim that filesystem and SQL effects are jointly atomic.

Retained-selector exclusion uses the existing SQLite boundary. Check owner exclusion, process termination and later progress. Orphan locks need supported repair or retirement. PID, age or absence alone does not authorize deletion. Directory flush support is not a universal power-loss guarantee.

Research repair uses validators, dependencies and schemas from the executing package. Failed research creates no success artifact. Task-packet-only synthesis does not need unrelated research. Research dispatch interruption preserves issue identity and UNKNOWN exposure. Do not replay it automatically.

### Filesystem and resources

Check containment, safe paths, reparse points, symlinks, hardlinks, exclusive collision and current package attestation. Recheck root/package identity after caller awaits before effects. Reuse the initialized Root promise; do not cache attestation.

CAS and lock callers keep their own pre-await and post-await checks. Inject root replacement or attestation drift during the cached await. Require unchanged payload, no callback entry and no leaked sidecar. A creator-specific check reduction does not remove CAS or lock guards.

For existing directories, validate current metadata. Missing creation and raced `EEXIST` must validate the resulting regular directory. Test legal 255-byte and multibyte lock basenames, contention, release and reacquisition.

For orphan and rollback faults, substitute a foreign target after descriptor verification. Preserve the original backup and the foreign target. Keep partial staging on interrupted resource publication. Wait for every disjoint asynchronous write before releasing its lock. Reject incomplete publication.

Keep the flushed control lock and per-launch byte checks during cache optimization. Do not weaken database or release-journal durability. Public version/help may use the shared formatter without loading an absent payload. Runtime use still requires cache validation.

## Formation and installed evidence

The development-lifecycle instruction owns formation and installation policy.
No test suite, repeated review, coverage, mutation, seal or CLEAR runs at these
boundaries. Development tasks retain their applicable behavior and risk checks;
reuse current results after one stable completion run.

Formation proof binds the successful build, exact Source/version, target,
request/run/attempt and archive/manifest/native bytes. The current profile is
native-build only. The metadata reader still enforces all declared checks of a
historical seven-check profile; it never fabricates missing passes.

Installation is one platform adapter effect. Observe exact installed bytes,
version and effective PATH, then remove only owned temporary previous files.
These are operation receipts, not installation tests or user Runtime acceptance.
Preserve credential separation, path/transport integrity, exclusive custody,
rollback and UNKNOWN/no-reissue controls. Keep sensitive diagnostics private.

## Development-controller qualification

Use an immutable current-candidate controller outside editable Source. Verify prepare, inspect, verify and controlled execution. Bind the exact logical target, original repository/projects/request, Host work/scope/lease/CAS, target Source and controller code. Reject active-selector targets and alias, FIFO or predecessor escapes.

Require pinned SDK exports, dependencies, filesystem/native support and resource integrity. Check actual isolated scope/admission and own-target report behavior. Deny tampering, wrong package or pin, missing dependency and undeclared target writes. Expected target edits continue the same attempt under unchanged controller code.

Shared Babel URL recognition owns only exact shape and original expression
identity. Resource admission retains its recursive import-meta candidate
selection and malformed-resource denial; directory anchors retain file,
declaration, decoder and shadowing policies. Check all six locator mappings,
adjacent/nested resources, identity, wrong argument/callee/literal/base shapes,
and exact names. Keep Babel node imports type-only and preserve the existing
absent-computed-field behavior. Shared extraction alone proves no frozen budget.

Check restart, failure and affected-proof invalidation. Metadata, copying and a small probe do not prove ready capability. Construction and qualified readiness are separate. The controller supplies no global PATH, production selector or Runtime acceptance.

### Controller child observations

Decode Buffer and Uint8Array diagnostic streams through the existing UTF-8
output owner before redaction and the 4096-character cap. Respect byte-view
offset/length; never decode its entire backing storage. Preserve byte-exact raw
receipts separately. Check empty streams, Unicode, secrets and truncation.
Readable failure output still carries UNKNOWN effect semantics and grants no
reissue or qualification authority.

Controller qualification follows the currently configured prewriter frontier
before testing writer authorization. Report every issued planner/security
prewriter using the existing preparation schema, current work/scope/config/AC
bindings, and the same observer as its outer report. Keep optional in-process
host attempt fields compatible with the producer's own undefined value; require
the actual nonempty writer attempt when writing and reporting Source. Assert
the specific approval denial before any declared or undeclared file appears.
Preparation advances lifecycle to PLAN. Synthetic native-repair fixtures bind
to the current package version, typed Source dependency paths, required workflow
and actual pack-file byte sizes. These development fixtures prove their bounded
flows only; they do not pass production numeric gates or real native acceptance.

The controller writes sensitive controller-owned operator evidence under the
fixed `<controllerRoot>/observations/` directory. Each receipt retains the exact
command, parent and child working directories, pinned runtime context, times,
terminal fields, and complete raw stdout and stderr bytes. The child environment
map and its values are not persisted, but captured arguments, paths or streams
may contain sensitive text. The portable core does not define or enforce the
host's filesystem authorization policy and makes no OS-principal confidentiality
guarantee. Public CLI diagnostics remain bounded and redacted.

One exclusive reservation covers a compound qualification and its three
declared repair children. A completed parent requires complete receipts for all
declared children. An incomplete or `UNKNOWN` result, path collision, or failed
final receipt write retains the reservation after restart and blocks another
independent child launch. Tests must not clean an `UNKNOWN` fixture or retry its
child. Successful qualification cleanup removes only its owned qualification
fixture; controller observations stay outside that fixture. Controller and
qualification timeout and output limits remain unchanged.

Run the inert capture cases with `bun bin/bun.ts test ./tests/development-controller-observation.test.ts`.
They cover byte-exact success, terminal nonzero streams, spawn error, pinned
partial capture, timeout, path/link/collision denial, fresh-process restart,
declared nesting, duplicate and independent launch denial, and final-receipt
persistence failure. The partial-capture case uses the package-selected Bun's
compatible `spawnSync` API. Run the existing pure diagnostic check
with `bun bin/bun.ts test ./tests/development-controller.test.ts --test-name-pattern "controller failure diagnostics preserve bounded sanitized terminal fields without claiming no effects"`.
Do not run the controller construction, dependency-install or copied-package
integration case as a local observation test.

## Integration, assurance and acceptance

Check protocol frames and error shapes, source protection, initialization/configuration, knowledge and research, capabilities, Cedar and Edictum enforcement, lifecycle/CAS, planning and session handoff. Use the current unit and integration contracts. Do not infer provider or policy enforcement from configuration alone.

Check every configured role, model, workflow, operation, policy, command and path has a consumer. Deny duplicate YAML keys, aliases, merges, custom tags, unknown fields and unsafe paths. Require explicit rebind on configuration drift. Do not use template fallback or silent hot reload.

Check the order, branches, joins, failures and restart of all five configured workflows through Mastra. Persist CAS issuance before the active session calls a native tool. Reports bind the action, issue and actual observed result. Check stale, duplicate and foreign reports, interruption and UNKNOWN reconciliation. An interruption request is not proof of termination.

Each authorized Source mutation must bind actual Cedar/Edictum policy, current approval, exact work/attempt/session lease and Host attempt receipt. Check pre-effect revocation and post-await freshness. Declared external edits invalidate affected evidence. Do not claim physical exclusion or identify an external actor from a shared write interval.

Use the current [test inventory](../../package.json) for configuration, project context, initialization, configured workflow, run entrypoint, CLI diagnostics, policy completeness, kernel boundary, Cedar, HostState, session ledger, Source snapshots and observed research. Lifecycle tests must verify final review, reverse validation, status and delivery. Public documentation CLEAR must cover baseline/closeout/verify, typed deletion lineage, map denial and actual revalidation at DELIVERY/COMPLETE.

For qualified portable delivery, the complete bundle must work in an unrelated repository/path/identity with this checkout unavailable. Check owned resources, project YAML, repeat initialization and no-provider public workflow preparation/resume. Run delivery installation checks in CI/CD. Keep unsupported target evidence as a GAP.

Root integration must retain project settings, unrelated scripts and unrelated registry entries. Check active instructions, sidecar, YAML, package declarations, capabilities, hooks and generators. Current callers must resolve the declared bundle. Retired routes must fail clearly. No generator or registry may restore an inactive runtime path.

Cutover needs quiescence, retained beforeimages, current payload/root-integration bindings and one validated selector. Check interruption before and after commit, collision, drift and exact retry. Restart must select one authority or deny. Keep inactive archives outside active lookup. Do not import or accept archived tasks or tickets. Preserve canonical database paths and backups. Claim durability only for tested interruption and supported filesystems.

The bundle must include complete declared exports and resources. Reject undeclared repository, project, tenant, developer-home, Desktop or inactive-runtime dependencies. Do not activate a historical converter, fixture or retired config reader. Keep repository-only migration and archive controls outside the public runtime.

Check queued suspension, producer cardinality, stopped-writer capture, execution-resource recovery and ledger headroom before admission. Track optional answer/save surfaces, publication-temp cleanup and ledger lookup as requirements or GAPs. A linked successor alone does not close a bounded correction. Do not compact current v1 state or invent an agent/job cap to make admission pass.

At development-task closeout, complete the applicable quality checks and the
lifecycle-required three fresh independent reviews, reverse validation and
documentation CLEAR. Bind them to current Source and declared assets. A change
invalidates only affected evidence. Formation and installation reuse current
task evidence; they do not repeat these checks or require a new seal.

Where cutover activation applies, validate the approved activation decision and its current plan, payload, selector intent and separate parity, security, assurance, rollback, DEV and UAT evidence. Check missing, rejected, stale and changed inputs, including resume. No direct selector path may bypass the decision. Integrity checks are not authenticated user observations.

Declare created/modified files, exact payload destination and order, PATH/prior-install/rollback effects, repository-only items and post-install checks. Apply the Source-specific [Git order](../../../../AGENT.sidecar.md#source-package-git-policy). A failed formation is not the commit/push trigger. Changed included bytes invalidate their proof; Git metadata alone does not.

Use the installer's successful structured result for installed bytes and
version. Confirm effective PATH once. Do not repeat these observations or add
prerequisite probes. Check runtime resources when the development task requires
them. Keep prepared, available, qualified, installed and accepted states
separate. Obtain attributable user testing of the delivered version. A copied
file, report or version string does not grant Runtime acceptance.

Coverage refuses nonempty ambient `BUN_OPTIONS`; all Bun execution options must
come from the recorded runner selection and its pinned preload.

The distributed SDK authentication case consumes a freshly formed SDK artifact,
with Source and artifact identity retained by the formation owner. It preserves
the production guard and public proof/export assertions; Source imports or
stale generated output are not substitutes. It runs the current Bun executable
directly, using the existing bounded subprocess owner with a four-second budget
and 250ms cleanup reserve inside the unchanged five-second case limit. Preserve
its failed or UNKNOWN fixture before launch and clear that retention only after
all assertions pass. Generated helper ordinals are compiler details: require
the constant-false production guard and exact denial message without fixing a
numeric suffix or dumping the entire bundle on failure. Artifact formation
and installation run no suites; this scoped SDK check is not Source numerical
qualification, native qualification or Runtime acceptance.

SDK toolchain guard tests use small owned package fixtures without generated
artifacts. Derive valid Node/npm declarations and the Bun pin from Source.
Check malformed declared npm ranges, exact Bun qualification before artifacts,
and valid consumer declarations reaching the missing-artifact gate without
requiring host Node/npm. Await actual rejected operations
with the shared rejection helper. These guard checks do not qualify SDK output.

The pack metadata adapter reads actual bounded archive bytes and derives file
sizes and full SHA-512 integrity. Its inert fixtures cover identity, unsafe
paths, duplicate entries and non-regular members. Lifecycle parity is checked
on a tiny package; it does not qualify the full SDK. Native CI uses the same
adapter with scripts disabled after formation. Do not parse CLI display text.

SDK capture tests use inert Source/config/schema/tool fixtures. Assert exact
retained bytes after live changes, transitive tooling closure and aliases/cycles,
omitted tests/generated output, unsafe paths/links and existing byte/tree limits.
Importing the builder must not execute formation. These tests never build an
SDK. Formation owns declaration emission and both Bun builds on one captured
tree; it emits the exact completion receipt after output-byte/ownership checks.
Keep external dependency custody explicit. Failed/UNKNOWN partial output stays
retained; staging stays until known owned cleanup completes. Qualifying the actual formed SDK and joining its four
JS members to test capture remain separate pending checks, with no checkout
dist fallback allowed as qualification evidence.

The captured loader resolves a Bun query alias only to an already captured
physical path. Exact manifest filenames take precedence, including literal
`?` and `#`; no percent decoding, fragment removal or path-spelling rewrite is
allowed. Bun retains the original request's module-instance identity. Snapshot
reads, counters and loaded-input receipts retain the canonical captured path
and digest. Match the raw request before filesystem normalization; unbound
query-bearing requests deny before query path segments can redirect a lookup
or reach a live-file fallback. An unbound request under a declared root still
denies. Isolated
preload lifecycle fixtures select explicit `./` test paths so copied snapshot
tests are not rediscovered as additional test subjects.

The final CRAP subprocess executes the captured tooling closure against the original package root. Its five-minute hard deadline and unknown termination retain the run lock for explicit reconciliation. Runtime plugin path admission accepts both Windows and POSIX separators. These are static implementation guarantees pending the final Bun behavior checks.

Coverage reservation custody follows the direct measurement producer's lifetime,
separately from test-result and fixture-effect custody. On qualified Bun 1.4.3,
a synchronous child return with a positive PID and an exit status or terminating
signal observes that direct producer's completion. A timeout/error still denies
measurement success; keep its run, diagnostics and UNKNOWN test effects. Release
only the genuine acquired lock handle after known producer termination, or an
explicit not-started result: exactly PID0, null status/signal and spawn error
code ENOENT. The latter is not producer termination or successful measurement;
keep UNKNOWN effects and run evidence. Do not infer it from a missing PID or
broaden it to timeout, buffer-limit or unqualified spawn errors. A live,
unobserved or replaced producer reservation remains held. Apply the same rule to
the captured CRAP subprocess; never classify these failures as Killed mutants.

Legacy reservation disposition requires explicit attributable authority and
independent evidence that its actual measurement writers terminated. A missing
PID alone is insufficient. Preserve the exact original inode and bytes in an
exclusive same-filesystem quarantine, recheck identity immediately before the
move and verify its afterimage. Keep the original run and UNKNOWN effects;
quarantine grants no measurement admission, old-operation replay or cleanup.
Do not fabricate an acquired handle or change the output root to evade custody.

### Lock pathname replacement and informational CLI isolation

Linux lock release, stale reclaim and reclaim-guard owner reads must open with
`O_NOFOLLOW | O_NONBLOCK` before descriptor checks. A FIFO substituted after
`lstat` must deny without blocking, preserve the replacement and original lock
payload, and restore an uncertain quarantined guard. Actual FIFO fixtures run
in bounded native children; timeout/compile/runtime failures are not Killed
mutation evidence. Failed or nonterminal fixtures retain custody.

Owned lock removal may borrow a caller-held read descriptor, but rereads the
owner with bounded positional reads after rename and keeps every inode/path,
nlink, pre-unlink, fsync and restoration check. Only the descriptor owner closes
the borrowed handle. Short reads continue to EOF with the existing byte bound.

Direct `run --help` and `reconcile-artifacts --help` must succeed from their
metadata-only closure with no runtime files or workspace effects. Run help waits
for its actual stdout write completion before explicit entrypoint exit;
reconcile help uses natural exit. Normal operations retain runtime validation.
The complete public help matrix keeps its existing per-child 2s limit.

Knip's sole new binary exception is the POSIX system utility `mkfifo`, used only
by owned Linux FIFO fixtures, with creation exit checked and a bounded child.
This exact `ignoreBinaries` entry suppresses no file, export or npm dependency;
configuration/tag hints and all project issues still fail at zero. Do not use
this fixture requirement to introduce blanket ignores or drop maintained tests.

### Bounded read allocation and canonical Git marker

Actual short syscalls must fill and reuse a bounded slab rather than retaining
one full slab per short read. Bound target read-buffer backing storage by the
accepted payload plus one 64 KiB slab; this is not a total-process peak-memory
claim. Exercise many fragmented reads, binary bytes, EOF, under-bound growth,
exact-bound acceptance, one-byte overflow and positional lock-owner rereads.
An already-owned descriptor's initial size is only an allocation hint; it must
not become an EOF condition or remove the one-byte overflow probe. Returned
bytes own their storage independently of the working slabs.

The canonical root `.git` existence marker is an advisory no-follow,
nonblocking probe without content reads or CAS sidecar writes. Missing, file,
directory and symlink marker cases need real filesystem fixtures. Metadata
bytes and descendants, including mixed-case descendant spellings, stay denied.
Ordinary file existence keeps per-file CAS, contention and foreign owner/payload
custody. Marker probes do not authorize Git metadata mutations or stable reads.

### Fresh UNKNOWN storage refusal and move afterimages

After retained journal schema, operation ID/root and fresh-mode validation,
missing/default reconciliation consent must refuse UNKNOWN bootstrap write or
move before schema reconstruction, package hashing or Host open. Keep the same
effect-adjacent guard and every explicit-true owner, schema, bundle and afterimage
check. Malformed/foreign journals still deny first; activation consent retains
its earlier priority. Existing storage keeps its exclusion blocker.

Observe actual bundle reads on default general/fresh/direct database resumes;
require zero extra reads and exact journal bytes unchanged. Explicit same-ID
reconciliation must still perform current preflight. For bootstrap move lost
ACK, make the actual no-replace move before injecting failure: require retained
UNKNOWN, frozen target bytes/device/inode, absent staging, replacement-ID denial
and one total move call/effect after reconciliation. A Host maintenance-fence
generation is N/A at this bootstrap-only phase because no Host fence exists yet;
exact frozen database bytes and physical identity are the applicable invariants.

### Finite native dependency admission

Run the maintained native positive control before interpreting denied variants:
it must produce the complete ordered dependency edges. A denied variant must
change the intended unique Source occurrence; an unrelated earlier denial does
not prove the tested boundary. Validate full root/target/metadata/binary/hash/
safe-read/ABI relationships and reject additional helper calls or aliases.
Exact call-node exceptions never authorize a generic computed loader.

Module value bindings distinguish imported assertion functions from global
require. Cover optional and literal-computed resolver forms, exported runtime
bindings and type-only/ambient declarations without treating erased declarations
as runtime ownership. Exact package directory locator exceptions apply only to
their declared top-level immutable binding, decoder, URL and module identity;
nested, extra and file-resource URL nodes retain ordinary resource treatment.
Preserve original URL semantics on Windows UNC paths as well as POSIX paths.

Reuse the parsed AST and inventory for these checks. Keep one scanner test owner,
one mutation owner and one final verifier. Behavioral denial regressions do not
establish assertion-confirmed Killed, complete coverage or Runtime acceptance.

### Fresh CLI timing custody

The existing upgrade lifecycle preload supports opt-in observe-only child timing.
Clear inherited stop variables and bind the new fixture's exact root/operation.
Observe-only mode installs no stop or validator consumer. Register observers
before importing the stop-only upgrade consumer; reject incomplete stop tuples.
Preserve original values/errors/native Promise identity. Keep package and
consumer counters separate, and distinguish readBytes from readText operations.
Their returned bytes and elapsed times do not count raw physical syscalls.

Emit bounded synchronous aggregate progress with in-flight state; SIGKILL cannot
flush an exit handler. Timing and optional access trace share48KiB within the
existing64KiB stderr cap. Label preload startup and observer activity; do not
interpret instrumented wall time as uninstrumented latency qualification.

File UNKNOWN refusal requires full journal schema/digest/root/operation/progress
validation before the shared consent guard. Assert no extra package byte reads,
unchanged journal and afterimage bytes/device/inode, and no second effect. Exact
same-operation explicit consent retains live package/schema/owner/fence/CAS and
complete history/activation proofs. Keep child45s and each existing parent test
bound unchanged; passing another scope does not erase a timed-out receipt.

### Owned read filesystem timing custody

VIDA_UPGRADE_IO_TIMING=1 enables the existing fresh CLI diagnostic preload only
when VIDA_UPGRADE_BUNDLE_TIMING=1 is also explicit. The parent clears inherited
stop, timing and access-trace variables before supplying its own fixture tuple.
The filesystem observer is installed before Source consumer imports. Plain
wrappers retain original arguments, receiver, values, errors and function
metadata; they keep scalar aggregates rather than retained call buffers.
The read scope unwinds before diagnostic writes. Timing and access tracing share
the existing bounded stderr budget, including any truncation marker.

Filesystem numbers describe inclusive JavaScript API calls during package
readBytes. They are not raw syscall evidence, can overlap for nested calls,
and omit the native helper's internal syscalls. A SIGKILL leaves partial
progress, not final call counts or proof of zero in-flight work at termination.
Expected ENOENT probes count as failed API calls, not failed product operations.
Keep diagnostic overhead separate from uninstrumented latency acceptance.
Do not remove lock/reclaim flushes or reuse live bundle proofs across effects
from timing evidence alone.

### Acquired read namespace custody

Linux readBytes, readText, ordinary fileExists and the acquired-lock path of
readStableBytes use the parent descriptor and basename owned by that CAS lock.
A root pathname replacement after lock acquisition must not move observations
to a different namespace. Text decoding retains the existing UTF-8 replacement
behavior; strict text-image validation stays with its existing reader.

Stable capture retains its two existence probes and two byte reads in order.
Twice-observed absence returns null; appearance, disappearance, byte drift and
read failure reject while closing owned descriptors and releasing the exact
lock. The missing-parent pre-lock fallback still probes the safe pathname twice.
Regular single-link/no-follow/nonblocking/bounded EOF checks, orphan backups,
lock/reclaim flushes and the advisory canonical root .git probe remain in force.

Regression fixtures replace the root only after an actual CAS descriptor open.
They assert original bytes or absence through the moved parent, unchanged
replacement bytes, one root traversal and cleanup in the original namespace.
Same-parent faults assert appearance/disappearance/byte drift and original EIO.
Failed fixture roots retain custody and are not reused as later test inputs.

### Release consent and no-effect recovery custody

The shared resume consent guard rejects UNKNOWN release without explicit
same-operation consent after complete journal/root/ID/progress validation and
before package-bound verification. Keep the effect-adjacent release guard.
Explicit consent still verifies the live owner, bundle, fence and activation
closure; a held release beforeimage never authorizes another release call.

A typed activation move no-effect fixture verifies the real staging digest and
absent target before provider denial. Assert retained activation_staged, exact
staging bytes/device/inode and held fence; a foreign ID cannot change them.
The same operation can retry the unissued move and must publish the same inode
with one successful move. Its new two-attempt test has a90s bound. Existing
60s completion and45s child bounds are unchanged.

A release-before-effect fault throws before the original Host release method.
Assert UNKNOWN, exact held fence/journal/activation, no history and no repeated
release under default false, foreign ID or explicit true. Keep its expected
UNKNOWN fixture without teardown/replay; a passing refusal case does not make
its operation terminal. Regression failures are not mutation Killed evidence.

The direct fresh-resume history fast path is still separately reviewed: normal
retirement history is retiring/completed. A schema-valid non-retirement history
cannot authorize retirement or release, but may reach late refusal after extra
package/Host reads. Do not claim universal zero-read refusal for that unsupported
placement from the canonical/general-resume evidence.

### Conflicting UNKNOWN publication afterimages

File publication and activation-staging conflict cases use a real successful
write followed by lost acknowledgement, then change one byte in place and
fsync the same inode. Default and foreign-ID resume must deny before package
verification. Explicit same-ID reconciliation must deny a conflicting image
without another write/move, changing journal bytes, replacing file identity,
releasing the held fence, publishing activation or creating history.

The file conflict is rejected by assertFileSet before the narrower UNKNOWN
afterimage predicate. Activation staging with an absent target is rejected by
its own afterimage predicate. These are separate reviewed regression scenarios;
their expected nonterminal roots remain retained and must never be replayed.
Passing refusal is neither completion nor assertion-confirmed mutation Killed.

### Initial atomic intent publication custody

Initial publication shares one operation lock across fresh and existing planners.
When canonical intent is absent, refuse an existing .vida/work directory;
otherwise acknowledge creating that supported directory before invoking atomic
intent create. Keep it after failure. It is a conservative no-reissue barrier
for supported planners, not a complete operation or an atomic reservation against
arbitrary external filesystem actors. Existing canonical and retained legacy
staging recovery paths retain their previous validation and phase rules.

An absent-canonical UNKNOWN test must block read-only replacement inspection and
public repeated publication without another provider call or bundle verification.
Recovery must still report no complete retained intent; do not relabel directory
custody as intent_prepared or promise automatic repair. Exact canonical bytes
after a real atomic-create lost ACK may commit planned and recover the same ID
without another create. Preserve schema/ownership/token/beforeimage checks and
UNKNOWN versus typed no-effect distinctions. Emit retained fixture identity
before assertions and discard read-only inspection return values in toThrow
callbacks to avoid dumping complete operation byte images on regression failure.

Conflicting canonical bytes after a real create and lost ACK must deny planned
inspection and same-ID recovery before package verification or product effects.
Keep the foreign bytes/device/inode, the committed plan's exact beforeimages,
the no-reissue directory and absent database/activation/history. A refused parse
must not authorize journal replacement, another create or a replacement ID.

### Typed no-effect retirement and unchanged completion bounds

The retirement denial fixture validates the real retiring journal digest and
absent history before a typed SAFE_REPOSITORY_MOVE_NOT_APPLIED result. Verify
CAS restores released with the same frozen plan/token/activation and revision
one beyond the captured retiring record. A foreign ID preserves the journal,
activation and released fence. Same-ID retry completes history with two move
calls, one effect and one original fence release. CAS phase restoration can
replace the journal inode; do not assert old inode preservation for that write.

The new two-attempt retirement case uses90s, like the activation denial case.
Existing lost-ACK retirement retains its60s bound. A timeout remains FAIL, not
Killed, completion or evidence for raising the bound. Keep its fixture even if
late callbacks finish; never inspect/replay retained failed roots.
