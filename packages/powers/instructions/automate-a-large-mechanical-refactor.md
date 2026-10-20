---
instruction_id: automate-a-large-mechanical-refactor
title: Automate a large mechanical refactor
summary: "Above five hundred touched lines, drive the change with codemods or transforms instead of by hand."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: A refactoring would touch more than five hundred lines.
conditions_does_not_apply_when: The refactoring is small enough to edit and review by hand.
artifact_contract_output_type: refactor-automation-decision
artifact_contract_required_data:
  - the lines the refactoring touches
  - the automation chosen
  - the manual-edits risk avoided
artifact_contract_verified_by: a refactor over the threshold was driven by a script rather than by hand
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-simplification/SKILL.md
status: active
revision: 1
---

# Automate a large mechanical refactor

**The Rule of 500:** If a refactoring would touch more than 500 lines, invest in automation (codemods, sed scripts, AST transforms) rather than making the changes by hand. Manual edits at that scale are error-prone and exhausting to review.
