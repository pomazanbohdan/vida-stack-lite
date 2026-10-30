---
instruction_id: gate-the-plan-on-the-readiness-standard
title: Gate the plan on the readiness standard
summary: "A plan is ready only when it is actionable, logical, testable, complete, sufficient and coherent; anything missing is fixed or asked about, never invented."
capability_tags:
  - plan-implementation
pattern_tags:
  - completion-criteria
conditions_applies_when: A plan has been written and is about to be handed over for approval.
conditions_does_not_apply_when: The plan is a draft that is still being written.
artifact_contract_output_type: plan-readiness-check
artifact_contract_required_data:
  - the six readiness properties
  - what is missing for each of them
  - the fix or the open question raised for each gap
artifact_contract_verified_by: every property of the standard is checked and each gap is either fixed in the plan or recorded as an open question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/workflow.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-02-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Gate the plan on the readiness standard

A plan is "Ready for Development" when:

**Actionable**: Every task has a file path and specific action.

**Logical**: Tasks ordered by dependency.

**Testable**: All ACs use Given/When/Then, and each is a check the implementer can prove it met without pointing at code.

**Complete**: No placeholders or TBDs.

**Sufficient**: No known requirement, acceptance, dependency, or implementation gaps remain unresolved.

**Coherent**: No unresolved ambiguities or internal contradictions.

Implementation should work from the plan without being told the investigation again.

Self-review against READY FOR DEVELOPMENT standard. For anything important that's missing: if the repository can tell you, go look and fix the plan; if a human has to decide, add an `## Open Questions` entry. Do not invent the answer.
