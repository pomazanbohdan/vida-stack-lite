---
instruction_id: help-the-reviewer-test-and-drive-the-target
title: Help the reviewer test and drive the target
summary: "Help test the part under discussion: name the useful checks, run what you can, and drive the app so the reviewer sees it work."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The reviewer picks the move that tests the part under discussion.
conditions_does_not_apply_when: The reviewer picked a move that does not exercise the target.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the useful checks and their expected behavior
  - the observations that needed the reviewer
artifact_contract_verified_by: "the checks that could be run were run, and the ones that needed the reviewer are named"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
---

# Help the reviewer test and drive the target
Help test the part under discussion. Identify useful checks and expected behavior, run what you can, and guide the user through observations that need them.
Drive: Start the app and tell the user which buttons to push to see the target do its thing.
