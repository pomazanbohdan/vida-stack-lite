# Portable runtime verification

Owner: runtime maintainers.

Use this guide for the current agent. The [system specification](docs/system-specification.md) defines product behavior. The [development lifecycle](instructions/development-lifecycle.md#self-development-protocol) owns execution policy. The [package scripts](package.json) define the commands.

Use short sentences and plain terms. Keep one main idea in each paragraph. Aim for approximately 80% ASD-STE100 principles, as defined by [adaptive reporting](instructions/adaptive-reporting.md). This is a style target, not a compliance claim or measured score.

## Current state

| Area | Current state |
| --- | --- |
| Public delivery | One native executable with embedded Bun 1.4.2. npm exports are SDK library interfaces. |
| Build lane | `native-build -> emit-build -> upload`. It publishes formation files. It does not qualify the target. |
| System command | Read actual installation and qualification status from the current release evidence and [installation owner](docs/installation.md). Keep user Runtime acceptance separate. |
| Package qualification | Successful formation provenance, target and exact artifact integrity. No test suite at formation or installation. |
| Aggregate numeric evidence | GAP. Retain coverage/mutation deficits and current fixed-gate results. The accepted frozen-budget policy below awaits executable gate reconciliation. A missing report is not a pass. |
| Mutation | A separate, explicitly authorized manual run. It is not part of an aggregate or CI/CD job. |
| Lint closure | In progress. The complete Source lint profile and full Source TypeScript checks pass. The test/tooling lint profile still needs correction. Source checks do not prove a clean package. |
| Precommit | The approved hook changes are in Source. Activation waits for completed checks. Pre-push remains separate. |
| Provider and ZIP capability | Use the approved adapter and current locked reader. Missing or drifting capability is a GAP. |

Read current operation details from the [release owner](../../tooling/agent/release-local.mjs), [installation guide](docs/installation.md), and current work receipts. Version text alone does not prove installed bytes. Source changes do not change an installed artifact.

This file contains current rules and required checks. Keep dated runs, failed logs and audit history in their existing evidence stores. Preserve FAIL and UNKNOWN records.

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
The existing AST inventory in `tooling/crap-gate.mjs` supplies a starting point;
do not introduce a second independent inventory without a demonstrated need.

Mutation qualification targets 100% confirmed Killed mutants in the selected
scope and runs only with explicit manual authorization. Survived, NoCoverage,
timeout, execution/compilation errors, missing partitions and uncertain outcomes
cannot establish a passing result. A suspected equivalent mutant needs explicit
reviewed disposition and remains a GAP under the current executable gate.
Ordinary task authorization does not automatically launch mutation. Pending
manual mutation proof is reported as pending, never as achieved qualification.

For a demonstrated test bottleneck, record comparable whole-command timing,
collection/setup and child outcomes, then research relevant current official
documentation. Optimize the actual cause while retaining test selection,
isolation, assertions, security and evidence. Do not increase a timeout merely
to improve the reported result. Keep the focused-batch/one-completion-run policy
below; no separate benchmark or ROI lane is required.

## Local execution policy

Run agent behavior, property, ZOMBIES, concurrency, fault, schema, integration and security checks locally. Run coverage and CRAP locally.

CI/CD forms and publishes the exact package and its provenance/integrity metadata. Formation and installation run no test suites. Keep behavior, security, data, coverage, CRAP and mutation checks in development tasks. Do not add local delivery tests, compiler probes or copied-package installation harnesses. Synthetic artifact-state fixtures test their development task only.

During development, select the affected test files and cases. Include direct callers and configuration, schema, filesystem and subprocess dependencies. Use an exact file path with a name filter. Do not load unrelated tests.

After the task corrections are complete, run the full applicable task suite once. Reuse evidence while its inputs remain current. After a new failure, fix the cause and run one affected completion check that includes its regression. Do not repeat an unchanged passing full suite.

Collect terminal failures and review findings into one correction batch. Join
parallel writers before running its checks. One selected completion run can
prove the regression and affected callers together; do not repeat the same
cases as a second completion command. Workers do not launch duplicate suites.
After a failed full run, retain that result and recheck only affected behavior.

Pass exact file paths with name filters. A name filter alone may still load
unrelated files; see the official [Vitest filtering guide](https://vitest.dev/guide/filtering.html)
and [Bun test runner guide](https://bun.sh/docs/test).

Run the final applicable behavior check before numeric checks on stable Source. Keep one writer for coverage, CRAP and mutation outputs. For a case timeout during concurrent heavy runs, inspect its child outcome and run that exact case alone before changing its bound. Preserve the original failed or UNKNOWN result.

Use current generated SDK outputs only when their inputs match. Missing or stale output is a GAP. Do not start a local build to make a test command pass.

Use supported temporary directories or explicit owned fixture roots. Keep Source-workspace scratch in ignored `.tmp`, outside the package payload. Preserve fixtures when a child outcome is UNKNOWN.

Tests and comments describe current supported behavior. Do not include narratives about absent legacy implementations. Precommit activation has human authorization. Complete and verify its formatter, Source type, lint, focused-test and staged-byte checks before activation. This authorization does not activate pre-push coverage, CRAP or mutation checks.

## Commands and pins

Run commands from `packages/agent`. Use the pinned launcher and frozen lockfile. The launcher must select Bun 1.4.2. A global Bun version must not change the pin.

For a focused check, use:

```text
node bin/bun.mjs test tests/FILE.test.mjs --test-name-pattern "CASE_PATTERN"
```

## Lint and type contracts

Fix every lint error and warning. Do not disable rules, lower severity, add suppression comments or accept a baseline to hide a defect. Use `--max-warnings 0` for the final lint gate and the approved precommit checks.

Oxlint type-aware analysis needs a declared TypeScript project for each file. Source uses the package `tsconfig.json`. The standard nested projects in `tests/tsconfig.json` and `tooling/tsconfig.json` include MJS files with `allowJs`, `checkJs` and `noEmit`. An import-resolution flag does not place an excluded file in a typed project. Keep the Bun/Node declarations and exact pins current; the Bun runtime and current Bun declarations are 1.4.2.

Type shared fixture state and helpers with the existing production contracts. Give SQLite results the exact selected row type and check missing rows. Preserve deliberately invalid test inputs with separate malformed values; do not present them as valid production data.

Check changed shared MJS helpers with strict `checkJs --noEmit` as well as lint.
A zero-lint result does not prove that their TypeScript contracts compile.
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
Check coordinates against the actual source line length. A large integer column
must not move a statement into a later function or remove it from the denominator.
Missing function/file/statement coverage stays uncovered. Keep source-fingerprint
checks, exact function mapping and nested statement ownership. A clean lint or
type result for the gate does not prove that product coverage or CRAP passed.

The precommit checks use pinned Bun, Oxfmt, full Source TypeScript with `--noEmit`, type-aware Oxlint and AST checks for focused tests. The AST check must detect Bun `test.only` and aliases, while allowing comments and strings. After formatting and `git add`, verify the staged object and mode against the captured checked bytes with Git's path filters. Include the root instructions, sidecar, YAML and attributes in checked inputs. Reject partial staging before tools run.
Compare every captured maintained input with its staged object, including files
hidden by `assume-unchanged` or `skip-worktree`. Use indexed attributes for Git
path filters. Reject a missing file or the first mismatch before checks; verify
the index and mode again afterward. A clean `git diff` alone is insufficient.

While fixing lint, capture complete machine-readable diagnostics in the owned ignored output directory. Read counts, rule groups and bounded examples. Do not print the full report. Recheck changed files and their callers; run the complete current profile once after the correction batch is stable. Require zero errors and zero warnings before claiming lint closure or activating the hook.

## Completion commands

Use the current scripts for the applicable completion checks.

| Check | Command |
| --- | --- |
| Toolchain and input layout | `node bin/bun.mjs run test:toolchain:pinned` and `node bin/bun.mjs run preflight:pinned` |
| Configuration | `node bin/bun.mjs run test:config:pinned` |
| Ordinary agent phase | `node bin/bun.mjs run test:pinned` |
| Repair and recovery | `node bin/bun.mjs run test:repair:pinned` |
| HostState and lifecycle | `node bin/bun.mjs run test:host-state:pinned` |
| Public run entrypoint | `node bin/bun.mjs run test:run-entrypoint:pinned` |
| Resource integrity | `node bin/bun.mjs run test:resources:pinned` |
| Fuzz | `node bin/bun.mjs run test:fuzz:pinned` |
| ZOMBIES | `node bin/bun.mjs run test:zombies:pinned` |
| Deep properties | `node bin/bun.mjs run test:deep:pinned` |
| Static quality | `node bin/bun.mjs run quality:static:pinned` |
| Full Source types | `node bin/bun.mjs node_modules/typescript/bin/tsc --project tsconfig.json --noEmit` |
| Coverage | `node bin/bun.mjs run test:coverage:pinned`, then `node bin/bun.mjs run coverage:gate:pinned` |
| CRAP | `node bin/bun.mjs run crap:pinned` |
| Format | `node bin/bun.mjs run format:check:pinned` |
| Final applicable local matrix | `node bin/bun.mjs run local:candidate:pinned` |
| Portable local subset | `node bin/bun.mjs run verify:portable:pinned` |

`npm test` selects four disjoint agent phases: ordinary tests, repair, HostState and run entrypoint. It does not build or install. `verify` is a local subset. It does not install dependencies or a bundle. `ci:pinned` is delivery preparation; run it only through the delivery lane.

Launch `test:mutation:pinned` only with its separate manual authorization. An inventory check does not prove that mutants ran or were killed.

Run Vitest suites that import Bun-only state under the pinned Bun host. A Node import failure executes no tests. Use the package's configured test resolver, fixture factories and maintained `bunfig.toml`.

Test the public CLI through the existing pinned child-process helper. Assert
terminal status, signal, spawn error, public JSON envelope and persisted state
before normal owned cleanup. Keep separate implementation-seam tests when they
protect an invariant that cannot be observed across processes. Imported `run()`
is not a declared public SDK export. Current LibSQL 0.5.29 can retain native
statement handles until process exit; do not hide EBUSY or claim that CLI proof
fixes in-process SDK disposal. Retain earlier uncertain cleanup roots.

## Evidence and quality gates

Before each check, verify the actual executing VIDA CLI and involved runner versions. Use the supported `vida-agent version` command. Keep an adapter-reported version separate from the installed executable version and the Source manifest version. Record the executable, command, working directory, exact tool versions, current inputs, exit status and sanitized result. Retain full stdout and stderr separately. Bind reports to the actual current source and operation.

| Evidence class | Meaning |
| --- | --- |
| Decision | Attributable accepted intent. |
| Code | Implemented behavior. |
| Static | Tests, inspection or integrity checks for declared inputs. |
| Runtime | Actual installed behavior and attributable user testing. |
| GAP | Required evidence is missing, stale, skipped, failed, partial or uncertain. |

Static proof does not grant Runtime acceptance. A writer report, caller JSON or valid schema does not prove native tool origin, review independence or authorization.

The accepted targets are exact 100% coverage and 100% mutation qualification
for maintained production functions, with task-scoped evidence as defined above.
Keep accepted legacy deficits and missing manual runs explicit.

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

Implementation GAP: `tooling/crap-gate.mjs` still enforces the historical fixed
`CRAP < 5` and `complexity <= 10` across its complete inventory. Incremental
file selection and the accepted frozen-budget policy are not implemented by
this documentation change. Keep the existing gate result truthful; do not
bypass a failure, change a baseline automatically or claim the new gate is active.
The scoped inventory/scenario enforcement and approved complete Bun Test
migration also require their separately owned implementation and verification.
Current Fuzz, ZOMBIES and V8 coverage commands still use Vitest. Keep unsupported
coverage-provider/engine combinations as tooling GAPs, not successful coverage.

V8 coverage includes packaged TypeScript outside the five Bun-native sources and public packaged `bin` entrypoints. The Bun-native lane binds LCOV and Istanbul counters to exact bytes. Separate production source, tests, tooling, dependencies and generated outputs in reports.

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

Use the cases in `tests/delivered-work-continuation.test.mjs` for owner recovery
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

`native-delivery-evidence-repair.test.mjs` covers the fixed stale qualification
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

Run the inert capture cases with `node bin/bun.mjs test tests/development-controller-observation.test.mjs`.
They cover byte-exact success, terminal nonzero streams, spawn error, pinned
partial capture, timeout, path/link/collision denial, fresh-process restart,
declared nesting, duplicate and independent launch denial, and final-receipt
persistence failure. The partial-capture case runs under the pinned Bun
1.4.2 Node-compatible `spawnSync` API. Run the existing pure diagnostic check
with `node bin/bun.mjs test tests/development-controller.test.mjs --test-name-pattern "controller failure diagnostics preserve bounded sanitized terminal fields without claiming no effects"`.
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
