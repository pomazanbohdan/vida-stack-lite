---
instruction_id: flag-a-shared-adapter-consensus-as-cross-model-not-cross-tool
title: "Flag a shared-adapter consensus as cross-model, not cross-tool"
summary: "When several reviewers run through the same adapter, the report says the consensus is cross-model and not cross-tool."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Two or more invoked reviewers share the same base adapter.
conditions_does_not_apply_when: Every reviewer runs on a different adapter.
artifact_contract_output_type: consensus-caveat
artifact_contract_required_data:
  - the reviewers that share the adapter
  - the one-line caveat
artifact_contract_verified_by: the caveat is printed before the first section
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/reviewer-instances.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Flag a shared-adapter consensus as cross-model, not cross-tool
when ≥2 invoked instances share the same base `cli`, print a one-line caveat immediately after the frontmatter (before the first section)
their consensus is cross-model, not cross-tool
