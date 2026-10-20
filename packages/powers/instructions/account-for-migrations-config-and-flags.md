---
instruction_id: account-for-migrations-config-and-flags
title: "Account for migrations, config and flags"
summary: "The change names the migrations, configuration changes and feature flags it touches and works with the rest of the system."
capability_tags:
  - define-quality-bar
pattern_tags:
  - standing-quality-bar
conditions_applies_when: A change is about to be integrated into a running system.
conditions_does_not_apply_when: "The change touches no schema, configuration or public interface."
artifact_contract_output_type: integration-surface-list
artifact_contract_required_data:
  - the migrations
  - the configuration changes
  - the feature flags
  - the backward compatibility decision
artifact_contract_verified_by: "every migration, config change and flag the change reaches is named and accounted for"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/definition-of-done.md
status: active
revision: 1
---

# Account for migrations, config and flags
Change works with the rest of the system, not just in isolation
Database migrations, config changes, and feature flags are accounted for
Backward compatibility considered for any public interface or API change
