---
instruction_id: add-visibility-before-you-change-behaviour
title: Add visibility before you change behaviour
summary: Logging and assertions are added and the code is run first; only then is a hypothesis formed and a change made.
capability_tags:
  - instrument-production-code
pattern_tags:
  - structured-observability
conditions_applies_when: A fix is about to be written for a defect that is not yet understood.
conditions_does_not_apply_when: The cause is already proven and only the change is left.
artifact_contract_output_type: observation-pass
artifact_contract_required_data:
  - the visibility that was added
  - the observed output
  - the hypothesis formed from it
artifact_contract_verified_by: the code was run and observed before any behavior was changed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/debugger-techniques.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Add visibility before you change behaviour
When: Always. Before making any fix.
Add visibility before changing behavior:
Workflow: Add logging -> Run code -> Observe output -> Form hypothesis -> Then make changes.
