---
instruction_id: treat-an-empty-review-result-as-a-dropped-lane
title: Treat an empty review result as a dropped lane
summary: "An empty result from a slow reviewer is a timeout kill, not a crash and not a clean review: the lane is treated as dropped and re-run with more time, because a review that silently drops a lane is blind in one eye."
capability_tags:
  - review-code
pattern_tags:
  - empty-result-policy
conditions_applies_when: A reviewer returns nothing after a long run.
conditions_does_not_apply_when: The reviewer returned a report.
artifact_contract_output_type: dropped-lane
artifact_contract_required_data:
  - the dropped lane
  - the reason it is treated as dropped
  - the re-run
artifact_contract_verified_by: the lane was re-run rather than counted as a clean result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/review.md
status: active
revision: 1
---

# Treat an empty review result as a dropped lane
A silent empty output after a long run is a **timeout kill, not a crash**
Treat an empty result on a slow lane as a dropped lane and re-run with more time rather than diagnosing a CLI or sandbox failure
A cross-AI review that silently drops a lane is blind in one eye
