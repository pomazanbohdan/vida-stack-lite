---
instruction_id: guess-the-follow-through-and-ask-before-doing-it
title: Guess the follow-through and ask before doing it
summary: The wrap-up names the likely follow-through of the work and waits for the reviewer to authorize it.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy
conditions_applies_when: Every block of the review has been gone through.
conditions_does_not_apply_when: "Blocks remain, or the reviewer already said what the follow-through is."
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the guessed follow-through
  - the question asked about it
artifact_contract_verified_by: the follow-through did not happen before the reviewer said so
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/step-03-walkthrough.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Guess the follow-through and ask before doing it
When every block has been gone through, suggest wrap-up.
The review is finished. Guess the follow-through this work was for (e.g. merge the PR, write the review, commit and push if they edited) and ask the user if that is what they want. Do not do it until they say so.
Do not end with only a summary in chat.
