---
instruction_id: merge-only-the-ready-prefix-of-a-wave
title: Merge only the ready prefix of a wave
summary: "Independent units are merged in the order the wave assignment gave them, and only the prefix that is actually ready merges in a round."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: Independent units are merged in dependency-ordered waves.
conditions_does_not_apply_when: There is a single unit and no wave order.
artifact_contract_output_type: merge-round
artifact_contract_required_data:
  - the wave order
  - the ready subset
  - the mergeable prefix
artifact_contract_verified_by: only the ready prefix of a wave was merged and an out-of-order finisher waited
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/merge-wave.md
status: active
revision: 1
---

# Merge only the ready prefix of a wave
Repeat until no wave has a mergeable prefix left
never re-sort it
an executor may still be mid-flight for a sibling in the same wave
merges happen strictly in wave order, an out-of-order finisher waits
the PREFIX of the wave order
If empty, skip this wave this round (its first item hasn't finished yet).
