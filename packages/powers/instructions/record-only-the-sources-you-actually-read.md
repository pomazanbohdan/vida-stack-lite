---
instruction_id: record-only-the-sources-you-actually-read
title: Record only the sources you actually read
summary: Only the material that was really fetched is listed as a source; a URL that was never opened is never written down.
capability_tags:
  - never-invent-what-was-not-stored
pattern_tags:
  - evidence-analysis
conditions_applies_when: A document lists the sources it was written from.
conditions_does_not_apply_when: Every source in the list is already in the document that is being refined.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the sources that were fetched
  - the sources that were already in the document
artifact_contract_verified_by: no source in the list was neither fetched nor already present in the document
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Record only the sources you actually read
Record in `sources` **only** URLs you actually fetched (or URLs already present in the doc you’re refining).
Do not invent URLs; record only sources you actually know.
