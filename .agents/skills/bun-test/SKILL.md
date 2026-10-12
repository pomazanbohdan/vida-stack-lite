---
name: bun-test
description: Use when writing, migrating, reviewing, running or optimizing TypeScript tests with Bun in this repository, or diagnosing timeouts, missing profiles, fixture leaks and mock pollution.
---

# Bun Test development

Use the smallest contract-backed check that resolves the current uncertainty.
Keep behavior, timing and numerical qualification as separate evidence.

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

In isolated fixtures containing copied snapshot tests, pass explicit `./` paths
for child test subjects. Bare names can act as discovery filters and select
both originals and copies. Assert the exact child test-file count when fixture
cardinality matters; keep that invocation bound to its actual manifest.

Use unlabelled `describe(() => ...)` for selective setup without changing exact
test names; `describe('', ...)` adds a full-name separator and can break anchored
filters. Verify selection with inert marker controls. Keep preparation and case
budgets distinct. Track all pending bodies through terminal custody checks;
retain before file cleanup if a timed-out body remains active. Bun snapshots
hook timeout options at registration; later object mutation does not change them.

For a Bun-only SDK subject, use the current executable rather than an unrelated
Node launcher. Keep launcher verification with its existing owner. Child and
cleanup budgets must fit the parent case limit; use the shared bounded child
owner, await terminal evidence and mark fixture retention before launch. Clear
retention only after all assertions pass. Formation does not launch these tests.

Test SDK Source capture with inert files and tool imports, without forming an
SDK. Verify retained bytes after live changes, aliases/cycles, omitted tests/
generated files and existing boundary limits. Reuse the bounded quality reader
and runtime closure owner. Captured SDK output is separate artifact evidence;
its execution does not measure Source coverage.

## Diagnose and optimize

For child diagnostics, check Buffer and offset Uint8Array views with Unicode
and distinct secret bytes inside/outside the view. Decode through the existing
output owner before sanitizing/capping; retain raw receipt custody separately.

In-process result validators follow the actual producer contract: an optional
property may be present with undefined even though JSON serialization omits it.
Keep required writer fields strict. Workflow fixtures consume the currently
issued prewriter stage before exercising writer denial; reuse existing typed
preparation/report owners and one observer value for both records. Derive
synthetic package version and file sizes from their actual fixture bytes.

For each observed error or bottleneck, retain a bounded receipt, inspect the
causal path and check current official documentation/upstream issues. Record
documented support separately from local qualification.

Parallel agents own disjoint edits; the lead schedules one runtime measurement
at a time. Hold edits to observed package inputs during that measurement. Save
the command, terminal exit, log and exec session ID before yielding. Compare the
same case and instrumentation under the same resource conditions. Report
operation-count reductions separately from elapsed-time improvements; nested
reporter rows and partial runs do not establish whole-suite percentiles.

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
PID is not proof of cleanup. Qualified Bun 1.4.3's exact PID0/null status/null
signal/ENOENT result proves only that a producer did not start. The coverage
owner may release its exact reservation while retaining UNKNOWN/run evidence;
other ambiguous spawn errors remain held. Never replay an uncertain operation to obtain a
cleaner measurement. Preserve live integrity, CAS, authorization and durable syncs.

## Maintain this reference

After a verified change to Bun Test practices, update the authoritative owner
and this reference in the same correction packet. Validate linked paths,
frontmatter and commands; use blind scenario exercises for changed guidance.
Label pending mechanisms explicitly. Keep dated measurements in work evidence,
not this skill; commit and push after applicable checks and review.
