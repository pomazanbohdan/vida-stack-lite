---
instruction_id: keep-an-advisory-step-failure-from-blocking-the-main-path
title: Keep an advisory step failure from blocking the main path
summary: An optional or post-hoc step that fails produces a warning and the flow continues; it never undoes or blocks the result that was already produced.
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: "An optional check, an external tool or a post-result step runs and may fail."
conditions_does_not_apply_when: The step is the gate that decides whether the result may exist.
artifact_contract_output_type: advisory-step-outcome
artifact_contract_required_data:
  - the step that failed
  - the warning
  - the path that continues
artifact_contract_verified_by: the main path continues after the warning
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
  - operations
---

# Keep an advisory step failure from blocking the main path
On failure, warn with stderr output and fall through to the manual review flow below.
If JSON is invalid (`INVALID_JSON`): warn "External review returned invalid JSON" with stderr and continue.
Regardless of the external review result, fall through to the manual review options below.
All `ship:post` hooks are post-ship and additive (`onError: skip`); a failure here never affects the already-created PR.
