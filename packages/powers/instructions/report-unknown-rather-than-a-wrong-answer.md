---
instruction_id: report-unknown-rather-than-a-wrong-answer
title: Report unknown rather than a wrong answer
summary: "When freshness cannot be established, the answer is unknown; a wrong freshness answer is worse than none, so the stamp is left out instead of guessed."
capability_tags:
  - verify-work-results
pattern_tags:
  - claim-freshness-window
conditions_applies_when: The freshness of a record is being reported and the history does not answer it.
conditions_does_not_apply_when: The history answers it unambiguously.
artifact_contract_output_type: unknown-freshness
artifact_contract_required_data:
  - the thing whose freshness is unknown
  - the answer that is reported
  - why the stamp is omitted
artifact_contract_verified_by: the answer was reported as unknown and no unverifiable stamp was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/state-md.md
status: active
revision: 1
---

# Report unknown rather than a wrong answer
- an unverifiable stamp degrades to absent rather than asserting provenance the file does not have.
- a wrong answer here is worse than no answer.
