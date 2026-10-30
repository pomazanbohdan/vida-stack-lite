---
instruction_id: assume-the-submitted-code-is-defective-and-prove-it
title: Assume the submitted code is defective and prove it
summary: The review starts from the hypothesis that the code has defects and reports only what it can prove.
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: A body of submitted code is reviewed.
conditions_does_not_apply_when: The task is to confirm that a change works as specified.
artifact_contract_output_type: review-report
artifact_contract_required_data:
  - the proven defects
  - the evidence for each
artifact_contract_verified_by: every reported defect carries proof and none was softened because it looked harsh
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-reviewer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-reviewer.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Assume the submitted code is defective and prove it
Assume every submitted implementation contains defects.
Surface what you can prove.
Stopping at obvious surface issues (console.log, empty catch) and assuming the rest is sound
Treating "code compiles" or "tests pass" as evidence of correctness
Reading only the file under review without checking called functions for bugs they introduce
