---
name: bun-test
description: Use when writing, migrating, reviewing, running or optimizing TypeScript tests with Bun in this repository, or diagnosing timeouts, parallel resource conflicts, missing profiles, fixture leaks and mock pollution.
---

# Bun Test development

Use the smallest contract-backed check that resolves the current uncertainty.
Keep behavior, timing and numerical qualification as separate evidence.

The current runner optionally reads the fixed
`coverage/bun-unified/shard-eligibility.v1.json` before allocating outputs.
Reuse the actual scope builder and captured config/input rows; do not generate
empty resource reviews, synthetic runtime hashes or stale scope bindings for a
real run. Missing/unavailable/malformed/stale reviews preserve serial fallback.
Carry the loader's exact opaque source digest, including a legacy filename
prefix; hashing a configuration origin does not require every string inside it
to be a bare hash. Exercise a genuine loader origin alongside synthetic policy
controls. Copied inert runner fixtures need its actual eager import closure.
Only a complete nonexclusive initial wave of at most two serial children is
supported. Parent log descriptors, known successful native terminals and actual
receipt bytes feed the existing aggregate-free report/v2 assembler; the final
validator owns the single checked merge. Reading that wave's receipts and CRAP
is evidence admission, not a successor test-resource wave. No descendant/effect
quiescence or numeric qualification follows; resource advancement stays false.

Classify actual reader effects, not the word "read-only": configured-context
loads consumer YAML/references through SafeAccess CAS, so shared physical roots
must coassign. A verified-reader test asserting absence of package CAS sidecars
also conflicts with raw readers of that same package. UUID leaves and unique
fixture children under a shared parent do not alone require whole-run exclusion.

When testing a pinned launch through an injected spawn, project the launcher-
managed budget/deadline/diagnostics/review-policy keys separately. Assert an
ambient review-policy claim is scrubbed on ordinary payloads; compare all other
caller environment fields exactly. Own-undefined mock properties differ from
the physical child environment, where undefined values are omitted.
For complete-run timing, label statistics from emitted PASS rows as partial;
unobserved/failed cases and startup/fixture overhead are outside that sample.
Preserve actual supervisor terminals before a spent producer allowance blocks
report work; diagnostics do not replace successful receipts or quiescence.

For current captured configured-context tests, propagate the manifest's bound
consumer root to the child rather than deriving it from relocated module paths.
Qualify missing/stale origin negatives at the real validator with other receipt
joins and hashes consistent. Reuse the successful loader's raw-source binding
and physical root identity; canonical config equality is not byte freshness.
An inert caller stub proves environment propagation only, not the product
configuration loader; keep genuine loader and project-upgrade controls separate.

For coverage clock reviews, keep exact child environment receipts unchanged.
The separate review-base hash defaults to exact and requires the maintained
current wrapper's explicit opt-in plus a consistent generated clock tuple.
Qualify real wrapper issuance and direct ambient-claim fallback in owned inert
scripts. Keep original caller/ancestor ceilings and all diagnostic/unknown keys
bound; no internal flag or cooperative JSON grants authority. Opaque parent
budgets and historical entries retain exact hashing. Bound native probes and
second controls within the case deadline; retain the root on failed observation.

For coverage receipt negatives, preserve the canonical Source map, assigned
tests, sibling/process joins and receipt hashes while changing the targeted
loaded-Source row. Test both nonzero and zero-valued child maps: every emitted
map key requires that child's load evidence, unlike an unloaded global zero
seed. Derive synthetic Source rows from the existing captured inventory.

## Load the current owners

