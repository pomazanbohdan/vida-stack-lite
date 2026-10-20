---
instruction_id: adapt-the-old-interface-to-the-new-implementation
title: Adapt the old interface to the new implementation
summary: "Translate calls from the old interface to the new implementation behind an adapter, so consumers change one at a time."
capability_tags:
  - migrate-consumers-off-the-old-system
pattern_tags:
  - incremental-cutover
  - migration-strategy
conditions_applies_when: "The old interface cannot change yet, but its implementation is being replaced."
conditions_does_not_apply_when: Every consumer can be migrated in the same wave.
artifact_contract_output_type: adapter
artifact_contract_required_data:
  - the old interface
  - the new implementation
  - the translation
  - "the condition that ends the adapter's life"
artifact_contract_verified_by: the adapter is removed once the last consumer has migrated
compatibility_excludes:
  - migrate-callers-and-delete-legacy
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 2
---

# Adapt the old interface to the new implementation

Create an adapter that translates calls from the old interface to the new implementation. Consumers keep using the old interface while you migrate the backend.
