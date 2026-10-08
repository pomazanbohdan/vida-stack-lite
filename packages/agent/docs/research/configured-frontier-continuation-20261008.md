# Same-run continuation after the prewriter configuration change

Status: current-wave projection, Host history and functional receipt repair
implemented in Source. Installed repair and runtime continuation are pending.

The [system specification](../system-specification.md) owns the product contract.
The installed development lifecycle owns repair and delivery sequencing.

## Confirmed cause

An original suspended attempt retains its old configuration and an unissued
developer request. The current configuration inserts `review_source_prewrite`
before that developer stage. The existing snapshot reader rejects the old
configuration. The bridge rejects its changed root configuration and a producer
ledger bound to a different configuration. These VIDA guards fail before the
public Mastra resume call. They do not prove that Mastra cannot resume the run.

The isolated probe uses the existing Bun 1.4.2 and Mastra Core 1.71.0 pins.
Its evidence is under
`.tmp/core-windows-resume-20261002/same-run-frontier-feasibility/`.
No live Host or engine state was changed.

## Required continuation behavior

Preserve the original work, attempt, run ID and completed observations. Retain
the old unissued developer request as evidence. Do not issue it or mark it
complete. Offer the full current prewriter wave before any developer action.
The wave can contain both the source planner and security reviewer.

Bind the existing closed configuration transitions in order, followed by the
qualified runtime code lineage. Do not rewrite a closed transition or fabricate
an issue ID for an action that was never issued. Continuation supplies no new
Source rights or Runtime acceptance.

Before the first active receipt uses a changed shape, ship its functional
bundle-owned artifact repair. Source now supports configured-frontier repair
inspect, plan, apply and resume under the existing fences. Historical review
receipts retain their existing contract.

## Framework evidence and implementation decision

The official [suspend and resume guide](https://mastra.ai/docs/workflows/suspend-and-resume)
and [Run.resume reference](https://mastra.ai/reference/workflows/run-methods/resume)
document opening an existing run with `createRun({ runId })`, then resuming its
suspended step with data that satisfies `resumeSchema`. The documentation does
not establish configuration or workflow-graph adoption for VIDA.

The raw public-API probe confirms the following behavior under the pinned
packages:

- Resume without data is rejected. The old developer suspension stays intact.
- Resume at the same `wave-1`, with both complete current prewriter observations,
  succeeds. The run ID and storage remain the same.
- The old successful `wave-0` synthesis output stays exactly the same. The current
  graph does not execute synthesis again.
- The prewriter step completes. Current developer `wave-2` then suspends with one
  developer-orchestrator request and the three accumulated observations.

The corrected probe records submitted and accepted report calls separately.
Its stdout and preserved no-data failure are in `raw-public-framework/stdout.log`
and `raw-public-framework/no-data-reoffer-failure.log` under the evidence root.
Fixture reports establish framework behavior only. They are not actual agent
results, Host issuance or native Runtime acceptance.

Use the existing Host journal to offer and record the full current prewriter
wave first. Do not call Mastra with missing reports to request a new offer.
After all actual prewriter reports are accepted, use public same-run resume to
advance the engine. The adapter must allow the exact receipt-bound configuration
change at that suspended step and preserve the old successful prefix.

The current-wave projection preserves the old developer request and completed
prefix. The shared package repair module separates immutable receipt structure
from exact live dependencies. Its live validator compares all successor reviewer
requests with the derived wave. History checks do not require current configuration
or an unexpired old lease. Focused checks cover changed Source scope with its exact
authorized bridge, omitted security reviewers, duplicate or old developer
requests, attempted lowering of the protected lifecycle risk, expired repair
leases, and advanced Work state. The CLI re-exports the shared validators.

The Host reads immutable frontier history after later Work progress. Its repair
inspector derives the full current reviewer wave from loaded configuration and
the protected original intake. Public repair checks cover successful plan/apply/
resume, changed intake denial before reservation, interrupted digest update,
retained UNKNOWN, producer fencing and exact recovery. Repair preserves the
Work, Ledger, Journal and receipt payload.

The task completion run reports 17 passing cases and one stale scope-equality
assertion. Its corrected full-request assertion passes in the selected follow-
through. Both results are retained under the existing scratch evidence root.
Independent review added exact-diff and successor-projection guards. Six affected
cases and six direct historical/immutable callers pass after those corrections.
These checks reject unused authorization entries and changes to the successor
run, risk, scope, contracts or retained artifacts. The original aggregate failure
remains recorded; selected passing follow-through does not rewrite it.
The final review accepts the prerequisite repair in Source. Further checks join
the old Work run and Source scope to its Journal, require the Ledger increment
to be exactly one, and bind the expected maintenance generation to the closed
transition fence. Original AMEND evidence remains retained.

Installed repair proof, chained configuration proof, the continuation producer
and ordinary public run consumer remain. This work does not restore live
continuation or grant Source rights.
