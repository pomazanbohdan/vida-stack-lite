---
instruction_id: record-the-mismatch-between-two-sources-instead-of-picking-one
title: Record the mismatch between two sources instead of picking one
summary: "When the first answer disagrees with an independent second source, both numbers and the disagreement are written down; one of them is not silently chosen."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A claim about the environment comes from a tool that can disagree with the filesystem.
conditions_does_not_apply_when: There is no second source to check against.
artifact_contract_output_type: cross-checked-claim
artifact_contract_required_data:
  - the first answer
  - the second answer
  - the recorded mismatch
artifact_contract_verified_by: a disagreement is recorded next to the claim and no side of it was dropped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ui-researcher.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ui-researcher.compact.md
status: active
revision: 1
---

# Record the mismatch between two sources instead of picking one
**Cross-check the first answer — always.** A tool's count is a claim, not a fact
If the two disagree — including a tool that reports none while files exist — do not pick one silently. Record the larger, filesystem-backed count with the command that produced it, and add a line directly under the provenance line: `Mismatch: <tool> reported <A>, filesystem has <B>.`
