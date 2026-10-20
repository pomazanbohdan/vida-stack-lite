---
instruction_id: sequence-verifiable-units
title: Sequence work into verifiable units
summary: "Order work as a sequence of small units, each ending in a state you can check, and do not advance until the current one is green."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The work is larger than one verifiable change.
conditions_does_not_apply_when: The work fits in one change with one check.
artifact_contract_output_type: unit-sequence
artifact_contract_required_data:
  - units
  - result of each unit
  - check
  - dependencies
artifact_contract_verified_by: each unit checked before the next one starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-sequence-verifiable-units/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/feature.md
status: active
revision: 1
---

# Sequence work into verifiable units
Order work as a sequence of small units, each ending in a state you can check.
Do not advance until the current one is green.
A break caught at the unit that caused it is cheap to localize.
A break caught after a batch is buried, and you have already built further on a broken base.
In a sweep, migration, or any run of similar edits, verify each change before starting the next.
Each unit is a before/after bracket: known-good state, one change, run the check, then proceed.
Rebase onto clean trunk first so every check measures against the real baseline.
When a lever does the edits, the per-unit check is nearly free; run it anyway.
In delivery, stack commits and pull requests in the order that proves the work.
The canonical shape is the failing test first, then the fix on top.
Other story orders are a subtraction before the reshape, a baseline capture before the treatment, the scaffold before the feature.
Each commit lands on its own and the sequence reads as an argument.
Sequencing those same units into a delivery a reviewer can replay turns "trust me" into "watch it go red, then green."
It complements keeping each check real and making the per-unit check cheap.
