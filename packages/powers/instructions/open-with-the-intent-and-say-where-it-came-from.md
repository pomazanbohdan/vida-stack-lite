---
instruction_id: open-with-the-intent-and-say-where-it-came-from
title: Open with the intent and say where it came from
summary: "The first block says what the change is for and why it exists now, and names the source of that statement."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A writeup about a change opens and the intent of the change has to be stated.
conditions_does_not_apply_when: The intent was already stated and confirmed earlier in the same session.
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the intent of the change
  - the source of the intent
artifact_contract_verified_by: the block names where the intent came from and stays under 300 tokens when it was generated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/workflow.md
status: active
revision: 1
---

# Open with the intent and say where it came from
What the change is for and why it exists now.
If you found a target plan file with an intent section, paste it verbatim. Otherwise generate from what you know about the target, no more than 300 tokens. Include a short note on where you got it from.
