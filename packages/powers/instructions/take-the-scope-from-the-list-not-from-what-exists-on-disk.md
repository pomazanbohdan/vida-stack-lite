---
instruction_id: take-the-scope-from-the-list-not-from-what-exists-on-disk
title: "Take the scope from the list, not from what exists on disk"
summary: The set of items comes from the list; the files on disk only decide create or update.
capability_tags:
  - plan-implementation
pattern_tags:
  - single-source-of-truth
conditions_applies_when: The set of items to produce is being assembled.
conditions_does_not_apply_when: The set of items is already fixed and only the work is being ordered.
artifact_contract_output_type: work-manifest
artifact_contract_required_data:
  - the list the scope comes from
  - the mode of each item
artifact_contract_verified_by: the list of items came from the list and the existing files only decided create or update
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/docs-update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Take the scope from the list, not from what exists on disk
The doc queue is built exclusively from the 9 known doc types listed above.
Do not derive the queue from `existing_docs` directly — existing_docs is only used in the next step to determine create vs update mode.
