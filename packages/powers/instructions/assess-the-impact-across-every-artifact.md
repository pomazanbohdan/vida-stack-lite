---
instruction_id: assess-the-impact-across-every-artifact
title: Assess the impact across every artifact
summary: "Replanning reads the ticket, its memlog, breakdown, finished children and the companions it touches, and records what the change reaches and what stays."
capability_tags:
  - assess-change-impact
pattern_tags:
  - change-impact-assessment
conditions_applies_when: A change significant enough to move the project direction is being assessed.
conditions_does_not_apply_when: "The change is local, reversible and touches no shared artifact."
artifact_contract_output_type: impact-assessment
artifact_contract_required_data:
  - the artifacts examined
  - the impact per artifact
  - the sections that need an update
artifact_contract_verified_by: every artifact that the change touches is named with the sections it needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-correct-course/checklist.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-correct-course/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
  - operations
---

# Assess the impact across every artifact
Replanning needs the record the change lands in: read the ticket, its `.memlog.md`, its breakdown, every finished child and its plan, and any architecture or design the ticket touches.
Say whether what is required changed or only how it is delivered. That answer routes the next step: a required change runs `spec.md`; a delivery change goes to re-slicing; a ticket that no longer belongs is dropped.
Check what the change reaches: the ticket's Requirements and Constraints, the `covers` ids of its children, their `after`, the architecture or design companion, and the tests that prove the affected behavior.
Record each artifact that must change and each that stays true.
