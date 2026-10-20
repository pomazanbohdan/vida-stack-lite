---
instruction_id: keep-the-quality-bar-as-a-rising-floor
title: Keep the quality bar as a rising floor
summary: "The bar is a floor that only rises: agents may not weaken it, the diff is inspected for weakening, today measured values become the new floor, and a gate the user disagrees with is corrected now."
capability_tags:
  - define-quality-bar
pattern_tags:
  - quality-bar-contract
conditions_applies_when: An agreed quality bar is in force and a change is about to pass it.
conditions_does_not_apply_when: The bar is being written for the first time.
artifact_contract_output_type: floor-record
artifact_contract_required_data:
  - the measured values of today
  - the weakening found in the diff
  - the floor that must not fall
  - the gate that was corrected
artifact_contract_verified_by: "the diff shows no lowered threshold, skipped test, suppression comment, stub or new exception"
compatibility_excludes: []
compatibility_requires:
  - write-the-quality-bar-as-a-floor-with-exceptions
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/constraints.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=docs/adoption-guide.md
status: active
revision: 1
---

# Keep the quality bar as a rising floor
6. **Point the agent at it.** Add a line to the rules file
telling agents to read CONSTRAINTS.md and never weaken it to make a change pass.
7. **Verify.** Run the constraints against the current branch. If anything fails that the user disagrees with, fix the constraint now rather than leaving a gate people will learn to ignore.
- guard — inspect the diff for a weakened bar: lowered thresholds, skipped or deleted tests, new suppression comments, unfinished stubs, new exceptions
- ratchet — record today's measured values as the floor that must not fall
- **Ratcheting nothing.** Adoption should make quality monotonically better: each phase adds a gate that doesn't come back off. If a month in you can't name what's now enforced that wasn't before, the rollout has stalled.
