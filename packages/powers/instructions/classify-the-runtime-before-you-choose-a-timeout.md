---
instruction_id: classify-the-runtime-before-you-choose-a-timeout
title: Classify the runtime before you choose a timeout
summary: "A task is classified by how long it is expected to run before a timeout, a health check or an external submission is chosen for it."
capability_tags:
  - execute-plan
pattern_tags:
  - resource-bounds
conditions_applies_when: A task is about to be run and its duration is not yet known.
conditions_does_not_apply_when: "The task's runtime is already characterised and verified."
artifact_contract_output_type: runtime-classification
artifact_contract_required_data:
  - the runtime class
  - the threshold that assigned it
  - the behaviour the class selects
artifact_contract_verified_by: every task carries a runtime class and the matching behaviour
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/external-job/fragments/execute-wave-post.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/external-job/fragments/plan-post.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Classify the runtime before you choose a timeout
- **Classify the runtime.** `quick` (<2 min) and `medium` (<~30 min) run normally. `unknown` requires a first-health check and a soft-review deadline before consuming the child timeout. `long_compute` (>30–60 min) is externalized.
- For every `<task>` likely to exceed ~2 minutes of real compute, emit a `<runtime_budget>` child element so execute can classify it:
- `<runtime_budget>unknown</runtime_budget>` — runtime not yet characterized; execute must run a first-health check and set a soft-review deadline before trusting the child timeout. Define a progress signal and an abort condition.
