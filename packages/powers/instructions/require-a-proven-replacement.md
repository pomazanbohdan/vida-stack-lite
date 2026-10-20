---
instruction_id: require-a-proven-replacement
title: Require a proven replacement
summary: "Do not announce a deprecation until the replacement covers the critical use cases, ships a migration guide, and has run in production."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - deprecation-decision
conditions_applies_when: A replacement for a deprecated system is being prepared.
conditions_does_not_apply_when: The replacement is already in production and proven.
artifact_contract_output_type: replacement-check
artifact_contract_required_data:
  - the critical use cases covered
  - the documentation and migration guide
  - the production evidence
artifact_contract_verified_by: the replacement covers the critical use cases and has run in production
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 1
---

# Require a proven replacement

Don't deprecate without a working alternative. The replacement must:

- Cover all critical use cases of the old system
- Have documentation and migration guides
- Be proven in production (not just "theoretically better")

**Red Flags**

- New features added to a deprecated system (invest in the replacement instead)
