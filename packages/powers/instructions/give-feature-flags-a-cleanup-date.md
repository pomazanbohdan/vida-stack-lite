---
instruction_id: give-feature-flags-a-cleanup-date
title: Give a feature flag a cleanup date
summary: "Ship the code without enabling it, and remove the flag and the dead code when the rollout is done."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - automated-enforcement
conditions_applies_when: You introduce a feature flag.
conditions_does_not_apply_when: The behaviour is switched on permanently from the start.
artifact_contract_output_type: flag-lifecycle
artifact_contract_required_data:
  - the lifecycle stage
  - the cleanup date
artifact_contract_verified_by: the flag and its dead code are removed by the cleanup date
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/ci-cd-and-automation/SKILL.md
status: active
revision: 1
---

# Give a feature flag a cleanup date
Feature flags decouple deployment from release. Deploy incomplete or risky features behind flags so you can:

- **Ship code without enabling it.** Merge to main early, enable when ready.
- **Roll back without redeploying.** Disable the flag instead of reverting code.
- **Canary new features.** Enable for 1% of users, then 10%, then 100%.
- **Run A/B tests.** Compare behavior with and without the feature.

**Flag lifecycle:** Create → Enable for testing → Canary → Full rollout → Remove the flag and dead code. Flags that live forever become technical debt — set a cleanup date when you create them.
