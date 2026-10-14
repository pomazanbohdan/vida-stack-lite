# Portable runtime verification

Owner: runtime maintainers.

Use this guide for the current agent. The [system specification](docs/system-specification.md) defines product behavior. The [development lifecycle](instructions/development-lifecycle.md#self-development-protocol) owns execution policy. The [package scripts](package.json) define the commands.

Use short sentences and plain terms. Keep one main idea in each paragraph. Aim for approximately 80% ASD-STE100 principles, as defined by [adaptive reporting](instructions/adaptive-reporting.md). This is a style target, not a compliance claim or measured score.

## Evidence status

Read operational status from the current work and release evidence. Version
text and passing Source checks do not prove installation or Runtime acceptance.
Keep dated runs, failed logs and audit history in their evidence stores.
Preserve FAIL and UNKNOWN. Missing numeric reports remain explicit gaps.
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
Use deterministic property tests and independent models where they protect the
contract. New test layers must add distinct regression confidence.

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

Stryker partitions reuse one scratch root. Record each process receipt and
post-run input check before deciding whether another partition may start.
UNKNOWN, incomplete output, signal, spawn error or missing owned-group termination
proof stops that sequence. A direct exit, including exit0, is not group proof.
On supported POSIX hosts, a normal owned-group exit probes group absence without
waiting or issuing another signal; a failed probe retains the direct observation
and reports unobserved group custody. Unsupported group observation remains GAP.
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

The four upgrade denial scenarios share one sequential worker to amortize
module loading. Each inner Bun test keeps its5000ms deadline and fresh repository.
The coordinator has an18s pool deadline, derived from the four prior4.5s child
limits, and a20s integration-case exception for completion/report checks. This
does not apply an18s deadline to individual tests. Check all four named results,
terminal process status, complete counters and four distinct retained-root
records. Keep every original provider, journal, UNKNOWN and no-replay assertion.

The distributed SDK regression joins a fresh selected formation input map to
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

Before a current full selection containing configured-workflow tests launches,
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
predecessor state. Cleanup attempts each registered resource independently.
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
safeIntegers returns bigint. Shared work-and-close helpers preserve single and
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

The test-function auditor and focused-test guard share the filename-based Babel
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
`qualification: not-performed`. It does not measure coverage, check a frozen
CRAP plan, or establish a numeric quality PASS. The coverage and CRAP gates run
only when their tool files are invoked directly; importing them does not run a
gate or coverage collection.

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

The default timeout is 5 seconds per individual test, selected explicitly with
`bun test --timeout 5000`. It is not a deadline for a file, phase, child pool or
the whole suite. Explicit per-test exceptions require a contract-backed reason,
such as observing a complete isolated pool or a real recovery quarantine.
Keep aggregate process budgets separate and preserve their cleanup/report
allowance. The product operation target remains 2 seconds; neither test defaults
nor exceptions change it. Do not shorten protocol quarantine to fit a test.

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
