---
name: bun-test
description: Use when writing, migrating, reviewing, running or optimizing TypeScript tests with Bun in this repository, or diagnosing timeouts, parallel resource conflicts, missing profiles, fixture leaks and mock pollution.
---

# Bun Test development

Use the smallest contract-backed check that resolves the current uncertainty.
Keep behavior, timing and numerical qualification as separate evidence. This
skill gives the working method. The package's [testing guide](../../../packages/agent/TESTING.md)
owns commands, timeouts, evidence gates and accepted policy. Its
[regression contract reference](../../../packages/agent/docs/research/test-regression-contracts.md)
owns detailed scenario-specific requirements. Read both before changing an
affected owner.

## Load the current owners

Resolve the repository root. Read `AGENTS.md` and `AGENT.sidecar.md`, then the
[self-development protocol](../../../packages/agent/instructions/development-lifecycle.md#self-development-protocol),
[TESTING.md](../../../packages/agent/TESTING.md), and the affected package
scripts. Read only the linked regression sections relevant to the change. These
owners define scope, authorization, custody and commands; this skill does not
replace them.

Check the executing Bun against `.bun-version`. Availability of a newer release
is not qualification. Bun executing TypeScript does not establish strict
typecheck success. Runtime and declaration versions are independent. Use the
selected Bun pin and manifest/lock declarations without embedding the current
runtime version in tests. Keep build and install free of test suites.

For full coverage SDK readiness, use the maintained coverage alias and its
repository adapter. A Cloud artifact-storage403 may require the selected GitHub
connector/uploaded-file transport bridge described in TESTING. Keep the actual
run/attempt/artifact identity and ZIP digest; never copy Source into dist, compile
locally, rewrite a receipt or disable freshness. Transport preparation is not
Runtime acceptance. Do not print temporary signed URLs or credential bytes.
For a focused selection, reuse `sdkFormationToolInputPaths` and the declared tests
to determine SDK dependency. Reuse selectedTestsRequireSdkArtifacts: public
run/controller fixtures can require the SDK export-completeness fence even when
they execute Source directly. Follow the actual guard and positive caller path;
a negative case that exits before that guard is not an SDK consumer by import alone.
A selection without SDK-dependent tests does not capture dist or need separate
artifact preparation. Keep automatic CI
formation and all freshness checks for selections that actually consume the SDK.
The native batch pilot uses the v4 complete-partition descriptor described in
TESTING. Preserve registry execution order while sorting only capture metadata;
never relabel focused input as v3 full-current evidence. A pre-baseline SDK error
in a non-SDK contour needs its capture scope checked before another SDK build.
If no runner receipt exists, read the original launcher result and stderr before
changing tests. Standalone captures traverse declared executable tools through
the same bounded closure owner; do not rely on an unrelated test importing their
dependencies or repair a sealed sandbox by copying live files into it.

After a focused producer terminates, use the maintained contour progress CLI's
`--coverage-run <focused.json>` to import its matching operation outcome and
print concise metrics in one step. Do not dump complete instrumented maps just
to read totals. Preserve the actual BLOCKED/FAIL/UNKNOWN status independently
of coverage. Reuse `campaignProcessState` in session launchers and separately
check unchanged boot identity; do not duplicate a weaker custody/log predicate.
During the owner's sequential exact F/L/S/B phase, work on one contour only and
defer frozen CRAP and mutation producers. Preserve their existing gaps and
evidence; a coverage milestone is not complete-triple closure. Do not launch CRAP
merely to reconfirm a known coverage prerequisite failure.
If an interrupted checkout retains coverage custody, keep it intact and use a
clean same-commit checkout with matching SDK inputs for independent diagnostics.
Record both namespaces; never turn the old lock or UNKNOWN into a completed run.
Keep disk usage bounded through TESTING's terminal cache-retirement rule. Reuse
one same-input gitless image across compatible lanes using TESTING's
[execution contract](../../../packages/agent/TESTING.md#gitless-contour-execution),
and give read-only agents existing paths. Writers prepare bounded patches in ordinary
directories; do not create preparation worktrees. New Source does not refresh an old
image's evidence. Fence installs while shared dependencies have active producers.
Delete only verified
regenerable caches outside immutable checkouts after custody closes; keep original
failure evidence and all other retained scratch. Reuse the latest inventory.

## Design a regression

For YAML/configured-root fixtures, follow [TESTING's fixture contract](../../../packages/agent/TESTING.md#new-and-modified-files).
Use the bound config's registered and allowed projects; verify targeted negative
mutations actually occurred before testing rejection. Keep portable-template
and configured-root checks distinct from complete coverage qualification.
For mutation fixtures, prefer the sealed `AGENT_RUNTIME_TEST_CONTEXT_ROOT` over
the parent repository root. Keep parent Source/tool input resolution separate;
verify the fixture's exact bytes and layout through the existing runner owner.
For synthetic coverage fixtures, a tool input can also be maintained Source.
Use valid inert TypeScript for those bytes and preserve the untrusted marker.
Reuse the captured-module union owner for exact-path deduplication; keep category
digests and the independent alias checks intact.
Real runner fixtures await `prepareCoverageRunnerInputs` and its bounded runtime
closure capture. Do not maintain a second transitive import list. Keep explicit
computed-module seeds, which static imports cannot discover. Synthetic fixtures
derive declared Source/tool overlaps from their input owner. Configured-context
fixtures use a real `packages/agent` layout and the declared repository context
files; unrelated temporary directories cannot represent that admitted namespace.
For stateless import-time subjects, follow TESTING's body-local synchronous
fresh-loader method. Query spelling alone proves neither fresh identity nor ALS
attribution on Bun1.4.3. Verify the actual generated mutant, snapshot interception
and exact body-owned activation; a direct suite pass or static review is insufficient.
Reuse one typed test-local operation forwarder for a stateless subject invoked
from multiple bodies. Load the exact subject synchronously before the operation;
never rely on registration order or a different case's fresh load for attribution.
For opaque-capability modules, preserve their namespace and registry. TESTING's
immutable-string consumption tracking qualifies supported import-time constants
through their actual body-owned reads; never substitute a fresh module or dummy
utility call. Unsupported initialization evidence remains UNKNOWN.

Start from the contract and the function or boundary that owns it. Map each
plausible regression to a fixture, a concrete case, and an assertion at that
boundary. Use Zero, One, Many, Boundary, Interface, Exception and Simple. Add
Replay, Persistence and Cross-surface consistency where the contract needs
them. For stateful behavior, consider Fresh, Explicit, Persisted and Replay
modes. Explain why an inapplicable scenario does not apply. A category label,
placeholder or broad suite pass is not scenario evidence.

Prefer a focused unit check plus integration checks at supported CLI, SDK,
database and subprocess boundaries. Isolate fixtures and control external
dependencies. Keep persistence, restart, compare-and-swap, failure-before-effect
and UNKNOWN behavior real. Use deterministic property checks and independent
models where they protect the contract. A new test layer should cover a distinct
regression risk. For callbacks passed to native APIs, follow TESTING's
[actual-callback law checks](../../../packages/agent/TESTING.md#rolling-contour-repair-cycle):
observe the real callback/arguments, delegate and restore the native operation,
then assert its documented laws alongside public behavior. Keep that evidence
distinct from coverage and mutation confirmation.

SQLite catalog tests include legal user names that resemble the internal prefix,
such as sqliteXledger and SQLiteXarchive. SQL LIKE treats underscore as a
wildcard; a literal sqlite_ prefix filter uses GLOB 'sqlite_*'. Verify actual
catalog rows, rejected extra schema and preserved input bytes. A cloned Host
keeping rows alone does not prove that its inventory included those objects.
Use native bigint expectations when safeIntegers is enabled.

For an inclusive SQLite image-byte boundary, build a real database at the exact
native page size/count. Delete an allocated padding BLOB to retain the image's
high-water size and free pages for a real merge. Assert actual page/freelist
metadata, exact serialized length, public success, reopened rows/integrity and
the output bound. Invalid trailing padding or a deserialization mock cannot
prove acceptance at the supported input limit.

For nested bwrap input failures, inspect mount visibility before changing module
resolution or copying packages into the sandbox. Bind the qualified parent
repository read-only after fresh device and temporary mounts, then rebind only
the owned operation directory writable, the sandbox read-only and scratch writable.
Captured parent context/tool inputs need visibility as well as dependencies.
For fixture data loaded through filesystem APIs rather than imports, follow
the visited helper's input owner in the existing capture. Reuse its bounded
read, freshness binding and final projection; do not add a global data list or
copy uncaptured live bytes into a mutation sandbox. If JUnit lists only a subset
of selected files, inspect the retained baseline outcome and first failing
fixture before rerunning. A bailed setup failure is incomplete evidence, not an
assertion-confirmed kill.
Reuse the existing initialization-bundle helper for matching copied-resource
fixtures; qualify exact bytes, modes and path sets before replacing a manual
list. Bind reached contained-controller docs through the same capture, checking
its running aggregate before retaining another bounded read. Do not add a
separate scan or global documentation list. Writer setup may reuse the existing
in-process preparation helper while retaining actual public operations under
test; readonly setup must stay at its earlier synthesis-only boundary.
For constructor failure, register handles as acquired and verify reverse cleanup,
all causes and thrown undefined with real native handles. Distinguish that unit
proof from bridge faults and persisted recovery. Separate independent state
matrices when each needs its own original case budget; preserve every mutation
and real restoration, and measure total cost separately.
Qualify temporary and shared-memory parent roots with actual reads/imports,
nested spawn, denied writes, unchanged bytes and owned output/scratch writes.
A later parent mount can hide an earlier child mount. Preserve failed runs and
use fresh measured inputs after a correction; never bypass descriptor validation.

For inert mutation-worker isolation, qualify namespace PID1 and host orphan
reaping together: host Tini `-s`, bwrap `--unshare-pid --as-pid-1`, then inner
Tini owning Bun. Validate writable mount destinations as well as sources;
a symlink at `sandbox/.tmp` can redirect a scratch mount. Retain timeout, signal
and no-PID results distinctly even when a negative-control test passes. Observe
native init/start identity and actual child proc state before exit; missing
readiness markers alone do not prove descendant cleanup. These mechanics are
not real-suite resource independence or pool admission.

Qualify bounded scheduling with controlled promises rather than sleeps: hold the
first invocation while later slots finish, then assert refill bounds, input-order
results and publication. Stop new assignments synchronously on UNKNOWN or a
failure, but drain every already-started invocation. A missing row from a thrown
invocation must not discard a later sibling's real result. Keep all indexed
failure/resource causes, including thrown undefined, and distinguish a below-
minimum allowance from a broken allowance provider. Keep synchronous publication
and terminal-custody invocation contracts explicit before wiring a real pool.

For a report overlay, qualify actual host bind-source resolution with two held
workers before adding staging copies. Preserve the runner's logical report,
sandbox and configured-context paths, and require real mirrored mount targets.
Publish exact raw output only after native group/capture closure; preserve exit0
for surviving mutants. Include generated assertion-context and hashed adapter
modules as well as JUnit, streams, body events, receipt and configured context.
Pre-read the bounded closure and reject collisions before canonical writes;
exclusive durable publication failures retain both private and partial roots.
The unchanged confirmer and persisted proof reader still own admission.

For image schema-order assertions, preserve actual SQLite encoding. A UTF-8
Buffer comparator is not a general model for UTF-16 BINARY collation. Real
UTF-16LE/BE images and opposite-order Unicode names expose this difference;
assert encoding, rows and integrity after reopening. Keep native metadata fault
denial and healthy retry separate from these supported-input controls. Forward
unrelated mock method/property operations with their native receiver and typed
unknown values; retain the generic native signature at the fault boundary.

For Source-beforeimage fixtures, reuse `tests/helpers/source-beforeimage-fixture.ts`
to serialize bytes from the existing successful capture. Keep capture A distinct
from each later current Source capture B and its inventory. A capture is not a
post-apply CAS observation. Preserve returned buffers privately when a reader
may reuse mutable storage; test same-buffer changes as well as distinct buffers.
Check actual parameterized reporter titles on the selected runtime. Named labels
must distinguish values whose serialization collides, including null/NaN/infinity.

For asynchronous failures, await the owned promise before asserting. Keep the
original work error and cleanup error, including `throw undefined`. Restore
spies and injected faults before retrying through the registered cleanup owner.
A test that reaches an early denial has not exercised a later target boundary.
Use a phase marker or direct observation to prove the intended operation began.
Limit injected faults to that phase. If a mutation skips the intended call,
forward later owners unchanged so their cleanup does not mask the failed assertion.
After capturing a failed behavioral assertion, run necessary cleanup and preserve
that error. Keep later behavioral probes on the successful path. A later passing
matcher consumes assertion provenance; the adapter must not carry it forward.
`completeOwnedCleanup` joins a primary cause only when cleanup also fails. If a
catch stores the body error, explicitly rethrow it after successful cleanup.
A throw already propagating through finally resumes automatically; retain that
contract rather than changing the helper to throw on successful cleanup.
Recheck a known repair through the native pilot's `--diagnostic-mutant-id` with
singleton batch bounds. Resolve its current canonical identity and Source binding;
do not rerun all preceding IDs or treat one diagnostic kill as a contour score.
Keep the full baseline and unfiltered tests; TESTING owns complete admission.
Require activation in the same failed body's active ALS context. Process-wide
totals, hook/previous-body hits and child-only activation do not establish it.
Keep real generated-image negative controls when changing activation attribution,
and settle body state even when returned thenable inspection throws. Use owned
promise handshakes for late-task controls instead of fixed timing sleeps.
For several known repairs, use the mutually exclusive `--diagnostic-mutant-ids`
comma-list (1..32 unique IDs) with the same singleton bounds. It shares one full
baseline and one partition budget, retains original sparse plan indices and the
full universe, and emits no complete proof or contour score. Resolve every ID
against the current complete plan; local and canonical IDs use the same existing
options. Canonical identities bind the Source hash and mutation tuple. Reject
duplicate aliases and ambiguous tokens before the baseline. A predicted identity
is only a lookup request, not execution evidence. Avoid a separate instrumenter
pass just to discover changed local IDs. Do not aggregate diagnostic runs as closure.

For expected-success async target calls, reuse `expectAsyncReturned` from
`tests/helpers/expect-rejection.ts`. It observes one invocation through Node's
doesNotReject and retains its exact value, including fulfilled undefined. Keep
separate exact result/event checks and leave setup/cleanup outside it. The real
adapter control qualifies imported helper attribution and rejected undefined
with zero native JUnit assertions; the concurrent Bun-matcher zero-count case
still remains unproven. The timing contour separately qualifies its async calls
through actual injected mutants; a passing original alone is not mutation proof.
Check value shape/type before a property access or regex matcher can throw its
own argument error. Preserve unproven results without padding assertion counts.
For expected rejection identity, await `rejectionReason` from the same helper
and then assert the returned error. Do not await a Bun matcher typed as returning
void; removing that await alone does not establish operation completion before
fixture cleanup. Format only the changed TypeScript files with the existing
package-pinned oxfmt owner before staging. The normal hook still owns the complete
captured static checks; a local preflight never replaces or bypasses it.
For descriptor/image regressions, exercise the actual capture with a Proxy
rather than replacing a module whose import route may change. Assert the returned
image's identity, prototype and nested alias isolation, and verify a later ordinary
call still succeeds. Envelope images are owned and mutable; do not assume the
deep-freeze contract of the separate public-ingress validators.
Keep property suites with their direct source owners. Share inert arbitrary and
seed/run/replay configuration rather than configured-context setup. When splitting
a mixed property, map every prior validator and assertion to its new owner;
broad unknown-value generation does not replace individually corrupted valid
requests. Keep private config/context capabilities in the configured Cedar tests,
and preserve historical retired receipt selection separately from active files.
For dependency-fault controls, retain the real dependency operation and observe
its result before altering a diagnostic view. Label malformed dependency output
explicitly; restore a scoped prototype spy before invoking captured validators.
Check a normal operation afterward. Never turn fixture health, matcher misuse or
missing result-property access into mutation-kill evidence.
For a capture UNKNOWN, distinguish child termination from complete pipe and
durable-file capture. Log existence does not prove EOF, sync or close. Keep the
existing capture deadline; inject faults on exact real file handles and prove
all close attempts plus retained ordered error codes. A gated sync control must
release and await its cleanup before restoring spies or disposing the fixture.
Use the existing `expectReturned` helper for expected-success synchronous setup
inside a test body; do not construct the mutable subject at module scope.
`describe` callbacks also run during registration. Keep their Source-dependent
loads inside the registered bodies that consume them. A failed `beforeAll` is
hook evidence, including a hook AssertionError; it is not an assertion-confirmed
kill. Do not hide that error or cache its failure to manufacture body evidence.
The shared synchronous helper uses `doesNotThrow`; the real-adapter control
copies its maintained bytes and checks thrown undefined while rejecting invalid
arguments and unrelated runtime errors. This control does not qualify actual mutants or justify a generic
JUnit Error exception. Preserve its exact native AssertionError/body attribution.
For a synchronous Cedar function spy, finish imports before installing it and
restore it in finally without an intervening await. Confirm restoration with a
real subsequent call. Module replacement and asynchronous provider cases retain
their separate namespace-restoration rules below.
Keep arbitrary UTF-16 values in path properties. A lexical POSIX normalization
proof missed Bun's native replacement of lone surrogates with U+FFFD. Preserve
that counterexample, explicit high/low-surrogate denials and accepted literal
replacement characters when simplifying path guards. Do not narrow a generator
to make a refactor pass; qualify the executing runtime's string behavior.
For descriptor-backed Proxy fixtures, cover both a valid captured image and an
invalid image whose live getters would pass. Dense arrays need a control that
reorders own keys and a nonnumeric length descriptor with a counted coercion
hook. Require no live gets/coercions, and assert image shape before inspecting
its properties. Keep temporary intrinsic changes synchronous and restore the
exact original descriptor while preserving primary and restoration errors.
Public authorization and governed-write validators return frozen owned images.
Check value equality and alias isolation; callers consume the returned image.
For a scope-denial control, first bind the operation hash to the captured fields
so another guard does not hide the target. Keep invalid matcher arguments
outside assertion-confirmed kills. A generic JUnit Error and a testcase's total
expectation count do not prove that its throwing matcher compared values.
For large-return rejection cases, use native `assert.throws` with a bounded
message expectation. A failed Bun `toThrow` can dump the return into stderr and
JUnit beyond custody limits. Keep type and boolean equality assertions for large
success values so an unexpected value cannot expand the evidence. Verify an
intentional missing-throw control separately; it is not a mutant kill. Native
path assertions preserve custom labels without relying on generic JUnit Error.
Keep every corpus value, including lone surrogates, and all seeds/runs unchanged.
Aggregate-budget fixtures can use many short unique lists to avoid quadratic
per-list schema work. Independently count all fields at the exact boundary and
one above; if the exact-limit input intentionally violates a later rule, assert
that later rule and do not call the whole ledger valid. Earlier schema rejection
does not qualify a later semantic predicate.
Lifecycle discovery treats strict JSON imports as data, even when their strings
mention hook names. Malformed JSON and executable-module parse failures still
fail closed; never skip an executable dependency to obtain a Killed result.
On Bun1.4.3, avoid asymmetric matchers inside `toMatchObject` when the value is
read afterward: the matcher can replace actual fields (verified upstream issue
https://github.com/oven-sh/bun/issues/24551). Assert object discriminants, then
`Array.isArray`, scalar types and exact values separately; preserve fixture bytes.

For an existing awaited try-body with synchronous owned cleanup, the package
finisher can join a tagged outcome in finally without moving returns or callback
identities. Use the async owner when cleanup itself requires awaiting. Preserve
both native failure causes and the retained retry owner in the public regression.

For paired lock cleanup, nest the existing close accumulator in ownership order.
Assert every close attempt and preserve all work/cleanup causes, including a
thrown undefined value and a sole cleanup error by identity. A fault injected
after a real native close proves cause aggregation, not SQLite I/O failure.
For cause arrays containing undefined, assert exact length and each indexed cause
by identity; loose array equality missed a removed undefined cleanup slot in a
real mutation control. Observe distinct database handles when targeting setup
phases: repeated client integrity queries are not separate client constructions.
Retain an expected-UNKNOWN fixture independently of successful assertions.
When several cases share a fixture root, track retained reservations by their
operation paths. Cleanup of a later applied operation must not clear retention
for an earlier UNKNOWN operation. Do not assert file-store terminal records for
a composition fixture whose declared reservation owner is an in-memory store.

For filesystem repair faults, prove that interception reaches preloaded named
imports. Use the qualified namespace-snapshot/module-replacement pattern from
TESTING and await both registration and restoration. Keep these cases serial.
Copy original exports with `{ ...fs }` before the first replacement; a live ESM
namespace is not a restorable snapshot.
For host-capability provider scenarios, use the existing parent-process cases
with qualified body-local synchronous subject loads and scoped restoration of
both complete provider namespaces.
This keeps assertions and coverage in the measured process. Module mocks remain
serial until shard qualification; mock.restore() does not undo mock.module().
Assert effects and all retained causes, not only the mock calls. Exercise denied
exclusive creation and a foreign afterimage after successful rename separately;
neither grants ownership of a file created by another actor.
The canonicalizer failure case also uses a parent-process namespace snapshot,
fresh typed query import and awaited restoration, followed by a real restored
target call. Keep its assertion in that process: a nested child's health failure
cannot establish the target's causal mutation evidence. Preserve both body and
restoration errors rather than allowing finally to replace the primary failure.

For a bounded release read fault, keep the file regular with one link until the
read begins. Unlinking after open triggers the earlier identity guard and cannot
qualify a later read-error assertion. Preserve target/temp bytes and restore
aliases before observation; real close followed by an injected error proves
cause aggregation, not failed native I/O.

For interrupted publication recovery, fail the real store method immediately
before its final CAS after actual prerequisite validation and packet/reference
publication. Restore the method through the owned cleanup accumulator, then
retry against that persisted intermediate state. Assert the same packet bytes,
reference, generation and Host versions, plus the newly committed result. Do
not manufacture intermediate rows through SQL or replace authority with mocks.
This controlled method-boundary fault does not prove a process crash or power
loss. Keep fresh public CLI success separate from this recovery control.
For a stale-read race, retain an actual earlier persisted snapshot, return it
only for the initial read, and let the real store enforce current CAS. Assert
the exact conflict and unchanged live state before a healthy retry. A fabricated
Work or version is not this control, and the stale snapshot grants no authority.

## Run focused checks safely

Follow [TESTING's rolling contour cycle](../../../packages/agent/TESTING.md#rolling-contour-repair-cycle)
with exactly one active contour. Keep Root as the sole final-check and numeric
owner. Select the next contour only after the active contour has accepted exact
F/L/S/B100. A prepared patch or partial diagnostic proves no milestone. This
strategy does not activate parallel numeric producers or coverage shards.

Use the stage command for the active contour:

```sh
bun run test:contour:stage --contour NAME --lane coverage --output /absolute/existing/canonical/output
```

This stage selects one declared contour and runs only its coverage lane. Do not
use the all-contour campaign's `--all` or `--unclosed` selectors while the
sequential strategy is active. Exact numeric evidence stays same-commit and
input-bound, while data-only N/A remains separate. Frozen CRAP, complexity and
mutation remain deferred for this cycle.

Run selected package tests from the package working directory with explicit
`./tests/...` paths. Bare filters from the repository root can also match retained
coverage snapshots; such a mixed run is not current selected-test evidence.

Use TESTING's exact declared-partition route for an authorized mutation pilot.
Keep its source/test selection unchanged and its diagnostic schema distinct
from full qualification. A matching input fingerprint and a perfect partial
score cannot make the pilot a complete campaign. Inventory remains campaign-free.

For local coverage/CC/CRAP diagnosis, use TESTING's focusedDiagnostic route in
the existing producer. Its diagnostic exit0 and function-entry counters are not
exact coverage or frozen-budget acceptance. Keep the diagnostic schema/output
separate from global reports and retain explicit child-counter gaps.
Before proposing a missing-branch case, match its zero counter to the captured
branchMap type, exact locations and Source expression. A line can contain several
short-circuit or nullish arms. Compare the existing case's resolved inputs before
adding another spelling of the same path. Child output assertions supply no
child counters without qualified capture and custody.
For sdk-package-compatibility, the focused capture retains complete SDK formation
inputs privately while instrumenting only selected coverage Source. Prepare
through the existing SDK readiness callback before capture; input review remains
forbidden in focused mode. Never use the coverage subset as the SDK inventory.
Keep emitted-SDK integrity cases in that artifact owner, separate from Source
mutation partitions. Stryker instruments even the dry-run Source, which cannot
match a receipt for unmutated CI formation. Preserve the complete ordinary
selection and SDK freshness; never rebuild or waive receipt checks per mutant.

For native mutation controls, distinguish the requested ID from the selected
instrumented branch hit. Assert the real generated-image positive and zero-hit
controls, and preserve the body's digest binding and assertion cause. Capture
activation at failure time; a bailing mutant cannot rely on afterAll completion.
TESTING owns the native receipt and complete-universe admission requirements.

For persisted native proofs, reuse `readNativeMutationPartitionProof` instead
of rebuilding a receipt parser or rerunning the producer. Verify synthetic
boundary controls and an actual retained context-bearing closure separately.
Keep a captured executable alias distinct from its recorded physical identity;
reconstruct its exact command without querying today's host. When testing a
digest denial, preserve byte count so the earlier size guard does not mask it;
test size denial separately. To project a qualified retained closure, use the
contour CLI's explicit `--native-report` route; ordinary `--report` must reject
raw native JSON. Native provenance occupies its own lane and contributes only
to exact historical local closure. Neither route establishes fresh global
qualification or Runtime acceptance.

For mutation inputs, keep the full captured test-selection identity separate
from the partition's executed tests. Reuse the coverage fingerprint owner and
check the descriptor's rejection stage before investigating assertions. A
known survivor is a mutation failure; an input/process failure is UNKNOWN.
For mutation-only early stopping, keep the full selected file argv and identical
`--max-concurrency=1 --bail=1` settings for baseline and mutants. Preserve the
single-process runner. Baseline and Survived require complete native JUnit
evidence; only an actual mutant may use a nonempty allowlisted file subset to
prove the existing causal assertion Killed outcome. Partial PASS is unproven.
Reuse the sealed command, body events and receipt parser; do not add module-end
markers or depend on afterAll completion after bail. Bun's concurrent-case
zero-assertion counter remains unproven even with a body matcher event. Qualify
this route with real Bun controls and a complete declared Stryker partition
before relying on throughput. Coverage remains complete and non-bailing.
For opt-in per-test capture controls, join the exact body/file token, runtime
coverage key, causal assertion event and full JUnit skipped counts. Absent and
observed-empty coverage maps are distinct. Callback-less todo/skip registrations
are unsupported under capture; retain their failed child evidence, including
missing JUnit. Ordinary non-capture execution stays supported. Callback-backed
skip and conditional modifier setup need positive controls. These diagnostic
checks do not qualify a filtered runner or mutation score; scoped lifecycle and
canonical-map admission remain with TESTING.
Request parent-owned diagnostic capture only through TESTING's explicit pilot.
Use the existing strict capture decoder on the same bounded buffer used for
receipt hashing; a shallow envelope check does not validate nested evidence.
Keep ambient flag denial and unchanged ordinary fingerprint controls separate
from actual parent custody qualification. Capture alone never authorizes filters.
The v2 diagnostic records plain describe ancestry and stable hook registration
IDs separately from repeated invocation IDs. Test a selected nested body against
all declarations and only its actually invoked outer/inner hooks; sibling
registrations do not imply execution. Hook coverage stays aggregate static.
Capture rejects async/each/modified describe forms until separately qualified;
ordinary execution keeps supporting them. A caught unsupported-registration
error must still prevent capture publication. Historical v1 has no scoped proof.
For the parent baseline join, supply the independent original declaration plan
and validated canonical map; do not construct expected authority from the
capture being checked. Reuse its JUnit case observer and dry-run validator.
Complete dry-run status is insufficient without passing public test results;
runner-local IDs are opaque while exact file/body markers provide this join.
An observed-empty map retains uncovered IDs. Diagnostic consistency does not
authenticate caller metadata, qualify a runner or establish mutation Killed.
Decode a separate registration-only capture with readMutationPerTestCapture
before reading its fields. If an impossible Bun name pattern uses
--pass-with-no-tests, confine that flag to planning and require a nonempty full
JUnit/registration set, all cases skipped and zero invocations. Keep this
runtime plan distinct from the static inventory and from the passing baseline.
Give every inventoried callback its own lineage disposition. A genuinely new
callable extracted from original inline logic uses the existing prospective
policy after review. A moved original callable keeps its original ceiling on
the substantive successor; a thin facade cannot take that allowance instead.
Do not invent original declarations from names or treat the parent allowance
as a nested callback's budget. Verify the actual archived Source bytes.
Use TESTING's per-invocation configured-context fixture for mutation workers;
keep repository tooling and consumer context roots separate and never reuse
an archived or another worker's context. Shared package sandboxes alone do not
isolate configured consumer reads.
For a function moved across files, use the reviewed v3 Source-pair relation;
retain its original ceiling on the implementation successor. A new adapter
reusing the old name needs its own independent budget and explicit identity
reuse record. Preserve older report semantics and retire an old contour shape
before assigning its Source differently; never rewrite historical receipts.
For child runners, test explicit environment deletion as well as inheritance,
and verify observation timers are disposed when output completes early.

Qualify an optional profiler on an inert pass and an intentional assertion
failure before using it on an owned product case. A runtime export, accepted
flag or successful test does not prove a usable profile was emitted. Record
missing output or native crash separately; retain the original process result.
For repeated stage probes, aggregate fixed-label counters instead of emitting
one row per nested read. Keep nested intervals separate and bounded; diagnostic
limits must not be mistaken for product failures or numeric qualification.

Use explicit test paths and an anchored `--test-name-pattern` for a focused
development check. Inspect the exit code and assertions. A name filter is not
complete-selection evidence. Bun applies the default timeout per individual
test, not to the whole file, phase or pool. Keep case exceptions and aggregate
child, cleanup and report budgets separate. Do not raise a timeout to make a
result pass.

A justified composite-case exception needs the dependent contract and measured
phase costs, not only an overrun. Preserve its freshness/CAS checks and document
the exception in TESTING. Reuse one snapshot for adjacent work/ledger assertions
only when no effect separates them; never cache live authority across public calls.

For repeated fixture setup, measure configuration and database phases separately.
An exact-byte, one-entry cache may retain an inert repository ID; keep each
physical root, derived workspace ID, admission handle and database separate.
Do not reuse a root-bound loaded configuration. Check identical-YAML fixtures
have different workspace identities and isolated database state. This shortcut
does not qualify per-root configuration-loader behavior.
For computed repository adapters, capture the known entrypoint through the
existing bounded runtime closure. Capturing only its own bytes misses package
imports. Check transitive-leaf bytes, digests and fingerprint drift; preserve
the preload's fail-closed admission guards.
Inspect existing mutation-map events before calling a quiet run stalled. Engine
events remain unconfirmed until final report/assertion/process admission. Use
Stryker's existing append-only progress reporter; avoid a second journal or
heartbeat owner. Missing final output or a deadline still means incomplete proof.

Keep pure helper cases independent of filesystem/config initialization they do
not use. Preserve required setup inside the invoking registered body. For a
JavaScript type-guard mutation, exercise values that actually reach that guard;
an earlier public nullish fallback can legitimately normalize null/undefined.

Scope hooks to cases that own the fixture. Await all work and restore mocks and
resources in `finally`. Keep cleanup in `finally` while preserving the original
and cleanup errors. Register each test file's own cleanup hook. If a case times
out or a child remains unobserved, retain its fixture root and report UNKNOWN;
do not retry or delete it without the owning recovery rule.

For initialization expiry, prove a real pending retry and unchanged persisted
state before advancing only the serial case's wall clock across its original
deadline. Keep the jump below quarantine and timers real. Attach rejection
observation before suspension, drain the binding, and restore the clock in
`finally`, preserving body and drain failures separately. Follow
[TESTING's expiry contract](../../../packages/agent/TESTING.md#process-timeout-and-fixture-safety).
For parent-body mutation activation, invoke the canonical binder in that body
under the real receipt lock; never copy subprocess counters into parent proof.
When a child-only failure first ends a registered scenario, exercise its real
parent counterpart in that same body before launching the child. A failed
replacement probe must leave the receipt pending and byte-identical, restore
its module mock, and assert the actual cause identity before the original child
starts. Keep successful recovery after the owning scenario's failure assertions;
do not reorder tests or bind the receipt early to manufacture activation.
When a retry owner uses `Bun.sleep`, observe that owner for a zero-retry assertion;
a `setTimeout` spy no longer proves the absence of delays. Restore the sleep
method in `finally` and retain the actual typed denial and unchanged-state checks.
Keep a mutation target out of fixture construction when its failure would abort
`beforeEach`. Build controlled expected data from the independent contract and
real fixture inputs, then invoke and assert the target inside registered bodies.
A hook error is UNKNOWN, even when its printed case name looks like a body.
For a contract that forbids retry, an owned sleep observer may reject an
unexpected invocation immediately and assert zero calls after restoring the
method. Preserve ordinary operation errors, including rejected undefined.
Keep typed error/state assertions and require fresh native proof; a5s timeout
against a5s production retry deadline cannot establish assertion-confirmed Killed.
The same observer can cover expiry only after the real pending probe and the
verified jump past the absolute deadline. At that point retry is forbidden;
observe both the binding await and its pending drain without releasing the
guard/quarantine. This does not prove mutations using another async mechanism.
The current function audit indexes literal test names and direct body assertions.
For a small scenario table, keep named wrappers with meaningful result assertions
and share the expensive scenario body. Mark fixture success after each wrapper's
assertions. Bun-valid interpolated registration alone does not establish audit
recognition; helper execution and static links remain different evidence.

For asynchronous case custody, enroll each root before the body can suspend.
Teardown must observe a pending body directly; a `finally` that marks failure
only after settlement is too late. Check the monotonic deadline again after
owned connection cleanup and before deletion. Use the runtime-config fixture's
case owner for its composite repair cases. Keep the same bound in that owner
and the Bun case. Qualify pending teardown with a real expected-timeout child,
preserving its failing child result and retained root separately from the
passing parent control.

For child programs, use Bun's `process.execPath`. For `-e`, pass named
environment values or serialize inert literals with `JSON.stringify`; do not
assume Node's positional argv layout. Observe stdout/stderr and native terminal
status. A signal request, missing PID or missing marker does not prove that a
child or descendant stopped. Arm a real timer before a readiness handshake when
the test depends on observing a deadline. Keep child, cleanup and parent limits
inside the owning case bound.

Use `tests/helpers/synchronous-child-outcome.ts`'s
`requireSynchronousChildSuccess` for isolated test-process health and completion
markers. Ordinary errors preserve the distinction between child infrastructure
failure and body assertion failure. A successful parent guard does not provide
the child's assertion causality or coverage counters.

Prepare public CLI child environments through the existing pinnedEnvironment
owner before launch, preserving explicit caller overrides. A raw environment
can make the entrypoint reload operation modules after cache-routing self-
reexecution. This preparation changes no authority or UNKNOWN predicate.

For callable CLI main tests, use its injected local exit recipient. Preserve
the exit-code assertion without mutating the Bun test process. Check native
command exit independently from the printed case counters.

An expected-UNKNOWN child control keeps its fixture retained after assertions
pass. Use the same cleanup owner as the real caller, with retention scoped to
the selected root and without resetting caller custody callbacks.
For request comparisons, derive expected values from independently seeded or
persisted fixture facts. Avoid invoking the production request builder again
as its own oracle. Keep versions and maintenance state explicit and never
reuse a test snapshot as production authority.

In copied snapshot fixtures, pass explicit `./` test paths so Bun does not
rediscover copied tests. Assert exact child file and case counts when fixture
cardinality matters. Keep fixture preparation separate from the case deadline.
Do not delete fixture state until assertions and owned checks succeed.

## Diagnose performance and parallel conflicts

When a Bun PASS row exceeds its declared case bound, follow TESTING's monotonic
setup/cleanup deadline rule. Check whether preparation throws before the body's
finally exists. Establish owned close handling before opening resources, preserve
setup and cleanup causes, and do not launch another phase after expiry.

Separate case timeout from protocol age thresholds. Compare identical complete
scopes under the same resource conditions. Record whole-command timing and
startup, collection, setup and child outcomes separately. Partial reporter rows
are not complete per-file timing weights. Do not infer speedup from operation
counts or instrumented wall time.

For a repeated SQLite BUSY wait in a functional lease-denial case, use
[TESTING's native-denial control](../../../packages/agent/TESTING.md#process-timeout-and-fixture-safety).
Keep the real lock, exact connection, healthy retry and production timing policy;
do not replace the native denial with a thrown error.

For mutation resource pressure, distinguish disposable Bun `.pile` transpiler
cache from fixture/evidence data. Follow TESTING's isolated worker cache policy;
retain the exact cleanup manifest and every database, raw receipt and UNKNOWN
fixture. Cache deletion or disabling alone establishes no test/mutation result.

Check the actual mount backing a private fixture, including bind mounts. Use
TESTING's retained-host-tmpfs rule for disposable functional/process-recovery
cases; preserve all fsync calls and failed roots. This is not power-loss
durability evidence or parallel-coverage qualification.
Use the existing isolation owner's explicit `VIDA_QUALITY_RETAINED_SCRATCH_ROOT`
option for a qualified retained host root; it must already exist, be absolute
and resolve outside `packages/agent`. Keep its capacity/type receipt and unique
per-stage scratch. Never substitute a namespace-only ephemeral tmpfs or reuse a
failed root. Default storage and all timeout/evidence gates remain unchanged.

Classify real reader effects. An immutable `readFileSync` dependency and a
SafeAccess reader that creates compare-and-swap sidecars have different resource
behavior even when they share a path. A common parent directory alone does not
prove a conflict. Review transitive reads, writes, mocks, clocks, environment
and module order before changing resource tags. UUID leaves do not establish
whole-run independence.
For no-sidecar-creation controls, count `O_CREAT`, not every open of a CAS name;
verified observations probe retained lock names read-only. Qualify the observer
with an actual guarded-read positive control and keep native contention proofs.

Parallel coverage remains subject to the serial fallback and activation gates
in TESTING.md. A scheduler or native fixture pilot proves mechanics only. Do not
use partial receipts, child-local worker IDs, direct-child exit or released
measurement reservation as proof of descendant/effect quiescence or numeric
qualification. Preserve one final evidence owner and one checked global merge.

## Quick reference

| Need                    | Practice                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Regression              | Map contract, scenario and assertion to the owning boundary.                       |
| Focused check           | Explicit path and anchored name pattern; inspect the complete result.              |
| Fixture isolation       | Scope hooks, await work, restore mocks and retain failed roots.                    |
| Timeout                 | Separate per-test, parent, child, cleanup and report budgets.                      |
| Missing profile         | Check the capability with an inert control before an expensive case.               |
| Inventory or report     | Reuse maintained TypeScript tools; validate JSON before reading fields.            |
| Measurement reservation | Separate direct producer termination from measurement success and UNKNOWN effects. |
| Captured module query   | Preserve module identity and exact captured path; reject unbound requests.         |
| SDK artifact            | Bind emitted bytes and preserve production guards; ignore compiler name ordinals.  |

Run commands from `packages/agent` with the existing pinned launcher. Read the
package scripts for ordinary phase membership. Add each maintained test once
to its owner. The final-check owner alone collects coverage, CRAP and mutation
outputs.

Preserve a worker's declared base commit when integrating test repairs. Review
only its assigned diff, retain intervening canonical cases/helpers, and reject
unrelated deletions from an older full-file copy. A passing filtered run must
also identify actual executed cases; keep zero-match/skip-only selections
unsuccessful and separate from complete contour qualification.

## Official references

Use current official documentation for the affected Bun behavior:

- [Runtime behavior and per-test timeouts](https://bun.com/docs/test/runtime-behavior.md)
- [Lifecycle hooks](https://bun.com/docs/test/lifecycle.md)
- [Mock restoration](https://bun.com/docs/test/mocks.md)
- [Coverage limitations](https://bun.com/docs/test/code-coverage.md)
- [Runtime plugin loading](https://bun.com/docs/runtime/plugins.md)
- [SQLite close behavior](https://bun.com/docs/runtime/sqlite#close-throwonerror-boolean-false)

## Maintain this reference

Change this skill only when a Bun Test practice has been verified and its
authoritative package owner is updated in the same work. Keep scenario-specific
contracts in the linked regression reference and current policy in TESTING.md.
Keep dated measurements in work evidence. Check links, frontmatter and commands;
label pending mechanisms as pending. Do not describe a pilot as qualification.
