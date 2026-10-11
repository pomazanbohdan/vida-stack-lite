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

## Local execution policy

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

Use current generated SDK outputs only when their inputs match. Missing or stale output is a GAP. Do not start a local build to make a test command pass.

Use supported temporary directories or explicit owned fixture roots. Keep Source-workspace scratch in ignored `.tmp`, outside the package payload. Preserve fixtures when a child outcome is UNKNOWN.

Initialization resource fixtures reuse the maintained inventory owner's exact
reserved-sidecar predicate. Preserve ordinary hidden files and lookalikes;
exclude only reserved custody metadata. Serialize Source-copy and Source-binding
behavior checks, retaining actual copy errors and prior failed receipts.

Tests and comments describe current supported behavior. Do not include narratives about absent legacy implementations. Human authorization covers the strict Knip precommit gate. Qualify its staged snapshot, tool/config failures, formatter check, one strict maintained-TypeScript program, lint and focused-test enforcement. Hook activation proves enforcement, not quality closure: existing findings must continue to block commits. This authorization does not activate pre-push coverage, CRAP or mutation checks.

## Commands and pins

Run commands from `packages/agent`. Use the pinned launcher and frozen lockfile. The launcher must select Bun 1.4.2. A global Bun version must not change the pin.

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

For a focused check, use:

