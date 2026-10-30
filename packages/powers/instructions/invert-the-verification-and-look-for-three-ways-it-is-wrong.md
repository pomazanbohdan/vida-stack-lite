---
instruction_id: invert-the-verification-and-look-for-three-ways-it-is-wrong
title: Invert the verification and look for three ways it is wrong
summary: "Instead of checking what is right, three specific ways the work could be wrong despite passing are listed and each gets a concrete check."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: An implementation passes its tests and is being verified.
conditions_does_not_apply_when: The verification is a re-check of items that already passed.
artifact_contract_output_type: inversion-list
artifact_contract_required_data:
  - the three ways it could be wrong
  - the concrete check for each
artifact_contract_verified_by: three failure modes were listed and each has a check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-verification.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Invert the verification and look for three ways it is wrong
Instead of checking what IS correct, list 3 specific ways this implementation could be WRONG despite passing tests: missing edge cases, silent data loss, race conditions, unhandled error paths. For each, write a concrete check (grep for pattern, test with specific input, verify error handling exists). Additionally, check whether any documented DEVIATION in SUMMARY.md changes the meaning or applicability of a must-have. If a must-have was written assuming approach A but the executor used approach B, the must-have may need reinterpretation, not literal checking
