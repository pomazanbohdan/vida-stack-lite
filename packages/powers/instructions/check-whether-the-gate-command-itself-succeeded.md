---
instruction_id: check-whether-the-gate-command-itself-succeeded
title: Check whether the gate command itself succeeded
summary: "A gate that errors is a different event from a gate that blocks: the command own failure is handled by the error policy, and only a successful command verdict is read."
capability_tags:
  - harden-validation
pattern_tags:
  - failure-first-analysis
conditions_applies_when: A gate check ran and its result has to be read.
conditions_does_not_apply_when: The gate is a plain predicate that cannot fail.
artifact_contract_output_type: gate-outcome
artifact_contract_required_data:
  - whether the check command succeeded
  - the error policy that applied
  - the verdict when the command succeeded
artifact_contract_verified_by: the verdict was read only after the command had succeeded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/wave-post-gate-hooks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Check whether the gate command itself succeeded
If the check command failed (non-zero `CHECK_EXIT`, empty output, or unparseable JSON):
treat as a fatal error: stop wave completion
log a warning and continue to the next hook