Resolve the repository root. Read `AGENTS.md` → `AGENT.sidecar.md`, then
[self-development protocol](../../../packages/agent/instructions/development-lifecycle.md#self-development-protocol),
[TESTING.md](../../../packages/agent/TESTING.md) and the affected package scripts.
These owners define gates, authorization, custody and commands; this reference
does not replace them. Check the executing Bun against `.bun-version`; availability
of a newer release is not qualification. Bun executes TS without establishing
strict typecheck success. Runtime and declaration versions are independent:
use the selected `.bun-version` and manifest/lock declarations, without embedding
the current runtime version in tests. An emitted native entry binds its selected
pin; fixtures for prior operations keep their original pin and bytes.

For parallel agent work, use one lead-owned input capture and disjoint review
packets. Reuse unchanged byte/tool-bound inventory roles; packets and generated
rows do not grant eligibility or reviewed budgets. Join writers, finish heavy
static checks, then run bounded affected behavior without compiler contention.
Keep one final numeric/Git owner and the existing exact gates.

Use the package-owned `bun check --project ... --no-pretty` no-emit gate on
qualified Bun 1.4.3. Preserve the explicit maintained roots, staged snapshot
and stricter Source project. Declaration emission still uses TypeScript's
compiler. Never append `test/run/build --check` to a passed checker: success
executes that operation. Keep build/install free of test suites.

## Quick reference

| Need                        | Technique                                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Regression                  | Map contract and scenarios to function/test IDs; assert actual outcomes at the owned boundary.                                                                                             |
| Focused check               | Explicit test file plus anchored `--test-name-pattern`; inspect exit code and assertions.                                                                                                  |
| Isolation                   | Scope hooks to the cases needing fixtures; await work and restore mocks/resources in `finally`.                                                                                            |
| Early return                | Put owned teardown in `finally`; preserve original and cleanup errors.                                                                                                                     |
| Timeout                     | Separate parent elapsed time, child receipt and phase intervals before changing implementation.                                                                                            |
| Repeated computation        | Reuse within the invocation; test output parity, changed inputs and deterministic operation counts.                                                                                        |
| Issued context handoff      | Use real issued/forged/foreign contexts and exact plan parity; controlled disk drift distinguishes reuse from fresh fenced commit, without module mocks or a product test seam.            |
| Missing profile             | Check capability on an inert control before another expensive case.                                                                                                                        |
| Inventory/report processing | Reuse TS tools or an owned temporary `.ts` diagnostic with qualified Bun; validate JSON before reading fields.                                                                             |
| Measurement reservation     | Separate qualified direct producer termination from measurement success and UNKNOWN test effects; apply the existing TESTING custody owner.                                                |
| Captured module query       | Keep Bun instance identity distinct from the exact manifest path; use the existing captured-loader owner and assert canonical receipts plus unbound denial.                                |
| SDK artifact oracle         | Bind the emitted artifact, preserve public authentication/production guards and ignore compiler-generated name ordinals; boolean assertions keep large generated-code diagnostics bounded. |

Run from `packages/agent`, using the existing pinned launcher:

```sh
bun bin/bun.ts --version
bun bin/bun.ts test ./tests/maintained-source-inventory.test.ts ./tests/runtime-package-access-reuse.test.ts
```

Read scripts for ordinary phase membership. Add each maintained test once to
its owner; build/install run no suites. The final-check owner alone collects
coverage, CRAP and mutation outputs. Reuse Babel inventory, hashes, reviewed
matrices and existing fixture helpers.

Use `bun test --timeout 5000` for the 5-second default per individual test.
The default does not limit the whole file, phase or pool. Keep explicit justified
case exceptions and aggregate child/cleanup/report budgets separate. A wrapper
observing a full child pool needs its own exception; set the child runner's
per-test default independently. Do not shorten real quarantine or change the
2-second product operation target. On qualified Bun 1.4.3, local controls found
TOML test timeout ineffective and bailout skipping preload `afterAll`; use the
CLI default and keep final coverage free of `--bail`.
Apply TESTING's case-budget rule: independent CLI denials get separate tests;
dependent calls share one case deadline without per-child budget resets.

In isolated fixtures containing copied snapshot tests, pass explicit `./` paths
for child test subjects. Bare names can act as discovery filters and select
both originals and copies. Assert the exact child test-file count when fixture
cardinality matters; keep that invocation bound to its actual manifest.

Use unlabelled `describe(() => ...)` for selective setup without changing exact
test names; `describe('', ...)` adds a full-name separator and can break anchored
filters. Verify selection with inert marker controls. Keep preparation and case
budgets distinct. Track all pending bodies through terminal custody checks,
including Source-only cases that prepare no contained package. Defer consumer
deletion until assertions and owned checks succeed; keep failed roots. If cleanup
fails, report the failed root and every remaining unattempted root. Retain before
file cleanup if a timed-out body remains active. Bun snapshots
hook timeout options at registration; later object mutation does not change them.

For a Bun-only SDK subject, use the current executable rather than an unrelated
Node launcher. Keep launcher verification with its existing owner. Child and
cleanup budgets must fit the parent case limit; use the shared bounded child
owner, await terminal evidence and mark fixture retention before launch. Clear
retention only after all assertions pass. Formation does not launch these tests.

For Bun `-e` fixtures, embed inert path literals with `JSON.stringify` or pass
named environment fields instead of assuming Node's positional argv layout.
Marker-based termination checks first arm the real timer, emit and assert a
readiness handshake, then observe beyond its deadline. A missing marker without
that positive control is insufficient. Platform doubles may simulate responses,
but must observe real child startup separately; an unconfirmed request stays
UNKNOWN rather than proving cleanup.

Build arguments for an embedded child API call as a typed parent value before
serializing it, so the compiler catches signature drift. Observe stderr and
`close` alongside readiness; fail on known early termination rather than waiting
for the readiness deadline. Reuse the original close promise for bounded cleanup
and retain failed/nonterminal fixtures. A child that immediately blocks its event
loop should emit readiness synchronously with `writeSync` before blocking.

Test SDK Source capture with inert files and tool imports, without forming an
SDK. Verify retained bytes after live changes, aliases/cycles, omitted tests/
generated files and existing boundary limits. Reuse the bounded quality reader
and runtime closure owner. Captured SDK output is separate artifact evidence;
its execution does not measure Source coverage.

## Diagnose and optimize

Distinguish a case timeout from a protocol age threshold. Native process-death
fixtures retain untouched lock bytes, identity and mtime until natural quarantine
age; synthetic aged-lock cases prove a different boundary. Do not backdate an
actual abandoned operation or globally fake its clock to obtain a faster pass.
Overlap independent waits only through qualified resource/custody ownership.
For producer read reuse, SQLite transaction isolation covers DB state, not the
filesystem: retain configuration freshness and exact identity checks, and never
reuse across an intervening write, await or later effect boundary. Bun's query
cache contains prepared statements, not validated Host/receipt values. Use the
existing query-count regression and fresh phase trace before claiming a gain;
`database.query()` observations count API calls, not actual SQL preparations or
cache misses. For the later project freshness boundary, change fixture config
after the real Journal resume has completed its own currentness check; prove
the intended boundary with a scoped omission control. Select the exact YAML
field, since config_id and repository_id can contain identical text.
nested phase durations must not be added to their parent totals. Current concrete
design and evidence: [timeout cost research](../../../packages/agent/docs/research/test-timeout-cost-20261013.md).

Package-reader witnesses count by resource path, independently of error labels.
Trace all legitimate captures before asserting cardinality: receipt validation,
endpoint binding and a full package snapshot can each read the same schema.
Join every observed byte digest to persisted authority. A raw-reader control
must alter the actual caller, not the observation wrapper. Keep failed roots;
when an existing test counts access construction, the observer must call the
real factory for each production invocation. Returning a precached access can
mask that witness even while byte-reader assertions remain valid.
a clean child exit also requires its close observation and no child/output or
forwarding errors before cleanup. Assertion custody alone does not qualify late
timeout or descendant quiescence. Check temp capacity and executable support
before a large run; use a fresh external root without pruning UNKNOWN evidence.

For pure configuration reuse, observe real public callers and forward to the
actual producer in spies. Count completed preparation only after it returns,
then compare the config identity used by the next dependency check. Record a
positive observation before the identity assertion; use a boolean comparison
to avoid dumping whole configurations on failure. Keep independently parsed
journal clones and every live freshness/authority check outside that reuse.

For Host race controls, intercept the store used by the real caller; a fixture's
writer handle can be a different instance. Commit through the independent real
connection after the captured read, then check exact persisted versions and
artifact absence. An omitted-read negative control qualifies only that boundary.
For SQLite inspection, a second WAL writer can commit after the first real SELECT
inside the reader's deferred transaction; require all-old then all-new row versions,
restore the query spy and retain failed roots. Do not infer mutating-route rights
from a coherent readonly snapshot.

Separate one large Ledger from a large composition of individually small Ledgers.
Both are valid regression classes. Keep ordinary ingress denial, small-v1 byte/
digest parity, first persistence, exact retry and current lookup. Retained receipt
clones must use the same bounded component encoder as their writer. Preserve the
existing full engine/restart cases; a new history-boundary case need not repeat
their engine roundtrip. A timed-out large-history engine check stays unqualified.

Consolidate shared CLI syntax/byte-envelope denials across routes only after
checking the actual shared branch. Keep one real copied-bundle witness and all
route-specific duplicate issuance, action/issue/CAS, recovery and report checks.
Report removed launches separately from measured speed or full-suite completion.

For child diagnostics, check Buffer and offset Uint8Array views with Unicode
and distinct secret bytes inside/outside the view. Decode through the existing
output owner before sanitizing/capping; retain raw receipt custody separately.

In-process result validators follow the actual producer contract: an optional
property may be present with undefined even though JSON serialization omits it.
Keep required writer fields strict. Workflow fixtures consume the currently
issued prewriter stage before exercising writer denial; reuse existing typed
preparation/report owners and one observer value for both records. Derive
synthetic package version and file sizes from their actual fixture bytes.

Persisted journal parsing can return frozen null-prototype JSON records while
Zod returns ordinary objects. Inspect the producer before treating strict
prototype inequality as a value mismatch. Reuse the existing canonical JSON
comparator for validated wire values; retain strict schema and parsed-versus-
original checks that reject unknown fields. Normalize nullable optional fields
only at their declared boundary through the existing parser. Do not apply this
rule to opaque capabilities or identity-bearing filesystem objects.

Public CLI fixtures distinguish first admission from persisted operations.
Prepare actual intake, scope and acceptance bytes; pass `--intake` only to
admission, never a changing or inspect mode. Keep independent pre-admission
denials in fresh5s cases, and the positive attempt's CAS/report sequence together.
Check actual Work and journal rows with the read-only workspace inspector;
bootstrap directory/database creation alone is not admitted Work. Share setup
code for separate released/staged selector roots, retain their explicit bounds
and all original assertions, and do not infer aggregate speed from a case split.

Historical coverage-consumer tests reconstruct the original declared snapshot
closure rather than today's tooling paths. Bind a single canonical evidence
provider to its observed digest; distinguish synthetic structural admission
from genuine measurement. A retained historical suite failure stays a failure.
For synthetic child receipts, capture runtime bytes once per fixture and reuse
that buffer for the executable hash and retained-file copy. Required test inputs
exist at their declared snapshot paths as well as in a published fixture tree.

For verified package captures, interpose a real descriptor read in an isolated
child to exercise file/inode/ancestor/root replacement and require an observed
mutation plus its specific denial. Retain moved and replacement roots on failed
or unknown outcomes. Check active CAS and recovery artifacts without changing
their bytes/identities; verify accepted captures do no writes or fsync. Profile
only the actual byte-method scope and distinguish diagnostic elapsed time from
ordinary execution. Keep durable writers and every live bundle hash fence.
For the runtime-package snapshot adapter, verify fresh captured bytes and
missing-file denial without fallback; mutable declared-source snapshots retain
their cooperative reader. Reuse the primitive race controls and separately
check the adapter actually selects the qualified method.

For each observed error or bottleneck, retain a bounded receipt, inspect the
causal path and check current official documentation/upstream issues. Record
documented support separately from local qualification.

Parallel agents own disjoint edits; the lead schedules one runtime measurement
at a time. Hold edits to observed package inputs during that measurement. Save
the command, terminal exit, log and exec session ID before yielding. Compare the
same case and instrumentation under the same resource conditions. Report
operation-count reductions separately from elapsed-time improvements; nested
reporter rows and partial runs do not establish whole-suite percentiles.

For parallel work, read [TESTING's parallel contract](../../../packages/agent/TESTING.md#parallel-testing-current-status-and-required-contract)
and [Bun file workers/isolation/sharding](https://bun.com/docs/test/parallel.md).
Use this recipe for the [pending explicit-shard design](../../../.agent/work/core-runtime-reactivation/PARALLEL-TESTING-DESIGN-20261012.md):

1. Reuse one captured inventory/input snapshot/maps and one final owner. The pure
   scheduler does not activate parallel coverage. Keep current commands serial
   until protocol/custody/pilots qualify; historical baseline stays serial.
2. Review resource ownership against current test SHA and global input/runtime/
   provider/package-owner scope. Missing review means singleton exclusive; stale
   or malformed review denies. Derive canonical namespace/digest resource IDs
   from captured physical owners, not alternate path strings. Private consumer
   roots still share package identity/schema/template reads and their CAS locks;
   keep that resource until package-only reader overlap qualification.
3. Batch reviewed files into two direct serial Bun assignments with explicit
   `./` paths, `--parallel=1 --no-isolate` and5000ms per test. Same-resource files
   may share one serial assignment; overlapping resources across assignments
   require later waves. Concurrent bodies/global flags invalidate this contract.
   Review mocks/clocks/env/module order independently. Count balance is neutral;
   partial reporter sums cannot provide measured duration weights or speedup.
4. Give every shard disjoint owned outputs. Require exact selected union, local
   input evidence and receipt/terminal run-shard-PID joins before one checked
   counter merge/global validation. Native JUnit/coverage aggregation is not
   admission. Keep proof kinds and exact/frozen/mutation gates distinct.
   Apply [shard output qualification](../../../packages/agent/TESTING.md#shard-output-qualification):
   declared log paths are not captured child streams. Qualify actual routing
   with distinct native stdout/stderr markers. Use one existing pilot merge
   path; the v3 report validator already performs its own checked merge.
   The bounded native pilot qualifies these fixture mechanics only. Caller-owned
   log FDs close after accounting; keep body and close errors, retain failed roots,
   and validate the captured FD before launch rather than trusting earlier reads.
5. Separate direct reservation release from resource-wave advancement.
   The one run lock releases only after every launched direct producer is
   accounted for; an unknown sibling holds it. Not-started accounts only for its
   own launch. Next resource use needs descendant/effect quiescence evidence;
   PASS/exit, released
   lock, absent PID/marker or a cleanup signal is insufficient. Stop successors
   and retain UNKNOWN on missing proof; do not retry under a new operation ID.
6. Use the maintained coverage alias's one pinned entry budget, including
   package/runtime checks, current typecheck, preparation, producer and CRAP.
   The parent wall ceiling is300000ms; runner terminal/report reserve is30000ms.
   Stricter caller limits remain ceilings. Validate malformed durations before
   probes even with a supplied budget; clamp every nested launch to the remainder.
   Historical selection skips current typecheck while keeping original fixtures
   and serial argv. Current serial production uses the qualified async direct-
   accounting owner; parallel receipt/output integration and waves remain pending.
   Spent allowance means no launch, never native timeout0. Compare bounded
   synthetic pilots with distinct run IDs/output roots over identical captured
   inputs; they qualify mechanics, not global metrics or adversarial test trust.
   Preserve every case/assertion/test-ID when extracting domains.

No per-worker full AST/scan/hash pass, duplicate full suite or build/install test.

Apply TESTING's sealed invocation/environment rules: focused name filters do not
qualify complete shards; reject bailout and unapproved modifiers. Use the shared
effective-environment digest, including missing NODE_ENV/TZ defaults before key
sorting and both serial worker IDs sealed as1. Worker IDs are child-local;
global identity comes from run/shard/PID. Diagnose differences with key names,
never raw environment values. Nonempty ambient BUN_OPTIONS denies v3 admission.

Keep child elapsed clocks local. Qualified Bun1.4.3's `process.hrtime()` and
documented `Bun.nanoseconds()` use process-relative origins; compare pool time
at the coordinator. READY/GO plus correct native reads proves coordination,
not read-boundary overlap. Preserve the common package resource until actual
overlap and caller closure qualify. For adversarial fixtures, retain valid
prerequisites/sibling receipts and assert the targeted rejection rather than an
earlier unrelated load/decoder error.
The Linux package-reader control parks both readers at the actual schema
descriptor's `readSync` boundary until the coordinator observes both entries.
This qualifies pending verified captures, not overlapping kernel syscalls or
all caller eligibility. A late renewal fixture starts the real Mastra bridge
producer; the absorption helper's minimal journal lacks required Source scope.
Renewal preserves Journal payload/digest while advancing its CAS revision.
For Host-only fixtures, distinguish a typed trusted legacy completion from the
current durable research protocol: use current request/observation builders and
codec-valid fields, while keeping activation/normalization absent for the legacy
contract. Current public research completion requires its real exposure barrier.
Compare journal revisions to the captured input revision plus the expected
transition count and preserve exact payload/digest assertions. A readonly Source
snapshot stays readonly; clone entries explicitly only for a mutable fixture.
For Bun eval subprocess fixtures, launch process.execPath and pass validated
fixture operands explicitly through the child environment. Script argv examples
do not establish eval operand positions. Keep real SQLite transaction/row proofs.
For read-amplification controls, observe the real owned SQL/decoder boundary,
scope the observer to the operation and restore it in finally. Use multiple Work
rows and a genuinely aggregate-overflow corpus; keep exact restore assertions.
Reuse validated snapshots only within the same fenced transaction before effects,
while retaining every per-record check. Record read/decoder counts separately from
wall-time claims; concurrent static checks make timings incomparable.
Reuse the completed upgrade fixture for project-split planner checks; keep its
original assertions and custody. Seed the isolated consumer selector prerequisite
explicitly, but let the planner create its operation directory. Assert the target
source binding and schema-drift denial against unchanged selector/config/receipt/
activation/database/operation state. This is not installed Runtime evidence.
Count raw-reader bypasses by resource path independently of diagnostic labels;
assert labels separately on the expected verified calls. Renaming a label must
not hide an extra raw read. Extend existing caller cases instead of bootstrapping
the same lifecycle again only to observe another schema or template.
Apply the same prerequisite rule to Source and authorization retries: retain
the real drift denial separately; a current-snapshot callback used to isolate
a later Host guard does not authorize the original candidate or public route.

Apply TESTING's shared-helper rules: register hooks explicitly in every owning
test file, account for preparation/recovery calls, and retain shared process
state while work is pending. `onTestFinished` has no documented success status;
hook execution alone cannot authorize fixture deletion. Qualify registration,
pending-state retention and successful cleanup separately.
Use onTestFinished to observe post-afterEach retention in a serial case, with
explicit existence and exact-byte assertions. A passing expected-UNKNOWN denial
still requires the owning fixture's retained disposition; assertion success
does not grant disposal. Check existence before stat/read so deletion produces
an assertion failure instead of an incidental I/O error. This does not qualify
concurrent hooks, late timeout cleanup or descendant quiescence.

For upgrade lifecycle fixtures, register the owning case's cleanup explicitly
from its case constructor; never sweep another case's custody in `afterEach`.
Carry the original case bound into its monotonic cleanup deadline. Qualify the
cleanup effect directly so controls do not depend on relative finish-callback
ordering; separately preserve actual UNKNOWN post-hook afterimage checks.
Current lifecycle read counters/timing are case-local through explicit ALS.run
inside ordinary test callbacks. Keep module/prototype interceptor lifetime and
natural-age overlap as separate pending qualifications; concurrent bodies remain
disabled. Capture original module callables before mock.module: Bun updates live
imports, so wrapping the rebound observer again double-counts real reads.

On qualified Bun1.4.3, [#44552](https://github.com/oven-sh/bun/issues/44552) misclassifies
async hooks registered under ALS as done callbacks. ALS.exit at registration is
not a qualified workaround. Register owning cleanup before entering ALS; affected
afterimage observers use explicit done(error?) completion with both async outcome
paths forwarded and no returned Promise. Do not raise hook/test timeouts to mask
the defect. Native inert and actual retained-afterimage controls are distinct
from concurrency or quiescence qualification.

Completion flags do not prevent cleanup after a timed-out body settles late.
Before deleting a fixture, require a finite unexpired monotonic deadline after
owned closes, as well as successful assertions. Attempt all owned resource
closes; retain roots and both original/cleanup errors on failure. Provider-native
error paths and required-context diagnostics are different contracts; assert
the intended denial and unchanged authoritative state, not an unrelated error.

For dependency migrations, keep runtime/declaration versions independent and
exercise real transforms/provider boundaries. Use an identical-content,
different-inode control when testing identity; a content mismatch alone cannot
prove that fence. Native rename errors retain UNKNOWN until exact identity is
verified. Mark unavailable native platforms with test.skip. For retained custody,
test the accepted byte bound in admission and resume, ancestor aliases and
unchanged Host state; do not increase generic limits to fit a dedicated subject.

On qualified Bun 1.4.2, `bun test --cpu-prof` can pass without writing a profile
([upstream](https://github.com/oven-sh/bun/issues/40184)). Programmatic
`node:inspector/promises` `Session` with `Profiler.enable/start/stop` works in
an inert Bun Test control. An explicit private preload can bracket exactly one
selected case with `beforeEach`/`afterEach`; always disconnect in `finally`,
report capture errors separately, and require an actual nonempty artifact.
This profiles the parent, not spawned children.

[Bun's idle-attribution issue](https://github.com/oven-sh/bun/issues/44077)
affects inspector profiles too. Samples identify stack candidates; they are
neither invocation counts nor reliable wall/CPU self time. Keep phase and child
receipts as separate timing evidence. Use no inherited profiling environment.

Preserve FAIL/UNKNOWN fixture custody and original operation IDs. A missing
PID is not proof of cleanup. Qualified Bun 1.4.3's exact synchronous
PID0/null status/null signal/ENOENT result proves only that a producer did not start. The coverage
owner may release its exact reservation while retaining UNKNOWN/run evidence;
other ambiguous spawn errors remain held. Never replay an uncertain operation to obtain a
cleaner measurement. Preserve live integrity, CAS, authorization and durable syncs.

For async work, apply [direct-producer accounting](../../../packages/agent/TESTING.md#direct-producer-accounting-before-resource-reuse).
Preserve async missing-PID/ENOENT and raw close status-2; they do not qualify the
synchronous no-start tuple. Record attempted versus budget-spent unattempted
launches and account for every attempted sibling. One inherited allowance and
one acquired group reservation remain owned by the runner. A live descendant
or unresolved effects keep `resourceSafeToAdvance=false`, even after direct
termination. Focused direct controls and current serial callers qualify the
foundation, not parallel shard receipts, outputs or waves. Retain an actual
timed-out control's UNKNOWN fixture even when its classifier assertions pass.

## Official references

Use the current [Bun documentation index](https://bun.com/docs/llms.txt)
to resolve pages rather than guessing URLs. Consult
[runtime behavior and per-test timeouts](https://bun.com/docs/test/runtime-behavior.md),
[lifecycle hooks](https://bun.com/docs/test/lifecycle.md),
[mock restoration](https://bun.com/docs/test/mocks.md),
[coverage limitations](https://bun.com/docs/test/code-coverage.md), and
[runtime plugin loading](https://bun.com/docs/runtime/plugins.md) for the affected boundary.
Documented support is separate from qualification on the selected Bun pin.
Bun currently documents that its `statements` threshold is not enforced;
its native thresholds therefore cannot replace the repository's exact
functions/lines/statements/branches admission.

## Maintain this reference

For the pending shard launch seam, use the existing eligibility resolver and
canonical layout guard; do not reproduce their checks in a caller. Bind the
reviewed base environment as well as configuration/provider and captured input
digests. Keep the entire selected union and one initial nonexclusive wave. Use
distinct external run/shard temporary directories; create log parents separately
because an external TMPDIR is no longer their ancestor. Missing reviews retain
serial fallback. The maintained native fixture pilot qualifies mechanics only.

Use the validator-owned `CoverageResult.coverage` for numeric consumers. In the
pending current v3 report/v2 route, wire bytes contain no aggregate counters.
Keep Source initialization maps zero-seeded and distinct from child maps; clone
sparse fixture maps before changing counters. A positive merge control needs an
actual nonzero counter and unchanged seeds, including constant-only modules that
have statements but no functions. Keep legacy report/v1 aggregate checks.

Store public CLI timing rows in the owning consumer fixture. Observe the setup
origin before allocation, then persist that actual timestamp after the private
path exists; retain both the elapsed interval and failed/UNKNOWN root. The final
phase start does not prove phase completion. Startup/preflight time is distinct
from the measured createRuntimeKernel interval. Compare attributable complete
scopes before claiming improvement.

For full coverage, stream the producer's output into the owned caller log and
keep the five-second default per individual test. The explicit user-selected
global operation deadline is five minutes (300000ms); timeout remains UNKNOWN, never final numeric
admission. No output-buffer ceiling applies. Place controller temporary data
outside the editable target. Close admitted Host/workspace database handles
with the admission-aware wrapper or their owning fixture/store close method,
so the source connection closes before its paired gate lease.

For close-custody controls, expire read authority at the first close attempt
and retain exact handles with their original cleanup owner. Reader and exclusive
admission both retry before a new owner. An associated source owns gate cleanup,
with one gate attempt per retry pass; an unbound lease owns only its gate.
An internal capture callback records its handle before fallible binding and
owns cleanup on callback failure. Distinguish an injected pre-native close
interruption from a real SQLite I/O close fault. Preserve body and cleanup
errors, and retain failed or expired fixture roots.

For public consumer migration reader tests, use the existing public-store fixture
option rather than its synthetic workspace. Reset close observations when the
selected verified capture starts; count completed native closes, preserving the
exact failed handle for the maintained retry. Include logical bundle prefixes
when joining observed byte entries to the persisted snapshot digest. An earlier
probe close or individual file hash cannot establish that join.
Initializer caller controls preserve explicit copied-bundle initialization;
only executing-package resources select its immutable reader. Keep consumer
CAS and every freshness/recovery boundary, and retain failed fixture roots.

After a verified change to Bun Test practices, update the authoritative owner
and this reference in the same correction packet. Validate linked paths,
frontmatter and commands; use blind scenario exercises for changed guidance.
Label pending mechanisms explicitly. Keep dated measurements in work evidence,
not this skill; commit and push after applicable checks and review.
