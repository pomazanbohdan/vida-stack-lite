---
instruction_id: never-fabricate-a-learning-or-a-sample
title: Never fabricate a learning or a sample
summary: "Only what the artefacts state is extracted; a phase that carries no estimate or no actuals is skipped rather than guessed, because a fabricated sample would steer every later estimate."
capability_tags:
  - never-invent-what-was-not-stored
pattern_tags:
  - evidence-analysis
conditions_applies_when: The artefacts are read and the items are extracted or counted.
conditions_does_not_apply_when: Nothing is extracted or counted.
artifact_contract_output_type: extraction-report
artifact_contract_required_data:
  - the items that were extracted
  - the samples that were skipped
  - the sample count and the confidence
artifact_contract_verified_by: no item and no sample was invented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/extract-learnings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never fabricate a learning or a sample
Do not fabricate learnings — only extract what is explicitly documented in artifacts
Phases missing either side are skipped rather than guessed: a fabricated sample would steer every future estimate.
The verb rebuilds from scratch each run, so it is safe to re-run and never accumulates duplicates.
