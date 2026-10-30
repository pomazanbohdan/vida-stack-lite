---
instruction_id: stop-the-repetition-and-the-fake-disagreement
title: Stop the repetition and the fake disagreement
summary: "Make the room raise objections, check claims and stop the repetition, and return the decision to the human instead of taking a vote."
capability_tags:
  - disagree-with-reasons
pattern_tags:
  - reasoned-disagreement
conditions_applies_when: A multi-voice discussion starts repeating itself or agreeing too easily.
conditions_does_not_apply_when: A single reviewer is judging a change.
artifact_contract_output_type: room-discipline
artifact_contract_required_data:
  - the objection raised
  - the claim checked
  - the decision returned
artifact_contract_verified_by: the room raised objections and returned the decision instead of taking a vote
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/customize/run-multi-agent-discussions.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
  - operations
---

# Stop the repetition and the fake disagreement
It is not a voting body: it raises objections, checks claims, stops repetition, and returns the decision to you.
Option generator — suggests alternative problem statements, assumptions, and examples.
Claim checker — checks support, missing information, and confidence.
Loop stopper — stops repetition, fake disagreement, and unsupported speculation.
Consensus challenger — questions easy agreement and ignored tradeoffs.
