---
instruction_id: separate-refactoring-from-feature-work
title: Separate refactoring from feature work
summary: "Submit a refactoring and the new behaviour it carries as two changes, never as one mixed change."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: A change both restructures existing code and adds or changes behaviour.
conditions_does_not_apply_when: The change is a small cleanup such as a variable rename.
artifact_contract_output_type: change-separation-decision
artifact_contract_required_data:
  - the refactoring part
  - the behaviour part
  - how they were separated
artifact_contract_verified_by: the refactoring and the behaviour are in separate changes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-review-and-quality/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-simplification/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/git-workflow-and-versioning/SKILL.md
status: active
revision: 1
---

# Separate refactoring from feature work

A change that refactors existing code and adds new behavior is two changes — submit them separately. Small cleanups (variable renaming) can be included at reviewer discretion.

A PR that refactors and adds a feature is two PRs — split them.

This makes each change easier to review, revert, and understand in history.
