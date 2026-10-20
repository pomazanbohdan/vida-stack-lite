---
instruction_id: keep-feature-flags-flat-and-tested
title: Keep feature flags flat and tested
summary: "Do not nest feature flags, and test both the on and the off state of every flag in CI."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - staged-exposure
conditions_applies_when: A feature flag is introduced or extended.
conditions_does_not_apply_when: The behaviour is switched on permanently from the start.
artifact_contract_output_type: flag-discipline
artifact_contract_required_data:
  - the flags in play
  - the nesting check
  - the states under test
artifact_contract_verified_by: both flag states are covered by the suite and no flag depends on another flag
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/shipping-and-launch/SKILL.md
status: active
revision: 1
---

# Keep feature flags flat and tested
Ship behind feature flags to decouple deployment from release.

**Rules:**
- Don't nest feature flags (creates exponential combinations)
- Test both flag states (on and off) in CI

## Common Rationalizations

"We don't need feature flags for this"
Every feature benefits from a kill switch. Even "simple" changes can break things.
