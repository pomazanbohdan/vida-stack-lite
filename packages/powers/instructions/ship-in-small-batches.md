---
instruction_id: ship-in-small-batches
title: Ship in small batches
summary: Smaller batches and more frequent releases reduce risk instead of increasing it.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - automated-enforcement
conditions_applies_when: You choose the size and cadence of a release.
conditions_does_not_apply_when: The change can only be delivered as one unit.
artifact_contract_output_type: release-plan
artifact_contract_required_data:
  - the batch size
  - the release cadence
artifact_contract_verified_by: each deployed batch is small enough to debug on its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/ci-cd-and-automation/SKILL.md
status: active
revision: 1
---

# Ship in small batches
**Faster is Safer:** Smaller batches and more frequent releases reduce risk, not increase it. A deployment with 3 changes is easier to debug than one with 30. Frequent releases build confidence in the release process itself.
