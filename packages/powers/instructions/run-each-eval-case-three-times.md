---
instruction_id: run-each-eval-case-three-times
title: Run each evaluation case three times
summary: "Firing and output are probabilistic, so one run proves little: run every case three times, and treat a result that holds on one run out of three as a lead to follow, not a pass."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A skill or an instruction is measured against cases and the result decides whether it stays.
conditions_does_not_apply_when: The check is deterministic and cannot vary between runs.
artifact_contract_output_type: evaluation-run
artifact_contract_required_data:
  - the case
  - the number of runs
  - the passes per case
artifact_contract_verified_by: "the verdict rests on every run of the case, not on one of them"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/evals.md
status: active
revision: 1
---

# Run each evaluation case three times
Firing and output are probabilistic, so one run proves little.
Three runs per case is the floor; more when the user wants a variance figure or a difference between two versions.
A pass that holds on every run is a pass; one that holds on one run out of three is a lead to follow.
