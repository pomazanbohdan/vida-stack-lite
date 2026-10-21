---
instruction_id: show-the-expected-outcome-and-ask-whether-reality-matches
title: Show the expected outcome and ask whether reality matches
summary: "Each checkpoint is presented as what should happen, and the person answers in plain words; there are no pass buttons and no severity questions."
capability_tags:
  - guide-a-human-review
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A person walks through the built behaviour with the agent.
conditions_does_not_apply_when: The behaviour is verified by a check alone.
artifact_contract_output_type: checkpoint
artifact_contract_required_data:
  - the expected outcome
  - "the person's answer"
artifact_contract_verified_by: the expected outcome was shown and the answer was taken in plain words
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work.md
status: active
revision: 1
---

# Show the expected outcome and ask whether reality matches
**Show expected, ask if reality matches.**
User confirms or describes what's different.
One test at a time. Plain text responses.
No Pass/Fail buttons. No severity questions. Just: "Here's what should happen. Does it?"
