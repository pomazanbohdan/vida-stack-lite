---
instruction_id: write-the-map-documents-directly-and-return-only-a-confirmation
title: Write the map documents directly and return only a confirmation
summary: The analysis is written to its files; the reply names what was written and nothing else.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - context-relay
conditions_applies_when: An analysis of an existing codebase is produced.
conditions_does_not_apply_when: The answer is a short question with no artifact to write.
artifact_contract_output_type: codebase-map
artifact_contract_required_data:
  - the files written
  - their line counts
artifact_contract_verified_by: the reply is a short confirmation and the documents hold the content
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-codebase-mapper.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-codebase-mapper.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Write the map documents directly and return only a confirmation
WRITE DOCUMENTS DIRECTLY. Do not return findings to orchestrator. The whole point is reducing context transfer.
RETURN ONLY CONFIRMATION. Your response should be ~10 lines max. Just confirm what was written.
DO NOT COMMIT. The orchestrator handles git operations.
