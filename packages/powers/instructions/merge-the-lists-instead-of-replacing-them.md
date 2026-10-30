---
instruction_id: merge-the-lists-instead-of-replacing-them
title: Merge the lists instead of replacing them
summary: "A list that the record already holds grows by the new entries; the entries it held are kept, so the record never loses what it already stated."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - expand-contract
conditions_applies_when: A record that already carries lists is written again with new entries for them.
conditions_does_not_apply_when: The record is created for the first time.
artifact_contract_output_type: record-replacement
artifact_contract_required_data:
  - the entries the record already held
  - the new entries
artifact_contract_verified_by: every previous entry is still in the record and the new entries are added
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/web_ingestion_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Merge the lists instead of replacing them
For `tags`, pass the union of existing tags plus any new ones (merge, don’t replace).
For `sources`, pass the union of existing entries plus any new ones (merge, don’t replace) — the tool refuses a write that shrinks the list.
Add an entry for the page you ingested.
