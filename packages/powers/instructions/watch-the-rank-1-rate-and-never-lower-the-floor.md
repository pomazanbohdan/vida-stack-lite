---
instruction_id: watch-the-rank-1-rate-and-never-lower-the-floor
title: Watch the rank-1 rate and never lower the floor
summary: "The rate that matters is the share of positive prompts that rank their skill first; the floor keeps headroom, rises as routing improves and is never lowered to make a regression pass."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A trigger check runs over a catalogue of skills and reports a rank-1 rate.
conditions_does_not_apply_when: The check reports only pass or fail with no rate.
artifact_contract_output_type: routing-metric
artifact_contract_required_data:
  - the rank-1 rate
  - the floor in force
  - the direction of the change
artifact_contract_verified_by: the floor was never lowered to make a regression pass
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=evals/README.md
status: active
revision: 1
---

# Watch the rank-1 rate and never lower the floor
The routing run
prints a **trigger rank-1 rate** (share of positive prompts that rank their skill first, not merely top-k).
CI runs with
the routing floor at 95, leaving useful headroom below the checked-in 100% baseline so an unrelated description edit does not immediately turn CI red.
Raise the floor as routing improves; never lower it to make a regression pass.
Falling numbers mean descriptions are drifting toward each other.
