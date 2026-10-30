---
instruction_id: apply-the-definition-of-done-to-every-change
title: Apply the definition of done to every change
summary: "Every change clears the project-wide bar: tests pass, no regressions, the behaviour is verified at runtime and the documentation is updated."
capability_tags:
  - verify-work-results
pattern_tags:
  - completion-criteria
conditions_applies_when: "Any change is about to be called done, whatever workflow produced it."
conditions_does_not_apply_when: "The work changes no runtime behaviour, such as a comment-only edit."
artifact_contract_output_type: definition-of-done-check
artifact_contract_required_data:
  - the test result
  - the regression check
  - the runtime verification
  - the documentation update
artifact_contract_verified_by: all four items of the bar are met and the task acceptance criteria were met as well
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/using-agent-skills/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Apply the definition of done to every change

## Verify, Don't Assume

Every skill includes a verification step. A task is not complete until verification passes. "Seems right" is never sufficient — there must be evidence (passing tests, build output, runtime data).

Per-skill verification is the local check. The project-wide bar that applies to *every* change, regardless of which skill is active, is the Definition of Done: tests pass, no regressions, behavior verified at runtime, docs updated. It complements each task's acceptance criteria rather than replacing them.
