---
instruction_id: record-where-the-answers-meet
title: Record where the answers meet
summary: "When two answers pass through the same method, the document records that method, the questions that reach it and the checks there that reject or throw."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: Two answers of the set pass through the same method.
conditions_does_not_apply_when: No two answers share a method; the section is dropped.
artifact_contract_output_type: research-document
artifact_contract_required_data:
  - the method
  - the questions that reach it
  - the checks there that reject or throw
artifact_contract_verified_by: every line of the section is cited the way its question section cites it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/assets/codebase.template.md
status: active
revision: 1
---

# Record where the answers meet
`## Where the answers meet`, only when two answers pass through the same method: each such method, the questions that reach it, and the checks there that reject or throw, each line cited as its question section cites it
