---
instruction_id: keep-a-step-advisory-and-a-gate-blocking
title: Keep a step advisory and a gate blocking
summary: "A step never blocks or redirects the workflow; only a gate blocks, and a failing step records a warning and continues."
capability_tags:
  - execute-plan
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A dispatched step or a gate is about to run.
conditions_does_not_apply_when: The workflow itself defines the step as blocking.
artifact_contract_output_type: blocking-policy
artifact_contract_required_data:
  - the entry kind
  - the blocking flag
  - the action taken on the outcome
artifact_contract_verified_by: a step never stopped the workflow and a blocking gate did
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/loop-hook-dispatch.md
status: active
revision: 1
---

# Keep a step advisory and a gate blocking
A `step` is advisory by construction: it never blocks or redirects the host workflow — that is what a `gate` is for. Each dispatch is best-effort; on error record a warning and continue, honoring `onError`
`blocking: true` → if the check returns `block: true`, surface `check.message` to the user and stop the current step. Do not continue
`blocking: false` → advisory only; surface the message but continue regardless of outcome
