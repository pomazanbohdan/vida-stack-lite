---
instruction_id: migrate-callers-and-delete-legacy
title: Migrate callers and delete legacy APIs
summary: "When introducing a new internal API while old callers still exist, migrate callers and delete the old API in the same wave instead of preserving compatibility layers."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
  - migration-strategy
conditions_applies_when: "You replace a function, format, or interface that already has callers."
conditions_does_not_apply_when: The old interface remains a public contract for external consumers.
artifact_contract_output_type: migration
artifact_contract_required_data:
  - call sites
  - migrated calls
  - deleted interface
  - external consumers
artifact_contract_verified_by: "the project's checks passing after the old interface is removed"
compatibility_excludes:
  - adapt-the-old-interface-to-the-new-implementation
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md
status: active
revision: 2
---

# Migrate callers and delete legacy APIs
When introducing a new internal API while old callers still exist, do not preserve compatibility layers.
Migrate callers and delete the old API in the same wave.
Update tests to assert the new contract.
Delete tests that only protect pre-refactor implementation details.
This applies when no external users depend on backward compatibility.
This applies when the project can absorb coordinated breaking changes.
This applies when the new API is part of a simplification or refactor initiative.
Does the change introduce a new API while keeping the old one alive?
A new API kept alongside the old one leaves a legacy dual path.
If there are no external consumers,
migrate callers and delete the old path in the same wave.
Do not leave compatibility layers that will become permanent.
The old path is gone in the same wave,
not deprecated and left running.