```text
node bin/bun.ts test tests/FILE.test.ts --test-name-pattern "CASE_PATTERN"
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

Oxlint type-aware analysis needs a declared TypeScript project for each file. Source uses the package `tsconfig.json`. The standard nested projects in `tests/tsconfig.json` and `tooling/tsconfig.json` include MJS files with `allowJs`, `checkJs` and `noEmit`. An import-resolution flag does not place an excluded file in a typed project. Keep the Bun/Node declarations and exact pins current; the Bun runtime and current Bun declarations are 1.4.2.

Type shared fixture state and helpers with the existing production contracts. Give SQLite results the exact selected row type and check missing rows. Preserve deliberately invalid test inputs with separate malformed values; do not present them as valid production data.

Check changed shared MJS helpers with strict `checkJs --noEmit` as well as lint.
A zero-lint result does not prove that their TypeScript contracts compile.
The mandatory full typecheck first rejects any maintained JS/MJS, then compiles
the captured maintained TypeScript files in one strict project, including CLI,
tooling and tests. It also checks the Source project, which owns `src/**/*.ts`
and retains its stricter prohibition on TypeScript import extensions.
During migration, use `tsconfig.checked-js.json` for one combined strict CLI/
tooling check; it also remains mandatory for the staged precommit snapshot.
The separate CLI and tooling commands remain available for focused checks.
Do not add another full CLI/tooling pass to a successful all-maintained check.
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

The precommit checks use pinned Bun, Node-hosted Knip, Oxfmt `--check`, one strict TypeScript program with `--noEmit` for every maintained staged TS root, including Source, CLI/tooling, native tests and helpers, type-aware Oxlint and the shared AST guard for focused tests. Knip runs once with all-code workspace/test entries, zero allowed issues, and configuration/tag hints treated as errors. Do not use production/strict mode to drop tests or dev dependencies, blanket ignores, issue baselines, cache-based freshness, autofix, or `--no-exit-code`. Public SDK entry exports remain supported API roots.

Capture the active Git index once and materialize its raw object bytes in one owned temporary tree. Reuse it for every precommit check; create its exclusive compiler config inside the same identity-checked temporary owner, outside the raw tree; do not read changed worktree bytes, run checkout filters, format files, or invoke `git add`. Valid partial staging is supported. Preserve indexed paths and modes, including assume-unchanged/skip-worktree entries and staged deletions. Reject conflicts, links, unsafe paths, missing tools/config, or any check failure. Compare the live index with its captured bytes and identity after checks, including failures; preserve concurrent index/worktree changes. Cleanup must prove temporary-root ownership and fail closed on uncertain cleanup. The focused-test guard detects Bun `test.only` and aliases while allowing comments and strings. Include root instructions, sidecar, YAML, attributes and package manifests/configuration in the common staged tree.

While fixing lint, capture complete machine-readable diagnostics in the owned ignored output directory. Read counts, rule groups and bounded examples. Do not print the full report. Recheck changed files and their callers; run the complete current profile once after the correction batch is stable. Require zero errors and zero warnings before claiming lint closure. An activated gate must reject outstanding diagnostics.

## Completion commands

Use the current scripts for the applicable completion checks.

| Check                         | Command                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| Toolchain and input layout    | `node bin/bun.ts run test:toolchain:pinned` and `node bin/bun.ts run preflight:pinned` |
| Configuration                 | `node bin/bun.ts run test:config:pinned`                                                |
| Ordinary agent phase          | `node bin/bun.ts run test:pinned`                                                       |
| Repair and recovery           | `node bin/bun.ts run test:repair:pinned`                                                |
| HostState and lifecycle       | `node bin/bun.ts run test:host-state:pinned`                                            |
| Public run entrypoint         | `node bin/bun.ts run test:run-entrypoint:pinned`                                        |
| Resource integrity            | `node bin/bun.ts run test:resources:pinned`                                             |
| Fuzz                          | `node bin/bun.ts run test:fuzz:pinned`                                                  |
| ZOMBIES                       | `node bin/bun.ts run test:zombies:pinned`                                               |
| Deep properties               | `node bin/bun.ts run test:deep:pinned`                                                  |
| Static quality                | `node bin/bun.ts run quality:static:pinned`                                             |
| Full Source types             | `node bin/bun.ts node_modules/typescript/bin/tsc --project tsconfig.json --noEmit`      |
| Coverage and CRAP             | `node bin/bun.ts run test:coverage:pinned`                                              |
| Saved coverage report         | `node bin/bun.ts run coverage:gate:pinned`                                              |
| Saved CRAP budget report      | `node bin/bun.ts run crap:pinned`                                                       |
| Format                        | `node bin/bun.ts run format:check:pinned`                                               |
| Final applicable local matrix | `node bin/bun.ts run local:candidate:pinned`                                            |
| Portable local subset         | `node bin/bun.ts run verify:portable:pinned`                                            |

`npm test` selects four disjoint agent phases: ordinary tests, repair, HostState and run entrypoint. It does not build or install. `verify` is a local subset. It does not install dependencies or a bundle. `ci:pinned` is delivery preparation; run it only through the delivery lane.

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

The launcher and ordinary test phases have no implicit aggregate deadline. Explicit caller, case, probe, repair, installation and cleanup bounds still apply. Do not turn an unbounded duration into an infinite native timeout value.

When a caller sets a parent deadline, every nested command uses its remaining allowance. Setup, sequential children and recovery do not restart that budget. Reject expired or malformed deadline metadata before launching another child. Preserve the original process-tree deadline through clock changes.

Reserve cleanup and report time within the parent budget. A positive reserve gives cleanup at most its allocated half. A zero reserve keeps the existing unpartitioned behavior. No remaining cleanup time means an unattempted UNKNOWN outcome.

Record timeout, status, signal, spawn error and cleanup result separately. A signal or cleanup attempt does not prove that descendants stopped. Require an observed integer terminal status without timeout, signal or spawn error before parsing command output. An expected exit 1 still needs the exact denial and unchanged-state assertions.

Keep each case's declared bound. The five repair/recovery seconds, 60-second stopped-source cases and 30-second cleanup/report reserve are operation bounds. They are not new suite deadlines. The stopped-source async teardown uses at most the 15-second cleanup half. Preserve the report half before and after the final binding check.

Log the owned root before deletion and its actual completion after deletion. A deferred, failed or timed-out cleanup retains custody. It does not authorize another deletion attempt. Do not remove another operation's roots.

Reuse immutable instruction or repair-fixture bytes only while their binding is current. Each mutable workflow has its own project, configuration, Host, journal, artifacts and working directory. Keep process interruption, restart, CAS and report boundaries real. No shared fixture cache may carry authority or mutable consumer state.

Source-only fixtures exclude the exact generated `dist/standalone` directory. Keep required sources, schemas, instructions and current SDK outputs. Do not change the repository text-read limit.

## Required agent regressions

### Public CLI and diagnostics

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

Check restart, failure and affected-proof invalidation. Metadata, copying and a small probe do not prove ready capability. Construction and qualified readiness are separate. The controller supplies no global PATH, production selector or Runtime acceptance.

### Controller child observations

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

Run the inert capture cases with `node bin/bun.ts test tests/development-controller-observation.test.ts`.
They cover byte-exact success, terminal nonzero streams, spawn error, pinned
partial capture, timeout, path/link/collision denial, fresh-process restart,
declared nesting, duplicate and independent launch denial, and final-receipt
persistence failure. The partial-capture case runs under the pinned Bun
1.4.2 Node-compatible `spawnSync` API. Run the existing pure diagnostic check
with `node bin/bun.ts test tests/development-controller.test.ts --test-name-pattern "controller failure diagnostics preserve bounded sanitized terminal fields without claiming no effects"`.
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

The final CRAP subprocess executes the captured tooling closure against the original package root. Its five-minute hard deadline and unknown termination retain the run lock for explicit reconciliation. Runtime plugin path admission accepts both Windows and POSIX separators. These are static implementation guarantees pending the final Bun behavior checks.

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
