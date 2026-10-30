---
instruction_id: separate-a-failed-check-from-a-blocking-verdict
title: Separate a failed check from a blocking verdict
summary: A check command that fails and a check that reports a block are two different outcomes; the error policy answers the first and never overrides the second.
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - failure-first-analysis
conditions_applies_when: "A gate runs a check command and the command may fail, time out or return something unreadable."
conditions_does_not_apply_when: "The gate's check always returns a readable verdict."
artifact_contract_output_type: gate-outcome
artifact_contract_required_data:
  - whether the check command ran
  - the error policy for a failed command
  - the block decision when a verdict was produced
artifact_contract_verified_by: the command failure is routed by the error policy and the block decision is read separately
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Separate a failed check from a blocking verdict
**Step 1a — did the CHECK COMMAND itself fail?** (non-zero `CHECK_EXIT`, empty output, or unparseable JSON).
**`onError == "halt"`** → stop the ship. Do NOT push, do NOT create a PR.
**`onError == "skip"`** → record a warning naming the `capId`, then continue to the next gate. Do NOT read `GATE_RESULT.block`.
**Step 2 — read the gate's `block` decision.** Only reached when the check produced a verdict.
This halt is **not** bypassed by `onError` — `onError` covers check-command failure (step 1a), never the gate's block decision.
