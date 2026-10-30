---
instruction_id: count-a-cut-as-a-loss-only-when-it-changes-the-action
title: Count a cut as a loss only when it changes the action
summary: "Cut the prose to the fewest words, and count a rule as lost only when you can name the different action the model would take without the line."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An existing instruction file is being shortened without losing a rule.
conditions_does_not_apply_when: The instruction is being written for the first time.
artifact_contract_output_type: instruction-cut
artifact_contract_required_data:
  - the removed sentences
  - the named loss
  - the diff for review
artifact_contract_verified_by: each loss names the different action and the human commits what they accept
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/toolsmith/modes.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body evaluates instruction edits but does not ground that editing rule in any supported domain.
---

# Count a cut as a loss only when it changes the action
It drops sentences the model does not need, trims the words inside sentences that carry nothing, and recasts a passage that spends lines on a nudge as the few words that give it.
It removes worked examples first, keeping one only when a one-line format cannot show the same shape.
A checker compares each file with its old version and lists a loss only when it can name the different action the model would take without the line, and points to passages that fewer words would say as well.
There is no percentage to hit: a lean skill comes back nearly unchanged, and a bloated one comes back much shorter.
You read the diff and commit what you accept.
