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
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
---

# Help the reviewer test and drive the target
Test: Help test the part under discussion. Identify useful checks and expected behavior, run what you can, and guide the user through observations that need them. Suggest it when behavior is easier to check than to reason out, or the tests do not cover it.
Drive: Start the app and tell the user which buttons to push to see the target do its thing. Suggest it when the target is observable and the user has the app at hand.
Demo: Exercise the change yourself and show the user what happened — screenshots or a transcript, in a rendered view the host offers; say which. Save them in the walkthrough folder and link them from the log. Suggest it when the target is observable and the user would rather watch than drive.
Draw: Diagram the block's mechanism, showing only what the linked code does, in a rendered view the host offers; say which. Save the source in the walkthrough folder and link it from the log. Suggest it when the mechanism has several moving parts.
