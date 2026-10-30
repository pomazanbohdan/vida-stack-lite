---
instruction_id: attest-with-deterministic-code-not-a-model
title: "Attest with deterministic code, not with a model"
summary: The check of a run is deterministic code that reads the receipt and returns a verdict; it runs on the consumer side.
capability_tags:
  - verify-work-results
pattern_tags:
  - attested-computation
conditions_applies_when: A receipt of a run has to be checked.
conditions_does_not_apply_when: The check is a definition check against a policy rather than a check of a run.
artifact_contract_output_type: attester
artifact_contract_required_data:
  - the receipt
  - the verdict the deterministic check returned
artifact_contract_verified_by: the verdict came from deterministic code over the receipt
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

# Attest with deterministic code, not with a model
`attester`: The deterministic check.
`resource` names code (no LLM) that takes a receipt and returns a verdict.
It is meant to run consumer-side.
`executor`: How the computation is run.
