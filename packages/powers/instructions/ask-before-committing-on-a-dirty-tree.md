---
instruction_id: ask-before-committing-on-a-dirty-tree
title: Ask before committing on a dirty tree
summary: "A dirty tree is a question for the reviewer, not a decision for you."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - approval-policy
conditions_applies_when: A block is accepted while the working tree still holds uncommitted changes.
conditions_does_not_apply_when: "The working tree is clean, or the reviewer already asked for the commit."
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the state of the tree
  - the question asked about committing
artifact_contract_verified_by: the commit happens only after the reviewer answered the question
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
---

# Ask before committing on a dirty tree
If the tree is dirty, ask the user whether to commit.
A dirty tree is generally undesirable; the user can still move on.
