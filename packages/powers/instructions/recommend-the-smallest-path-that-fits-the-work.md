---
instruction_id: recommend-the-smallest-path-that-fits-the-work
title: Recommend the smallest path that fits the work
summary: "Recommend the smallest path that safely fits the work instead of walking through every step; the phases describe the kind of help given, not a sequence to complete, and the work is done when the intent is satisfied."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: "The next step for the user's work has to be chosen."
conditions_does_not_apply_when: The user has already chosen the step.
artifact_contract_output_type: next-step
artifact_contract_required_data:
  - the smallest path
  - what it covers
  - what it leaves out
artifact_contract_verified_by: the recommended path is the smallest one that safely fits the work
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/help.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Recommend the smallest path that fits the work
Recommend the smallest path that safely fits the work; never march the user through every skill.
The four phases are analysis (ideation, research, is it worth building), planning (what exactly, and in what slices), implementation (build it), and validation (is it right).
They describe what kind of help a skill gives.
They are not a mandatory sequence to complete.
The work is complete when the intent is satisfied, its chosen checks pass, and no chosen review leaves material findings open - not when every skill has run.
