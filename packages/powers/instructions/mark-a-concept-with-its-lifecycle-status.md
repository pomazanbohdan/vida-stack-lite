---
instruction_id: mark-a-concept-with-its-lifecycle-status
title: Mark a concept with its lifecycle status
summary: "A concept carries a lifecycle status: not yet reviewed, ready for consumption, or kept only for links and history; a concept that carries no status is stable."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - deprecation-decision
conditions_applies_when: A consumer has to know whether a concept is still current.
conditions_does_not_apply_when: The concept is a single artefact that is not maintained.
artifact_contract_output_type: lifecycle-status
artifact_contract_required_data:
  - the status of the concept
  - the concepts that carry no status
artifact_contract_verified_by: every concept carries a status or is read as stable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Mark a concept with its lifecycle status
`draft`: not yet reviewed; possibly incomplete.
`stable`: default; ready for consumption.
`deprecated`: kept for links and history; no longer current.
Absent `status` ⇒ `stable`.
