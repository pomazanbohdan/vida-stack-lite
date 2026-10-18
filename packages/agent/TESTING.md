# Portable runtime verification

Owner: runtime maintainers.

Use this guide for the current agent. The [system specification](docs/system-specification.md) defines product behavior. The [development lifecycle](instructions/development-lifecycle.md#self-development-protocol) owns execution policy. The [package scripts](package.json) define the commands.

Use short sentences and plain terms. Keep one main idea in each paragraph. Aim for approximately 80% ASD-STE100 principles, as defined by [adaptive reporting](instructions/adaptive-reporting.md). This is a style target, not a compliance claim or measured score.

## Evidence status

Read operational status from the current work and release evidence. Version
text and passing Source checks do not prove installation or Runtime acceptance.
Keep dated runs, failed logs and audit history in their evidence stores.
Preserve FAIL and UNKNOWN. Missing numeric reports remain explicit gaps.
Coverage inputs retain distinct Source, test and tool categories. Their derived
runtime module union contains each exact logical path once; conflicting digests
fail, and distinct physical aliases still reach the existing alias guards.
Synthetic tool placeholders that are also selected TypeScript Source must be
valid inert TypeScript. Keep their untrusted marker; capture/instrumentation does
not turn synthetic fixtures into producer proof.
An expected-UNKNOWN fixture remains retained even when its denial assertions
pass. Its test owner marks retention separately from successful case completion.
For serial cases, an onTestFinished assertion can check exact retained bytes
after afterEach; the hook itself does not establish success or quiescence.
Settled fixture transport does not resolve persisted governance. The cleanup
owner checks its recorded creator database with the shared reservation validator;
reserved, commit_unknown and unreadable or malformed evidence retain the root.
Qualify retained bytes and normal terminal cleanup separately. An applied control
uses the real reserved-to-commit_unknown-to-applied transition; successful child
exit alone does not authorize disposal of another unresolved producer's lock.

Regenerable caches are not retained operation evidence. With no active owner,
clear Bun transpiler or install caches by their exact namespace; keep Source,
installed dependencies, executable binaries and unique operation evidence.
Never copy generated coverage or scratch into fixture Source payloads.
Deduplicate an old artifact copy only after byte/hash equality with a stable
original outside the cleanup tree. Keep a path/digest custody manifest and leave
unmatched or unreadable files in place. Lossless compression must reproduce the
original byte count and SHA-256 before removing the uncompressed manifest.
Cleanup neither changes FAIL/UNKNOWN classifications nor resumes an old attempt.
Do not touch an active producer's input image, output or scratch.

Coverage must use a provider compatible with Bun and report all required
metrics. The frozen-budget CRAP policy must match its executable gate; a fixed
legacy threshold does not establish that match. Pre-commit is authorized after
its required checks; pre-push and automatic mutation are separate.

## New and modified files

Apply this policy when authoring or changing production files. Inventory every
maintained function in each new or modified file, including private functions,
methods and closures. Include affected callers and public contracts in the test
plan. Classify generated code, dependencies and non-production tooling explicitly;
do not hide production functions through coverage exclusions.

Feature and fix developers write, run and correct their own tests and repair
defects within their authorized implementation scope. Independent verification
remains a separate role. Developers' test results are development evidence; they
do not replace independent review or grant Runtime acceptance.

Vida-Test owns shared test patterns, audits and authorized test refactoring.
During refactoring, Vida-Test sends discovered product/runtime defects and test
tooling blockers to TeamLead with reproducible evidence and the actual versions.
That report does not authorize Vida-Test to fix another developer's production
contour. This escalation rule does not prohibit feature developers from making
their own in-scope test and implementation corrections.

Defer unchanged legacy files to the separately authorized improvement queue.
Identify existing deficits inside a modified file and any affected dependency
explicitly. Required missing proof remains a GAP; an unchanged-file deferral is
not permission to waive an affected contract or present partial proof as pass.
Do not turn a bounded task into an unrequested whole-repository cleanup.

Before writing tests, map each function or owned behavior to its contract,
plausible regression, fixture, applicable scenarios, concrete case references
and results. Use Zero, One, Many, Boundary, Interface, Exception and Simple.
Add Replay, Persistence and Cross-surface consistency where applicable. Check
Fresh, Explicit, Persisted and Replay modes for stateful behavior. Explain each
not-applicable decision from the contract. Category labels, placeholder strings
and a broad suite pass are not scenario evidence.

Combine focused unit tests with integration checks at supported CLI, SDK,
database and subprocess boundaries. Use isolated fixtures and controlled external
dependencies. Preserve real persistence, restart, CAS, failure-before-effect and
UNKNOWN boundaries; synthetic approvals do not prove runtime authorization.
Configured-root tests derive positive project requests from declared projects and
the selected team's allowlist. Keep unregistered-project negative controls and
use a different registered, allowed project for binding-mismatch controls. Test
both configured-root and portable-template modes when changing shared fixtures.
Before loading a negative YAML fixture, prove its transformation changed the
input and inserted the intended malformed field; unchanged valid YAML is a
fixture defect, not a schema rejection test.
Use deterministic property tests and independent models where they protect the
contract. New test layers must add distinct regression confidence.

For timestamp contract changes, check every affected published schema leaf
against an independent instant-arithmetic oracle, including numeric offsets,
fractions, leap seconds and Gregorian century boundaries. The internal developer
command `bun tooling/rfc3339-schema-patterns.ts` updates the legacy leap-second
alternations without reformatting schemas and refreshes the runtime config schema
pin when that schema changes. It runs no tests and grants no numerical evidence.
Keep regex fragments in raw literals; verify regeneration and idempotence in the
existing completeness tests before publishing changed schema bytes.

Compare the maintained source AST inventory with fresh function, line, statement
and branch coverage. Require exact 100% coverage for the selected new/modified
production-file scope, with no missing function mappings. Executing a function
alone does not establish meaningful assertions or complete scenario coverage.
The shared AST inventory in `tooling/function-inventory.ts` supplies the
function identities and complexity values used by the CRAP gate and Git quality
hook. Do not add another inventory. Every retained CRAP budget row binds its
published `identity` to one reviewed `current_identity`; these pairs must be
one-to-one and exhaustive. Unpaired current functions require new-function
budgets, and unpaired published functions require removal dispositions. Do not
infer correspondence from matching ordinals or body hashes.

Give each inventoried callback or projection its own disposition. A parent row
does not account for its nested callable. When a new callable extracts original
inline logic that had no callable identity, review it under the existing
new-function policy. When an original callable moves into a helper, preserve
that original identity and ceiling on its actual successor. Added callers or a
new name do not make that retained role new.

Scoped report v3 uses explicit reviewed Source pairs when an implementation
splits across files or several files merge. The original/current function
dispositions remain exhaustive and one-to-one, with every original ceiling
unchanged. V1/v2 retain their existing interpretation. A reused original name
for a new thin adapter requires an explicit published `identity_reuses` record
binding the original role to its different substantive successor, plus a
separate new-function budget for the adapter. The producer and projection
consumer both reject missing, duplicate, foreign or unused reuse records.
Removed-plus-new identity resets remain forbidden. V3 requires
`source_mapping_kind: reviewed-pairs` and an explicit `identity_reuses` array,
including an empty array when no name is reused.
V3 also requires explicit `new_source_paths` and `removed_source_paths` arrays
in the published review and report. Together with the reviewed pairs they must
partition the exact current/original Source inventories without overlaps;
an omitted edge cannot silently classify a Source as added or removed.

Keep recorded contour Source selections immutable. A changed active Source
group gets a new contour name; preserve its predecessor under the existing
retired registry rather than invalidating historical receipts. The current
`main-governance-validation` owns both Edictum and the extracted approval-record
parser. Historical `main-governance` keeps its original single-Source selection.
All affected test selections stay intact; reassignment does not establish a
new closure, improve a score or change global Source coverage requirements.

Historical static inventory artifacts can contain both `baseline` and `current`
arrays. Only the original `baseline` array, corroborated by the published
measurement and original Source, establishes a frozen retained ceiling. A row
present only in `current` cannot establish a published counterpart or budget.
Review absent-original roles under the unchanged new-function policy; do not
introduce extra closures to satisfy a ceiling inferred from candidate data.

Published CRAP evidence uses the standard Bun coverage report with its run
manifest, immutable input snapshot, and process receipts. The evidence must bind
the published Source, selected tests, pinned runtime, and exact coverage-tool
bytes. A synthetic function table or source fingerprint alone is not coverage
evidence.

Mutation qualification targets 100% confirmed Killed mutants in the selected
scope and runs only with explicit manual authorization. Survived, NoCoverage,
timeout, execution/compilation errors, missing partitions and uncertain outcomes
cannot establish a passing result. A suspected equivalent mutant needs explicit
reviewed disposition and remains a GAP under the current executable gate.
Ordinary task authorization does not automatically launch mutation. Pending
manual mutation proof is reported as pending, never as achieved qualification.

For an explicitly authorized core-first campaign, improve one existing partition
at a time. Establish a passing original dry run, then classify every generated
mutant through the existing assertion/custody evidence owner. A survivor needs
a contract-backed regression or a product correction; never change correct
behavior merely to raise the score. Missing coverage needs a real scenario.
Runner errors, timeouts and incomplete receipts block the affected scope and
stay outside confirmed Killed. Generated scenarios remain unreviewed until
reviewed, and N/A needs a contract reason.

Reuse the captured input closure, function inventory and scenario/test IDs.
Invalidate evidence only for changed source/tests/tooling/config and their
affected callers. Independent agents may analyze disjoint mutants or prepare
disjoint fixes; one lead owns shared files, measurements and final admission.
Do not run duplicate full suites, scans or hash passes per agent. A complete
selected partition at100% is local proof, not global coverage/CRAP/mutation
acceptance. Preserve exact coverage and frozen complexity/CRAP requirements.
Retained .tmp and coverage report/snapshot trees are evidence, not fresh Stryker
sandbox inputs; keep them excluded from sandbox copying without deleting them.

The former combined `main-contracts` campaign is retired after two complete
attempts reached its unchanged deadline. Its original reports remain historical
observations. The active `main-public-ingress` and `main-envelopes` declarations
preserve its exact two-Source and four-test union, including shared fuzz tests.
Run and qualify each complete child separately. Neither child alone closes the
former obligation, and their results never synthesize a parent score. The
registry defaults to active declarations; only historical projection opts into
retired metadata. Preserve each old status, acceptance flag and counter while
excluding retired contours from active denominators and closure counts.

For public authorization and governed-write validators, assert value equality,
an independently owned frozen result, and isolation from later caller changes.
Do not require the input object by reference. Use a valid captured Proxy control
and an invalid captured image whose live reads would pass; require zero live
gets during validation. Rebase operation hashes before a scope-denial control
so an unrelated binding rejection does not mask the intended boundary. The
builder must consume the returned intent. Native matcher argument errors are
runtime failures, not assertion-confirmed kills. Neither a generic JUnit Error
nor a positive testcase assertion count establishes the throwing matcher's cause.
For exact rejection identity, await the existing `rejectionReason` helper before
asserting the returned error and disposing of fixtures. A Bun matcher typed as
returning void is not an awaitable completion boundary. Format changed TypeScript
files with the pinned oxfmt owner before staging, then run the unchanged normal
hook. Keep full captured static checks there; do not repeat full suites to fix a
formatting or matcher-typing failure.

The main-host contour selects `tests/host-capability-boundary.test.ts`. Its two
native cases own the seven host assertions extracted from the combined Cedar
completeness case. Provider cases run in the parent Bun process with fresh
query imports, so assertions and instrumentation use the same process. Snapshot
complete module exports before replacement and await restoration of both
namespaces after every provider case, retaining every cleanup error. Do not use
mock.restore() to reset module overrides. Keep these mocks serial and exclusive
until parallel qualification; modified tests invalidate old shard reviews.
NTFS/ReFS descriptor simulations are not native Windows qualification.
Observe a successful target call with not.toThrow and separately assert its
exact result. Keep imports, mocks, hooks and runner health outside that assertion:
their failure cannot become a product assertion kill. Test Windows provider
attestation and supported-filesystem proof independently, including false/true
and true/false combinations; a positive pair alone cannot distinguish AND/OR.
The full test selection retains all fourteen former completeness cases in their
owner test files. Avoid eager configured-context/index setup in this narrow contour: a
mutant's import/setup error cannot substitute for the target assertion.

The main-runtime-timing contour owns only src/runtime-timing.ts and selects its
direct runtime-timing-boundary test plus the single runtime-kernel-composition
case shared with the kernel contour. Kernel keeps its existing core tests, including
configured-workflow and smoke. The emitted-SDK regression belongs to
sdk-package-compatibility and remains in the full selection with SDK freshness.
Never compare Stryker-instrumented Source with an unmutated CI formation receipt
or rebuild dist per mutant. The full
selection retains the timing public-output subprocess check separately. Do not
substitute its child-health result for attributable target assertions.

For an asynchronous target expected to succeed, the timing test's local
expectTimingResult asserts doesNotReject around that target invocation and then
returns its result for separate exact payload assertions. Keep fixture setup,
imports, hooks and cleanup outside the assertion boundary. The real adapter
binds the node:assert AssertionError to its body; no Node process is needed.
Assert returned objects and call-ID types before property access or regex
matchers, so a missing target value fails the intended assertion. A raw runtime
exception or a matcher argument error remains unproven. Do not pad assertion
counts or relax the classifier to admit it.

`expectReturned` uses `node:assert/strict.doesNotThrow`. The real-adapter
synchronous-helper control copies the maintained `expect-rejection.ts` byte-for-byte.
It qualifies preserved ordinary/undefined returns and an attributable AssertionError
for thrown undefined with zero JUnit assertions. Invalid assertion arguments and
unrelated runtime errors remain rejected by the strict JUnit reader. This is
mechanism qualification, not a mutant score. Retain separate result assertions;
the helper checks completion of the target invocation only, not fixture health.
Its four serial adapter children justify the enclosing test's explicit 15 s limit;
the default remains 5 s per test.

Envelope descriptor regressions must check invalid captured schema/kind and stale
captured revisions against benign Proxy reads. Require zero live reads, independent
returned identity, null-prototype records and payload alias isolation. Assert the
actual consumed result. Envelope images remain mutable; public ingress validators'
deep-freeze contract does not extend to envelope validation.

Fuzz scenarios are selected by source owner: `fuzz-public-ingress.test.ts`,
`fuzz-config.test.ts`, `fuzz-envelopes.test.ts` and `fuzz-authorization.test.ts`.
Their shared helper owns seed/run/replay settings and unknown-value generation;
it registers no tests and loads no configuration. Pure ingress fixtures carry
synthetic identity fields only. Configured authorization keeps genuinely issued
config/context capabilities. Preserve the named-field malformed request checks
in ingress and the corresponding authorization denials in Cedar. Keep all seven
unknown-value validators: the three owner groups each retain the configured run
count, increasing this property's default total from 1,000 to 3,000 trials. Named-field
validation remains a separate 1,000-trial check; Cedar retains its 1,000 denial trials.
Do not import an aggregate test module during full discovery. The retired
main-contracts selector retains its historical fuzz.test.ts path for receipt
interpretation only; it must never launch an archived suite. Changed selections
require new receipts and do not rewrite old observations or replay paths.

Ingress residual controls isolate lexical timestamp rejection from native parsing,
and inject one parsed-null value among valid evidence values. Keep exact native
error assertions and restore parser spies before normal-call controls. Verify
object/non-null results before property access so an empty return is an attributable
assertion failure. The separate error-fallback file wraps a real schema validator:
only after false with nonempty real diagnostics does it expose a nonmutating
malformed diagnostic view. This tests defensive formatter fallbacks, not valid
Ajv ErrorObject data. Restore the compile spy before public calls, then verify
normal vendor diagnostics. No fake validator success or capability is permitted.

Timing invalid-input cases must observe absence of side effects, not only the
fallback error code. Give non-string message/code values a counted slice getter,
and invalid clock/threshold values a counted coercion hook. Require zero reads
and coercions, preserved original failure/result, and no action on an invalid
threshold. The same validated primitive must reach the numeric/string operation.

Mutation budgets have one data-only owner in
[mutation-limits.ts](tooling/mutation-limits.ts). They do not replace the Bun
per-test default or the full coverage deadline. A test command has a180000ms
hard cap; Stryker's dry-run envelope is240000ms to leave termination/evidence
headroom. Stryker derives a mutant allowance from twice its measured original
baseline plus10000ms, bounded in practice by the command cap. A partition has
a900000ms deadline. These are independent layers, not900000ms per test.
Command receipts record their configured cap. The existing process observer
owns termination escalation and output completion. If an outer Stryker deadline
interrupts a command before a complete receipt, the result remains timeout or
UNKNOWN; never infer an assertion-confirmed kill. Split oversized scopes rather
than raising all budgets. Changed limit/tool inputs require fresh affected proof.

The native batch pilot applies that same factor/overhead policy to one measured
complete passing baseline, retaining its existing190000ms command-plus-overhead
ceiling. Its diagnostic summary records the elapsed baseline and derived
allowance. Before each producer starts, the shared remainder must cover that
whole allowance; otherwise the remaining IDs stay budget-spent and unattempted.
This never resets the partition deadline or reclassifies an already-started
UNKNOWN. Actual hangs, incomplete captures and failed custody retain their
existing outcome. Per-test and coverage deadlines stay with their current owners.

Keep assertion diagnostics bounded for large payloads. A missing-throw Bun
`toThrow` assertion can serialize a multi-megabyte return into stderr and JUnit,
exceeding receipt bounds. Use native `assert.throws` with the expected error
message; assert the type before a large successful-value comparison, then compare
with a boolean assertion instead of printing both payloads. Qualify the missing-
throw negative control separately and retain its expected failure. Do not raise
capture limits or admit truncated artifacts. Path assertions whose custom Bun
labels produce generic JUnit Error need native assertions, preserving the exact
corpus, seeds and malformed UTF-16 values; positive body events alone do not waive
the AssertionError and custody requirements.

Budget fixtures retain exact thresholds while limiting per-array work. Prefer
many short unique string lists over a few enormous lists when testing an aggregate
resource cap; account independently for every included list and record. Exact-
limit invalid fixtures may deliberately reach a named later guard, while over-
limit fixtures must reach the aggregate guard first. They do not prove that the
whole invalid ledger is accepted. Check schema conditionals and uniqueItems before
claiming a semantic witness; earlier schema rejection cannot kill that later guard.

Stryker partitions reuse one scratch root. Record each process receipt and
post-run input check before deciding whether another partition may start.
UNKNOWN, incomplete output, signal, spawn error or missing owned-group termination
proof stops that sequence. A direct exit, including exit0, is not group proof.
The output-capture500ms close envelope includes stream reads, queued writes,
file sync and file close; its expiry does not identify the stalled phase.
Await both capture outcomes without an unhandled rejection. Even after a read,
write or sync failure, attempt reader release and native file close. Cancel a
failed reader before releasing its lock so an emitting child cannot block on an
unread pipe until the command deadline. Preserve cancellation errors too. A settled
capture failure retains the observed child exit/custody and ordered per-stream
error codes as `output-capture-failed` with `complete:false`. A deadline remains
`output-capture-incomplete`; neither state can qualify a mutation kill. A held-
sync regression releases its gate and observes both closes before fixture cleanup.
On supported POSIX hosts, a normal owned-group exit first probes group absence
without waiting or issuing another signal. If descendants remain, reuse the
existing bounded TERM/KILL settlement before returning. Preserve the original
leader exit/signal and timedOut:false plus the non-successful unobserved-group
diagnostic; successful cleanup updates custody, not execution success. Unsupported
group observation remains GAP.
The current observer is qualified on Linux; a native Windows campaign cannot
establish this proof through a direct-child result and remains unqualified.
Known nonzero exits stay available for reporting; they permit another partition
only with affirmative group termination. Importing the mutation gate runs no
campaign or inventory. These controls do not establish Killed mutants.

Rewritten test and shared-helper assertion adapters share one async context per
child while retaining exact file and test-body identities. A consumed assertion,
runtime error or overlapping body's assertion is not proof for another body's
failure. Exclusive adapter publication permits only exact equal-byte retries;
the child classifier's own fixtures do not qualify a full mutation scope.

For a demonstrated test bottleneck, record comparable whole-command timing,
collection/setup and child outcomes, then research relevant current official
documentation. Optimize the actual cause while retaining test selection,
isolation, assertions, security and evidence. Do not increase a timeout merely
to improve the reported result. Keep the focused-batch/one-completion-run policy
below; no separate benchmark or ROI lane is required.

Record the actual filesystem and mount backing each fixture. A private bind
mount inherits its backing filesystem; a path named `/tmp` does not prove tmpfs.
For disposable functional/process-recovery cases, an explicit owned host tmpfs
root can preserve real filesystem calls and every fsync without disk flush
latency. Retain failed or UNKNOWN roots after the child namespace exits; do not
use an ephemeral namespace-only tmpfs that loses them on exit. This does not
qualify power-loss durability or activate parallel coverage. Recheck the same
selected cases without filesystem timing spies before attributing an improvement.

Parallel writers use disjoint files. The lead schedules runtime measurements
sequentially and holds edits to observed package inputs during each run. Save
the command, terminal exit, raw log and exec session ID before yielding. Compare
identical cases and instrumentation under the same resource conditions. Keep
operation-count reductions separate from elapsed-time improvement. Partial
reporter rows, including nested child output, cannot establish whole-suite
min/mean/p95/max; setup and collection need their separate elapsed evidence.

## Local execution policy

Coverage captures its input closure once under the owned output lock. The
captured Bun pin must match the selected runtime before staging. Instrumentation,
snapshot files and manifest identities use those same captured bytes. Final
report admission still compares current inputs and validates snapshot custody;
the single capture does not waive Source drift checks.

Mutation partition descriptors bind the exact sorted Source subset and its
original captured digests to the parent Source fingerprint. Stryker rewrites
the sandbox subject, so those original digests are metadata bindings, not
expected hashes of rewritten sandbox files. Test/tool byte checks and parent
before/after current-input checks remain required. Binding predicate tests do
not establish real mutation execution or assertion-confirmed Killed.

Child runner health must fail with an ordinary error before behavior assertions.
A parent assertion about child exit status, timeout or reporter integrity cannot
prove that the child's own failure was caused by an assertion. Bind and classify
child test/body evidence before qualifying nested failures as Killed; until then
keep that mutation scope pending. Preserve ordinary test failures and UNKNOWN.
For synchronous isolated-test health and completion checks, reuse
`tests/helpers/synchronous-child-outcome.ts`'s `requireSynchronousChildSuccess`.
It throws an ordinary error on abnormal/nonzero exit or a missing completion
marker. Host and envelope boundary tests use this shared owner. Their successful
parent checks do not supply child assertion or coverage evidence.

The four upgrade denial scenarios share one sequential worker to amortize
module loading. Each inner Bun test keeps its5000ms deadline and fresh repository.
The coordinator has an18s pool deadline, derived from the four prior4.5s child
limits, and a20s integration-case exception for completion/report checks. This
does not apply an18s deadline to individual tests. Check all four named results,
terminal process status, complete counters and four distinct retained-root
records. Keep every original provider, journal, UNKNOWN and no-replay assertion.

The distributed SDK regression in tests/sdk-package-compatibility.test.ts joins a fresh selected formation input map to
the complete receipt input inventory, then captures the exact four emitted
JavaScript members. It executes copies of those captured outputs, preserving
the SDK subject. Stale or missing formation receipts deny; no Source fallback
qualifies emitted SDK behavior. Form the SDK separately before this regression;
build/install do not run suites. External dependency bytes remain outside
snapshot custody. This join proves selected input freshness and output integrity,
not authenticated formation origin or Native Runtime acceptance.

The repository coverage adapter obtains SDK test inputs from the successful
selected-commit `agent-sdk-coverage.yml` run. That CI job reuses the SDK builder
with `--test-inputs` and emits a distinct `CandidateSdkTestInputs/v1` receipt,
with exact `purpose: development-tests`. SDK regression accepts that exact
envelope or the existing product receipt; mixed identities deny. Test inputs
cannot enter SDK delivery verification or packaging. Their version binds Source
compatibility only; the lifecycle's product-release version policy remains intact.
The adapter validates the archive, emitted bytes and CI identity before replacing
dist, retaining previous outputs and failed staging. Unavailable or failed CI
remains an actionable preflight GAP; generated staging and prior dist custody
live under `coverage/sdk-test-inputs`, outside maintained handwritten Source.
There is no local compilation fallback.
It performs no second Source inventory/hash pass: coverage derives freshness
from the one existing capture below. Cache reuse verifies actual output bytes.
If Cloud denies the CLI's artifact-storage redirect, the selected GitHub connector
may download that same observed artifact and materialize its returned file through
the uploaded-file downloader. Pass its absolute path as
`VIDA_SDK_TEST_INPUT_ARCHIVE` to the maintained coverage command. The repository
adapter still validates current CI/run/attempt/artifact metadata, exact API ZIP
digest, bounded archive and the final Source join; a local file grants no proof.
This is a transport bridge, never local formation or an SDK freshness bypass.

Before a current full selection containing the SDK package compatibility test launches,
coverage captures the SDK builder inputs, receipt and four emitted JS members
in its existing input capture. Derive the formation subset from maintained
Source/schema inventories and the builder edges observed in that one closure
pass, never from the receipt's claimed input list. Validate that subset against
the receipt before staging or producer launch. A copied quality object or a
mutated exposed buffer cannot inherit the owner's private SDK projection.
Captured-byte validation hashes actual bytes, never caller-supplied digests.
Missing/stale artifacts block the run; form them separately without suites.

Review preparation reuses `coverageReviewInputPaths(anchor, changes, current)`
with typed Git A/M/D/R changes and the current owner's complete inventories.
Reconcile Source, test/helper, schema/resource and transitive tool memberships;
deleted and renamed-old paths are not live refresh inputs. Selected tests come
from the current owner, separately from helpers. The trusted `runBunCoverage`
callback receives copied frozen metadata, its actual review scope and any already
captured consumer binding after the existing capture, without private bytes or
a second scan/hash/capture. Its result still passes the eligibility resolver;
missing, stale, malformed or incomplete review preserves fallback/denial. The
default CLI keeps verified artifact review. No callback or Git path creates
resource authority, substitutes for capture, or derives closure from a receipt.
SDK projections share one private snapshot only within that capture; getters
still return fresh copies and reject changed exposed bytes.

Final-quality preflight reuses the CRAP owner's plan prerequisite validator
before inventory or coverage launch. Schema, baseline, disposition arrays,
published roles and in-repository bound evidence must be present; explicit
non-executable/non-exhaustive plans deny. Preflight shape acceptance is not
baseline/current correspondence or numeric admission. Full fresh validation
remains mandatory, and standalone diagnostic coverage stays available.

Every acquired coverage operation records a separate diagnostic under
`coverage/bun-unified/operation-outcomes/<run-id>.json`. Native producer close
observations are recorded before a spent budget can stop report assembly.
Keep timeout timer observations, SIGKILL, UNKNOWN, direct accounting, report
validation and quality completion separate. Attempt both supervisor and operation
record writes even if one fails; preserve all write and cleanup errors.
The CRAP producer records report validation before checking its budget plan,
so a later quality failure cannot erase that completed validation. This record
is diagnostic, not a coverage receipt, CRAP report or resource-quiescence proof.
Metric PASS still retains custody while resource advancement is unsafe.

Record current typecheck and CRAP child observations separately from test shards:
actual PID, status/signal, spawn error, observed timeout and direct reservation
disposition. Persist each observation before reading child output or report
markers. A known nonzero exit and an explicit deterministic report rejection
are FAIL; missing terminals, timeout, signals and filesystem uncertainty remain
UNKNOWN. Test counts never include these phase producers. Direct termination
alone does not establish descendant quiescence or resource advancement.

Typed HostState, Journal and Lease fixtures receive explicit identity, context,
source, revisions and ticket operands. Validate their actual codecs/schemas;
do not manufacture authorization defaults or normalize intentionally stale
predecessor state. Unit reconciliation verifiers share
`tests/helpers/workflow-reconciliation-authorization-fixture.ts`, with an
explicit principal and the exact request/persisted snapshot. This builder is
not a provider attestation or permission to reconcile real UNKNOWN effects.
Cleanup attempts each registered resource independently.
Only successful close removes a native handle; failed/UNKNOWN file roots keep
their retained disposition and metadata. A transient deletion failure does not
authorize automatic deletion of retained evidence on a later cleanup call.
Environment restoration distinguishes an originally absent PATH from an empty
PATH and from an uncaptured value; restore absence by deleting the variable.
Plain filesystem fixtures may share `tests/helpers/tracked-fixture-root-cleanup.ts`:
keep active and retained sets distinct and file-owned; await every removal before
reporting aggregate failure. This helper registers no Bun hooks and grants no
database, process, governance or retained-evidence disposal rights. Failed roots
leave the active queue only after retained custody is recorded; later cleanup
calls skip them. Preserve even a thrown undefined value as a failed outcome.

Observe asynchronous coverage deadlines through the actual owner timer scheduling,
not a removed native spawn timeout option. Join observed native PID/terminal to
the generated receipt; keep deadline expiry/kill controls separate from successful
map/artifact custody controls. A configured timer alone does not prove it fired.

Public run fixtures prepare real intake, scope and acceptance bytes before the
first admission. Keep admission arguments separate from persisted invocation
arguments; changing modes reject `--intake`. Test independent pre-admission
denials on fresh fixtures with the5s default, preserving exact CLI envelopes.
Inspect existing Work and journal rows through the read-only workspace API:
an empty bootstrap directory or database does not establish admitted Work.
Keep a positive attempt's preparation, issuance, CAS and reports together.
Released and staged selector cases use separate fresh roots and shared setup;
retain their existing integration deadline and every denial/custody assertion.
Splitting cases alone does not establish an aggregate speed improvement.

The final CLEAR P0–P1 regression scope includes these distinct contracts:

- A valid ledger and its records can exceed one ingress message's node count.
  Check codec parity, schema/byte/depth limits, foreign-record preservation and
  CAS. Ordinary ingress limits remain unchanged. Getter and serialization-hook
  rejection must occur without invoking them.
- Session inspection must return Work, Ledger and Journal from one committed
  snapshot. Reject foreign work keys, mismatched journal runs and stale or
  foreign lease tickets. Concurrent commits must never produce a mixed view.
- Release preparation must resume the same intent at each interrupted file
  publication point. Use state fixtures; preserve exact beforeimages, conflicting
  edits and UNKNOWN outcomes.
- Governed-write preparation failures must return a safe finite phase, retain
  their cause and count one denied attempt, with zero writer calls. Trigger a
  failed abort before commit starts to test cleanup custody and both errors.
  A failure after `markCommitStarted` tests UNKNOWN retention and must not be
  presented as proof that abort ran.
- Project configuration components must preserve all v1 values and configured
  paths through split/compose. Check exact field ownership, schema versions,
  revisions, identities, fixed local references and cross-component references.
  Reject oversized, deep, aliased or invalid Unicode inputs before use. The
  input binding must change for an edit in any file, including its metadata.
  Pure parsing/conversion must not grant loaded-config authority or perform writes.
  Include accepted v1 numeric boundaries. Block and flow YAML nesting must fail
  at the configured depth before Composer runs on an over-deep CST; preserve
  empty/single-document behavior and reject a second document.
- All Host and Mastra database readers must use the shared project path owner.
  Check the configured work root, the supported `.` root, canonical relative
  pointers, native absolute paths and existing public exports. Configuration
  validation and filesystem/Host checks remain separate required boundaries.
- Source inventory must preserve entry order, file identities, directory
  observations and repair-pass cache results. A failed root inspection must not
  publish a partial root identity. Reuse the existing inventory equivalence case
  and cover interrupted root inspection without invoking build or installation.

Run agent behavior, property, ZOMBIES, concurrency, fault, schema, integration,
and security checks locally. The coverage command runs the selected Bun Test
files, checks coverage, and checks CRAP budgets in one invocation.

CI/CD forms and publishes the exact package and its provenance/integrity metadata. Formation and installation run no test suites. Keep behavior, security, data, coverage, CRAP and mutation checks in development tasks. Do not add local delivery tests, compiler probes or copied-package installation harnesses. Synthetic artifact-state fixtures test their development task only.

During development, select the affected test files and cases. Include direct callers and configuration, schema, filesystem and subprocess dependencies. Use an exact file path with a name filter. Do not load unrelated tests.

After the task corrections are complete, run the full applicable task suite once. Reuse evidence while its inputs remain current. After a new failure, fix the cause and run one affected completion check that includes its regression. Do not repeat an unchanged passing full suite.

Collect terminal failures and review findings into one correction batch. Join
parallel writers before running its checks. One selected completion run can
prove the regression and affected callers together; do not repeat the same
cases as a second completion command. Workers do not launch duplicate suites.
After a failed full run, retain that result and recheck only affected behavior.

Finish expensive compiler, format and lint checks before bounded runtime cases;
these checks compete for CPU and can consume a case's five-second allowance.
Root captures shared Source/test/tool inputs once per settled byte state and
dispatches compact disjoint review packets. Workers reuse those bindings and
the existing inventory, without independent scan/hash/full-suite passes. A
packet is not an eligibility receipt. Reuse SHA-identical inventory roles only
with the same inventory-tool binding; changed or new roles require fresh review.

Pass exact file paths with name filters. A name filter alone may still load
unrelated files; see the official [Bun test runner guide](https://bun.sh/docs/test).

Run the final applicable behavior check before numeric checks on stable Source. Keep one writer for coverage, CRAP and mutation outputs. For a case timeout during concurrent heavy runs, inspect its child outcome and run that exact case alone before changing its bound. Preserve the original failed or UNKNOWN result.

Separate shared contained-package preparation into a bounded hook for the cases
that require it; keep Source-only cases outside that suite. Bun's unlabelled
`describe(() => ...)` preserves exact test-name filters. An empty string label
adds a separator to the full name. Track every pending body, including
Source-only cases, through its terminal custody checks. Keep failed consumer
roots even when no contained package was prepared; file cleanup retains fixtures
while a body remains in flight. If one consumer cleanup fails, report that root
and every remaining unattempted root.
A parent timeout does not prove that an asynchronous body has stopped.

Use current generated SDK outputs only when their inputs match. Missing or stale output is a GAP. Do not start a local build to make a test command pass.

Use supported temporary directories or explicit owned fixture roots. Keep Source-workspace scratch in ignored `.tmp`, outside the package payload. Preserve fixtures when a child outcome is UNKNOWN.

Initialization resource fixtures reuse the maintained inventory owner's exact
reserved-sidecar predicate. Preserve ordinary hidden files and lookalikes;
exclude only reserved custody metadata. Serialize Source-copy and Source-binding
behavior checks, retaining actual copy errors and prior failed receipts.
Initializer reader controls distinguish the executing package from the supported
explicit copied bundle. The public executing-package path uses the immutable
resource helper; explicitly selected bundles keep their existing SafeAccess/CAS
reader. Observe real package resources and selected-reader failure before
consumer publication, without caching across freshness boundaries.
Consumer migration controls use the fixture's public derived workspace identity.
Reset close observations at the selected capture boundary so an earlier probe
cannot satisfy cleanup assertions; record native close completion and exact
source-before-gate ordering. Retain body plus close errors and verify retry of
that same handle. Snapshot digest assertions use logical bundle-prefixed paths,
not the physical reader's relative operands.

Bootstrap-inspection fault controls target schema and sentinel validation
separately, then inject failure before the exact native source close. Require
both original causes, unchanged image/journal/activation bytes, the held paired
gate and same-handle retry before another admission. Match SQLite integer mode:
safeIntegers returns bigint. SQLite closure regressions must observe native
prepared-statement and partially consumed cursor behavior before test cleanup;
finalizing statements or force-closing handles first would mask the defect.
Instrument each handle's first close only, preserving defensive repeated closes,
and always restore/finalize retained probes in finally. A malformed serialized
journal-header fixture must actually fail Bun's native parser after a query
(deserialization is lazy): 3/3 and 2/3 fail, while 2/1 remains readable. Exercise
both Host and Mastra inputs; rebind digests and prove both images remain unchanged.
An SDK-close fault injected after native close cannot qualify fallback force-close:
inject before native close and observe the retained statement/cursor before cleanup.
Use one complete scenario label in Bun test.each titles so repeated placeholders
do not collapse distinct cases into duplicate test IDs. These
native observations do not substitute for assertion-confirmed mutation results.
Controlled dependency-fault cases may exercise existing defensive diagnostics
with missing COUNT/PRAGMA rows or appended hidden metadata. Label that fault
model explicitly; it proves fail-closed handling or metadata filtering, not that
native SQLite returns an invalid row or that a new schema family is supported.
Assert the exact intercepted query/handle/occurrence, unchanged input images and
owned closure before test cleanup. Keep native-output and dependency-fault
evidence distinct, without excluding survivors or inferring mutation results.
Positive image fixtures validate the returned public shape and safe-integer size
before numeric, string or binary assertions. Numeric matchers given undefined
throw an argument error rather than an assertion failure. Keep this guard in the
shared positive-result helper; negative tests must still invoke the original
operation directly, so a helper assertion cannot count as product rejection.
Exact row-count boundaries retain the real100000-row SQLite population, total
count, edge witnesses, bulk multiplicity and integrity check, while using minimal
repeating payloads for the interior rows. Keep heterogeneous values, primary keys,
BLOBs and large integers in their existing dedicated preservation cases. Avoid
making every boundary row a distinct sorting/serialization workload when that is
not the boundary's contract. The real4MiB image case also round-trips through the
public validator; its ordinary success is independently asserted in that body.
That same positive operation records actual SDK init/close receivers and requires
each observed owned store to be closed exactly once before publishing the result.
Compare receiver identities, not a fixed store count or deep-equal stand-ins.
Scope and restore these observers around that one operation; never let a skipped
cleanup survive until an unrelated large fixture times out.
When a test helper retains an action failure, restore its owned resources and
rethrow that same failure before any success-path assertion. A later successful
matcher can consume causal assertion evidence; it must not mask the primary
failure before mutation attribution. Keep success-only invariants on the normal
completion path, without weakening the reader's UNKNOWN classification.
An error path must still fail any independent forbidden-effect invariant: the
no-retry helper checks zero calls on success and whenever a retry occurred;
only a zero-retry failure skips the later successful matcher before rethrowing.
Otherwise a caller's broad catch could mistake the retry sentinel for its
expected operation error.
Shared work-and-close helpers preserve single and
combined failures; async work must settle before close. Await the owned promise
explicitly before a matcher instead of awaiting a synchronous matcher result.

Closed checkpointed WAL-image controls preserve raw bytes/digests and physical
source files. SQLite deserialize requires rollback headers: normalize bytes18/19
only in a distinct copy when both are2. Cover Host, Mastra and both sources,
BLOB/bigint/duplicate/sequence values and a seeded Mastra row. A held-connection
mechanics pass does not qualify closed-image capabilities or legacy exclusion;
WAL/SHM can remain present. Native Bun timing output is not an incremental
completed-file source on an interrupted child; use only qualified complete-run
file costs, never summed partial/nested PASS rows.

Tests and comments describe current supported behavior. Do not include narratives about absent legacy implementations. Human authorization covers the strict Knip precommit gate. Qualify its staged snapshot, tool/config failures, formatter check, one strict maintained-TypeScript program, lint and focused-test enforcement. Hook activation proves enforcement, not quality closure: existing findings must continue to block commits. This authorization does not activate pre-push coverage, CRAP or mutation checks.

## Commands and pins

For dependency updates, compare current official stable metadata once, qualify
the affected owners and keep exact manifest/lock bindings. Babel Core 8 supplies
its native declarations and parses standard import attributes without the old
plugin name. Exercise generated code and original function counters, separately
from inventory or typecheck. fs-safe identity guards use direct bigint captures
or exact receipt companions; never convert rounded IDs to bigint. A matching
hash after a rename error does not prove the destination's identity. Keep UNKNOWN
and the original error when exact verification is unavailable. Off-platform
native cases are explicit skips, with target qualification still pending.

Run commands from `packages/agent`. Use the pinned launcher and frozen lockfile. The launcher must select the exact stable version in `.bun-version`, mirrored by `packageManager` and `engines.bun`. A global Bun version must not change the pin. Update that owner after current official release research and affected qualification; do not duplicate runtime version literals in validators, current tests or CI. Historical receipts retain their original version.

The frozen `b549951` CRAP baseline uses the four-file Bun native coverage set
declared by that commit's `test:coverage:pinned` command and
`tooling/run-bun-native-coverage.mjs`. In an isolated checkout at exactly that
commit with the current quality tooling overlaid, run
`bun tooling/run-bun-coverage.ts --published-baseline=b549951`. The report
records this baseline-only selection and fingerprints every published test
input, including files outside the selected four. The CRAP gate verifies those
bytes against `b549951`. This report supplies frozen baseline evidence; the
current coverage gate accepts only the full current test set.

Select current coverage tests by supported test suffixes within the captured
test tree. Resolve selection once into exact paths and hashes for the run;
membership rules do not replace its immutable manifest. Keep ordinary command
phases and mutation source-to-test mappings distinct. A mutation partition
describes applicability, not merely file membership. Do not apply current
selection rules to the four published baseline tests. Capture TypeScript
declarations as tool inputs, but exclude `.d.ts`, `.d.mts` and `.d.cts` from
runtime module inputs regardless of their basenames.

Current coverage capture checks selected test bytes with pinned Bun's
`Transpiler.scanImports`, reusing a scanner per supported loader within that
capture. Deny static Vitest module requests (imports, reexports, dynamic imports
and CommonJS loads), including escaped specifiers and intervening comments.
Quoted test fixtures, comments and erased type-only references are allowed.
This is conservative syntactic evidence: a shadowed `require('vitest')` is also
denied; it does not prove module execution or lexical binding. Computed module
names and resolution-only `require.resolve` remain outside this static check.
Preserve the captured bytes and hashes;
do not add a second Babel AST or filesystem capture pass for this check.

The test-function auditor, focused-test guard, mutation preload and mutation
hook-dependency analysis share the filename-based Babel
syntax owner in `tooling/babel-syntax.ts`. Plain TypeScript retains generic arrow
and angle-assertion syntax; JSX is enabled only for JSX filenames, including
discovered `.test.tsx` inputs. The auditor reuses each parsed test AST and reports
static links separately from execution. This syntax policy does not expand the
maintained product Source inventory or qualify JSX runtime execution.

For a focused check, use:

```text
bun bin/bun.ts test ./tests/FILE.test.ts --test-name-pattern "CASE_PATTERN"
```

The published fixture protocol is owned by
`.agent/work/core-runtime-reactivation/BASELINE-FIXTURE-PROTOCOL-20261010.md`.
Direct child capture completeness is separate from fixture success and parent
module loads. Known requested interruption in a published producer test is not
mutation Killed; timeout/error/unobserved output never qualifies. Sync UTF8 proof
binds returned text, not raw OS bytes. Fixture coverage scratch has no admission
authority. Captured fixture files are read-only, but their directories permit
real CAS sidecars. Same-UID modes do not establish immutability: compare all
captured bytes in both roots after successful execution and again at consumer
admission, using the already captured buffers. Declared external dependency
links retain the existing dependency trust scope.

## Lint and type contracts

Maintained handwritten implementations, CLI/bootstrap Source, development tools,
tests and helpers use native TypeScript. New files use TypeScript.
Strict `checkJs` is transitional and does not satisfy TS-only completion.
The `quality:ts-only:pinned` gate enumerates declared Source roots and
rejects JS/MJS/CJS/JSX implementations, including untracked or Git-ignored Source.
Generated JavaScript is allowed only at declared compiler/SDK/delivery output
boundaries; native shell/PowerShell adapters retain their platform contract.
The filename scanner excludes the exact declared package `node_modules` roots
before rejecting links; it never traverses those dependency targets. All other
links remain rejected. This does not attest dependencies or change the separate
standalone fingerprint command's link policy.
The gate runs before costly final suites and stays FAIL while legacy violations
remain. Do not add legacy exceptions or reduce selection to make it pass.

Migrate a file with imports/callers, native types, named regression and explicit
frozen function correspondence. Path/extension changes cannot reset retained
complexity or CRAP allowances. Source purity, typing and behavioral/numeric
evidence are separate required checks.

The strict quality command must include native TypeScript tests and helpers,
using the combined checked project to avoid redundant CLI/tooling/test compiles.
The focused test project remains available. A filename-only pass cannot certify
that a test's types compile. Before moving public CLI/bootstrap paths, verify
the generated artifact's exact Source binding, manifest/exports closure and
actual supported version/help/dispatch routes.

The focused `tests/tsconfig.json` permits `.ts` imports with `noEmit:true` and
uses the repository root for `rootDir`, because maintained tests import declared
repository tooling. Its selection and inherited strict options stay unchanged.
This does not change the package Source project's extension or emission policy.

Scenario matrices may reuse explicitly reviewed contract applicability profiles
and scenario definitions, while retaining exact function IDs and unique named
test cases. Profiles do not attest to assertions or executed behavior. Generated
drafts stay unreviewed; missing/empty cases, duplicate names, unknown profiles,
stale hashes and unjustified N/A fail closed. Update affected slices and shared
profile consumers rather than reconstructing each function's matrix separately.

The function/test audit reuses captured Babel ASTs for Source, tests and its
bounded package-local `tests/` and `tooling/` export-resolution closure. Helper
bytes and resolver bounds bind the configuration hash; each helper is parsed and
hashed once and never adds a product function row. Already selected test modules
reuse their captured ASTs and test hashes as export-resolution subjects. Package
JSON/schema defaults are validated as UTF-8/JSON data, hashed once and never
parsed with Babel or inventoried as functions; named JSON exports stay unsupported.
Package-owned Stryker configuration remains a captured JS export subject. Source,
tests, helpers, matrices and configuration use lossless fatal UTF-8 decoding.
Parser metrics count actual invocations, including failed attempts. Helper bodies do not transfer
execution or assertion evidence to Source. Runtime values, class identities and
function rows are distinct: a direct `new` links only an explicit inventoried
constructor, and constants do not create function links. Erased type syntax and
type-only exports cannot supply runtime evidence. Missing, unsafe, ambiguous or
unsupported used runtime imports remain blocking; do not suppress diagnostics
to release queue jobs. Repository `tooling/agent/` export subjects require an
explicit canonical repository ancestor of `packages/agent`; links and other
external subtrees remain denied. Reexports back to captured package Sources reuse
their existing function identities, bytes and ASTs.

Static namespace links also support one top-level `const` identifier initialized
directly by `await import()` with a relative string literal. Relative module
paths start with `./` or `../`; bare dot-prefixed names and exact `.`/`..` are
unsupported. Options, phase modifiers, wrappers, mutable bindings, writes and
lexical shadows cannot supply these links. Literal same-target Bun module mocks
withhold awaited namespace links; named aliases and Bun namespace imports share
the existing binding resolver. Nonliteral or indirect mock flows are not modeled,
and existing static-import mock behavior is unchanged. All links remain static
evidence; generated scenario applicability stays unreviewed. Resolver edges and
helper ASTs use the existing capture, without a second scan or parser.

Capture uses bounded no-follow descriptor reads without CAS sidecars. Source,
tests, matrices and tool configuration have an 8 MiB file bound; auxiliary
resolution inputs have a 1 MiB file bound and an 8 MiB aggregate bound. Growth
of an opened file must obey the same bound. Linux and Windows use the existing
attested provider and never fall back after a provider failure. Other platforms
use the library's rooted, identity-checked bounded descriptor reader; simulated
platform tests do not qualify a native OS. Neither reader promises an immutable
file image against concurrent in-place writes or a multi-file snapshot.

The CLI captures its manifest once and uses those exact bytes for Source
selection, configuration hashing and JSON export shape. Reuse the inventory's
validated JSON image, including its supported BOM, without a second JSON parse.
Cache access objects only within one capture. These static links do not prove
execution, coverage, assertions, reviewed applicability or mutation outcomes.

Fix every lint error and warning. Do not disable rules, lower severity, add suppression comments or accept a baseline to hide a defect. Use `--max-warnings 0` for the final lint gate and the approved precommit checks.

Oxlint type-aware analysis needs a declared TypeScript project for each file. Source uses the package `tsconfig.json`; maintained TypeScript tests and tooling use their standard nested projects. An import-resolution flag does not place an excluded file in a typed project. Keep the Bun/Node declarations and exact pins current. Runtime and declaration packages have independent published versions: read `.bun-version` for execution and the manifest/lock for declarations; do not require artificial version parity.

Type shared fixture state and helpers with the existing production contracts. Give SQLite results the exact selected row type and check missing rows. Preserve deliberately invalid test inputs with separate malformed values; do not present them as valid production data.

Maintained Source and tests are TypeScript-only. A zero-lint result does not
prove that their TypeScript contracts compile.
The mandatory full typecheck first rejects any maintained JS/MJS, then compiles
the captured maintained TypeScript files in one strict project, including CLI,
tooling and tests. It also checks the Source project, which owns `src/**/*.ts`
and retains its stricter prohibition on TypeScript import extensions.
During migration, use `tsconfig.checked-js.json` for one combined strict CLI/
tooling check; it also remains mandatory for the staged precommit snapshot.
The separate CLI and tooling commands remain available for focused checks.
Do not add another full CLI/tooling pass to a successful all-maintained check.
Bun 1.4.3's `bun check --project ... --no-pretty` owns these no-emit checks,
including the explicit all-maintained root list and staged snapshot project.
Require the Source-selected Bun before executing the gate. Its embedded
TypeScript 7 compiler replaces the previous no-emit subprocess; it does not
replace Babel inventory, semantic consumers or TypeScript declaration emission.
Keep `tsc --emitDeclarationOnly` in SDK formation. Do not add `--check` to
test/run/build after the existing checker: successful commands would execute
their operation and duplicate typechecking. Build/install still run no suites.
Keep mutable test seeds separate from readonly production snapshots. Use the
complete current Work contract for valid research fixtures, and check nullable
Host state, journal versions and original request pointers before use.

Parse external JSON as `unknown`. Check records, arrays, status values and nested containers before use. Keep identity, digest, size, scope and caller checks. Avoid a broad cast or a library type that reintroduces nested `any` at an untrusted boundary. Check array shape without widening an already typed readonly array to `any[]`.

Preserve async assertion completion. If a matcher declaration differs from its runtime thenable, standard Promise assimilation can retain the awaited result. Do not delete the await merely to clear lint. Handle APIs declared as synchronous or asynchronous in both forms.

Cleanup must retain the original failure and any cleanup or recovery failure. Throw after cleanup; use an aggregate when both failed. Include errors from recovery listing and completion probes. Keep unresolved process or fixture custody. A lint correction must not turn an uncertain result into a pass or remove a negative regression.

CRAP tooling reads AST locations and coverage counters through checked types.
Counter values must be non-negative safe integers; do not coerce malformed
values into covered evidence. Each provided location requires a valid start
with an integer line of at least1 and an integer column of at least0. Reject
invalid locations before mapping; do not skip them or substitute column0.
The pinned Istanbul implicit false arm of an `if` without `else` has the exact
empty location `{start:{},end:{}}`. Accept this sentinel only as the second arm
of a two-arm `if` when the complete branch map matches the canonical map
generated from captured Source bytes. It still requires its own covered counter;
unbound empty coordinates, map drift and forged locations deny. Reuse the
validator's transient canonical Source maps in CRAP validation; do not generate
a duplicate instrumentation pass or substitute decoded report maps.
Check coordinates against the actual source line length. A large integer column
must not move a statement into a later function or remove it from the denominator.
Missing function/file/statement coverage stays uncovered. Keep source-fingerprint
checks, exact function mapping and nested statement ownership. A clean lint or
type result for the gate does not prove that product coverage or CRAP passed.

The precommit checks use pinned Bun, Bun-hosted Knip and Oxfmt `--check`, one strict TypeScript program with `--noEmit` for every maintained staged TS root, including Source, CLI/tooling, native tests and helpers, type-aware Oxlint with its locked native tsgolint helper and the shared AST guard for focused tests. Knip runs once with all-code workspace/test entries, zero allowed issues, and configuration/tag hints treated as errors. Do not use production/strict mode to drop tests or dev dependencies, blanket ignores, issue baselines, cache-based freshness, autofix, or `--no-exit-code`. Public SDK entry exports remain supported API roots.

Resolve the native tsgolint optional dependency from its installed wrapper's
package metadata, supporting both hoisted and Bun isolated dependency layouts.
Keep the staged lock dependency-edge, version, platform and executable checks;
a missing flat top-level native package is not itself a dependency failure.

Capture the active Git index once and materialize its raw object bytes in one owned temporary tree. Reuse it for every precommit check; create its exclusive compiler config inside the same identity-checked temporary owner, outside the raw tree; do not read changed worktree bytes, run checkout filters, format files, or invoke `git add`. Valid partial staging is supported. Preserve indexed paths and modes, including assume-unchanged/skip-worktree entries and staged deletions. Reject conflicts, links, unsafe paths, missing tools/config, or any check failure. Compare the live index with its captured bytes and identity after checks, including failures; preserve concurrent index/worktree changes. Cleanup must prove temporary-root ownership and fail closed on uncertain cleanup. The focused-test guard detects Bun `test.only` and aliases while allowing comments and strings. Include root instructions, sidecar, YAML, attributes and package manifests/configuration in the common staged tree.

While fixing lint, capture complete machine-readable diagnostics in the owned ignored output directory. Read counts, rule groups and bounded examples. Do not print the full report. Recheck changed files and their callers; run the complete current profile once after the correction batch is stable. Require zero errors and zero warnings before claiming lint closure. An activated gate must reject outstanding diagnostics.

## Completion commands

Use the current scripts for the applicable completion checks.

| Check                          | Command                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| Toolchain and input layout     | `bun bin/bun.ts run test:toolchain:pinned` and `bun bin/bun.ts run preflight:pinned` |
| Configuration                  | `bun bin/bun.ts run test:config:pinned`                                              |
| Ordinary agent phase           | `bun bin/bun.ts run test:pinned`                                                     |
| Repair and recovery            | `bun bin/bun.ts run test:repair:pinned`                                              |
| HostState and lifecycle        | `bun bin/bun.ts run test:host-state:pinned`                                          |
| Public run entrypoint/recovery | `bun bin/bun.ts run test:run-entrypoint:pinned`                                      |
| Resource integrity             | `bun bin/bun.ts run test:resources:pinned`                                           |
| Fuzz                           | `bun bin/bun.ts run test:fuzz:pinned`                                                |
| ZOMBIES                        | `bun bin/bun.ts run test:zombies:pinned`                                             |
| Deep properties                | `bun bin/bun.ts run test:deep:pinned`                                                |
| Static quality                 | `bun bin/bun.ts run quality:static:pinned`                                           |
| Full Source types              | `bun bin/bun.ts run typecheck:source:pinned`                                         |
| Coverage and CRAP              | `bun bin/bun.ts run test:coverage:pinned`                                            |
| Saved coverage report          | `bun bin/bun.ts run coverage:gate:pinned`                                            |
| Saved CRAP budget report       | `bun bin/bun.ts run crap:pinned`                                                     |

The run-entrypoint phase selects both `run-entrypoint.test.ts` and
`run-entrypoint-recovery.test.ts`; neither belongs in the ordinary phase.
Their shared run-result parsers live once in a pure test-support module. Keep
the four copied-bundle recovery case names and their enclosing describe name;
path/name test references move to the new file, while production function IDs
stay unchanged. Existing Bun mutation and V8 skip policy stays unchanged.
All four recovery cases own one private copied bundle and run serially in that
file. Consumer roots are fresh per case. Source schema/template dependencies
are immutable raw reads during the Source freeze: they create no CAS sidecars,
and reviewed selected peers do not mutate those live files. Distinguish these
read-only dependencies from actual shared-root CAS effects; ordinary bundle and
consumer CAS still require their exact private owners. This scoped review does
not remove common-resource tags from other files or qualify successor waves.
Known assertion/cleanup failures retain and report fixtures independently from
UNKNOWN child outcomes; UNKNOWN still denies copied-bundle reuse. A file split
and an affected caller pass do not establish a complete-run timing improvement.
| Format | `bun bin/bun.ts run format:check:pinned` |
| Final applicable local matrix | `bun bin/bun.ts run local:candidate:pinned` |
| Portable local subset | `bun bin/bun.ts run verify:portable:pinned` |

`bun run test` selects four disjoint agent phases: ordinary tests, repair, HostState and run entrypoint. It does not build or install. `verify` is a local subset. It does not install dependencies or a bundle. `ci:pinned` is delivery preparation; run it only through the delivery lane.

Launch `test:mutation:pinned` only with its separate manual authorization. An inventory check does not prove that mutants ran or were killed.

For an explicitly authorized bounded diagnostic, run
`bun bin/bun.ts run test:mutation:pinned --pilot-partition <exact-declared-name>`.
This selects one existing runnable partition with its unchanged sources/tests
through the same input, process and assertion-evidence owners. No arguments
still select the complete campaign; `--inventory` remains campaign-free and
cannot be combined with a pilot selector. Malformed, duplicate, unknown, static
or pending selections fail before creating campaign evidence.
The diagnostic emits CandidateMutationPilotReport/v2, selected/omitted
partitions, assessed sources and full_qualification:false. A pilot-pass and
its selected-scope effective_score never establish full mutation qualification;
final quality accepts only the complete CandidateMutationReport/v4 contract.
Zero mutants, survivors, unconfirmed Killed and UNKNOWN cannot pass the pilot.

MutationInputDescriptor/v3 keeps the complete captured test_selection separate
from partition tests. Both producer and runner use the coverage owner's test
fingerprint formula; selected tests must belong to that captured selection.
Invalid descriptors retain an input_rejection stage and launch no test child.
When the captured runtime closure includes tests/configured-context.ts, the
same capture/tool fingerprint binds exactly four _repository/test-context
inputs: root runtime config, AGENTS.md, AGENT.sidecar.md and the declared
documentation-policy JSON. The mutation runner retains their already verified
buffers and exclusively creates a fresh configured-test-context below that
invocation's adapter directory. AGENT_RUNTIME_TEST_CONTEXT_ROOT selects it for
configuredTestContext() and configured YAML, fuzz and repair fixture reads;
AGENT_RUNTIME_TEST_REPOSITORY_ROOT keeps the parent Source/tooling binding.
Fixture readers prefer the context root when present. Do not redirect parent
input verification to it or read shared repository state as a fixture instead.
Package schemas and templates resolve from the executing captured package root,
such as the test module's package-relative location; they are not project context
files. Keep project output/configuration reads on the sealed context. Do not
expand its four-file layout or copy uncaptured package assets to fix a reader.
Never copy .vida, work, databases or leases into this fixture.
Parent admission verifies the deterministic root/digest receipt binding, exact
layout and bytes before accepting an outcome. Failed materialization launches
no tests. Retain the root with runner evidence on failure/UNKNOWN; never reuse
it. These post-run checks assume trusted selected tests and do not authenticate
the absence of adversarial mid-run substitution. A parallel runner control does
not qualify Stryker's full mutant universe or parallel coverage shards.
Stryker's score-based process exit is disabled; VIDA alone enforces100%
assertion-confirmed Killed after admitting complete process and receipt evidence.
A surviving mutant remains a gate failure, not an infrastructure UNKNOWN.

Mutation baseline and mutant commands share the full selected file argv,
`--max-concurrency=1 --bail=1`, the5s case limit and the existing reporter/preload.
Keep the existing single-process file mode; do not add workers or test filters.
The exact command remains bound by the existing execution identity and receipt.
Coverage keeps its complete non-bailing command.

Baseline admission retains strict selected-file completeness and the passing
native JUnit case census. A Survived candidate must preserve its exact raw
file/name/outcome multiset, including intentional skips and duplicate rows.
Only confirmation of an actual mutant ID may accept a subset of selected JUnit
suite files, and only when the existing exact assertion/body proof classifies it
as Killed. Omitted cases remain unobserved. Foreign/duplicate files, inconsistent
counters, runtime/hook errors, incomplete receipts, timeout, signal or uncertain
process custody remain UNKNOWN. A partial passing report cannot establish PASS.
The Linux main-host declared-partition pilot qualified this early-Killed route
with69/69 assertion-confirmed mutants; its exact receipts are in WORK. It does
not qualify the full mutant universe or parallel coverage. Other partitions
retain their own complete receipt and causality requirements; controls alone
are not a score.

An explicit child environment replaces inheritance; removed parent variables
must not reappear. Completed output capture must dispose of its deadline timer.
Static Source inventory excludes only declared package-root .tmp evidence
directories, alongside generated outputs. It still checks handwritten nested
.tmp paths and rejects symlinks at those declared boundaries.

Run the selected coverage files with Bun Test under the pinned Bun host. A test
with a Vitest import fails closed until it is migrated. Do not treat that
failure as coverage evidence. Keep any remaining Vitest tests under the pinned
Bun host. Use the package's configured test resolver, fixture factories, and
maintained `bunfig.toml`.

Test the public CLI through the existing pinned child-process helper. Assert
terminal status, signal, spawn error, public JSON envelope and persisted state
before normal owned cleanup. Keep separate implementation-seam tests when they
protect an invariant that cannot be observed across processes. Imported `run()`
is not a declared public SDK export. Current LibSQL 0.5.29 can retain native
statement handles until process exit; do not hide EBUSY or claim that CLI proof
fixes in-process SDK disposal. Retain earlier uncertain cleanup roots.

## Evidence and quality gates

### Per-test mutant coverage capture

`bun run mutation:map` captures the current global Source/partition index without
running tests or generating mutants. Its `MutationMapInventory/v1` output binds
the exclusive `global-mutant-map.json` artifact and all current input hashes.
An inventory has zero generated universes, not zero mutants: pending, omitted
and unobserved assignments keep `mutant_count:null`. The index includes every
maintained mutation Source and all platform assignments.

Every runnable contour uses the public `vida-mutant-map` Stryker reporter. The
reporter writes a bounded exclusive `*.map-plan.json` synchronously from
`onMutationTestingPlanReady`, before mutant execution, then an append-only engine
event journal and terminal digest record. A timeout retains the whole generated
plan and its partial journal; neither supplies assertion-confirmed results.
Plan API positions start at0; engine event/report schema positions start at1.
One canonical owner normalizes both to one-based start-inclusive/end-exclusive
ranges. Identity binds captured Source digest/path, range, mutator and replacement;
local Stryker IDs may renumber and are never global identities. Canonical metadata
uses the existing sorted JSON contract; input fingerprint serialization is unchanged.

The parent reconciles unique plan identities, the already-parsed engine report,
journal IDs/statuses, terminal artifact digests and original dry-run binding.
Reporter callbacks can fail without failing Stryker, so absent/invalid map evidence
makes parent qualification UNKNOWN. Engine Killed remains unconfirmed until the
existing JUnit/body assertion and process-custody owner confirms it. Linux and
Windows results stay separate. The final quality owner requires the bound current
global map and its exact Source domain; a local pilot cannot qualify it globally.
Function/scenario associations without a current shared inventory stay explicit
gaps; no extra Source parse, scan or hash pass is added for this projection.

`planMutationBatches` in the existing mutation-map owner prepares planning-only
ID batches from one validated complete canonical universe. It emits aligned
canonical identities and local activation IDs with a supplied count limit.
The universe digest streams sorted identity/local-ID pairs and the parent input
binding; renumbering revokes that activation plan without changing canonical
mutant identity. Large maps do not widen the public canonical JSON budget.
Do not regenerate each batch through ranges or excluded mutator families:
Core10's CallExpression filtering depends on other generated mutations, and the
native instrumenter pilot demonstrated foreign mutants from that approach.
The helper launches no tests, changes no runner selection and admits no score.
Activation requires one current complete generated/instrumented image, its bound
bytes and local-ID correspondence, exact child membership, exhaustive/disjoint
parent reconciliation, full unchanged test argv and existing assertion/custody
receipts. Public instrumenter static API observations do not qualify Bun execution.
A retained timeout map can inform static planning research only; it cannot qualify
a current batch or restore an interrupted attempt. Missing children or any drift
remain GAP/UNKNOWN. The900s partition and independent per-case limits are unchanged.

The Linux-only diagnostic `bun run mutation:batch:pilot --contour <exact-name>
--batch-size 8 --max-batches 1` uses one complete public Stryker instrumenter
generation and the existing Bun command runner/receipt classifier. It supports
declared main/Bun contours, default16IDs and1batch, bounded1..128 for each option;
`--help` describes the options. It does not accept a caller-supplied test list.
Use the existing owned PID1/isolation and SDK-readiness ingress before invocation.
The package/root input capture is shared, the instrumented image is created once,
and execution is serial in a private sandbox with read-only Source/test/tool files
and private writable scratch. The full declared test argv runs for each ID.
The internal `nativeMutationMechanicsWorkerCommand` constructor qualifies inert
max-two worker mechanics separately from the default serial command builder.
The explicit diagnostic route below reuses it; default execution and score
admission remain unchanged. Focused controls launch simultaneous
workers under temporary and shared-memory roots and verify input/sibling write
denial, private output/temp/cache, distinct PID namespaces, actual SIGTERM,
timeout with a held healthy sibling, no-PID UNKNOWN and an armed detached child.
Host Tini `-s` reaps outside bwrap; `--unshare-pid --as-pid-1` makes inner Tini
namespace PID1. All output/scratch directories, including `sandbox/.tmp` as a
mount destination, must already be canonical real directories before launch.
The descendant control observes native init/start identity and the actual child
through `/proc/<init>/root/proc/<child>`, then init death and group closure; it
does not infer cleanup from missing markers or scan unrelated host processes.
Expected timeout/signal/no-PID fixtures retain raw execution results even when
their parent assertions pass. These controls do not qualify real-test resources,
pool scheduling or parallel admission. Keep the default serial and qualify the
[parallel resource/PID/custody contract](#parallel-testing-current-status-and-required-contract)
before real suite concurrency. A fresh `/proc` mount does not create a private
PID namespace. Each worker needs qualified PID1/subreaper stop/drain ownership;
separate temporary names alone do not establish resource independence. Share
only read-only captured image/dependencies/descriptor inputs; separate each
producer's output, context, logs/events/JUnit, `/tmp`, `.tmp` and transpiler cache.
Parent alone writes batch/terminal summaries. Require denied sibling/input
writes, unchanged shared bytes, deterministic input-order reporting, exact/below
allowance controls and UNKNOWN stopping new launches while accounting for all
already-launched siblings. Keep signals/timeouts as their actual failed outcomes;
unobserved termination, async no-PID ambiguity and live effects remain UNKNOWN.
No complete parallel score is admitted before qualification; two workers do not
by themselves prove the900s budget.

The separate `collectIsolatedNativeMutationBatch` scheduler is used only by the
explicit diagnostic pilot; it does not replace the default serial collector. It snapshots unique paired
IDs, limits in-flight invocations to two, and uses the caller's one shared
remaining-budget provider. Exact minimum allowance is allowed; a nonnegative
allowance below it leaves that ID unattempted. Invalid or thrown allowance values
retain a failure, not a fabricated timeout. UNKNOWN, resource denial, invoke
failure or synchronous progress-publication failure stops new assignments while
both already-started invocations drain. The invocation promise must mean terminal
custody, not merely child launch. Final rows and multiple failure/resource entries
retain input order; thrown undefined remains a recorded cause. Synchronous
progress publishes only the contiguous observed prefix; a non-row gap stops that
publication while later real sibling rows remain in the returned diagnostic.
This diagnostic result is not a native mutation proof schema. Real integration
still needs captured-input/private-output binding and qualified worker resources.

`--isolated-workers` opts into a bounded real-runner diagnostic for
`bun-project-upgrade-existing-storage-image`, `bun-fs-safe-attestation`,
`main-envelopes`, `bun-service-operation-custody` or
`bun-runtime-initialization`. Storage admission additionally permits a candidate
two-worker pool; an explicit four-worker request is rejected before generation.
Its static review and real ID0 consumption proof are preparation. First qualify
one16-mutant diagnostic with the full28-case baseline, complete private-output
and child custody, all assertion-confirmed kills and no UNKNOWN/resource block;
then request the full current universe under the same two-worker bound. A static
review or partial diagnostic is never a complete score.
Runtime initialization runs its full declared
test file in each invocation. Its first complete pilot follows the existing
private temp/output/SQLite and nested-process mechanics controls, a passing
21-case baseline with both racer children drained, and the closed64-mutant
isolated diagnostic recorded in WORK. The diagnostic itself is not a score or
evidence that four racer children ran concurrently.
The reviewed selections also permit `--admit-complete` through the same
selector; no separate duplicate complete-eligibility list is maintained. Each
still requires the full current universe and unchanged native proof gates.
Envelope eligibility follows a fresh closed64-mutant all-Killed diagnostic with
its48-case baseline, existing private context/output and runner custody controls.
Its720unattempted rows remain unqualified; full784 must independently pass.
Image eligibility follows the closed
four-mutant, fixed-two diagnostic with its full80-case baseline and the existing
private temp/output/SQLite and worker-custody controls recorded in WORK. Those
four results remain non-score evidence: the complete current527-mutant universe
must independently pass the unchanged native proof gates.
Custody's first
complete pilot follows actual private-database resource controls, fresh SQL/table
activation controls and a closed64-mutant isolated diagnostic. Admission still
requires the complete current universe and unchanged persisted-proof reader;
this permission alone establishes no passing score or global qualification. None permits
per-test capture or ID selectors. Start diagnostic work with `--batch-size 2
--max-batches 1`; it preserves the full declared test argv, one input capture,
one generated image and the existing900s partition deadline. Baseline runs first;
at most two mutants are then in flight. The copied parent environment is frozen
before launch; worker-private scratch overrides and mutant ID are explicit.
Isolated workers set `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0`: their single-invocation
cache would otherwise retain duplicate compiled output on the bounded filesystem.
Native controls compile an entrypoint above Bun's cache threshold while preserving
the full isolation/custody checks. The serial cache policy is unchanged. Bun's
[runtime cache documentation](https://bun.com/docs/runtime/environment-variables#runtime-transpiler-caching)
identifies `.pile` output as disposable; cleanup may remove only that derived cache,
preserving fixtures, databases, Source, raw reports/receipts and outcome classes.
This bounded route does not activate broader parallel mutation or global qualification.

`--isolated-workers --workers 4` is an explicit bounded throughput option for the
same admitted contour allowlist; omission retains the two-worker default and
ordinary execution remains serial. Other counts and serial use are rejected.
It changes neither the full selected test argv nor the single baseline/image,
900/930s budgets, per-case limits, assertion evidence or complete-universe gates.
UNKNOWN, resource denial, callback failure or insufficient remaining allowance
stops new assignment and drains every in-flight sibling. Publication retains
canonical input order and actual observations; later unassigned IDs stay unattempted.
The terminal summary records the selected maximum, never a guessed concurrency.
Qualify real four-process namespaces, immutable shared input/descriptor, private
scratch/output, disabled caches and full group closure on the target storage.
Then run a bounded generated-image diagnostic on each selected contour before
requesting complete four-worker admission. A diagnostic is not a score or a union
with old runs. Do not increase deadlines or change the default based on it.

The report overlay binds each private output at the original logical operation
directory, then rebinds the shared sandbox and descriptor read-only, followed by
private scratch. Actual temp/shm controls establish host bind-source visibility
through that overlay, unchanged inputs and disjoint outputs. Require canonical
existing mirrored sandbox/descriptor destinations; deny linked descriptors.
No copied Source tree or rewritten receipt identity supplies path eligibility.

`publishNativeMutationOutput` requires observed owned-group termination, complete
valid native captures and exit0 for baseline or exit0/1 for mutants. A surviving
mutant's exit0 is preserved. This is custody eligibility, not assertion evidence.
Before any canonical write, capture all five raw runner roles and the complete
adapter tree, including generated assertion modules and configured context.
Individual files retain the4MiB reader bound; a worker publication is bounded by
32MiB aggregate,4096adapter entries, depth8 and1024-character relative paths.
Accept canonical directories and regular single-link files only, and preflight
all destination collisions. Parent alone creates directories/files exclusively,
preserving raw bytes and sync operations. Uncertain native custody leaves private
outputs unpublished; partial publication failures retain both roots and deny
confirmation. Closed raw diagnostics can still fail the unchanged runner
confirmer; copied files alone never mean Killed. The persisted proof reader and
flat-basename guards are unchanged. Complete admission for each reviewed contour retains
the existing exhaustive-plan, all-Killed and freshness gates and emits the same
context-bearing proof. Verify that actual retained closure through the unchanged
reader, separately from synthetic controls. This does not resolve its zero-callable
CRAP applicability GAP or qualify broader parallel execution.
The retained fs-safe proof parity result and its memory-only report/selection
rejection controls are recorded in WORK. They preserve the actual artifact roots
and hashes; no producer rerun or artifact rewrite is needed to test the reader.
Envelope diagnostics retain deterministic fuzz settings, fresh configured context
and serial child-local spies. Custody diagnostics retain unique private SQLite
fixture roots and canonical lifetime module state; they do not qualify the open
import-time SQL activation class. WORK owns the exact reviewed resource findings.

The explicit `--capture-per-test-diagnostic` mode runs only the complete native
baseline and binds existing diagnostic-v2 capture through its input fingerprint,
descriptor and receipt owner. It executes no mutants, rejects complete admission
and mutant-ID selectors, and retains a nonzero diagnostic exit for the unattempted
universe. Captured baseline names include file tokens; they must not be compared
directly to capture-free mutant names as if those were an identical outcome census.
Independent registration, full baseline/canonical joins and any filtered-runner
controls remain unqualified. Defaults retain the existing full argv and no capture.
One900s partition deadline covers capture, generation, baseline and every selected
batch; command/case limits remain with their existing owners. Do not reset this
deadline between batches: the campaign's930s outer envelope must leave time for
terminal bookkeeping instead of interrupting a newly renewed batch. Batch elapsed
times remain separate observations. Storage admission reuses the unchanged2GiB
campaign owner. Use the existing integer execution-budget owner rather than
subtracting floating clock values at launch. Nested bwrap includes fresh `/dev` and `/proc` mounts:
binding `/` alone denies `/dev/null` and prevents Bun's own child spawn. Mount
private `/tmp`, then bind the qualified repository root read-only, then the
owned operation directory writable, followed by the sandbox's final read-only
and writable-scratch bindings. Pass the same repository root used for parent
capture verification explicitly. A dependency-only bind cannot expose captured
`_repository/*` inputs through a nested `/dev` reset. The repository bind must
follow `/tmp` to retain its read-only boundary, while the nested operation bind
must follow that parent to retain writable output. The real inert controls use
both temporary and shared-memory parent roots, exercise context/dependency reads,
nested Bun imports/spawn, denied Source/dependency/context writes, unchanged bytes
and allowed owned-operation/private-scratch writes; option-string inspection
alone does not qualify it. Parent snapshot and descriptor validation stay intact.
Native receipts still require exact baseline census, process/output closure,
input/executable/image bindings and body assertion proof. Errors, timeouts and
unattempted IDs remain separate. Its generated universe, image and diagnostic
batch summaries are retained under one new `.tmp/mutation-batch-*` operation.
Native mutant confirmation also requires an actual selected-branch hit. The
preload initializes the locked instrumenter's `__stryker__.hitCount` before
Source imports. A failing body records its optional exact-key `activation`
object (`mutant_id`, `hit_count`) in the existing digest-bound body event.
Observe it synchronously before rethrow; `--bail=1` cannot depend on afterAll.
The native parent requires a matching ID and positive count on an assertion-caused
body, rejects every foreign observation and rejects baseline observations. An
absent or zero-hit observation cannot confirm Killed. Activation alone never
establishes an assertion. The ordinary Stryker confirmation route retains its
existing contract; historical receipts do not acquire activation evidence.
The instrumenter's process counter is distinct from that failed body's count.
The shared ALS context attributes actual counter increments only to its active
body, preserving Stryker's process total and hit limit. Load that context before
Source imports in every native mode. Hooks execute outside body context; settled
sync/async bodies and return-classification failures are deactivated. Hits from
imports, hooks, earlier passing bodies or their late tasks cannot qualify another
body's assertion. Actual generated-image controls cover those denials alongside
sync/awaited positive and foreign-ID controls. Child-only activation is not a
parent-body hit; asserting child success alone does not qualify that mutation.
The real generated-image control pairs an active BooleanLiteral branch with an
inactive foreign-ID assertion failure. This cooperative in-process observation
is not protection against hostile code rewriting the public counter. It qualifies
the activation seam only; a fresh native receipt pilot and complete-universe
parent admission remain distinct requirements. The native universe contains all
mutants from the captured public instrumenter call, with explicit empty exclusions
and ignorers and null parser plugins, not fabricated Stryker engine dispositions.
V2 batch/terminal diagnostics retain a structured storage denial and completed
observations. A storage denial before a launch leaves that ID unattempted; it
does not create an UNKNOWN or Killed observation. Parent input/image/executable
readback still runs before the resource-incomplete terminal summary. Other
interruptions retain partial rows with `interrupted: true`; record failures keep
the primary cause through the shared cleanup accumulator. Neither an interrupted
record nor live progress establishes complete parent qualification. Preserve old
incomplete artifacts; do not reconstruct them as newly admitted results.
Live progress carries cumulative status totals across batches. Read those totals;
`completed` counts observations within one batch and does not mean Killed.
Progress remains explicitly unadmitted until the complete parent readback.
No old operation is resumed. These schemas are deliberately not contour-progress
admission: until the complete execution/custody pilot and parent join qualify,
the ordinary mutation gate and global quality command remain unchanged.

`--admit-complete` opts into a separate complete-partition candidate proof. Its
finite `--max-batches` must cover the whole generated plan before baseline tests
launch. The parent joins exact universe/plan/result pairs, every batch index,
the complete passing baseline census, selected-branch hits, and both inner runner
and outer launcher receipts. It preserves generated-image, descriptor and batch
artifact references plus the existing input/image/executable readbacks. Missing,
duplicate, foreign, partial, survived, UNKNOWN or resource-blocked observations
produce no passing candidate. The metadata universe digest has one shared owner;
this join adds no Source scan or test suite.

For a fresh repair diagnostic, `--diagnostic-mutant-id <local or canonical ID>`
requires `--batch-size 1 --max-batches 1` and rejects `--admit-complete`. Resolve
the ID against the current complete generated plan; local IDs can change with
Source. A canonical identity includes the Source hash and exact mutation tuple.
An identity computed from retained metadata and changed Source is only a lookup
request until this resolution succeeds, never a new mutation observation.
The producer keeps the complete universe/plan and original batch index, rejects
an absent ID before baseline execution, and runs the full passing baseline and
the full unfiltered selected tests for that mutant. Other rows remain unattempted.
The terminal summary records its diagnostic selection; it supplies no candidate
partition proof, contour score or global qualification. All activation, assertion,
input/image/executable readbacks, custody and time limits remain in force.

For several known repairs, use the mutually exclusive
`--diagnostic-mutant-ids <ID,ID,...>` with the same singleton bounds. Supply
1 through 32 unique nonempty local or canonical IDs, each at most 200 characters.
All IDs must resolve before the baseline starts. Multiple aliases for the same
mutant and tokens matching distinct mutants are rejected. This reuses the
producer's full plan without a separate image-generation pass to discover local
IDs. The producer runs the full baseline once,
then only those original plan indices in plan order under one shared partition
budget; intervening mutants remain unattempted. The complete universe and plan
are unchanged. The diagnostic summary lists the selected ID/index pairs and
still grants no partition proof or combined contour score. Prefer this path to
repeating baseline, input capture and image generation for each known repair.

The in-memory `NativeMutationPartitionProof/v1` join remains the semantic owner.
The producer writes `NativeMutationPartitionProof/v2` with one referenced
`NativeMutationValidationContext/v1`, after the existing parent input and
executable readbacks succeed. It records the invocation executable, actual
before/after parent identities, captured hook-file selection and complete
global Source digest rows from `inputs.sources`, distinct from the partition
subset. Those observations are reused once, without another Source/AST/hash
pass or a copy in each mutant receipt. Descriptor v3 and runner receipts keep
their existing contracts. Historical v1 proofs do not acquire this context.

`CandidateNativeMutationReport/v1` keeps its opaque proof artifact reference
and `native-instrumenter-batches/v1` provenance. Proof and report remain
partition-local with `full_qualification:false`, without synthetic Stryker
statuses or events. Require a complete context-bearing producer pilot; keep its
terminal evidence in WORK. The offline
`readNativeMutationPartitionProof` owner in `tooling/native-mutation-proof-reader.ts`
dispatches on the context-bearing proof and verifies the descriptor, generated
universe/plan, complete baseline and every runner/launcher/JUnit/body/output
artifact through the unchanged semantic join. It reuses the shared bounded
file reader, reads sequentially and caps aggregate retained bytes at128MiB;
overflow is an incomplete-evidence GAP. Captured absolute invocation spelling
can differ from the recorded physical executable path. Bind both through the
captured command and identity, without current-host realpath or executable
hashing. Captured global test-selection metadata is not fresh global inventory.

The reader is separately checked with synthetic controls and a complete retained
context-bearing producer closure. It launches no tests, regenerates no Source
inventory and grants no freshness or Runtime authority. Its returned canonical
proof stays partition-local with `full_qualification:false`. The contour CLI's
explicit `--native-report` route calls that reader before projecting a separate
`native-mutation` lane. It retains proof/context references, universe and binding
fingerprints alongside the existing exact Source/test/tool closure. Ordinary
`--report` still rejects raw native candidates. Matching coverage and frozen
CRAP can form historical local pairs/triples only through the existing exact
closure checks. Global/current qualification and final-quality native admission
remain pending; offline readback alone does not activate those boundaries.
Historical v1 proofs stay historical, and old diagnostic operations stay diagnostic.

Mutation artifact byte reads share `tooling/mutation-artifact-reader.ts` rather
than importing the gate's orchestration. Its default4MiB evidence and explicit
32MiB report bounds retain basename, regular-file, single-link and opened-file
identity checks. Read and close failures retain their original ordered causes,
including rejected undefined. Reuse this boundary for persisted-proof readers;
matching artifact hashes alone do not replace observed runner/assertion custody
or activate a new numeric admission route.

Parent receipt validation reuses one partition-local execution observation and
lifecycle-hook analysis of the already captured immutable test/import bytes.
Each receipt still binds its exact command, tests, sources, tools, JUnit, context
and assertion evidence. Full executable observations bracket all parent joins;
an after-check failure or any byte/file-identity drift revokes the partition's
confirmations to UNKNOWN. Worker before/after full executable hashes are unchanged.
No process-global or stat-only cache is admitted. The summary's aggregate
`receipt_validation_timing` separates measured identity/lifecycle cost and counts
from a reduction in repeated operations; only a real contour run proves timing.

The native pilot confines Bun's derived runtime transpiler cache to a fresh0700
subdirectory of its private operation directory. Runner/test children reuse it
only within that operation; it is outside Source and is never copied across runs.
Explicit `BUN_RUNTIME_TRANSPILER_CACHE_PATH=''` or `'0'` still disables caching.
Other inherited paths are replaced by the operation-owned path, which the existing
sandbox can write. This caches compiled bytes, never test execution or admission
evidence: input/executable readbacks, full selected tests, activation, assertions,
JUnit and custody checks all remain required. Qualify the actual generated-image
run before claiming any timing improvement.

The coverage-input helper loads its synchronous instrumentation owner only when
instrumentSource is called. Its literal require edge remains in the captured
module closure and fingerprints; it must not add Babel/Istanbul startup to
workers that only validate inputs. Keep the complete instrumentation/map tests
and lazy-edge invalidation check. Import-only benchmarks qualify startup cost
only; they do not establish a complete mutation campaign speedup.

The shared mutation preload accepts diagnostic `AGENT_MUTATION_PER_TEST_CAPTURE=1`
and writes `per-test-coverage.json` exclusively inside its invocation-owned
adapter directory. `MutationPerTestCapture/v2` records file/body registrations,
describe ancestry, stable hook registrations, body and hook invocations
(including pending work and durations), and the public
Stryker `static`/`perTest` counters. `coverage_observed=false` distinguishes an
absent runtime map from an observed empty map. This producer has no Killed or
filtered-run admission authority; the ordinary command runner clears inherited
opt-in. It does not change the active Stryker runner/configuration.

The instrumenter's `currentTestId` getter reads the shared AsyncLocalStorage
body identity, keeping concurrent bodies distinct. Settled detached tasks and
all lifecycle hooks are attributed statically. Static coverage may require the
full test set; never discard it to improve timing. The preload's global
`afterAll` finalizes after file-local hooks, following the existing Bun coverage
owner; Bun test does not invoke process exit listeners.

Plain synchronous describe callbacks record copied parent-ID paths for bodies
and hooks. Hook registration IDs are separate from invocation IDs, so repeated
beforeEach/afterEach invocations resolve to their declaring scope. Filtered
siblings remain registered without implying their hooks ran. Static coverage
stays aggregate; scope metadata does not attribute mutant hits to individual
hooks. Async describe, describe.each and describe modifiers are unsupported in
opt-in capture; ordinary non-capture execution remains unchanged. Unsupported
registration latches invalidity and prevents final artifact publication even
when caller code catches the error. Historical v1 artifacts lack scoped evidence
and must not be promoted to v2 or filtered-run qualification.

File/body tokens preserve the existing assertion marker. Bun includes filtered
registrations as skipped JUnit cases, so executed-body count and JUnit case count
are different. Opt-in capture rejects callback-less test registrations, including
todo and skip, instead of silently omitting a planned case. Ordinary execution
without capture retains Bun's behavior. Callback-backed skipped cases remain
registered and uninvoked; boolean conditional-modifier setup is not a registration.
A collection failure may produce no JUnit or only partial diagnostic artifacts;
it remains UNKNOWN, never an assertion-confirmed kill or complete body set.
Before a real filtered runner uses the capture, its parent must
bind the full original selection, canonical current mutant universe, exact
planned body set, registered/finished bodies, required scoped lifecycle and
JUnit outcomes. Missing/pending/foreign/malformed evidence remains UNKNOWN;
assertion attribution remains with the existing body-event classifier. A capture
file or a successful producer control does not establish a mutation score.

`mutation-per-test-evidence.ts` provides a passing-baseline consistency join.
It validates v2 with Ajv, compares the independently supplied declaration plan,
uses the existing JUnit traversal's optional case observer, and reconciles exact
body/file tokens, skipped cases, settled invocations and scoped hook counts.
Scope counts are accumulated once per executed ancestry, without a hook/body
Cartesian scan. Static and per-body counters must match the bound public dry-run
map and resolve through the already-validated canonical local-ID universe;
uncovered canonical IDs remain explicit gaps, never Killed. Observed-empty maps
are permitted; absent coverage is not.

The caller owns immutable artifact/receipt custody, the independent declaration
plan and the complete canonical map for the same current binding. Pass the
partition's original selected execution files, never the observed subset; retain
the separate full captured test-selection fingerprint. These trusted parent
inputs cannot be derived from the capture being checked. The join returns
diagnostic-only with origin_qualified=false and filtered_runner_qualified=false.
It does not authenticate those caller inputs or activate a runner. The current
all-tests command runner lacks the required public per-body file/name mapping;
that path remains unsupported by this diagnostic, with full-selection fallback.

`readMutationPerTestCapture` decodes producer bytes with that same v2 schema
before a parent reads registration or runtime fields. It preserves
coverage_observed=false for registration planning; the passing-baseline join
still refuses it. A separate Bun registration-only probe can use an impossible
name pattern and `--pass-with-no-tests`, only in that planning invocation.
Require a nonempty complete registration/JUnit set, all cases skipped and zero
body/hook invocations. That flag must never turn an empty baseline or mutant
selection into success. Runtime planning is distinct from the static inventory
and cannot by itself authenticate immutable origin or qualify filtering.

The explicit `--pilot-per-test-capture <exact-partition>` route requests v2
baseline capture for one complete declared mutation partition. It binds diagnostic-v2
into the existing input fingerprint, descriptor and parent environment. Ordinary
commands omit the mode and scrub both inherited capture variables. The child
enables capture only for the null-mutant baseline after descriptor admission;
selected test argv stays full. Mutants keep fail-fast execution without capture,
and unexpected mutant capture metadata denies. The parent derives the fixed
baseline artifact below the expected JUnit adapter directory,
reads it once with the existing bounded evidence reader, strictly decodes those
same bytes, and matches their byte count and digest against the runner receipt.
Missing, malformed, linked, changed, oversized or mismatched artifacts remain
UNKNOWN. Directory identity checks assume trusted selected tests; they do not
authenticate against a hostile same-user process. This route establishes only
diagnostic artifact custody. Independent registration and actual public dry-run,
JUnit, body and canonical-map joins remain necessary before any filtering.

`validateMutationPerTestRegistration` performs this registration-only consistency
check with the shared capture decoder, scope validation and JUnit/body-token
traversal. Require exit0, zero body events, zero assertions and no per-body
coverage keys. Unobserved coverage must contain no counters; observed aggregate
static module hits may exist but establish no test execution. Return a detached
declaration plan and copied original execution file list. All-skipped JUnit
remains unproven for ordinary baseline/Killed classification. The result stays
registration-only with origin_qualified=false and filtered_runner_qualified=false.
Its caller must bind the separate planning capture and process/artifacts to the
existing parent receipt before using that plan as independent baseline authority.

The ordinary parent map validator also checks the public dry-run test results:
complete termination alone is insufficient. Require a nonempty Success/Skipped
array, finite nonnegative durations, nonempty IDs/names and at least one Success;
Failed, error, timeout or an all-skipped baseline remains UNKNOWN. Public runner
IDs are opaque and are not equated with body IDs or assumed globally unique.
The per-test join separately requires exact file/name tokens and body uniqueness.

The global mutant map must cover all maintained Source/partition assignments,
with explicit pending/omitted/platform gaps. Its stable identities bind Source
digest, normalized path, position, mutator and replacement; Stryker IDs are local
joins only. Reuse captured inputs, function inventory and actual test results;
do not add another project scan, AST or hash producer. Function/scenario links
without current bound evidence remain unresolved or unreviewed, never execution,
coverage or assertion proof.

Before each check, verify the actual executing VIDA CLI and involved runner versions. Use the supported `vida-agent version` command. Keep an adapter-reported version separate from the installed executable version and the Source manifest version. Record the executable, command, working directory, exact tool versions, current inputs, exit status and sanitized result. Retain full stdout and stderr separately. Bind reports to the actual current source and operation.

| Evidence class | Meaning                                                                     |
| -------------- | --------------------------------------------------------------------------- |
| Decision       | Attributable accepted intent.                                               |
| Code           | Implemented behavior.                                                       |
| Static         | Tests, inspection or integrity checks for declared inputs.                  |
| Runtime        | Actual installed behavior and attributable user testing.                    |
| GAP            | Required evidence is missing, stale, skipped, failed, partial or uncertain. |

Static proof does not grant Runtime acceptance. A writer report, caller JSON or valid schema does not prove native tool origin, review independence or authorization.

The accepted targets are exact 100% coverage and 100% mutation qualification
for maintained production functions, with task-scoped evidence as defined above.
Keep accepted legacy deficits and missing manual runs explicit.

`bun tooling/crap-gate.ts --inventory` reports maintained function identities
and static complexity for budget planning. Its `MaintainedFunctionInventory/v1`
output declares `mode: static-inventory-only` and
`qualification: not-performed`. Its additive `files` entries bind each selected
path to its byte length and SHA-256 from the same buffer decoded for the existing
function inventory; no second Source read or AST pass is needed. These bindings
do not establish exhaustive baseline/current correspondence or freshness after
capture. It does not measure coverage, check a frozen
CRAP plan, or establish a numeric quality PASS. The coverage and CRAP gates run
only when their tool files are invoked directly; importing them does not run a
gate or coverage collection.

For contour development, the existing producer API accepts
`runBunCoverage({ focusedDiagnostic: { mode: 'focused-diagnostic', contour,
sources, tests } })`. Both path sets must be nonempty, unique and members of
their maintained inventories. The selected import closure binds transitive
test helpers and unselected dependencies without claiming their coverage.
This route uses the same capture, instrumentation, preload, counter merge,
300000ms budget and shared coverage lock. It remains serial.

A focused SDK package compatibility selection retains the full maintained SDK Source
inventory privately in that same capture. Omitted SDK Source is bound as tool
input, with no added coverage claim. Formation projection and freshness use
those complete captured bytes. The existing prepareSdkInputs callback is allowed
only when this SDK-dependent test is selected and runs before typecheck/capture.
Focused input-review callbacks and historical preparation remain forbidden.
Full-current Source/tool classification and historical SDK behavior stay intact.
Use the maintained SDK readiness owner; do not form SDK outputs locally.

The coverage lock retains an open descriptor and an immutable, exact in-memory
owner handle until terminal cleanup. This prevents inode reuse from authorizing
removal of a foreign replacement. Copies, changed paths and hardlinked paths
cannot release the lock. Keep descriptor/path checks, original and close errors,
and UNKNOWN retention. This does not make pathname unlink atomic against a
concurrent namespace swap; no hostile-local-caller exclusion is claimed.

If an interrupted producer leaves this custody in its checkout, preserve that
checkout and its output. Continue independent diagnostics in a clean isolated
checkout of the same immutable Source, with matching qualified SDK inputs and
one final owner. Bind the new checkout in the launcher and retain its actual
output paths. A new output namespace does not resolve the old UNKNOWN operation
or authorize deletion of its lock, fixtures or evidence.

Its `VidaBunFocusedCoverageDiagnostic/v1` report lives under
`coverage/bun-unified/diagnostics/<run-id>.focused-coverage.json` and never
replaces coverage-final.json. It reports four local coverage metrics plus exact
Babel function IDs, CC and the existing function-entry-based CRAP calculation.
The original AST is observed before Istanbul inserts counters, without a second
parse. Function-entry coverage does not imply full body/branch coverage. Child
processes still need explicit bound instrumentation to contribute counters.
An exit0 establishes diagnostic completion only; frozen budget qualification
is explicitly pending. This report is not accepted by global coverage/CRAP
gates and cannot establish scope or full-quality PASS. Preserve frozen caps and
complete correspondence; the global plan remains required for final admission.
The final report stays outside the sealed runs/<run-id> directory. Do not relax
its read-only manifest/snapshot permissions to publish a diagnostic.
Focused manifests, snapshots and process receipts use the separate canonical
`coverage/bun-unified/diagnostics/runs/<run-id>/` namespace. The shared validator
selects that path from the focused schema only; global runs retain `runs/` and
the global reader still rejects focused reports. Never copy or relabel a run
to satisfy the other namespace.

For sequential whole-contour development, the existing CRAP owner also supports
`VIDA_BUN_COVERAGE_REPORT=<focused-report> bun tooling/crap-gate.ts --contour
<declared-contour> --budget-ref <published-reviewed-current-Source-commit>`.
This is a separate conservative local proof, never global admission of a partial
plan or a historical measurement. The pinned published review must cover every
declared Source. Its `current_source_bindings` must list exactly those paths and
their SHA-256 digests. The gate compares them with the focused validator's
already established Source digests, without another scan, read or hash pass.
Missing, duplicate, malformed, partial or stale bindings fail closed, including
historical reviews lacking explicit bindings; use a published review of the
actual current Source before measuring. Historical issued reports remain intact.
Resolve the current contour's review through the maintained
`latestScopedCrapBudgetRef` owner in `tooling/crap-gate.ts`; never copy a historical
pin from an earlier run or another contour. Exact Source-binding validation still
governs the selected pin. Retired callbacks retain their historical rows without
allowance transfer; the active proof uses the actual current callable roles.
The facade partition executes the complete `tests/runtime-facade-boundary.test.ts`
file, retaining all declared public behavior cases with body-local Source-module imports.
The package integration cases remain in `tests/smoke.test.ts`; that owner
also verifies identity of all five facade package-root exports. Keep both owners
registered and run the integration evidence for changes affecting that boundary.
Do not repeat unrelated integration operations for every pure facade mutant.
Changed test/module selection needs fresh compatible coverage, scoped proof and
complete assertion-confirmed mutation; no old result is relabeled current.

The gate accepts only the maintained pinned review/key
pairs and each review's actual Source scope. Caller-supplied correspondence
versions are rejected. The shared
focused validator rechecks the pinned runtime, current inputs, immutable snapshot,
manifest, process receipts, canonical instrumentation and exact per-file F/L/S/B.
The CRAP owner then derives exhaustive original IDs/CC from immutable b549951
Source and current IDs/function fractions from the validated maps; it requires
one-to-one reviewed correspondence without increasing any saved cap.

This bounded mode requires saved maxCC=originalCC, maxCRAP>=originalCC and
currentCC=currentCRAP<=originalCC at exact current coverage1. Since original
CRAP=originalCC+originalCC²(1-originalCoverage)³>=originalCC for every possible
originalCoverage in[0,1], this stronger bound proves numeric non-regression
without reconstructing or admitting the missing historical coverage/CRAP.
Unmatched/new/removed callable roles or unsupported reviews remain GAP.
Its run-keyed `VidaScopedCrapBudgetReport/v1` preserves the original diagnostic
schema and binds its exact parsed bytes, input closure, frozen Git version and
per-function proof. It never overwrites the global CRAP report. This receipt is
one kind of evidence: complete contour closure separately requires compatible
exact coverage and100% assertion-confirmed Killed mutation evidence. UNKNOWN,
runtime/compile errors, missing suites and timeouts remain non-kills.

`VidaScopedCrapBudgetReport/v4` adds explicit `cross_role_identity_reuses` to
reviewed-pairs proofs when removal or movement lets a retained role occupy a
different original role's lexical ID. Each edge names that occupied identity,
its actual retained original owner and a review rationale. The producer and
projection reader share one exhaustive edge validator: missing, duplicate,
foreign, surplus or misdirected edges fail. An edge supplies no allowance;
removed roles remain successor-free and retained roles keep their own original
ceilings. Existing v2/v3 reports and independently capped adapter reuse retain
their original meaning; they do not claim v4 ownership proof. A v4 review must
be independently reviewed and pinned before numeric use. Projection remains a
local owner-reported proof, not independent remeasurement of the published
budget or global qualification. Current CC=CRAP<=original CC and exact coverage
are still required; the reader does not independently reload reported CRAP caps.

### Rolling contour repair cycle

Use the three-contour rolling pool declared by the root
[sidecar](../../AGENT.sidecar.md#orchestration-and-delegation). Assign one blind
Luna writer and one isolated checkout to each active contour, including its
product fixes and tests. Shared files have one writer. Root integrates, runs
checks, admits numeric results and owns Git. Workers prepare independently; they
do not start duplicate suites, scans, hashes or inventories.

After each terminal handoff, Root retires the completed preparation checkout
under the [sidecar's worktree retention rule](../../AGENT.sidecar.md#orchestration-and-delegation).
Retain pending patches and all local/staged data before removal; closure of a
worker does not release an immutable measured checkout or its evidence.

1. Reuse the existing contour selection, current canonical mutant map and retained
   failures. Map each gap to the supported contract and applicable scenario. Search
   analogous paths inside the contour before choosing the correction.
2. Reproduce a new defect with a focused regression, repair its cause, then run
   static and affected checks. Preserve failed artifacts and exact cleanup custody.
3. Once the correction packet is stable, Root publishes its checked bytes and runs
   exact F/L/S/B coverage plus same-run frozen CRAP against the original budgets.
   Prepare required SDK inputs through their existing owner. Resolve readiness
   from the producer's actual captured input set: the native mutation owner also
   captures full SDK formation inputs for a pure partition. Form missing or stale
   test inputs once before capture; keep failed setup separate from attempted
   mutants. Formation runs no suites and establishes no Runtime acceptance.
4. Run bounded mutation diagnostics for current repair IDs with one shared full
   baseline. Repair survivors and assertion weaknesses; timeout, missing coverage,
   compile/runtime error and UNKNOWN remain distinct failures. After repairs,
   collect the complete compatible per-ID proof before accepting Killed100.
5. Repeat only affected checks after a correction. Regenerate through the existing
   projection owner after each terminal admitted result. Close a contour only with
   exact coverage100, qualified frozen correspondence/CRAP and assertion-confirmed
   Killed100 for the same bound inputs; retain freshness/global-admission limits.
   Immediately fill its slot with the next ready contour.

Archived UNKNOWN operations, fixtures and issued effects are never replayed under
either an old or new ID, and unresolved resource custody still blocks successors.
This does not ban fresh regression or mutation evidence for repaired Source:
use a new clean immutable checkout/run and new fixtures, preserve the original
artifacts and classification, and require observed process-group closure before
resource reuse. Matching semantic mutant identity alone is not operation replay.

For a stateless module whose mutated initialization runs at import time, load a
fresh captured module inside the asserting test body. Our Bun1.4.3 file-URL query
probe reused module identity and initialized outside body ALS; a query suffix is
not fresh-load evidence. Use `createRequire(import.meta.url)`, resolve the exact module, delete only
its cache entry and require it synchronously in the body. Retain the explicit
computed entrypoint, exact Source capture and all cases; qualify snapshot-loader
interception and real generated-mutant activation. Confirm that the module has no
lifetime state or namespace-identity contract before adopting this fixture isolation.
Keep package-root identity checks in their integration owner.
The first registered case need not execute first. For a stateless subject used
across many bodies, reuse one typed test-local forwarder that synchronously loads
the exact subject before each operation; all assertions inspect that operation's
result. A fresh load in only one helper cannot supply activation for another
failing body. Preserve one module instance within an operation and retain native
prototype interception. Qualify this route against the actual generated mutant.
When several test files share that pure utility, keep their typed forwarding
functions in one test helper. Restore the exact prior cache entry in `finally`,
or remove the fresh entry if the cache was originally empty. Check a consuming
file alone as well as the full contour so test-file ordering cannot hide a
missing-cache prerequisite. Keep actual dependency namespace spies on the
canonical utility; changing direct test imports does not replace a stateful caller.
Audit every subject import in the declared contour, including residual dynamic
imports in later bodies and static value imports in property files. For a pure
property subject, load once per body before constructing the unchanged property,
not once per generated input. Keep public-index export inventory and unrelated
dependencies with their existing owners. A passing assertion with zero owned
activation remains UNKNOWN until a fresh native control proves the repair.
Do not use this fixture for a module owning opaque capabilities or lifetime state:
restoring its exact `require.cache` entry does not restore subsequent ESM imports'
identity on the qualified Bun probe. Preserve its canonical owner and leave missing
static-initialization evidence as an explicit GAP until a safe owner is qualified.
A child-only activation still needs qualified child evidence; a parent assertion
or a fresh import alone does not supply that proof.
For a Stryker-instrumented module-level immutable string, the generated image
tracks actual value consumption without reloading the namespace. Babel binding
references identify function-body reads of the exact const; an initial read
preserves temporal-dead-zone behavior, then the selected mutation helper runs
only when the value equals that mutation's replacement. Shadowed bindings,
type-only references and typeof are excluded. Import-time or hook-only hits do
not become body hits. Unsupported initializers retain UNKNOWN rather than a
synthetic activation. The generated image and tracking version remain bound to
the captured tool inputs. Existing assertion, JUnit and child-custody requirements
remain unchanged; the mechanism does not supply a mutation result by itself.
When a stateful subject calls a separately owned stateless utility, an exact
test-local dependency spy may delegate the real observed arguments to a fresh
synchronous utility load within that actual call. Keep the stateful namespace and
opaque capability registry intact. Restore the utility cache and interception
before later persistence/cleanup; compare observed arguments/results with the
real reservation. An original suite pass only qualifies the fixture's ordinary
behavior; actual generated-mutant activation/assertion/custody proof is still
required. Never add a dummy utility call merely to create a hit.

For a private callback supplied to a native API, test the native API's documented
callback contract when public output alone hides a violation. Observe the actual
callback and arguments through a scoped dependency spy, delegate the real native
operation and restore it in finally. For sorting, the
[ECMAScript consistent-comparator contract](https://tc39.es/ecma262/multipage/indexed-collections.html#consistent-comparator)
requires reflexive equality and a consistent total order. Check applicable laws
on observed rows, alongside public result and input-preservation assertions.
Do not copy the implementation, invent callback inputs or export a private helper
solely for a mutation score. Callback-law assertions, public behavior, coverage
and assertion-confirmed mutation remain distinct evidence.

Preparation is parallel across the active contours. Numeric producers remain
under one Root owner and their existing resource admission; this policy does not
activate concurrent coverage shards. Freeze the measured checkout until its
producer is terminal. Other lanes may prepare changes in their isolated checkouts;
Root integrates them afterward. After each terminal bounded attempt, select the
next ready measurement and return failures to their owning lane, avoiding an
unchanged full-suite retry. A blocked prerequisite releases capacity for ready
work while its contour remains OPEN; it is never counted as a closure.

The generated contour JSON/Markdown is the single progress projection. Do not add
a manual percentage ledger or combine diagnostic kills into a passing score.
For data-only Source, retain the producer's exact zero function/branch counters
and represent absent function complexity/entry CRAP as null with an inventory N/A
label. This observation is not a reviewed scoped CRAP exemption and does not
satisfy the unchanged positive-denominator maximum or complete-triple gates.
Build/install run no test suites. Per-case5s defaults and the existing independent
coverage/mutation envelopes remain unchanged.

Host-state's declared selection includes `tests/stopped-source-capture.test.ts`
alongside `tests/bun/host-state.test.ts`, so its changed capture methods have their
real verifier, receipt and retry assertions in the numeric input set. This is the
complete fixture file, not an unqualified per-test filter. Its existing package
repair-suite owner is unchanged; retain the independent mutation envelope even
when a complete partition schedule cannot finish within it.

### Automatic contour progress document

Repair dispatch follows the root sidecar and the
[rolling contour cycle](#rolling-contour-repair-cycle): one agent owns one of
three active contours, with immediate refill after verified closure.
Workers search analogous defects within their contour and report shared causes
to Root; Root owns the shared helper and integration. Keep active measurement
inputs immutable, including transient edits. Parallel preparation uses separate
checkouts; integration and numeric rechecks wait for terminal producer custody.
Track each contour through verified repair or an explicit remaining GAP, without
promoting a proposal, timeout, UNKNOWN or static check into numeric acceptance.
An unresolved finding stays OPEN and is requeued once its prerequisite is ready.

The explicit campaign command is `bun run test:contours --all` or
`bun run test:contours --unclosed`. Add `--plan` to inspect the exact registry
selection without launching tests; `--help` describes the options. The runner
requires a clean, immutable Source commit. `--unclosed` includes every executable
contour without a compatible complete local triple recorded at that same commit;
historical maxima at older commits do not suppress current checks. Neither this
selection nor a same-commit triple establishes global or host freshness.

The campaign first runs declared focused coverage and same-run scoped frozen
CRAP per contour, then every selected partition's existing mutation pilot. It
preserves full Source/test selections and the existing evidence owners. Missing
pinned scope reviews remain GAP; failed coverage does not silently skip mutation.
Read-only campaign Git observations disable optional locks while retaining the
clean-commit and worktree checks, so status cannot refresh the index during a
concurrent staged-hook observation.
If the coverage lane is not completed at its exact maximum, record frozen CRAP
as GAP without launching that producer. Continue independent mutation lanes;
UNKNOWN custody and resource denial still fence every successor.
The outer coverage envelope is330s around its existing300s owner; mutation uses
its independent900s partition/930s outer envelope. Per-test defaults stay5s.
These are separate budgets, not a five-minute allowance for the entire campaign.

Linux execution requires `bwrap` and `tini` on PATH, or an installed tini path in
`VIDA_QUALITY_TINI`. Each child has a private PID namespace, subreaper and retained
host-backed scratch under `.agent/work/core-runtime-reactivation/campaign-scratch/<run-id>/<stage>/`
with at least2GiB free. This root stays outside `packages/agent` so bundle
fixtures cannot recursively copy their own scratch. Whole-bundle copies also
exclude generated `coverage` output. Capacity denial fences every successor and
records `resource-incomplete`; it is not a test failure or a mutation kill.
For the single-stage owner, `request.json` precedes isolated setup. A native
`CampaignResourceError` before launch retains a separate
`prelaunch-resource-refusal.json` (`VidaContourStagePrelaunchResourceRefusal/v1`).
The existing `--stage-outcome` route binds it to that request and Source commit,
rejects any launch/execution record, and projects `stage-outcome` without metrics.
It records the observed resource path, free bytes (null when unobservable), and
the unchanged 2 GiB floor. It claims no PID, termination, capture or test start.
Receipt/projection failure preserves the resource error and secondary cause.
Such an outcome cannot be relabeled as a metric lane or accepted evidence;
ordinary failed-stage outcomes still require their original terminal custody.
Record the actual filesystem type and available bytes in `launch.json`; the
private `/tmp` bind does not imply tmpfs. `TMPDIR` and `BUN_TMPDIR` both select
that private root. `BUN_INSTALL_CACHE_DIR` selects its fresh writable
`/tmp/bun-install-cache`; do not copy the whole host cache into each stage.
The default keeps new scratch off the shared host `/tmp` capacity. For a qualified
retained host filesystem, explicitly set `VIDA_QUALITY_RETAINED_SCRATCH_ROOT`
to an existing absolute directory outside `packages/agent`. The isolation owner
resolves symlinks, rejects package-contained roots and allocates a unique child;
it retains the same capacity checks and records the actual backing filesystem.
No automatic tmpfs selection or ephemeral mount is performed. An explicitly
selected host tmpfs must retain failed roots after namespace exit; it consumes
host memory and is lost on host reboot/unmount. Keep all fsync calls and do not
claim power-loss durability from functional or process-recovery tests there.
The private `/tmp` bind precedes the exact repository and stage binds, preserving
owned workspace/stage aliases below `/tmp`. Use unique owned stage directories;
do not pass `/tmp` or a filesystem root as a stage. This ordering grants no
broader writable root and changes neither resource guards nor retention.
Do not delete or relocate any prior FAIL/UNKNOWN fixture. Native mutation evidence stays
at its real package `.tmp` path; the campaign does not relocate or rewrite it.
Full captures, boot identity, argv, terminal status, timeout and process-group
custody are retained in `coverage/contour-campaigns/<run-id>/`. Known failures
continue; unobserved process termination fences every successor. An interrupted
campaign is incomplete and never automatically replayed. Execution completion
does not imply gate success or global mutation qualification: each mutation lane
retains its pilot scope and requires assertion-confirmed Killed for every mutant.
Only the final owner publishes the existing contour projection after terminal
producer accounting. The campaign terminal record follows successful projection
publication. A failed interruption receipt emits a structured diagnostic on
inherited stderr and preserves both causes; a failed diagnostic channel remains
an additional error, never successful reporting. Repair agents may prepare disjoint changes in isolated checkouts
while a campaign runs. Root integrates only after the affected producers are
terminal; build/install and hooks do not run the campaign.

`bun run quality:contours` projects existing terminal reports into
`coverage/bun-unified/contours/CONTOUR-STATUS.md` and its JSON snapshot. It runs
no suite, AST inventory, Source hashing, compiler or quality gate. The registry
is shared with the mutation gate in `tooling/mutation-partitions.ts`; do not
maintain a second list. The document is a derived view, not acceptance evidence
or a new planning ledger. WORK remains the decision owner.

The summary separates historical exact F/L/S/B coverage, coverage plus compatible
same-run scoped frozen CRAP, and the complete triple including confirmed mutation.
These counters reuse the imported observations and existing compatibility checks;
they trigger no new scans or runs. Retired and static contours do not enter the
executable denominator. A coverage-only result never implies a CRAP or mutation
PASS, and historical counters do not establish current input freshness.

Mutation attempts retain raw runner counters separately from an optional
assertion-confirmed count. Global producer totals apply to a contour only for a
single selected partition with matching denominator. Same-run imports may enrich
a missing confirmed count; contradictory counts fail. Neither enrichment nor a
nonpassing confirmed subtotal admits a closure or changes the producer's result.

Focused coverage and mutation producers automatically write independent,
per-run observations under that ignored directory. Coverage records its final
parent outcome separately, including FAIL/UNKNOWN. A killed parent that cannot
write a terminal receipt remains an artifact gap; never infer PASS from an older
report. One final-check owner runs `quality:contours` after every terminal batch.
Parallel workers never merge a shared snapshot. Build/install and Git hooks do
not run this command. Projection failure reports an output gap and cannot change
the producer's gate result.

Keep the last observation, historical complete closure and current freshness
separate. Four covered/total counters and max CC/function-entry CRAP are measured
values, not global exact/frozen qualification. The separate frozen-crap lane
records the CRAP owner's conservative local receipt, without re-admitting it.
A complete local triple requires that receipt's exact same coverage run,
function denominator and identical Source/test/tool/module closure plus the
compatible assertion-confirmed mutation result. Historical coverage/mutation
pairs remain separately counted. Global gate statuses and current freshness
stay pending; generated scenarios and absent scenario/function/test links gain
no approval from this projection.

A historical local completion requires full declared Source and executed-test
selection, compatible captured Source/test/config/dependency digests, and the
mutation owner's assertion-confirmed result with complete process custody.
Different fingerprint universes are compared by captured per-file bytes, not
aggregate fingerprint equality. An unselected Source can be a focused tool input
and a mutation Source input. Match its digest through the normalized closure.
Failed/partial/UNKNOWN runs retain the prior achieved numbers and exact closure;
never combine individual maxima from different inputs. Missing evidence is
unknown, never zero. No currentness is claimed without the existing owner proof.

Use repeated `--report <JSON>` to import existing producer reports. For a
focused coverage run, `--coverage-run <focused.json>` imports the diagnostic and
its sibling `operation-outcomes/<run-id>.json` together. It requires matching
run, contour and Source/test/tool fingerprints before publication. The concise
CLI result includes F/L/S/B counters, measured CC/function-entry CRAP and the
actual operation status. BLOCKED, FAIL and UNKNOWN remain separate operation
observations; numeric counters never promote them to PASS. This reads retained
reports only and adds no Source/AST/hash scan or test run. Use this option for
new focused-run imports; retain `--report` for other owner-issued artifacts.
The campaign uses that same coverage/outcome pairing and retains each report's
lane when assembling imports. Missing or mismatched outcome bindings fail before
publication; do not downgrade a coverage import to generic `--report`.

Use the maintained single-stage controller from a clean immutable measurement
checkout for rolling contour work:

```sh
bun run test:contour:stage --contour bun-service-operation-custody --lane coverage --output /absolute/canonical/.agent/work/core-runtime-reactivation
bun run test:contour:stage --contour bun-service-operation-custody --lane frozen-crap --coverage-run /absolute/retained/focused-coverage.json --budget-ref <published-reviewed-commit> --output /absolute/canonical/.agent/work/core-runtime-reactivation
bun run test:contour:stage --contour bun-service-operation-custody --lane mutation --isolated-workers --output /absolute/canonical/.agent/work/core-runtime-reactivation
```

Root alone runs this controller and serializes publication. `--output` must be an
existing canonical directory outside the measured checkout; its existing JSON is
merged automatically. `--snapshot <JSON>` optionally supplies an additional explicit
snapshot. The controller retains launch and terminal process/capture receipts,
checks unchanged boot/commit/clean inputs, then imports the exact structured
producer report location through the existing CLI. Coverage always imports its
paired outcome; native mutation always uses the persisted proof reader. A missing
report or publication error produces a retained error and nonzero command exit.
The frozen stage also imports its input coverage/outcome pair, so an earlier missed
import is repaired idempotently. A publication exception remains unknown/partial
because JSON may already have committed; a subsequent receipt failure preserves
the primary error. Neither case asserts that nothing was written.
Failed coverage retains its actual operation status. Partial/UNKNOWN native
summaries are retained and never imported as a score or closure. Native workers
remain subject to their existing allowlist; the flag grants no admission.
The campaign and stage share one terminal-publication predicate: frozen CRAP,
applicability N/A and mutation require completed producers with complete captures
and observed child/group termination. A report emitted before a failed exit is
not publishable evidence. Coverage's paired operation outcome remains separate.
The native controller uses batches of128 to reduce parent barriers while keeping
the same complete selection, fixed worker limit and900/930-second budgets. This
is an execution setting, not a measured speedup or a new timeout allowance.

Stage stdout contains a compact `VidaContourStageLocation/v1` and terminal
`VidaContourStageOutcome/v1`; full argv/environment remain in `launch.json`.
The terminal record carries retained paths, elapsed time, process/exit/signal/
timeout/spawn result, capture/group closure, boot/commit/clean-input checks and
publication outcome. It reuses the one retained stdout read, including a failed
read, and adds no Source/AST/hash scan. Mutation counters are explicitly
`diagnostic-only`: even all-Killed counters cannot substitute for the existing
native report reader or be routed through ordinary report admission. Missing,
malformed, ambiguous or inconsistent diagnostics never replace the primary
publication error. Read diagnostic artifacts with the shared bounded descriptor
owner; enforce the byte limit while reading, before JSON parsing/allocation can
consume an arbitrarily large file. Preserve existing per-caller limits and the
stricter native proof reader.

For a repair's generated-mutant controls, use the same maintained controller:

```sh
bun run test:contour:stage --contour bun-runtime-initialization --lane mutation --diagnostic-mutant-ids 92,115 --output /absolute/canonical/.agent/work/core-runtime-reactivation
```

ID selection remains serial and mutation-only; it cannot combine with isolated
workers. The native owner validates the IDs and selection bound. A partial
diagnostic keeps its nonzero exit and retained diagnostic counters; it never
publishes a mutation score or a closure. Confirm the intended IDs are assertion-
Killed, then run the full selected universe. This replaces private launcher
copies without adding another test runner or report authority.

For an isolated worker-width pilot, use `--diagnostic-batch-size 16` with the
mutation lane and the requested qualified worker flags. It forwards exactly one
native batch, with the complete baseline/universe still captured and no complete
admission request. The native owner validates the batch bound. Batch and ID
selectors are mutually exclusive; batch diagnostics may use isolation, while ID
selection remains serial. Require actual all-Killed bounded evidence for that
contour and width before launching its complete isolated run. Partial diagnostics
retain their original classification and never publish a score.

Arbitrary private launchers still require an explicit Root import after terminal
custody. Audit a suspected omission against retained report paths and the existing
snapshot; do not rerun tests or rescan Source to repair an import gap.

Focused development launchers retain native JUnit and report actual executed and
skipped case counts with their terminal result. A zero-match/skip-only selection
does not verify a repair. Reuse the existing JUnit reader; this census does not
replace complete contour selection, assertion confirmation or numeric admission.
Version a retained launcher when changing its receipt format, preserving the
original launcher and failed/UNKNOWN artifacts.

For an older mutation summary that omitted executed tests, supply its actual retained
`--selection <partition.inputs.json>` v3 descriptor. It must match the summary's
input/source/test/tool bindings; today's registry alone cannot establish what
an old run executed. `--commit <SHA>` binds explicit imports without a Git scan;
`--at <ISO-time>` records import time, not execution time. Producers leave commit
`not-captured` until an attributable import supplies it. Conflicting results or
known commits for one run are rejected.

Preserve history across hosts with the tracked
[derived contour snapshot](../../.agent/work/core-runtime-reactivation/CONTOUR-STATUS.md).
After a fresh checkout, use its sibling JSON as `--snapshot <path>`. After all
Source freezes/checks finish, export the merged snapshot with `--output <directory>`
to that same work directory and commit/push both generated files. Do not edit
measurements manually. Output defaults to ignored coverage storage. File and
directory sync precede successful publication; JSON is the recoverable snapshot
and Markdown can be regenerated after an interrupted write. This filesystem
publication is qualified on the current Linux host; unsupported sync is an output
gap, never a weaker silent durability claim.

These targets and frozen budgets govern development and truthful completion of
its checks. They add no numeric barrier to the minimum native formation and
installation profile or supported developer unblocking. Follow the lifecycle
owner's formation and installation policy: do not run suites or repeat task
checks or reviews solely for delivery or unblocking. Missing measurements remain
pending or GAP; delivery does not turn them into PASS or Runtime acceptance.
Causal functional defects still require correction by their current owner.
Preserve Source rights, CAS, UNKNOWN custody and required artifact integrity.

For the current clean-project qualification task, the user's later explicit
instruction requires all four exact coverage metrics at 100%, 100%
assertion-confirmed Killed mutation qualification, and passing dynamic CRAP
against frozen per-function budgets before the real formed-native Runtime run.
This task-specific sequencing overrides the general minimum delivery profile
above; it does not add suites to build/install. Development fixtures may run to
close the gaps. Root owns final numerical outputs and the subsequent isolated
Runtime phase. The current user instruction authorizes the separate final
mutation qualification; an inventory or partial lineage checkpoint cannot pass it.
Dynamic CRAP uses current complexity and current measured coverage in the formula
below. Its allowances remain frozen; do not reset them from candidate results.

Compute each function's CRAP as `CC^2 * (1 - coverage)^3 + CC`, with coverage
expressed as a ratio. Report complexity, coverage and CRAP separately. At full
coverage CRAP equals cyclomatic complexity, so a universal CRAP ceiling must not
force removal of required behavior or artificial splitting of a cohesive invariant.

Freeze a justified function/risk complexity and CRAP budget in the existing task
plan before implementation. Use the existing verified baseline for modified
functions and a justified reviewed ceiling for new functions. The budget must
retain security, data and lifecycle requirements. Reject deterioration against
that baseline. Never recompute an increased allowance from the candidate itself;
a necessary budget change needs explicit rationale and review in the same work.
Missing baseline, ceiling or review is a GAP, not an unlimited allowance.
CRAP 1/2/3 and cohesive-invariant 4 remain design guidance for simple functions.
Numeric simplicity does not replace behavioral, security or recovery evidence.

The CRAP gate uses the frozen budget plan bound to the reviewed baseline. A
missing baseline or plan is a GAP. The gate must fail closed. Never derive a
budget from candidate results. The Bun Test runner rejects tests that import
Vitest until those tests are migrated.

The baseline coverage report may record less than 100% coverage; its measured
per-function fractions determine the frozen baseline CRAP values. It still
requires a genuine Bun Test run with matching published Source and test
bytes, exact quality-tool inputs, pinned runtime executable digest, manifest,
immutable input snapshot, and complete process receipts and counters. Validate
that provenance through the shared side-effect-free report validator. Current
captured tools remain the sole measurement and admission authority. Under the
user-authorized TEST-013 fixture protocol, the frozen four published tests may
execute their published tools only as sealed, isolated test subjects. Bind the
fixture tree separately from current measurement tools, retain exact published
bytes and selection, and require child command/input/terminal receipts; missing
observation remains a GAP. This exception does not permit historical tools to
produce or admit accepted quality evidence, or any historical operational state
replay. See the baseline fixture protocol in the current CLEAR work directory.
The unfinished b549951 checkpoint has one intrinsic inventory assertion failure.
A typed historical reference may admit its complete measurements only under the
protocol's exact JUnit, expected child-output and terminal predicate. It retains
`suite_passed=false` and `quality_passed=false`; all other failed/unknown runs
deny. Current mode rejects historical-reference metadata. This does not supply
a passing mutation baseline or runtime acceptance, change any original test or
derive candidate budgets. The implementation and genuine admission remain
required; this policy change supplies neither.
The current CRAP consumer may validate retained historical evidence without
executing its runtime. Require exact published-baseline selection/reference,
historical package pin and retained regular runtime bytes matching the report
and manifest. Keep all snapshot, input, process, child, JUnit, terminal and
counter checks. The current producer remains bound to the current pinned Bun.
Original measurement-tool hashes stay bound to their original captured inputs;
they need not equal later consumer bytes. Consumer compatibility requires full
canonical map regeneration matching report and manifest, original process-counter
validation/merging, exhaustive unique function joins and exact frozen baseline
CC, coverage and CRAP equality. Non-current published tooling still matches
b549951. None of this changes frozen budgets or the historical suite failure.
Use the declared original snapshot closure through the existing bounded,
no-follow input reader; never rediscover current tooling paths in that archived
tree or insert replacement tools there.
Bootstrap evidence uses exactly one declared canonical evidence provider
(`tooling/bun-coverage-evidence.ts` or its original `.mjs` counterpart) and its
observed captured digest. Missing or duplicate providers fail closed; current
mode still requires the exact `.ts` path. Other bootstrap paths stay exact.
The CRAP plan's cross-version runtime
reference stays inside the Source repository and rejects symlinked components.
An absent reference retains the strict current-executable hash/pin check, which
can succeed only for an exactly matching runtime. The read-only validator's
direct caller owns its retained artifact path; the CLI owns repository containment.
Outside that bounded fixture role, do not execute baseline tools. Missing genuine report or plan stays
a GAP. The current candidate report must continue to meet exact 100% in every
coverage metric.

The coverage child serves maintained Source, selected tests, helpers and declared
local tooling modules from its sealed per-run snapshot. Each intercepted module
path and digest is listed in the process receipt, and every selected test must
appear there. Generated local modules outside `src`, `bin`, `tests` and `tooling`
may load live bytes; the receipt classifies and hashes those bytes separately.
The runner process itself remains checkout-loaded and fingerprinted. The captured
preload is passed as a Bun CLI option, so test-spawned child processes do not
inherit the coverage preload. Installed
npm dependencies, Bun runtime files, non-module filesystem reads, generated
resources and inherited environment are outside byte-snapshot custody. Published
baseline environment and Bun config files are captured and supplied from the
snapshot. This evidence assumes trusted selected tests; it does not authenticate
live Istanbul counters against adversarial in-process test code.

Coverage uses the pinned Istanbul public API with Bun Test. It binds every
maintained TypeScript and CLI source file to the selected test, tool, manifest,
lock, and Bun version inputs. It reports functions, lines, statements, and
branches. The exact coverage gate requires 100% for each metric.

Current instrumentation uses the public Babel/Istanbul `programVisitor` adapter.
Private methods retain their original private syntax and body locations while
receiving ordinary Istanbul function counters; getters/setters, static, async
and generator methods remain in the Babel inventory. Missing or ambiguous
function mapping still denies admission. Do not exclude private methods, infer
function execution from statement counters or replace them with field closures.

Use deterministic seeds. Record platform skips as GAPs. A descriptor simulation does not qualify a native OS target. Do not create a benchmark, ROI or token-accounting lane to score a correction.

## Process, timeout and fixture safety

Before profiling native tests, qualify the exact command on a private two-case
fixture. Require the intended case filter, no package-script dispatch and a
nonempty profile artifact. Global profiler flags before `test` can select the
package script; native test execution can also ignore runtime profiling flags.
Runtime help and a passing test alone do not establish profiler support.

The default timeout is 5 seconds per individual test, selected explicitly with
`bun test --timeout 5000`. It is not a deadline for a file, phase, child pool or
the whole suite. Explicit per-test exceptions require a contract-backed reason,
such as observing a complete isolated pool or a real recovery quarantine.
Keep aggregate process budgets separate and preserve their cleanup/report
allowance. The product operation target remains 2 seconds; neither test defaults
nor exceptions change it. Do not shorten protocol quarantine to fit a test.

Bun's timer can run late during synchronous fixture work. A PASS row after the
declared deadline is not time-budget evidence. Carry the same monotonic case
deadline through setup and cleanup, reject completion after it, and stop issuing
later setup operations once it expires. Establish cleanup ownership before the
first handle opens; preserve the original setup error and every close failure.
Keep a failed or expired root even when the body eventually settles. Opt-in phase
timings may diagnose setup, but nested timings are part of their enclosing phase
and must not be added twice or treated as a controlled benchmark.

For initialization read-admission expiry, first observe a real pending retry
and unchanged receipt, guard/quarantine and Host images before the original5s
deadline. A serial test-local `Date.now` jump may then cross that deadline while
remaining below the30s quarantine; keep retry timers real. Attach rejection
observation immediately, drain the owned binding before restoring the clock,
and preserve both the assertion and drain causes. This proves deadline handling,
not elapsed quarantine. These expiry cases use the default5s case bound.
For cross-process binding, a real parent call under a held receipt lock provides
parent-body activation; child counters never substitute for that evidence.

For a functional SQLite lease-denial case, a test-local native exec wrapper may
set `PRAGMA busy_timeout=0` on the exact gate connection immediately before its
real `BEGIN EXCLUSIVE`. Keep the actual paired lease held, assert native BUSY,
no verifier call and unchanged persisted state, restore the wrapper, then release
the lease and prove a healthy retry. Preserve owned cleanup and failed fixtures.
This proves immediate lock denial, not the production busy-wait policy; tests
of that policy retain its real bound. SQLite documents the connection-scoped
handler and zero-disable behavior in its [busy timeout API](https://www.sqlite.org/c3ref/busy_timeout.html).

Direct Source final-assurance preparation uses a20s composite exception. It
requires fresh admission, the real writer reservation/report, two configured
validator reports, the dependent tester/delivery-proposal waves and persisted
packet publication. The passing fixture makes one actual authorized scoped edit
before reporting its writer result. Fresh preparation measured17.16s; its
controlled pre-assurance-CAS interruption and exact packet retry stay within the
same scenario. This method-boundary fault is not a crash or power-loss proof.
Typed passing reports are synthetic
caller-report inputs and do not establish native test execution or Runtime
acceptance. The separate public CLI preparation case remains intact.

Initialization replacement-effect contention reuses the existing fresh-module
fixture for both injected errors and the real CAS reclaim guard. The real mode
delegates the original typed arguments to `replaceAtomicAsync`, checks one call,
typed cause, unchanged receipt and retained guard inode, and restores original
module exports in `finally`. It needs no extra Bun process or SQLite connection;
the separate two-process binding case remains the process-boundary contract.
Keep the replacement case under the default5s limit and preserve failed state.

The separate-process initialization describe's `beforeEach` has an explicit10s
cold-start allowance. Its two fresh Bun imports and Host DB opens stay sequential:
parallel DB opening encountered an active project-upgrade CAS quarantine. The
retained b07c5670 invocation exceeded the default5s during setup before READY;
it remains UNKNOWN, never Killed. This exception changes neither the5s test-body
default nor other hooks, each child's15s owner, or the900/930s mutation budgets.
Bun's [timeout contract](https://bun.com/docs/test/writing-tests#timeouts) kills
children when the uncatchable timeout fires; preserve the independent owned drain
and failure artifacts. Do not add retries or bypass the quarantine to pass setup.

The initialization-authority v2 integration case has an explicit10s exception.
It creates a fresh project, plans and completes the real bundle-owned upgrade,
then reads the selected v2 receipt and exact binding. This dependent setup and
readback phase measured6.144s within the15-case initialization selection; a
fabricated activation or receipt would remove the proof being tested. The
exception changes neither the5s default nor the5min aggregate coverage limit.

The activated-config closure case has the same explicit10s composite exception.
One real completed upgrade supports both a successful cached config load and
the subsequent schema-valid receipt-identity denial. It measured6.034s, retains
failed/expired fixtures and checks denial leaves receipt bytes unchanged. Do
not duplicate the complete upgrade just to give each dependent assertion its
own case; the default and aggregate limits remain unchanged.

Keep independent CLI denial scenarios in separate tests, each with its own
case budget. Dependent calls within one scenario share its parent budget;
do not restart that budget for each child. Splitting independent cases preserves
the per-test default; it does not prove faster execution of the whole selection.

The TaskSource public prepare-and-issue integration case has an explicit20s
exception: it checks two independently initialized public calls, current Source
authority, policy evaluation, persisted Host CAS, the prepared public result and
the issued wire result in one attempt. The related independent report/GAP/high-
risk cases retain the5s default.
This classifies the supported integration contract; it establishes no processing
speed improvement and does not relax the2s product target or freshness checks.

The delivered-work public interruption case has an explicit8s exception for
five dependent public calls: plan, intake-denied apply, interrupted apply, resume
and exact retry, with persisted UNKNOWN/fence checks between them. A phase probe
measured the complete sequence at5.56s and each phase below2s. The ordinary
three-call repair and body/cleanup regression keep the5s default. This allowance
preserves the composite contract; it claims no speedup and changes no product
target, protocol threshold or full coverage operation budget.

The unprepared-work recovery CLI sequence has an explicit8s exception. Its
diagnosis, public inspect, apply, connection reopen, exact lost-ack retry and
changed-request denial depend on the same persisted attempt. A complete5s run
and the isolated case both exceeded the bound; the isolated sequence reached
7.23s. Keep every freshness/CAS, original-evidence and no-effect assertion.
The fixture cleanup deadline starts at case entry and uses the same8s bound.
The observed inspect phase exceeded2s in that isolated run; its product latency
target remains an open optimization, not a relaxed gate. Independent recovery
denials and all ordinary CLI children keep the5s default.

The read-only replacement report integration case has an8s exception, reduced
from30s. It activates one real persisted replacement, rejects three corrupt-plan
variants without changing Host/journal/plan/outcome bytes, then publishes the
valid report and denies the stale CAS retry. The measured complete case was5.29s.
Keep the activation and each fresh persisted read in the same scenario. The
independent public inspect/plan/apply/resume and malformed-generation matrix
now use separate fixtures with the5s default; the legacy v1 case also uses5s.
These changes establish per-case bounds, not faster total suite execution.
This in-process Source CLI fixture creates directories through the real configured
path bindings and retains real policy, configuration, source scope and SQLite.
Its copied package Source/test/tooling/dist trees were unused by the executing
Source CLI and are removed. This sparse fixture is not native delivery or a
Source-unavailable Runtime qualification.

Source-correction fixtures share the test-only `captureSourceBeforeimages` owner.
It delegates one unchanged snapshot capture and retains private returned-byte
images for serialization, removing the later package-wide reread. Those bytes
describe capture A, not a later CAS observation. Preserve the order A, delivery
apply, beforeimage serialization and Source correction, plus every independent
production capture B and its fresh executable inventory. Reject missing entries
or capture failure before publication. Check stable one-read, fallback two-read,
drift, absence, canonical membership and independent later captures.
Borrowed readers can reuse a mutable Buffer. Snapshot fallback and configured
context pin the first bounded image before asking for the second, then compare
and hash that image. Test same-buffer mutation between reads and across paths.
Native readers already returning private buffers need no additional copy.

Parameterized cases need distinguishable actual reporter titles. Check the
selected Bun output, not format documentation alone. The numeric terminal-status
matrix uses named object rows with observed working `%j`; labels distinguish
null, NaN and infinity despite JSON encoding them as null. This observation does
not establish that every other placeholder or existing case is defective.

Public CLI test helpers prepare the existing pinnedEnvironment before launching
the child. This avoids loading operation modules again through cache-routing
self-reexecution. Preserve caller environment overrides and the existing child
budget, terminal-outcome and UNKNOWN predicates. Cache preparation grants no
project, thread or trusted initialization authority.

The shared uninitialized run fixture latches UNKNOWN for its selected root
before invoking caller cleanup notices. Its single close owner retains and
reports the root during both the direct control and afterAll. An inert timed
child's passing UNKNOWN assertion does not clear that latch or permit deletion.
Keep unrelated roots under their existing caller-owned cleanup contracts.

Recovery request comparisons use an independent model from the validated
pre-inspect Host snapshot and declared fixture inputs. Calling the same
production builder as both public path and test oracle duplicates work and can
share a defect. Bind all expected fields, versions and seeded maintenance state;
retain fresh post-call no-effect snapshots. Reuse a prior fixture snapshot only
across preparation that cannot change those rows, never as live authority.
Time public operation returns separately from oracle and witness work.

For callable CLI diagnostics, pass the supported local exit recipient to main
and assert its exitCode. Do not mutate the test process exitCode and restore
undefined. A qualified Bun probe left1 after that restoration, despite all
case assertions passing. Require the actual terminal command result as well as
the reporter counters; zero failed cases alone does not establish suite PASS.

On the qualified Bun 1.4.3, a local inert control showed that `[test] timeout`
in TOML did not enforce the requested timeout; use the CLI option. Another
control showed `--bail=1` skips preload `afterAll` finalization on first failure.
Do not enable bailout in final coverage or admit a missing process receipt.
The concurrent-body bail control emitted a zero JUnit assertion count despite a
causal Bun matcher event. It remains unproven under the current strict classifier;
do not infer Killed from the body event alone or confuse this with the separately
qualified zero-count Node assertion case.

The launcher and ordinary test phases have no implicit aggregate deadline. Explicit caller, case, probe, repair, installation and cleanup bounds still apply. Do not turn an unbounded duration into an infinite native timeout value.

The coverage test producer inherits stdout/stderr into its caller-owned log;
the explicit user-selected global operation deadline is five minutes
(300000ms), with no in-memory
output ceiling. An interrupted iteration remains UNKNOWN and cannot admit
final coverage or mutation results. Keep its CLI
`--timeout 5000` per individual test and documented case overrides. Temporary
controller destinations must remain outside the editable repository target;
do not set TMPDIR to a directory inside that target for the full suite.

### Parallel testing: current status and required contract

Parallel coverage remains pending; it is not a supported flag override. The pure
`tooling/coverage-shard-plan.ts` scheduler does not activate parallel production.
The deployed serial v2 run/v1 process receipts require the whole selected set
per process. Versioned v3 run/v2 process primitives are a separate foundation,
not activation of parallel producers or resource-wave supervision. Historical references also bind
one PID and fixture-child observations. Native
Bun worker/JUnit merging does not satisfy these contracts. Keep current and
historical commands serial until the versioned protocol, custody and bounded
pilot qualify. Keep historical baseline execution serial after current-mode
parallelism qualifies. Read the maintained
[design](../../.agent/work/core-runtime-reactivation/PARALLEL-TESTING-DESIGN-20261012.md)
and [implementation plan](../../.agent/work/core-runtime-reactivation/PARALLEL-TESTING-IMPLEMENTATION-20261012.md)
before changing the runner or parallel eligibility.

The target is one final-check owner, one run/reservation, one captured input
snapshot and instrumented map set, and initially two direct Bun producers.
Prepare the Babel inventory, associations, reviewed scenarios and digests once.
Reuse captured bytes/maps across shards; validate and merge globally once.
Do not add per-worker full AST/scan/hash passes, competing full suites or tests
in build/install. Preserve existing exact coverage, frozen CC/CRAP, function
correspondence and assertion-confirmed Killed gates. Static links, execution,
coverage, assertions, properties and mutation remain distinct evidence.

Each assignment batches explicit `./` test paths in one serial Bun child with
`--parallel=1 --no-isolate` and `--timeout 5000`. A shared-resource file may run
after another in that same assignment. This requires serial test bodies too:
global `--concurrent`, `test.concurrent` and concurrent describes invalidate the
initial assignment contract. Mocks, clocks, environment and module ordering need
their own review; fresh filesystem roots do not prove global independence.
Batch resource-free files to retain import/JIT reuse rather than starting a
process per file. Balance file counts with stable path/index ties initially;
use duration weights only after complete same-scope per-file timing evidence.
Partial reporter body sums are not those weights or proof of speedup.
Partial PASS/FAIL rows may appear in a dated progress record only with their
incomplete scope and terminal FAIL/UNKNOWN status. They establish neither final
suite success nor coverage, CRAP or mutation admission.

Seal shard invocations to the approved serial argument grammar, including
explicit assigned paths and captured configuration/preload/report destinations.
Name filters, discovery filters, retries/repeats, bailout and unknown modifiers
cannot qualify the complete assignment. A name filter is valid for a separately
labelled focused development check only. Loading every assigned file and exit0
do not prove that every intended test body ran.

For the v3 contract, bind the effective child environment through the shared
environment-digest owner. Missing NODE_ENV and TZ use Bun Test's documented
defaults `test` and `Etc/UTC`; explicitly supplied values remain bound. Apply
defaults before the final canonical key sort. Qualified serial
`--parallel=1 --no-isolate` children expose both BUN_TEST_WORKER_ID and
JEST_WORKER_ID as `1`: seal and verify those values rather than ignoring the
keys. Worker1 is local to each child and cannot identify a global shard;
use the run/shard/PID receipt join. Nonempty ambient BUN_OPTIONS denies this
contract. Do not log raw environment values while diagnosing hash differences.

The review-base environment digest is separate from the exact child digest.
Only the current maintained wrapper, without an opaque parent budget, emits
`--wrapper-review-clocks` together with a fresh bounded clock-policy tuple after
discarding ambient claims. The tuple binds the actual generated budget/deadline,
original caller and ancestor ceilings, effective maximum and30000ms reserve.
Review normalization requires explicit wrapper opt-in and full tuple consistency;
direct invocations, missing/malformed claims and opaque budgets use exact hashing.
Original absolute expiries, diagnostic flags and unknown env keys remain bound.
This is cooperative consistency, not authentication or execution authority.
The final owner retains actual Source wrapper issuance evidence; an internal
flag or internally consistent JSON alone is not that evidence. Native inert
wrapper/direct controls qualify this routing without running a second suite.

Eligibility binds captured test SHA plus the source/test/tool/config/runtime,
platform/provider and package-owner review scope. Source or dependency drift
invalidates unchanged-test reviews too. Omitted reviews default to singleton
exclusive waves; stale, duplicate, foreign or malformed reviews deny planning.
Current selections containing `tests/configured-context.ts` capture the actual
consumer configuration origin and physical root identity in execution scope.
Pass that captured root to the current child; relocating a test snapshot must
not change its configured root. Reuse the successful loader's source digest,
not the canonical semantic config digest. The final validator resolves its
expected root from the caller and denies missing, stale or foreign claims;
report metadata grants no filesystem or execution authority. This binding opens
no workspace database and does not activate parallel eligibility.
Use canonical `namespace:<64 lowercase hex>` resource IDs derived from already
captured physical-owner identity, not alternative raw path spellings. The pure
scheduler performs no filesystem discovery. Resource IDs shared by concurrent
assignments are forbidden. A file joining resources from both assignments starts
a later wave. Global-exclusive files run alone between settled waves.

The pure `coverage-shard-eligibility.ts` resolver decodes an explicit
`VidaCoverageShardEligibility/v1` review envelope. It compares Source, tests,
tools, configuration, runtime, base environment, Bun version, provider, platform,
architecture and physical package-owner digests. The initial launch seam accepts
only a complete current selection in one nonexclusive wave of at most two serial
assignments; missing, stale, malformed, historical or multiwave reviews retain
serial fallback. No caller may manufacture empty resource rows. The existing
native fixture pilot exercises this seam. The maintained current runner reads
`coverage/bun-unified/shard-eligibility.v1.json` once through the qualified verified
reader before output allocation; unavailable, malformed or stale reviews retain
serial fallback. The scope builder reuses captured configuration digests and the
observed consumer origin, runtime hash, environment and physical package identity.
It does not reread configuration, invent resource reviews or grant eligibility.
Treat the consumer loader's `source_digest` as bounded opaque provenance:
legacy origins include the configuration filename prefix, while activated
origins hash their complete activation/history/input/receipt binding. Carry its
exact value into the fingerprint; only derived scope and physical-owner hashes
have the bare64-hex contract. The existing loader recapture owns freshness.
Inert runner fixtures copy the real eager CLI/provider/source-identity closure,
without substituting constants or weakening product readers.
An authoritative current resource review and complete production qualification
remain pending. A retained fixed-path artifact may belong to older inputs;
its existence does not make its rows eligible for the current captured scope.

Launch preparation and report admission share the canonical output-layout owner.
Prepared child temporary directories are distinct run/shard children outside the
editable package, including when a temporary fixture package shares their parent.
Bind the external root in `shard_temporary_root`; keep absent-field compatibility
for existing v3 fixture receipts. Validate the layout and effective serial argv
before creating outputs or launching children. Seal the reviewed base environment
separately from each child's effective environment; diagnostic environment switches
can change resource ownership even when test bytes are unchanged.

For current run/v3, the aggregate-free `VidaBunCoverageReport/v2` wire contract
contains sealed Source maps and process/terminal receipt references, with no
top-level `coverage` or historical admission fields. Unknown wire keys fail
closed. The final validator checks the same provenance, snapshot, map, selected
union and counter rules, performs the checked merge and returns it separately as
`CoverageResult.coverage`. CRAP consumes that transient checked map. The raw report
and zero-seeded canonical maps cannot substitute for it. Report/v1 retains its
persisted aggregate comparison, including established v1/v3 fixture compatibility
and historical readers. Without a qualified current artifact the live producer
remains serial report/v1. The opt-in v3 route reuses the same capture, transform,
supervisor and final validator: parent-owned log descriptors are closed after
direct accounting, and the report assembler joins actual successful native PIDs
to strictly decoded process receipts. It emits report/v2 without a producer
premerge. Fixture acceptance alone does not qualify a full production run or
establish numeric evidence.

Module mocks, clocks and environment changes confined to a serial child do not
alone establish a conflict between producer processes. Trace active guards and
restoration, including unresolved failure paths. A randomized child under a
shared temporary parent is distinct from a fixed output or destructive parent
cleanup. Ordinary SafeRepositoryAccess config/Source reads can create CAS locks;
batch callers of the same physical consumer root in one serial assignment.

Private consumer roots do not isolate runtime package resources. Package identity,
schema and template reads may still use one executing package root and read-side
CAS locks. Keep the shared runtime-package owner resource until package-only
verified reads and actual overlapping-reader controls qualify. Preserve mutable
consumer/Source readers, identity/freshness/bounds, authorization, CAS, recovery
and durable writes. Package copies alone do not redirect module-derived roots.

Treat child elapsed clocks as local evidence. On qualified Bun1.4.3,
`process.hrtime()` has a process-relative origin; timestamps from different
children cannot establish interval overlap. Bun documents `Bun.nanoseconds()`
as process uptime too. Measure the pool from its coordinator, and require
causal evidence at the actual read boundary before claiming read overlap.
Two READY/GO handshakes, simultaneous process lifetime or successful native
reads without writes qualify only their stated coordination/correctness checks.
Keep the package resource shared until the stronger overlap and affected-caller
closure checks qualify; do not force a green timing assertion with sleeps or
retries.

The Linux package-reader control additionally parks both real readers inside a
`readSync` interposition after matching the opened schema descriptor. The
coordinator releases either read only after observing both boundary entries.
This proves concurrent pending verified captures at that JavaScript descriptor
boundary; it does not measure overlapping kernel syscalls. Keep the common
package resource until the remaining caller closure and eligibility review.
For late renewal caller tests, initialize the real Mastra bridge journal through
its producer owner. The absorption helper's minimal journal omits Source scope
and cannot reach the late schema fence. A successful renewal advances Journal
CAS while preserving its payload and digest; assert these separately.
The Linux late-renewal case in `tests/runtime-package-access-reuse.test.ts`
has an explicit30000ms exception covering real producer bootstrap, renewal and
awaited close. Keep the ordinary5000ms test default. This control requires the
real producer-bound Source journal; the minimal admission journal fails before
the late schema read. Do not substitute fabricated journal postimages. Its
exception is not a product latency qualification or an increase to the complete
coverage300000ms budget. Keep the same allowance in the fixture retention
deadline. A timed-out async body may continue owning spies; stop the affected
pool on failure, retain its root, and await terminal observation before any new
pool. Neither timeout nor a sent signal proves effects are quiescent.
Project-split rebind caller checks reuse an already activated upgrade fixture
after its original assertions. Supply the consumer selector prerequisite as
explicit isolated fixture data, not installation evidence. Let the public planner
create its own canonical operation directory; precreating it hides path defects.
Bind authored target validation to the loaded baseline's configuration source,
retain source-mismatch denials, and compare selector/config/receipt/activation
bytes, database rows and operation bytes around a schema-drift denial.
For reader instrumentation, count raw accesses by resource path independently
of diagnostic labels. Verify the expected labels on native verified captures and
bind their actual bytes to the caller's persisted digest. A declared supported
provider missing verified capture fails qualification; unsupported providers keep
the original semantic assertions with an explicit qualification gap.

Shared fixture helpers export an explicit hook-registration function; each test
file calls it once in its own top-level or owning suite scope. With
`--no-isolate`, imported modules are cached across files: a module-level
"already registered" guard can leave later files without their hooks. Keep
shared helper definitions reusable while registering each file's hooks locally.
Qualify this with two explicit test files in one serial child, checking that both
files receive setup/cleanup; a one-file pass is insufficient.

Route every asynchronous fixture operation, including preparation and recovery,
through its existing pending-call owner. While a call remains unresolved, retain
its root and the shared PATH/native-runtime/mock state it may still consume.
Prevent another case from entering that same shared state. Restore state only
after terminal accounting permits it; retaining the directory while resetting
process state is incomplete custody. Verify both pending retention/next-case
denial and settled cleanup without wrapping or duplicating the scenario matrix.

Direct-producer termination and coverage-reservation release are separate from
resource-wave advancement. Apply the exact existing direct reservation predicates.
The run has one acquired reservation, released once by its owner only after all
launched direct producers are accounted for under those predicates. An unknown
or unobserved producer keeps the shared reservation held despite passing siblings.
An exact not-started result accounts only for its own launch, never another child.
A successor also needs reviewed descendant/effect quiescence for resources it
will reuse. Direct PASS/exit, a released lock, missing PID/marker or issued signal
cannot establish this. Missing custody proof stops successors and retains UNKNOWN
evidence. Never retry an uncertain operation under another ID.

Every shard owns disjoint physical coverage/JUnit/log/receipt/temp outputs.
Reject aliases, output collisions and writes into the shared immutable snapshot
before launch. Bind run/shard/PID, exact argv/cwd/env, global inputs and local
assigned tests in the new protocol; preserve serial readers. Admission requires
exact disjoint assignment union, exact assigned-input load evidence, no sibling
claims, and valid process receipts joined to known successful supervisor outcomes.
Child counter evidence may be sparse: validate every observed source key against
its exact canonical map entry, deny foreign keys and invalid counter shapes,
and check safe-integer sums. Seed the global result once from the full captured
map; require the merged domain to equal the complete expected Source set. This
does not require every shard to load every Source. PASS siblings cannot mask missing,
stale, duplicate, foreign, failed or UNKNOWN evidence.
An absent Source key adds no counter increments; an unloaded seeded Source keeps
zero counters and still faces every exact coverage gate. Absence cannot replace
required receipt or loaded-module evidence; retain existing per-process checks.
Every child counter-map key, including a zero-valued map, requires its matching
Source path/digest in that same child's validated `loaded_inputs`. Apply this
guard to serial and versioned reports before merging. A global zero seed alone
does not claim a child loaded that Source. Synthetic fixtures derive load rows
from their actual captured Source/maps rather than a separate hand-written list.

#### Shard output qualification

Record a bounded pilot's separate dispositions for exact test selection,
v3 run/v2 process receipt and terminal joins, physical output custody, checked
counter merge and resource reuse. A passing receipt/merge check does not close
the output or resource disposition. Keep the synthetic fixture scope explicit.

Declared disjoint `log_file` paths are not evidence of captured child streams.
For the native output pilot, emit distinct controlled stdout and stderr markers
from each real child. Check that each bound physical log contains its own
markers and no sibling markers, alongside the existing output-role, alias and
collision controls. An inherited shared parent log retains diagnostics but does
not qualify separate shard logs. Do not manufacture logs from expected strings
or substitute preload output for observing the actual producer streams. Silent
ordinary tests need no artificial output; these markers qualify the routing.

Choose one existing validation/merge path for a pilot: direct shard-evidence
validation plus checked sparse merge, or the report-validator path. The v3 report
validator itself validates joins, performs the checked merge and compares it to
reported counters. Do not add a preceding merge solely to repeat that same pilot
check. Preserve the required report-counter consistency comparison.

The current serial supervisor inherits stdout/stderr by default. An internal
prepared invocation may supply a caller-owned writable `log_fd`; its caller opens,
holds and closes that descriptor. Validate the actual captured descriptor before
any group launch, including an accessor that changes during copying.
The bounded native v3/v2 fixture qualifies separate stream routing, receipt/PID
joins and one sparse merge. It does not qualify production shard integration,
resource successors, read-boundary overlap or global numerical gates. Current
commands remain serial; successors need the separate descendant/effect proof.
Its25s test exception observes the whole two-child group and owned cleanup under
one20s preparation/producer budget; each child retains the5000ms test default.

Negative controls preserve the valid prerequisites of the targeted guard.
Adversarial receipt fixtures preserve prerequisite rows and sibling receipts
while changing the targeted claim and its dependent custody rows/hashes. Assert
the intended denial boundary; an earlier load, decoder or Source-freshness error
cannot qualify a later ownership or counter guard merely because the request
was rejected. Keep the real drift denial as a separate assertion when isolating
a later low-level guard with a current-snapshot verification callback. That
callback does not establish authorization of the original candidate or public
route acceptance. Check unchanged authoritative state after each denial.
Malformed output-role sets still need an explicit structural denial.

The maintained coverage aliases launch the repository adapter
`../../tooling/agent/run-coverage.ts`, which calls the existing coverage owner
through the pinned bootstrap, with one300000ms outer wall allowance beginning
before package checks and runtime resolution. Stricter caller limits remain
ceilings; supplied budgets cannot bypass malformed-duration validation before
version probes. Other developer commands retain their existing default budgets.
The runner reuses the inherited monotonic allowance, reserves30000ms for
terminal/report work, prepares selected CI SDK inputs and runs one current
typecheck under its acquired lock before one capture/preparation. SDK retrieval,
producer and CRAP launches spend the same remainder;
CRAP also retains its300000ms upper bound. Check the remainder between CPU
phases; the pinned parent supplies the hard bound while a synchronous phase
cannot service a timer. An outer timeout remains UNKNOWN and cannot prove
descendant/effect quiescence or successful reservation cleanup.
Historical selection shares the entry budget but skips current typecheck and
keeps its original fixture, serial argv and reference-admission contract.
Current serial tests use explicit `./` captured paths to avoid snapshot-copy
discovery. The current serial producer uses the async direct-accounting owner.
The opt-in one-wave shard receipt/output route is implemented; its complete
current resource review and production qualification remain pending. No
successor resource-wave integration is enabled.
Spent allowance prevents launch; native timeout0 may disable a timeout.
Per-test5000ms defaults and justified case overrides remain separate. Mutation
is separately invoked; the five-minute target does not qualify its whole campaign.

#### Direct-producer accounting before resource reuse

For async supervisor work, record each prepared invocation's shard ID, whether
launch was attempted, observed PID/status/signal/error, direct terminal proof
and group reservation disposition. Validate and snapshot the complete bounded
invocation group before launching any child. Reuse the existing execution budget;
check its remaining allowance immediately before each launch. Never create a
new deadline per sibling or wave. Await accounting for every attempted sibling,
including when another launch fails or its allowance is spent.

Current serial and v3 producers atomically preserve the actual parent group in
`processes/observations/supervisor.json` before later budget/report checks or
caller log closure can fail. This diagnostic is separate from child receipts
and numeric reports. It grants no measurement success or resource advancement;
failed persistence still fails the run and retains actual direct accounting.

The retained manifest also records an actual current serial-fallback decision
in `execution_scope.shard_eligibility`: status, owner-provided reason and
available artifact/review-scope hashes. Prepared and historical paths retain
their existing shape. This explains a denied plan; it grants no parallel or
numeric admission. Prepare the review and launch from the same caller origin:
`PWD` remains an exact environment input even when the launcher sets child cwd.
Reuse already captured rows to diagnose mismatches; do not relax environment
binding or recapture a full inventory just to compare two scope fields.

| Observation                                                                     | Direct reservation disposition                                             | Measurement and resource reuse                                                              |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Qualified positive PID with observed direct terminal exit or signal             | May account for that producer only                                         | Nonzero, signal, timeout or error denies success; descendant/effect proof remains separate. |
| Qualified synchronous PID0/null status/null signal/ENOENT                       | Accounts only for that exact not-started launch                            | Retain UNKNOWN evidence; no resource-quiescence claim.                                      |
| Async missing PID with ENOENT, including close status-2                         | Unaccounted under the existing predicates; retain the acquired reservation | UNKNOWN. Do not rewrite it into the synchronous tuple.                                      |
| Shared allowance exhausted before an attempted launch                           | Record unattempted; adds no launched producer to account for               | No measurement success. Earlier attempted siblings still require accounting.                |
| Direct producer exits while a descendant remains live or effects are unresolved | Direct accounting alone may permit reservation release                     | `resourceSafeToAdvance=false`; stop resource successors and retain evidence.                |

Preserve raw observations and distinguish a recorded error from a qualified
terminal proof. For an acquired group reservation, release once only when every
attempted producer is accounted for and every unattempted launch has explicit
budget-spent evidence. This permits release of an already acquired reservation
for a group wholly unattempted due solely to observed budget exhaustion. That
fact proves neither a successful run nor safe resource reuse. An unexpected
error without qualified accounting does not satisfy this rule.
Do not acquire or synthesize another reservation to evade an
unaccounted attempted launch. Issued kill/unref requests are not terminal proof.

Qualify changes with bounded native controls for two producers, nonzero exit,
timeout with a still-running sibling, signal, async no-start ambiguity, spent
prelaunch allowance, invalid descriptors before any launch, and direct exit with
a live descendant. Keep FAIL/UNKNOWN roots and logs. READY/GO markers prove only
their stated coordination; missing markers or PIDs do not prove quiescence.
OS capability documentation or writable cgroup mounts do not qualify a provider:
verify actual owned creation authority before launching its control children.

The async foundation has focused static, native direct-producer and current
serial caller qualification. Its internal one-or-two-invocation controls do not
qualify a complete shard selection or descendant/effect quiescence. Keep current
coverage serial unless its complete current review admits the sole initial wave;
historical execution stays synchronous. The successful one-wave producers may
feed read-only receipt admission and CRAP without claiming resource advancement.
No successor test producer is launched; `resourceSafeToAdvance=false` remains.
Actual UNKNOWN/failed/unaccounted producers deny report success. Resource
successors and a quiescence provider remain pending.
Retain an actual timed-out control's UNKNOWN run after successful assertions;
passing the classifier test is not permission to erase that run in teardown.

Qualify pure assignment controls first, then bounded two-file/failure pilots
through the existing explicitly untrusted synthetic-fixture owner. A pilot proves
fixture behavior/receipt mechanics, not full trusted Source coverage or protection
against adversarial in-process test code. Compare serial and parallel over the
same immutable inputs/pin/maps/resource scope, with distinct run IDs and outputs.
Record actual wall/test-file tails, memory, child count and retained roots.
Stop expansion on custody, provenance, collisions, lost cases/assertions or resource
regressions. Split large files by domain only with exact case/name/test-ID lineage,
reviewed associations and fresh owned roots/DBs per case. Expand opt-in contours
before one complete current selection; publish verified correction packets.

For fixture teardown after asynchronous bodies, completion alone is insufficient:
a timed-out body may reach its final assertions later. Permit removal only with
successful completion and a finite, unexpired monotonic case deadline checked
after owned connection cleanup. Retain/report incomplete roots, attempt all
owned closes, and preserve both body and cleanup errors. Native Linux missing
file errors may expose a proc-fd leaf path; distinguish provider details from
required configured-context diagnostics and keep exact denial/no-effect proofs.

Composite runtime-config Source-repair cases use `withRuntimeConfigFixtureCase`
with the same bound passed to Bun. The helper enrolls each fixture root at
creation, so teardown can retain a still-pending body even when its individual
CLI calls have settled. Guarded cases are serialized; another guarded case
cannot begin while one remains active. Cleanup checks the case deadline again
after closing its governance-inspection database and before removing the root.
An expected-timeout child control must prove the child failed, its body was
unsettled and its root survived teardown. That control is not a passing timed-out
case, a coverage result or permission to remove the retained fixture.

New automatic-work-admission cases use withAutomaticWorkAdmissionCase and its
enrolled createFixture factory. Register retainPendingAutomaticWorkAdmissionCase
in the file's afterEach hook. Guarded cases are serialized; pending teardown
marks/reports retained roots without closing a database still used by its body.
After settlement, synchronous deferred cleanups run in reverse ownership order,
preserving body and cleanup causes through completeOwnedCleanup. Retention is
checked after native close against the same case deadline. Use an enrolled
fixture when preparing admitted work, so setup does not take a second close path.
The cleanup helper returns normally after successful cleanup. A catch that only
stores the body/assertion error must explicitly rethrow it afterwards; a pending
throw through finally resumes by itself. Do not add passing behavioral probes
between cleanup and that rethrow or change the helper's finally contract.
An unresolved body keeps database cleanup unproven even when its process exits;
retain its root and native failed outcome, never relabel it PASS or Killed.

The boundary case that completes a fresh ordinary assignment through a real
admitted local store uses10000ms for both Bun and its fixture-case owner. Measured
disk-backed phases were1362ms admission,1516ms composition,855ms preparation and
3925ms dispatch/completion (7667ms total; another run8389ms). Its real live lease,
config/authority checks and persisted claim/completion remain coupled; splitting
them across tests would share issued state. This is a single integration-case
exception, not a product performance acceptance or a new default. The immediate-
provider dispatch cost remains an optimization target. Other tests retain5000ms;
coverage/mutation campaign and product operation budgets are unchanged.

The protected-completion case in interrupted-source-retirement.test.ts uses30000ms
for a genuine public prewrite, issue-wave and native-result acknowledgement.
The reused issued-source setup measured8.503s and the new case8.715s
(9.69s for its command including module setup).
It verifies foreign/stale rejection, durable completed/applied state and replay
denial through the real store. Its separately owned Mastra journal remains
unchanged by the kernel acknowledgement. This bounded integration exception
does not change the5000ms default or the300000ms coverage campaign budget.

The protected public-issue entry-abort case also uses30000ms. It shares the
genuine prewriter setup, injects failure before the real effect begins, proves
durable abort, and rejects replay of the spent approval. The measured body is
9.849s (10.865s owned command). Prepare this case before issue through the same
fixture owner; restore workspace-scoped prototype spies before replay and owned
cleanup. The ordinary issued-fixture wrapper retains its required reservation.

[Bun lifecycle documentation](https://bun.com/docs/test/lifecycle.md) places
`onTestFinished` after all `afterEach` hooks and excludes concurrent tests.
Its documented callback supplies no test-success status. Neither this callback
nor reaching `afterEach` proves successful assertions, absence of pending work
or permission to delete. Require the existing explicit success/deadline/custody
evidence; record unsupported legacy cleanup as a gap until qualified. Hook
registration controls alone do not establish failure-retention correctness.

The upgrade lifecycle owner registers cleanup per case with `onTestFinished`,
not a file-wide sweep over other cases. Its finite monotonic cleanup deadline
matches each original test bound; expired completion and failed removal retain
custody. Direct effect controls qualify own-root removal, foreign-root survival
and expired retention without depending on finish-callback order. This does not
qualify concurrent bodies. Case-local read counts/timing use explicit
`AsyncLocalStorage.run` inside existing test bodies; native deferred/late-read
controls qualify call-time attribution and missing-context denial. Module/prototype
interceptors, cross-file lifetime and natural-age overlap remain pending.

Qualified Bun1.4.3 reproduces [upstream #44552](https://github.com/oven-sh/bun/issues/44552):
zero-parameter asynchronous hooks registered while an ALS frame is active can
be misclassified as done callbacks. An inert native probe shows `ALS.exit` at
registration still fails. For the two affected post-finish afterimage observers,
use the documented explicit done-callback form, forwarding both async success
and rejection, without returning a Promise or increasing the hook timeout.
Keep test registrations and owning cleanup registration outside the ALS body.
Actual changed-stage and natural pre-effect UNKNOWN cases qualify this workaround;
hook success does not grant fixture disposal or concurrent eligibility.

Close admitted workspace/Host database handles through
`closeWorkspaceDatabaseWithAdmission` or the owning store/ledger/fixture close
method. Raw SQLite `.close()` does not release the paired storage-admission
gate lease. Keep the source-close then gate-close order and retain failed or
uncertain fixtures under their existing custody owner.

Failed native closes retain the exact handle and its existing cleanup strategy
in the shared workspace close owner. Both reader and exclusive admission retry
that custody before opening a new owner. Closing immediately expires ordinary
read authority; cleanup remains permitted. Qualify source-before-gate ordering,
one gate attempt per retry pass, callback failure after capture, and body plus
cleanup error retention. An internal capture callback records the handle before
fallible binding and owns cleanup even when it throws. Injected interruptions
before a native close prove this custody contract; they do not prove native
SQLite I/O failure behavior. These controls do not qualify auxiliary-gate
retirement or the pending one-workspace-DB cutover.

The shared close accumulator accepts the exact owner callback, including an
awaited async adapter close. Tag work outcomes explicitly so `throw undefined`
remains a failure; retain original work then cleanup causes, and rethrow a sole
failure by identity. Large caller bodies keep their existing control flow and
ownership transfer; constructor success must leave its returned owner live.
LibSQL smoke owns at most one store at a time. Close it before removing its
temporary root. A failed close retains that root and its diagnostic; preserve
both work and cleanup causes, including thrown `undefined`. Its root observer
captures the exact invocation through a scoped module mock. Run those cases
serially with other users of that module registry until cross-file isolation is
qualified. An ALS observation token alone does not isolate module replacement.
Exercise real configured factory and public TaskSource failure paths separately
from opaque ledger/bridge protocol controls. Capture live admission before
close starts: its read authority deliberately expires on the first close attempt.
Restore injected faults before registered retry, and retain failed fixture roots.

Research repair descriptor controls exercise plan creation, lock creation,
journal append and pending replacement through the public reconcile entry.
Preserve work, real-close and pending-unlink causes in order, including thrown
undefined. An exclusive-open failure grants no pending-file ownership. Successful
rename consumes that ownership; cleanup must preserve a foreign file recreated
at the vacated pathname. Retain interrupted plan/lock/journal and foreign-file
fixtures even when their assertions pass. A phase interruption plus admitted
database-close error must preserve both causes and the held maintenance fence.
Restore the fault and retry through the existing close owner before opening an
observer. Injection after real close qualifies cause retention, not native I/O
failure behavior.

For preloaded named `node:fs` bindings, first prove the interceptor reaches the
actual public call. The qualified Bun control uses an original namespace snapshot
and `await mock.module` for scoped replacement and restoration in finally.
Materialize the snapshot with `{ ...fs }` before the first replacement. A retained
live ESM namespace changes with the mock and cannot restore the original exports.
`mock.restore` does not restore module mocks. A default-export spy alone did not
intercept these named bindings. Keep module replacement out of concurrent bodies
and restore it before any other case or registered cleanup uses the dependency.
See [Bun module mocks](https://bun.com/docs/test/mocks#module-mocks-with-mockmodule).

The public controller durable writer follows the same descriptor accumulator.
Its regressions retain ordered write/fsync, real-close and unlink failures,
including an undefined write cause, and unchanged prior target bytes. Retain both
fault fixtures even when their assertions pass; ordinary success cleans its own
root only after exact published-byte and no-pending-file assertions.

Engine-reader close controls retain the original close, upgrade-inactive and
physical-file identity fence order. Exercise both successful and rejected reads
with drift introduced after admitted open/native source close. Capture the actual
paired gate at `BEGIN DEFERRED`: gate bootstrap verification also closes a handle
for the same filename, so filename-wide counts do not establish paired ordering.
Keep parameterized case names distinct with explicit scenario labels.

Exclusive verifiers and callbacks transfer each raw handle through their source
owner before post-open guards. Its registered retry closes each pending source
once per pass and releases the exact gate only after every source is closed.
A competing native close owner rejects before effects; expired capture still
owns cleanup. Keep original nested body/close errors without duplicate entries.
Reject bound-lease reuse before another open. Fresh acquisition owns unbound
lease cleanup when its pre-open identity check fails; preserve caller-owned leases.
Prime the gate before instrumenting an exclusive owner, so bootstrap handles
cannot qualify its ordering. Match row assertions to the actual safe-integer mode.
Use registered pending-close cleanup after restoring fault spies; never close a
gate independently while source custody is unresolved. Bun documents immediate
statement finalization and connection release with
[close(true)](https://bun.com/docs/runtime/sqlite#close-throwonerror-boolean-false);
injected pre-close interruptions establish custody, not physical SQLite I/O faults.

When a caller sets a parent deadline, every nested command uses its remaining allowance. Setup, sequential children and recovery do not restart that budget. Reject expired or malformed deadline metadata before launching another child. Preserve the original process-tree deadline through clock changes.

Reserve cleanup and report time within the parent budget. A positive reserve gives cleanup at most its allocated half. A zero reserve keeps the existing unpartitioned behavior. No remaining cleanup time means an unattempted UNKNOWN outcome.

Record timeout, status, signal, spawn error and cleanup result separately. A signal or cleanup attempt does not prove that descendants stopped. Require an observed integer terminal status without timeout, signal or spawn error before parsing command output. An expected exit 1 still needs the exact denial and unchanged-state assertions.

Bun-only subprocess fixtures launch `process.execPath`. For `-e` programs,
embed inert path literals with `JSON.stringify` or use named environment fields;
do not assume Node's positional `process.argv` layout. A missing marker alone
cannot prove descendant termination: arm the real marker timer before emitting
a readiness handshake, assert that handshake, and observe past the timer's
deadline. Keep simulated platform responses separate from real child readiness.
An unconfirmed signal request retains UNKNOWN; absence of a PID or marker does
not turn it into confirmed cleanup.

Keep each case's declared bound. The five repair/recovery seconds, 60-second stopped-source cases and 30-second cleanup/report reserve are operation bounds. They are not new suite deadlines. The stopped-source async teardown uses at most the 15-second cleanup half. Preserve the report half before and after the final binding check.

Log the owned root before deletion and its actual completion after deletion. A deferred, failed or timed-out cleanup retains custody. It does not authorize another deletion attempt. Do not remove another operation's roots.

Reuse immutable instruction or repair-fixture bytes only while their binding is current. Each mutable workflow has its own project, configuration, Host, journal, artifacts and working directory. Keep process interruption, restart, CAS and report boundaries real. No shared fixture cache may carry authority or mutable consumer state.

The service-custody fixture reuses only a primitive repository ID for exact YAML
bytes in a one-entry cache. Every call copies configuration into a new physical
root and opens real admission and SQLite handles. This identity shortcut does
not validate the configuration loader for each root; loader tests retain that
responsibility. Keep different-root identity and database-isolation controls.
Mutation progress uses Stryker's built-in append-only reporter. Its engine labels
are diagnostic; only complete reports joined with assertion and process receipts
can establish Killed. Partial events or a quiet log cannot establish a score.

Source-only fixtures exclude the exact generated `dist/standalone` directory. Keep required sources, schemas, instructions and current SDK outputs. Do not change the repository text-read limit.

## Required agent regressions

See the [scenario contracts](docs/research/test-regression-contracts.md#required-agent-regressions) for the maintained cases in this section.

### Public CLI and diagnostics

See the [scenario contracts](docs/research/test-regression-contracts.md#public-cli-and-diagnostics) for the maintained cases in this section.

### Configuration and configured context

See the [scenario contracts](docs/research/test-regression-contracts.md#configuration-and-configured-context) for the maintained cases in this section.

### Admission, ownership and reporting

See the [scenario contracts](docs/research/test-regression-contracts.md#admission-ownership-and-reporting) for the maintained cases in this section.

### Recovery, repair and migration

See the [scenario contracts](docs/research/test-regression-contracts.md#recovery-repair-and-migration) for the maintained cases in this section.

### Failed prewriter recovery

See the [scenario contracts](docs/research/test-regression-contracts.md#failed-prewriter-recovery) for the maintained cases in this section.

### Filesystem and resources

See the [scenario contracts](docs/research/test-regression-contracts.md#filesystem-and-resources) for the maintained cases in this section.

## Formation and installed evidence

See the [scenario contracts](docs/research/test-regression-contracts.md#formation-and-installed-evidence) for the maintained cases in this section.

## Development-controller qualification

See the [scenario contracts](docs/research/test-regression-contracts.md#development-controller-qualification) for the maintained cases in this section.

### Controller child observations

See the [scenario contracts](docs/research/test-regression-contracts.md#controller-child-observations) for the maintained cases in this section.

## Integration, assurance and acceptance

See the [scenario contracts](docs/research/test-regression-contracts.md#integration-assurance-and-acceptance) for the maintained cases in this section.

### Lock pathname replacement and informational CLI isolation

See the [scenario contracts](docs/research/test-regression-contracts.md#lock-pathname-replacement-and-informational-cli-isolation) for the maintained cases in this section.

### Bounded read allocation and canonical Git marker

See the [scenario contracts](docs/research/test-regression-contracts.md#bounded-read-allocation-and-canonical-git-marker) for the maintained cases in this section.

### Fresh UNKNOWN storage refusal and move afterimages

See the [scenario contracts](docs/research/test-regression-contracts.md#fresh-unknown-storage-refusal-and-move-afterimages) for the maintained cases in this section.

### Finite native dependency admission

See the [scenario contracts](docs/research/test-regression-contracts.md#finite-native-dependency-admission) for the maintained cases in this section.

### Fresh CLI timing custody

See the [scenario contracts](docs/research/test-regression-contracts.md#fresh-cli-timing-custody) for the maintained cases in this section.

### Owned read filesystem timing custody

See the [scenario contracts](docs/research/test-regression-contracts.md#owned-read-filesystem-timing-custody) for the maintained cases in this section.

### Acquired read namespace custody

See the [scenario contracts](docs/research/test-regression-contracts.md#acquired-read-namespace-custody) for the maintained cases in this section.

### Release consent and no-effect recovery custody

See the [scenario contracts](docs/research/test-regression-contracts.md#release-consent-and-no-effect-recovery-custody) for the maintained cases in this section.

### Conflicting UNKNOWN publication afterimages

See the [scenario contracts](docs/research/test-regression-contracts.md#conflicting-unknown-publication-afterimages) for the maintained cases in this section.

### Initial atomic intent publication custody

See the [scenario contracts](docs/research/test-regression-contracts.md#initial-atomic-intent-publication-custody) for the maintained cases in this section.

### Typed no-effect retirement and unchanged completion bounds

See the [scenario contracts](docs/research/test-regression-contracts.md#typed-no-effect-retirement-and-unchanged-completion-bounds) for the maintained cases in this section.

### Reviewed non-applicability for the FS attestation data file

`src/config/fs-safe-attestation.ts` has a file-specific independent review at
`/workspace/attachments/fs-safe-attestation-na-applicability-review-v295.md`.
The reviewed partial plan records only that file, the exact current source digest,
the `b549951` path absence, zero current callable roles, and that executable
attestation remains owned by `safe-repository-access.ts`. Its disposition is
bound to immutable review `93628e28772dbffcbb503fbb27e5a4977a86f814`; it authorizes
only the separate applicability lane and requires qualified producer/reader controls.
The older broad
`scope_review_20261013_small` entry is not this authority.

The receipt uses `VidaScopedCrapApplicabilityNA/v1`, a separate lane
from every numeric `VidaScopedCrapBudgetReport/v1` through `/v3`. It carries
`status: reviewed-not-applicable`, null CC and CRAP fields, the exact contour,
review commit/key and budget digest, `baseline_ref: b549951`, explicit path
absence, `current_callable_count: 0`, `original_callable_count: 0`, the exact
selected Source digest and coverage run/report/manifest digests, and the complete
test, tool, module and test-selection bindings. It cannot be represented as numeric
`0/0` and cannot satisfy `maximum` or the ordinary frozen-CRAP triple.

The producer reuses the already validated current coverage inputs and canonical
function/branch maps from that same Source AST; it adds no parse, Source walk or
Source hash pass. Its counter-only validator checks the complete existing provenance,
maps and raw counters but explicitly grants no numeric coverage admission. The
ordinary focused validator still requires a positive exact function denominator.
The separate applicability owner alone requires positive exact lines/statements
and zero functions/branches. Reject if the current Source binding is missing/stale, any callable is
present, the pinned historical inventory contains the selected path, any callable
responsibility is removed or delegated, or inventory lookup is incomplete. The
N/A receipt reader admits only this exact contour and review key. It requires matching
complete line and statement coverage with positive denominators, zero functions and
zero branch denominator for this reviewed data-only file. A separate closure join
requires a reader-validated full all-Killed native report with identical
source/test/tool/module closure and selected tests; the N/A producer never reads or
re-admits native artifacts. A distinct projection may display “reviewed N/A” only for those compatible
observations; the ordinary numeric schemas, ceilings, maxima, and all other contour
selection rules remain unchanged.

Focused negative controls must reject a foreign contour/review key, missing or stale
Source binding, a current or original callable, a present baseline path, incomplete
inventory, non-null numeric metrics, 0/0 or incomplete line/statement evidence,
nonzero branch denominator, mismatched coverage/report/manifest/test/tool/module/
selection bindings, partial or non-all-K native proof, and any attempt to treat N/A
as a numeric frozen report or completed ordinary triple.

Use the explicit `contour-stage.ts --lane crap-applicability` with the FS contour,
the fresh absolute `--coverage-run`, the immutable review commit as `--budget-ref`
and the canonical external `--output`. The stage forwards `--applicability-na` to
the existing CRAP owner; ordinary numeric frozen stages reject N/A receipts.
The progress owner captures the coverage report digest during its existing bounded
read, only for coverage imports. The separate join matches both that digest and
the manifest digest, selected tests and Source/test/tool/module closure against
the applicability receipt and the existing reader-validated full native proof.
Missing legacy report-digest metadata keeps this separate join open; it does not
invalidate or numerically promote any historical triple. Conflicting retained
digests are rejected; a newly captured digest may only enrich an otherwise
identical observation. Do not launch an older strict projection controller after
the new applicability observations have been published.
