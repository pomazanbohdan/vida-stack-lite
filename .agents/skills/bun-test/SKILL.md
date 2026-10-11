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
strict typecheck success.

## Quick reference

| Need | Technique |
| --- | --- |
| Regression | Map contract and scenarios to function/test IDs; assert actual outcomes at the owned boundary. |
| Focused check | Explicit test file plus anchored `--test-name-pattern`; inspect exit code and assertions. |
| Isolation | Scope hooks to the cases needing fixtures; await work and restore mocks/resources in `finally`. |
| Early return | Put owned teardown in `finally`; preserve original and cleanup errors. |
| Timeout | Separate parent elapsed time, child receipt and phase intervals before changing implementation. |
| Repeated computation | Reuse within the invocation; test output parity, changed inputs and deterministic operation counts. |
| Missing profile | Check capability on an inert control before another expensive case. |
| Inventory/report processing | Reuse TS tools or an owned temporary `.ts` diagnostic with qualified Bun; validate JSON before reading fields. |
| Measurement reservation | Separate qualified direct producer termination from measurement success and UNKNOWN test effects; apply the existing TESTING custody owner. |

Run from `packages/agent`, using the existing pinned launcher:

```sh
node bin/bun.ts --version
node bin/bun.ts test ./tests/maintained-source-inventory.test.ts ./tests/runtime-package-access-reuse.test.ts
```

Read scripts for ordinary phase membership. Add each maintained test once to
its owner; build/install run no suites. The final-check owner alone collects
coverage, CRAP and mutation outputs. Reuse Babel inventory, hashes, reviewed
matrices and existing fixture helpers.

## Diagnose and optimize

For each observed error or bottleneck, retain a bounded receipt, inspect the
causal path and check current official documentation/upstream issues. Record
documented support separately from local qualification.

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
PID is not proof of cleanup. Never replay an uncertain operation to obtain a
cleaner measurement. Preserve live integrity, CAS, authorization and durable syncs.

## Maintain this reference

After a verified change to Bun Test practices, update the authoritative owner
and this reference in the same correction packet. Validate linked paths,
frontmatter and commands; use blind scenario exercises for changed guidance.
Label pending mechanisms explicitly. Keep dated measurements in work evidence,
not this skill; commit and push after applicable checks and review.
