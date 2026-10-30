---
instruction_id: observe-the-guard-ran-rather-than-infer-it
title: Observe that the guard ran rather than infer it
summary: "A run records the hooks that actually started, so the claim that a guard ran is observed and not inferred from the absence of a complaint."
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: A run claims that a guard or a hook ran.
conditions_does_not_apply_when: The run has no way to observe what the guard did.
artifact_contract_output_type: observed-hook-run
artifact_contract_required_data:
  - how the run records the hooks
  - what the observation shows
  - what is claimed without it
artifact_contract_verified_by: the guard that ran was observed and the claim rests on the observation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/opencode-v2-verification-matrix.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Observe that the guard ran rather than infer it
- so "the guard ran" is observed, not inferred.
- starts the real `opencode` binary against a scripted local OpenAI-compatible model (nothing leaves the machine), and asserts on what the model received, what the tools returned and which hook scripts ran.
