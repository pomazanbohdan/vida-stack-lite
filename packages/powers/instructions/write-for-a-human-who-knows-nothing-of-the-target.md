---
instruction_id: write-for-a-human-who-knows-nothing-of-the-target
title: Write for a human who knows nothing of the target
summary: The reader knows the context but nothing about the target beyond what this session has said.
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A session output or a review narrative is written for a human reader.
conditions_does_not_apply_when: The text is written for another agent that will read the raw sources itself.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the text the human reads
artifact_contract_verified_by: the text names nothing the session has not already mentioned
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/workflow.md
status: active
revision: 1
---

# Write for a human who knows nothing of the target
The session output and the review narrative file are for a human.
Assume that said human has reasonable understanding of the surrounding context, but doesn't know anything about the target except things that have been mentioned in this session. Leave the brief log style to the log.
