---
instruction_id: scope-a-simplification-pass-to-what-changed
title: Scope a simplification pass to what changed
summary: Simplify the recently modified code by default and leave unrelated code alone unless the scope is widened on purpose.
capability_tags:
  - simplify-code
pattern_tags:
  - code-minimization
conditions_applies_when: A simplification pass is started on a codebase or a module.
conditions_does_not_apply_when: "The code is already clean, the code is not yet understood, the simpler version would be measurably slower, or the module is about to be rewritten entirely."
artifact_contract_output_type: simplification-scope
artifact_contract_required_data:
  - the code in scope
  - the code deliberately left alone
  - the widened scope when it was widened
artifact_contract_verified_by: the diff contains no change outside the agreed scope
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-simplification/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Scope a simplification pass to what changed

Default to simplifying recently modified code. Avoid drive-by refactors of unrelated code unless explicitly asked to broaden scope. Unscoped simplification creates noise in diffs and risks unintended regressions.

"I'll just quickly simplify this unrelated code too" | Unscoped simplification creates noisy diffs and risks regressions in code you didn't intend to change. Stay focused.

Refactoring code outside the scope of the current task without being asked
