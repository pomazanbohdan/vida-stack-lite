---
instruction_id: frame-the-experiment-as-a-given-when-then-question
title: Frame the experiment as a given-when-then question
summary: "An idea is broken into a few independent feasibility questions, each framed as a given-when-then condition with an observable outcome."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: An idea has to be turned into experiments that can answer something.
conditions_does_not_apply_when: The question is already framed and observable.
artifact_contract_output_type: experiment-set
artifact_contract_required_data:
  - the questions
  - the given-when-then framing
  - the observable outcome
artifact_contract_verified_by: "every question is narrow, framed as a condition and ends in an observable outcome"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spike.md
status: active
revision: 1
---

# Frame the experiment as a given-when-then question
Break the idea into 2-5 independent questions. Frame each as Given/When/Then.
Good spikes: specific feasibility questions with observable output.
Bad spikes: too broad, no observable output, or just reading/planning.
