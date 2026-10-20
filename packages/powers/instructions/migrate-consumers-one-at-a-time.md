---
instruction_id: migrate-consumers-one-at-a-time
title: Migrate consumers one at a time
summary: "Move consumers incrementally, and if you own the infrastructure you are deprecating, you migrate the users yourself."
capability_tags:
  - migrate-consumers-off-the-old-system
pattern_tags:
  - incremental-cutover
conditions_applies_when: Consumers still use a system that has a replacement.
conditions_does_not_apply_when: The system has no consumers.
artifact_contract_output_type: consumer-migration
artifact_contract_required_data:
  - the consumers and their touchpoints
  - the per-consumer migration steps
  - the behaviour verification
  - the cutover mechanism
artifact_contract_verified_by: each migrated consumer is verified and the old system reached zero traffic
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 1
---

# Migrate consumers one at a time

Migrate consumers one at a time, not all at once. For each consumer:

```
1. Identify all touchpoints with the deprecated system
2. Update to use the replacement
3. Verify behavior matches (tests, integration checks)
4. Remove references to the old system
5. Confirm no regressions
```

**The Churn Rule:** If you own the infrastructure being deprecated, you are responsible for migrating your users — or providing backward-compatible updates that require no migration. Don't announce deprecation and leave users to figure it out.

### Strangler Pattern

Run old and new systems in parallel. Route traffic incrementally from old to new. When the old system handles 0% of traffic, remove it.

### Feature Flag Migration

Use feature flags to switch consumers from old to new system one at a time:
