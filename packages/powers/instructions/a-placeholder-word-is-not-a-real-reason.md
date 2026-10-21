---
instruction_id: a-placeholder-word-is-not-a-real-reason
title: A placeholder word is not a real reason
summary: "A required reason is read by a reviewer as the whole artifact: a placeholder such as \"fix\" or \"expected\" is rejected, and so is an empty one."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: "A record, a declaration or a note must carry a reason."
conditions_does_not_apply_when: The field is a value that is checked against a list rather than read as prose.
artifact_contract_output_type: reasoned-record
artifact_contract_required_data:
  - the reason
  - the record it explains
artifact_contract_verified_by: "the reason is a sentence a reviewer can act on, not a placeholder and not empty"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/acknowledge-emitted-drift.md
status: active
revision: 1
---

# A placeholder word is not a real reason
Write a real reason. "fix" or "expected" is not one — the reason is the whole artifact a reviewer reads, and an empty one is rejected.
