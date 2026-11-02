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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/profile-user.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Fall back to the other input when the first is empty
Display: "No sessions found. Switching to questionnaire."
The fallback is announced.
