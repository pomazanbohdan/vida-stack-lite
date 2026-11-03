# Runtime next actions

Owner: runtime maintainers. Updated: 2026-11-03.
Class: derived task queue. The [system specification](system-specification.md),
[development lifecycle](../instructions/development-lifecycle.md) and
[testing policy](../TESTING.md) retain their contract ownership.

## Active implementation

The [runtime product model implementation plan](plans/runtime-project-model.md)
owns the catalog, work records, product configuration and Codex identity,
clean initialization, interactive CLI/help, temporary acceptance, build/release,
external update and repository reinitialization. Its implementation and
verification tasks are maintained in that plan.

Follow the [one-task runtime-first delivery cycle](decisions/work-items/runtime-first-development.md). Task 2 (`runtime-work-records`) Source and its causal readonly-frontier repair are delivered in [v0.1.9](https://github.com/pomazanbohdan/vida-stack-lite/releases/tag/v0.1.9). Linux external installation and the system Windows update are verified. The original Task2 attempt is suspended through the delivered public owner, with no lease, no pending actions and `recovery_required:false`; it is not retroactively completed or accepted. The [implementation plan](plans/runtime-project-model.md#task-2--local-work-records-keys-and-hierarchy) records scoped checks and remaining gaps. Task 3 is the next queued cycle and has not started; begin it through the updated runtime after its admission prerequisites. The full plan and the remaining queue are not one release batch.

## Remaining work outside the implementation plan

Before the next PATCH cycle, reconcile the logical-bundle guard in
`tooling/agent/release-local.ts#publishedPreparationSnapshot`. It still accepts
only legacy `packages/agent`, while the current configuration uses logical
`vida-agent`. The independent CI-identity review records this as Important I-1.
It fails closed and does not affect the published 0.1.9 pair, but the supported
`--prepare-after-publication` route needs its own bounded correction before use.
Preserve the current operation and all publication/UNKNOWN evidence.

### 1. Qualify a governed installed-runtime work session

Admit a fresh attributable work request through the installed runtime. Bind
actual tool invocations and terminal reports to the configured work, attempt,
project, runtime, source and current lease/CAS state. Record the supported
admission, wave issue and report transitions and any demonstrated defect.

Completion: a normal workflow has attributable technical evidence, followed by
the user's acceptance of the delivered version for that scenario.

### 2. Qualify installation recovery and offline resource discovery

Verify Windows rollback through the maintained installer owner, with exact
artifact bytes and structured native observations. Check first-run resource
discovery from another cwd with external runtimes absent and exercise the
required offline boundary. Preserve ambiguous installer/process effects for
their supported reconciliation owner.

Completion: each claimed recovery/offline path has attributable native evidence.

### 3. Close whole-product development-quality debt

Rebind whole-product coverage, frozen CRAP and mutation qualification to current
Source under the existing policies and budgets. Preserve the distinction between
focused implementation checks and whole-product qualification.

Qualify outstanding Windows filesystem physical races, adversarial scheduling
and native failure/close injection. Establish isolated producer evidence before
increasing test concurrency.

Completion: current reports close the applicable numeric and custody criteria.
These tasks retain their existing gate scope under TESTING and the lifecycle.

## Evidence custody

Historical records, FAIL/UNKNOWN, backups, operation journals and native fixture
roots retain their original bindings and recovery owners. Removing a duplicate
or obsolete queue entry does not settle an operation or authorize its replay.
