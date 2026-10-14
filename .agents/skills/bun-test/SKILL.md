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

## Design a regression

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

For asynchronous failures, await the owned promise before asserting. Keep the
original work error and cleanup error, including `throw undefined`. Restore
spies and injected faults before retrying through the registered cleanup owner.
A test that reaches an early denial has not exercised a later target boundary.
Use a phase marker or direct observation to prove the intended operation began.

For an existing awaited try-body with synchronous owned cleanup, the package
finisher can join a tagged outcome in finally without moving returns or callback
identities. Use the async owner when cleanup itself requires awaiting. Preserve
both native failure causes and the retained retry owner in the public regression.

## Run focused checks safely

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

For child programs, use Bun's `process.execPath`. For `-e`, pass named
environment values or serialize inert literals with `JSON.stringify`; do not
assume Node's positional argv layout. Observe stdout/stderr and native terminal
status. A signal request, missing PID or missing marker does not prove that a
child or descendant stopped. Arm a real timer before a readiness handshake when
the test depends on observing a deadline. Keep child, cleanup and parent limits
inside the owning case bound.

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
