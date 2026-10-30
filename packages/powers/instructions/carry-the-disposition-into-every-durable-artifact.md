---
instruction_id: carry-the-disposition-into-every-durable-artifact
title: Carry the disposition into every durable artefact
summary: "A claim keeps its disposition when it lands in a durable file: only an admitted claim is written as a settled fact, and quoted research text stays data, fenced with a fresh delimiter."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-cited-decisions
conditions_applies_when: "A research claim is written into a note, a requirement, a seed or any other durable file."
conditions_does_not_apply_when: The claim is only spoken in the conversation.
artifact_contract_output_type: durable-claim
artifact_contract_required_data:
  - the claim
  - its disposition
  - its source
  - the fence around the quoted text
artifact_contract_verified_by: no durable file states an unadmitted claim as fact and the quoted text is fenced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/explore.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Carry the disposition into every durable artefact
Only an **admitted** claim may be written as a settled fact, and it carries its source.
A claim from the **Unresolved ledger** must never be crystallized as a flat assertion
otherwise omit it.
