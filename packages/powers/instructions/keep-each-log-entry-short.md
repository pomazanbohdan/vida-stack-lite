---
instruction_id: keep-each-log-entry-short
title: Keep each log entry short
summary: An entry stays under 150 tokens and drops the fields that have nothing in them.
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A log entry is written.
conditions_does_not_apply_when: The entry is a single value with nothing to omit.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the entry fields
artifact_contract_verified_by: the entry is under 150 tokens and holds no empty field
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/templates/log-template.md
status: active
revision: 1
---

# Keep each log entry short
Omit empty fields.
Token budget: up to 150 tokens per entry. The smaller the better, but do not sacrifice precision.
