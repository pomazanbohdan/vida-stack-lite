---
instruction_id: describe-a-lens-by-what-it-diagnoses-and-prescribes
title: Describe a lens by what it diagnoses and what it prescribes
summary: "Every lens states the class of problem it detects, the class of response it prescribes and the conditions that trigger it."
capability_tags:
  - review-code
pattern_tags:
  - dimension-sweep
conditions_applies_when: A reusable lens is written for a method.
conditions_does_not_apply_when: A one-off check that is not meant to be reused.
artifact_contract_output_type: lens-definition
artifact_contract_required_data:
  - what the lens diagnoses
  - what it recommends
  - when it applies
artifact_contract_verified_by: "the lens names its diagnosis, its prescription and its trigger"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/artifact-types.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body defines reusable diagnostic-lens fields, but the lens subject is unspecified; no listed domain can be grounded from the body or conditions."
---

# Describe a lens by what it diagnoses and what it prescribes
Named lenses, each documenting:
What it diagnoses (the class of problem it detects)
What it recommends (the class of response it prescribes)
When to apply (triggering conditions)
