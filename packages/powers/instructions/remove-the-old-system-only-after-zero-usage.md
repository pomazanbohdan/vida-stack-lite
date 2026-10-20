---
instruction_id: remove-the-old-system-only-after-zero-usage
title: Remove the old system only after zero usage
summary: "Verify with metrics, logs and dependency analysis that no active consumer remains, then remove the code, its tests, its documentation and its configuration."
capability_tags:
  - migrate-consumers-off-the-old-system
pattern_tags:
  - incremental-cutover
conditions_applies_when: The consumers of a deprecated system have been migrated.
conditions_does_not_apply_when: Consumers are still using the old system.
artifact_contract_output_type: removal-record
artifact_contract_required_data:
  - the usage evidence
  - "the removed code, tests, documentation and configuration"
  - the removed notices
artifact_contract_verified_by: the usage evidence shows zero active consumers before the removal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 1
---

# Remove the old system only after zero usage

Only after all consumers have migrated:

```
1. Verify zero active usage (metrics, logs, dependency analysis)
2. Remove the code
3. Remove associated tests, documentation, and configuration
4. Remove the deprecation notices
5. Celebrate — removing code is an achievement
```

**Red Flags**

- Removing code without verifying zero active consumers
