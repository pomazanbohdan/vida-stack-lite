---
instruction_id: write-the-hypothesis-before-the-code-and-verdict-with-evidence
title: Write the hypothesis before the code and the verdict with evidence
summary: The hypothesis is written before any code and the verdict carries evidence.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A feasibility experiment is about to be built.
conditions_does_not_apply_when: The experiment is a throwaway with no question to answer.
artifact_contract_output_type: experiment-record
artifact_contract_required_data:
  - the hypothesis written before the code
  - the verdict
  - the evidence behind it
artifact_contract_verified_by: the hypothesis predates the code and the verdict names its evidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/spike-and-sketch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Write the hypothesis before the code and the verdict with evidence
A **Given / When / Then** hypothesis written before any code
A **VALIDATED**, **INVALIDATED**, or **PARTIAL** verdict with evidence
Working code (not pseudocode)
An investigation trail documenting edge cases, pivots, and surprises
