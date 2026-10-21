---
instruction_id: fall-back-to-the-other-input-when-the-first-is-empty
title: Fall back to the other input when the first is empty
summary: "When the first source of data holds nothing, the run switches to the other one instead of reporting an empty result."
capability_tags:
  - profile-the-working-style
pattern_tags:
  - graceful-degradation
conditions_applies_when: The first source of data turns out to be empty.
conditions_does_not_apply_when: The first source produced data.
artifact_contract_output_type: fallback-notice
artifact_contract_required_data:
  - the source that was empty
  - the source that was used instead
artifact_contract_verified_by: the run continued on the other source and said which one it used
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/profile-user.md
status: active
revision: 1
---

# Fall back to the other input when the first is empty
Display: "No sessions found. Switching to questionnaire."
The fallback is announced.
