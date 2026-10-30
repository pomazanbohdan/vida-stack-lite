---
instruction_id: check-the-authors-verification-story
title: "Check the author's verification story"
summary: "Ask what was actually run, what passed, what was tested by hand and what the comparison shows."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review must judge the evidence behind a completed change.
conditions_does_not_apply_when: The author has already supplied the verification evidence.
artifact_contract_output_type: verification-story
artifact_contract_required_data:
  - the tests that were run
  - the build result
  - the manual verification
  - the visual evidence
artifact_contract_verified_by: "every claim of verification is answered by a run, not by an assertion"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-review-and-quality/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Check the author's verification story

Check the author's verification story:

- What tests were run?
- Did the build pass?
- Was the change tested manually?
- Are there screenshots for UI changes?
- Is there a before/after comparison?
