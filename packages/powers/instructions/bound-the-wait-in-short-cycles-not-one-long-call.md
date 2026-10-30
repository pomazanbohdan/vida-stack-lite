---
instruction_id: bound-the-wait-in-short-cycles-not-one-long-call
title: "Bound the wait in short cycles, not one long call"
summary: A long wait is split into short bounded cycles; the outer threshold accumulates across the cycles instead of being carried by one call.
capability_tags:
  - coordinate-program
pattern_tags:
  - resource-bounds
  - verification-rerun-policy
conditions_applies_when: A wait can outlast the timeout of the tool that performs it.
conditions_does_not_apply_when: The wait is bounded by the tool itself and returns as soon as the condition holds.
artifact_contract_output_type: bounded-wait-policy
artifact_contract_required_data:
  - the interval one cycle waits
  - the threshold the cycles accumulate
  - the outcome of the current cycle
artifact_contract_verified_by: every cycle was a short bounded call and the elapsed time was accumulated across the cycles
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase/steps/stall-detection-helpers.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Bound the wait in short cycles, not one long call
A single Bash tool call blocking for `threshold + interval` minutes (up to 15 min at defaults) risks the *host tool's own* timeout killing the call before it ever prints a result — silently defeating the fix it exists to ship.

Looping at the orchestrator-prose level instead means every cycle is a short (default 5 min), real, bounded call that reliably hands control back — the outer threshold is enforced by `dispatch_ts` accumulating across calls, not by one call's own duration.

**Disclosed tradeoff:** the first cycle always sleeps a full `PLANNER_STALL_INTERVAL_MINUTES` before its first check, so a planner that completes in seconds is not observed by this path until that interval elapses (default 5 min) — slower than a plain blocking call's near-instant return on success.
