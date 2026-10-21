---
instruction_id: flag-the-gap-the-codebase-cannot-answer-instead-of-researching-it
title: Flag the gap the codebase cannot answer instead of researching it
summary: A question the repository cannot answer is listed as a gap; the scope of the work is not widened to close it.
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: A question arises that the code alone cannot settle.
conditions_does_not_apply_when: External sources are part of the assigned task.
artifact_contract_output_type: assumption-list
artifact_contract_required_data:
  - the flagged gap
  - the scope boundary
artifact_contract_verified_by: the gap is listed and no out-of-scope research was performed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-assumptions-analyzer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-assumptions-analyzer.compact.md
status: active
revision: 1
---

# Flag the gap the codebase cannot answer instead of researching it
Flag any topics that need external research (library compatibility, ecosystem best practices)
Do NOT research beyond what the codebase contains (flag gaps in "Needs External Research")
Do NOT suggest scope expansion -- stay within the phase boundary.
