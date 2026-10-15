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

## Design a regression

For YAML/configured-root fixtures, follow [TESTING's fixture contract](../../../packages/agent/TESTING.md#new-and-modified-files).
Use the bound config's registered and allowed projects; verify targeted negative
mutations actually occurred before testing rejection. Keep portable-template
and configured-root checks distinct from complete coverage qualification.

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
regression risk.

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

For expected-success async target calls, reuse the contour's narrow result
observer where present. Assert doesNotReject around the invocation and retain
separate exact result/event checks. Keep setup and cleanup outside it. The timing
contour qualifies this through actual injected mutants and the real assertion
adapter; a passing original test alone does not prove mutation causality.
Check value shape/type before a property access or regex matcher can throw its
own argument error. Preserve unproven results without padding assertion counts.

For an existing awaited try-body with synchronous owned cleanup, the package
finisher can join a tagged outcome in finally without moving returns or callback
identities. Use the async owner when cleanup itself requires awaiting. Preserve
both native failure causes and the retained retry owner in the public regression.

For paired lock cleanup, nest the existing close accumulator in ownership order.
Assert every close attempt and preserve all work/cleanup causes, including a
thrown undefined value and a sole cleanup error by identity. A fault injected
after a real native close proves cause aggregation, not SQLite I/O failure.
Retain an expected-UNKNOWN fixture independently of successful assertions.

For filesystem repair faults, prove that interception reaches preloaded named
imports. Use the qualified namespace-snapshot/module-replacement pattern from
TESTING and await both registration and restoration. Keep these cases serial.
Copy original exports with `{ ...fs }` before the first replacement; a live ESM
namespace is not a restorable snapshot.
For host-capability provider scenarios, use the existing parent-process cases
with fresh query imports and scoped restoration of both complete namespaces.
This keeps assertions and coverage in the measured process. Module mocks remain
serial until shard qualification; mock.restore() does not undo mock.module().
Assert effects and all retained causes, not only the mock calls. Exercise denied
exclusive creation and a foreign afterimage after successful rename separately;
neither grants ownership of a file created by another actor.

For a bounded release read fault, keep the file regular with one link until the
read begins. Unlinking after open triggers the earlier identity guard and cannot
qualify a later read-error assertion. Preserve target/temp bytes and restore
aliases before observation; real close followed by an injected error proves
cause aggregation, not failed native I/O.

## Run focused checks safely

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
For configured-workflow, the focused capture retains complete SDK formation
inputs privately while instrumenting only selected coverage Source. Prepare
through the existing SDK readiness callback before capture; input review remains
forbidden in focused mode. Never use the coverage subset as the SDK inventory.

For mutation inputs, keep the full captured test-selection identity separate
from the partition's executed tests. Reuse the coverage fingerprint owner and
check the descriptor's rejection stage before investigating assertions. A
known survivor is a mutation failure; an input/process failure is UNKNOWN.
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

Scope hooks to cases that own the fixture. Await all work and restore mocks and
resources in `finally`. Keep cleanup in `finally` while preserving the original
and cleanup errors. Register each test file's own cleanup hook. If a case times
out or a child remains unobserved, retain its fixture root and report UNKNOWN;
do not retry or delete it without the owning recovery rule.

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

Separate case timeout from protocol age thresholds. Compare identical complete
scopes under the same resource conditions. Record whole-command timing and
startup, collection, setup and child outcomes separately. Partial reporter rows
are not complete per-file timing weights. Do not infer speedup from operation
counts or instrumented wall time.

Check the actual mount backing a private fixture, including bind mounts. Use
TESTING's retained-host-tmpfs rule for disposable functional/process-recovery
cases; preserve all fsync calls and failed roots. This is not power-loss
durability evidence or parallel-coverage qualification.

Classify real reader effects. An immutable `readFileSync` dependency and a
SafeAccess reader that creates compare-and-swap sidecars have different resource
behavior even when they share a path. A common parent directory alone does not
prove a conflict. Review transitive reads, writes, mocks, clocks, environment
and module order before changing resource tags. UUID leaves do not establish
whole-run independence.

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
