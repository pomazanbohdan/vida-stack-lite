---
instruction_id: present-the-next-block-before-recording-the-previous-one
title: Present the next block before recording the previous one
summary: "When a block is done, the next block comes first so the reviewer can keep going, and the previous one is recorded silently afterwards."
capability_tags:
  - guide-a-human-review
pattern_tags:
  - approval-policy
conditions_applies_when: The reviewer has said that a block is done and more blocks remain.
conditions_does_not_apply_when: No further block remains after the one that was accepted.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the next block
  - the updated state of the previous block
artifact_contract_verified_by: the next block was offered before the previous block was checked in the narrative
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
  - design-ux
  - operations
---

# Present the next block before recording the previous one
When they say the block is done:
- present the next block first so they can keep going.
- then record that the previous block is done: check it in the narrative silently, and revise the remaining narrative if it needs to change.
