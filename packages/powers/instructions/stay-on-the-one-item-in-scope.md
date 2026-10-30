---
instruction_id: stay-on-the-one-item-in-scope
title: Stay on the one item in scope
summary: "One invocation works one item: it never reads another entry and never moves to a different item, whatever the outcome."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The request names one item of work.
conditions_does_not_apply_when: The request names several items to be worked in sequence.
artifact_contract_output_type: scope-boundary
artifact_contract_required_data:
  - the item in scope
  - the items left untouched
artifact_contract_verified_by: no other item was read and the run never moved to a different one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-01-clarify-and-route.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/autonomous-development-loops.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Stay on the one item in scope
One ticket per invocation: never read another entry, and never advance to a different ticket regardless of outcome.
The main input is the invocation prompt.
It treats that prompt as workflow input, not as a finished implementation plan.
