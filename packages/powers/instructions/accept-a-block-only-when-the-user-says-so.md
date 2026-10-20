---
instruction_id: accept-a-block-only-when-the-user-says-so
title: Accept a block only when the user says so
summary: "A walkthrough block is finished when the reviewer says it is, never because the work on it is done."
capability_tags:
  - guide-a-human-review
pattern_tags:
  - approval-policy
conditions_applies_when: A guided review walks a human through a body of work one block at a time.
conditions_does_not_apply_when: The work is not paced by a human reviewer in the loop.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the block list
  - the acceptance state of each block
  - the current block
artifact_contract_verified_by: a block is checked only after the user has said it is done
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/workflow.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/step-02-narrative.md
status: active
revision: 1
---

# Accept a block only when the user says so
Guide a human review of a target, one block at a time. They may stop to inspect, edit, or test.
Keep track of which blocks the user has called done. A block or the review as a whole is done only when the user says it is.
Use unchecked boxes for unvisited, in-progress, or reopened blocks, labeling their state; check a block when the user indicates they are satisfied with it.
Work performed on a block does not itself mean it is accepted.
