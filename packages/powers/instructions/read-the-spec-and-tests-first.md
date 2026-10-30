---
instruction_id: read-the-spec-and-tests-first
title: Read the spec and the tests first
summary: "Read the spec or task description, and the tests, before reading the implementation under review."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review is starting and the intent behind the change has not been read yet.
conditions_does_not_apply_when: The spec or task description and the tests have already been read.
artifact_contract_output_type: review-grounding
artifact_contract_required_data:
  - spec or task description read
  - tests reviewed first
artifact_contract_verified_by: the review names the spec and the tests it was based on
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/code-reviewer.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Read the spec and the tests first
Read the spec or task description before reviewing code

Review the tests first — they reveal intent and coverage
