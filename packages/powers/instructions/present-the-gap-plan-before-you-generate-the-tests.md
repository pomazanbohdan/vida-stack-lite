---
instruction_id: present-the-gap-plan-before-you-generate-the-tests
title: Present the gap plan before you generate the tests
summary: "The gaps are shown as a table with the ways forward, and the person picks before any test is written."
capability_tags:
  - triage-reports
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A set of verification gaps was found and the work could fill them.
conditions_does_not_apply_when: There are no gaps.
artifact_contract_output_type: gap-plan
artifact_contract_required_data:
  - the gaps
  - the options
  - the choice
artifact_contract_verified_by: the gap table was shown and the choice was made before any test was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/validate-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Present the gap plan before you generate the tests
Call AskUserQuestion with gap table and options:
"Fix all gaps"
"Skip — mark manual-only"
"Cancel" → exit
