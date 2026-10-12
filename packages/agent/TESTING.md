# Portable runtime verification

Owner: runtime maintainers.

Use this guide for the current agent. The [system specification](docs/system-specification.md) defines product behavior. The [development lifecycle](instructions/development-lifecycle.md#self-development-protocol) owns execution policy. The [package scripts](package.json) define the commands.

Use short sentences and plain terms. Keep one main idea in each paragraph. Aim for approximately 80% ASD-STE100 principles, as defined by [adaptive reporting](instructions/adaptive-reporting.md). This is a style target, not a compliance claim or measured score.

## Evidence status

Read operational status from the current work and release evidence. Version
text and passing Source checks do not prove installation or Runtime acceptance.
Keep dated runs, failed logs and audit history in their evidence stores.
Preserve FAIL and UNKNOWN. Missing numeric reports remain explicit gaps.

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
tests and helpers must migrate to native TypeScript. New files use TypeScript.
Strict `checkJs` is transitional and does not satisfy TS-only completion.
The planned `quality:ts-only:pinned` gate enumerates declared Source roots and
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

| Check                         | Command                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| Toolchain and input layout    | `bun bin/bun.ts run test:toolchain:pinned` and `bun bin/bun.ts run preflight:pinned` |
| Configuration                 | `bun bin/bun.ts run test:config:pinned`                                              |
| Ordinary agent phase          | `bun bin/bun.ts run test:pinned`                                                     |
| Repair and recovery           | `bun bin/bun.ts run test:repair:pinned`                                              |
| HostState and lifecycle       | `bun bin/bun.ts run test:host-state:pinned`                                          |
| Public run entrypoint         | `bun bin/bun.ts run test:run-entrypoint:pinned`                                      |
| Resource integrity            | `bun bin/bun.ts run test:resources:pinned`                                           |
| Fuzz                          | `bun bin/bun.ts run test:fuzz:pinned`                                                |
| ZOMBIES                       | `bun bin/bun.ts run test:zombies:pinned`                                             |
| Deep properties               | `bun bin/bun.ts run test:deep:pinned`                                                |
| Static quality                | `bun bin/bun.ts run quality:static:pinned`                                           |
| Full Source types             | `bun bin/bun.ts run typecheck:source:pinned`                                         |
| Coverage and CRAP             | `bun bin/bun.ts run test:coverage:pinned`                                            |
| Saved coverage report         | `bun bin/bun.ts run coverage:gate:pinned`                                            |
| Saved CRAP budget report      | `bun bin/bun.ts run crap:pinned`                                                     |
| Format                        | `bun bin/bun.ts run format:check:pinned`                                             |
| Final applicable local matrix | `bun bin/bun.ts run local:candidate:pinned`                                          |
| Portable local subset         | `bun bin/bun.ts run verify:portable:pinned`                                          |

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

On the qualified Bun 1.4.3, a local inert control showed that `[test] timeout`
in TOML did not enforce the requested timeout; use the CLI option. Another
control showed `--bail=1` skips preload `afterAll` finalization on first failure.
Do not enable bailout in final coverage or admit a missing process receipt.

The launcher and ordinary test phases have no implicit aggregate deadline. Explicit caller, case, probe, repair, installation and cleanup bounds still apply. Do not turn an unbounded duration into an infinite native timeout value.

The coverage test producer inherits stdout/stderr into its caller-owned log;
the explicit user-selected iteration ceiling is ten minutes, with no in-memory
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
not activation of the producer or supervisor. Historical references also bind
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

Eligibility binds captured test SHA plus the source/test/tool/config/runtime,
platform/provider and package-owner review scope. Source or dependency drift
invalidates unchanged-test reviews too. Omitted reviews default to singleton
exclusive waves; stale, duplicate, foreign or malformed reviews deny planning.
Use canonical `namespace:<64 lowercase hex>` resource IDs derived from already
captured physical-owner identity, not alternative raw path spellings. The pure
scheduler performs no filesystem discovery. Resource IDs shared by concurrent
assignments are forbidden. A file joining resources from both assignments starts
a later wave. Global-exclusive files run alone between settled waves.

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

The maintained coverage aliases launch `tooling/run-bun-coverage.ts` directly
through the pinned bootstrap, with one600000ms outer wall allowance beginning
before package checks and runtime resolution. Stricter caller limits remain
ceilings; supplied budgets cannot bypass malformed-duration validation before
version probes. Other developer commands retain their existing default budgets.
The runner reuses the inherited monotonic allowance, reserves30000ms for
terminal/report work and runs one current typecheck under its acquired lock
before one capture/preparation. Producer and CRAP launches spend the remainder;
CRAP also retains its300000ms upper bound. Check the remainder between CPU
phases; the pinned parent supplies the hard bound while a synchronous phase
cannot service a timer. An outer timeout remains UNKNOWN and cannot prove
descendant/effect quiescence or successful reservation cleanup.
Historical selection shares the entry budget but skips current typecheck and
keeps its original fixture, serial argv and reference-admission contract.
Current serial tests use explicit `./` captured paths to avoid snapshot-copy
discovery. Parallel waves and async sibling supervision remain pending.
Spent allowance prevents launch; native timeout0 may disable a timeout.
Per-test5000ms defaults and justified case overrides remain separate. Mutation
is separately invoked; the ten-minute target does not qualify its whole campaign.

#### Direct-producer accounting before resource reuse

For async supervisor work, record each prepared invocation's shard ID, whether
launch was attempted, observed PID/status/signal/error, direct terminal proof
and group reservation disposition. Validate and snapshot the complete bounded
invocation group before launching any child. Reuse the existing execution budget;
check its remaining allowance immediately before each launch. Never create a
new deadline per sibling or wave. Await accounting for every attempted sibling,
including when another launch fails or its allowance is spent.

| Observation | Direct reservation disposition | Measurement and resource reuse |
| --- | --- | --- |
| Qualified positive PID with observed direct terminal exit or signal | May account for that producer only | Nonzero, signal, timeout or error denies success; descendant/effect proof remains separate. |
| Qualified synchronous PID0/null status/null signal/ENOENT | Accounts only for that exact not-started launch | Retain UNKNOWN evidence; no resource-quiescence claim. |
| Async missing PID with ENOENT, including close status-2 | Unaccounted under the existing predicates; retain the acquired reservation | UNKNOWN. Do not rewrite it into the synchronous tuple. |
| Shared allowance exhausted before an attempted launch | Record unattempted; adds no launched producer to account for | No measurement success. Earlier attempted siblings still require accounting. |
| Direct producer exits while a descendant remains live or effects are unresolved | Direct accounting alone may permit reservation release | `resourceSafeToAdvance=false`; stop resource successors and retain evidence. |

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

The async supervisor foundation is pending static, native and caller integration
qualification. Keep current coverage serial and historical execution synchronous;
these instructions do not activate shards, resource waves or a cgroup provider.

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

Close admitted workspace/Host database handles through
`closeWorkspaceDatabaseWithAdmission` or the owning store/ledger/fixture close
method. Raw SQLite `.close()` does not release the paired storage-admission
gate lease. Keep the source-close then gate-close order and retain failed or
uncertain fixtures under their existing custody owner.

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

For a missing CPU profile, check the mechanism with an inert control before
another expensive test. On the qualified Bun 1.4.2, CLI profiling flags can
leave `bun test` successful without an artifact; upstream issue
https://github.com/oven-sh/bun/issues/40184 and its open proposed fix do not
establish installed support. Programmatic `node:inspector/promises` Session
Profiler commands are documented and locally qualified in an inert test.
An explicit ignored preload may bracket one selected case with global
beforeEach/afterEach hooks; disconnect in finally, use an exclusive private
output and report capture failure separately from the test outcome. Do not
inherit profiling environment into CLI children. Require a nonempty observed
artifact, not merely exit zero. Profiles cover the parent, not child execution.
The Bun 1.4.2 idle-attribution defect in
https://github.com/oven-sh/bun/issues/44077 also affects Inspector: stack samples
are candidate attribution, not invocation counts or reliable wall/CPU self
time. Keep actual phase/child elapsed receipts separate. No profiling result
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

### Failed prewriter recovery

Use the cases in `tests/delivered-work-continuation.test.ts` for owner recovery
and failed-wave correction. These are development behavior checks. They do not
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
Inject a journal SQL failure after receipt and Host writes. The transaction must
restore all three beforeimages and leave no recovery receipt. Reject a failed or
asynchronous current-proof callback. The callback sees frozen request data.
Exercise the public Source handler's recorded-result path for status, inspect
and exact apply retry; all return the same result without Host or journal writes.
Changed retry intent must deny.
Use `tests/helpers/configured-frontier-fixture.mjs` for complete continuation
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

Use actual SQLite JSONB fixtures. Cover unrelated valid state, matching run ID, same-work alias, malformed BLOB, NULL and JSON5. A record within the 8 MiB storage bound whose decoded JSON exceeds 8 MiB must deny before projected payload fetch. Preserve physical/count preflight and bounded decoding. Text-only records do not prove store-codec behavior.

Configuration rebind uses `runtime-config` and `ConfigRebindOperation/v1`. Keep YAML and initialization schemas unchanged. Check the exact executor-only target, read-only inspect/plan, maintenance before owner YAML authoring and receipt-only CAS. Preserve provenance and stale work. Deny queued/active ownership and issued/uncertain effects. Check own-fence release, interruption, no-effect abandonment and forbidden rollback. Verify exact two-file ownership retirement and deny partial or unrelated omissions. Keep parent proof and the current changelog path valid.

Correction-generation repair must use an actual isolated admitted Source attempt with an issued action, started Host state, `commit_unknown` approval and null observation. Remove only the coupled correction fields from the Host and mirrored receipts. Check inspect/plan/apply/resume/restore. All other semantic fields must stay unchanged. Deny partial fields, conflicting history, foreign receipts, competing ownership and dependency drift. Inject a transaction failure. Strict readers reject the unrepaired shape. Repair grants no replay, outcome or ownership transition.

Keep raw repair beforeimages separate from normalized current Work and journal
types. Validate the permitted normalization and exact afterimage before any
plan retry, applied resume or restore returns. Reject null records, invalid
arrays, extra fields, foreign identity, invalid actor/status and changed frozen
transformations without modifying Host state or the stored operation.
Request-transition repair does not supply missing correction authority.
Remove a required stored change and recompute its operation checksum in a
fixture. The reader must deny the incomplete set. A matching checksum does not
prove complete repair or permit an early plan/resume result.

Writer fixtures follow the configured graph. Report the required source-plan
prewriter through the normal journal and bridge before reserving a Source
writer. Use the fixture's actual scope and acceptance evidence. Do not insert
lifecycle references directly or relax production approval to make setup pass.

Stopped-source capture uses a physically contained, qualified immutable controller and separate consumer fixtures. Fresh pinned processes call the copied public route for their own target. Do not use controller execution for a foreign target. Recheck package binding before and after each case. Preserve the mutable-package drift control, the original missing/null completion denial and unchanged Host. Fixture review manifests are setup data, not real independent review or Runtime proof.

Release-retarget checks use inert data. Cover same operation/version, bounded release-field changes, pointer absence, sealed archive/log custody, active/failed/UNKNOWN/install-started denial, admission/worker exclusion, planning reservation and source/path/archive drift. Check known-phase interruption, lost ACK and legitimate later worker progress. Local logs cannot replace trusted delivery evidence.

Consumer migration keeps canonical DB/WAL/SHM paths and a consistent backup. Partition work children. Restore semantic beforeimages under maintenance/CAS with synchronous idempotent callbacks. Deny inflight or UNKNOWN state before callbacks. Exact retry receives no new initial backup. Keep the fence through interrupted restore.

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
persistence failure. The partial-capture case runs under the pinned Bun
1.4.2 Node-compatible `spawnSync` API. Run the existing pure diagnostic check
with `bun bin/bun.ts test ./tests/development-controller.test.ts --test-name-pattern "controller failure diagnostics preserve bounded sanitized terminal fields without claiming no effects"`.
Do not run the controller construction, dependency-install or copied-package
integration case as a local observation test.

## Integration, assurance and acceptance

Check protocol frames and error shapes, source protection, initialization/configuration, knowledge and research, capabilities, Cedar and Edictum enforcement, lifecycle/CAS, planning and session handoff. Use the current unit and integration contracts. Do not infer provider or policy enforcement from configuration alone.

Check every configured role, model, workflow, operation, policy, command and path has a consumer. Deny duplicate YAML keys, aliases, merges, custom tags, unknown fields and unsafe paths. Require explicit rebind on configuration drift. Do not use template fallback or silent hot reload.

Check the order, branches, joins, failures and restart of all five configured workflows through Mastra. Persist CAS issuance before the active session calls a native tool. Reports bind the action, issue and actual observed result. Check stale, duplicate and foreign reports, interruption and UNKNOWN reconciliation. An interruption request is not proof of termination.

Each authorized Source mutation must bind actual Cedar/Edictum policy, current approval, exact work/attempt/session lease and Host attempt receipt. Check pre-effect revocation and post-await freshness. Declared external edits invalidate affected evidence. Do not claim physical exclusion or identify an external actor from a shared write interval.

Use the current [test inventory](package.json) for configuration, project context, initialization, configured workflow, run entrypoint, CLI diagnostics, policy completeness, kernel boundary, Cedar, HostState, session ledger, Source snapshots and observed research. Lifecycle tests must verify final review, reverse validation, status and delivery. Public documentation CLEAR must cover baseline/closeout/verify, typed deletion lineage, map denial and actual revalidation at DELIVERY/COMPLETE.

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

Declare created/modified files, exact payload destination and order, PATH/prior-install/rollback effects, repository-only items and post-install checks. Apply the Source-specific [Git order](../../AGENT.sidecar.md#source-package-git-policy). A failed formation is not the commit/push trigger. Changed included bytes invalidate their proof; Git metadata alone does not.

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
