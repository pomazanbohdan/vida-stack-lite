---
instruction_id: cut-the-section-that-does-no-work
title: Cut the section that does no work
summary: "Strip the suspected ceremony out of the instruction and compare; if the output is the same, the section is decoration and gets cut."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A section of an instruction is suspected of being ceremony rather than work.
conditions_does_not_apply_when: The section is the only place the behaviour is stated.
artifact_contract_output_type: section-ablation
artifact_contract_required_data:
  - the stripped variant
  - the dimension the section was supposed to protect
  - the verdict
artifact_contract_verified_by: the verdict says whether the stripped variant ties or is durably worse on the protected dimension
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/eval-format.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Cut the section that does no work
Run the full skill against a stripped smallest-version of the same skill
or against a snapshot of the prior version for an edit, on the same input.
It settles whether a section suspected of being ceremony does real work.
If the two outputs tie on the dimension the section was supposed to protect, the section is decoration and gets cut.
If the small version is materially and durably worse, the section earned its keep.
