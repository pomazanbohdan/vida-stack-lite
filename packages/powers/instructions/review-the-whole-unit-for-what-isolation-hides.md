---
instruction_id: review-the-whole-unit-for-what-isolation-hides
title: Review the whole unit for what isolation hides
summary: "Judge the finished unit against its own acceptance criteria, because the defects that survive per-item review are the ones isolation hides."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A unit made of several separately built items is finished and must be accepted as a whole.
conditions_does_not_apply_when: The work is a single item that was already reviewed on its own.
artifact_contract_output_type: whole-unit-review
artifact_contract_required_data:
  - "the unit's acceptance criteria"
  - the combined diff
  - the verdict
artifact_contract_verified_by: the unit is judged against its own criteria from the combined diff and commits
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/finish-an-epic.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/plan/plan-inside-an-organization.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Review the whole unit for what isolation hides
An epic ships as a stack of tickets, each built and reviewed on its own.
Each ticket passed its own review in isolation, so the bugs that survive to this point are the ones isolation hides.
Nine sessions each add a little to the same file, and none of them ever sees the oversized module they built together.
No session judged the epic as a whole against what it set out to deliver either.
The end of an epic is the moment to close that gap: the diff is fresh and the session logs have not been cleared.
Run integration checks and a retrospective at every epic boundary, not only at the end.
