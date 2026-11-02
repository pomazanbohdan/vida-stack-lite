---
instruction_id: ask-why-the-truth-holds-and-declare-the-hidden-precondition
title: Ask why the truth holds and declare the hidden precondition
summary: A verified truth is asked why it holds; a truth that holds incidentally is qualified and the hidden assumption is promoted to a declared precondition.
capability_tags:
  - verify-work-results
pattern_tags:
  - adversarial-self-review
conditions_applies_when: A truth has been marked as verified.
conditions_does_not_apply_when: The truth did not reach the verified state.
artifact_contract_output_type: reliance-qualification
artifact_contract_required_data:
  - why the truth holds
  - the reason it is incidental
  - the precondition to declare
artifact_contract_verified_by: every verified truth is asked why it holds and the incidental ones are qualified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/verification-report.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Ask why the truth holds and declare the hidden precondition
**Filling this column — apply the reliance check to every `✓ VERIFIED` truth before writing the row.** Ask why the truth holds and classify the evidence you already recorded, not your confidence in it.
The usual fix is to promote the hidden assumption into a declared precondition.
