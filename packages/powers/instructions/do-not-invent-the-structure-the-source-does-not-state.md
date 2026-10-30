---
instruction_id: do-not-invent-the-structure-the-source-does-not-state
title: Do not invent the structure the source does not state
summary: "Fields, partitions and joins are written only when the source states them; what the source does not say is left out instead of being made up."
capability_tags:
  - never-invent-what-was-not-stored
pattern_tags:
  - evidence-analysis
conditions_applies_when: A document describes the structure of a source.
conditions_does_not_apply_when: The structure is read directly from the source.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the fields and partitions the source states
  - the joins the source names
artifact_contract_verified_by: "every field, partition and join in the document is stated by the source"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Do not invent the structure the source does not state
Do not invent fields, partitions, or shard counts that are not in the raw metadata.
Only capture joins explicitly named in documentation or example queries on the fetched page.
