---
instruction_id: merge-a-partial-update-instead-of-rewriting-the-whole-intel-file
title: Merge a partial update instead of rewriting the whole intel file
summary: An update that names a few files changes only the entries that mention them and keeps the rest.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - incremental-cutover
conditions_applies_when: Only part of the knowledge base has to be refreshed.
conditions_does_not_apply_when: The whole knowledge base is rebuilt.
artifact_contract_output_type: intel-file
artifact_contract_required_data:
  - the changed entries
artifact_contract_verified_by: the untouched entries survived and only the named files changed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-intel-updater.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-intel-updater.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Merge a partial update instead of rewriting the whole intel file
Only update entries in file-roles.json/api-map.json/dependency-graph.json that reference the given paths
Preserve existing entries not related to the specified paths
Read existing intel files first, merge updates, write back
