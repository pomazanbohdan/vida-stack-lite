---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmod-toolsmith-help-evals-md-26f96d35-c01"
title: "bmad-method: skills/bmod-toolsmith/help/evals.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmod-toolsmith/help/evals.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmod-toolsmith/help/evals.md\"}"
atom_ids:
  - run-each-case-in-a-clean-environment
  - run-each-eval-case-three-times
atom_count: 2
atoms: "[{\"atom_id\":\"run-each-case-in-a-clean-environment\",\"file_sha256\":\"114fccbe8ff05a70af87ebae65426b60a24abdca6fbc086df18e36e0e08ef3fd\",\"content_sha256\":\"927a891a24a37ee20e37205b0f7c2c1c56e3dad2ae4446fe2825a0a197e32836\",\"file_bytes\":1530,\"body_bytes\":370},{\"atom_id\":\"run-each-eval-case-three-times\",\"file_sha256\":\"9b5f0b005ada6a7c1b04d6ea80808294c0fbd1faad625c3d9c72a9b166f3fcc2\",\"content_sha256\":\"18e51cddba9c5c45490e1b2e8bcdd76cfa0d368a3730117515cb36c319509e29\",\"file_bytes\":1462,\"body_bytes\":319}]"
carrier_sha256: 437493103d6e8c5ed3f57e797985a7e8abf589a197f55361ed09215e538a9389
carrier_bytes: 3239
revision: 1
status: active
---
<!-- vpmodule:atom:begin run-each-case-in-a-clean-environment -->
---
instruction_id: run-each-case-in-a-clean-environment
title: Run each case in a clean environment
summary: "Every case runs in a clean working directory with its own copy and a fresh home, so nothing from the user's own environment leaks into the result, and the runs are kept so the history stays comparable."
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: A skill or an instruction is run against cases and the result has to be trustworthy.
conditions_does_not_apply_when: The run is an interactive session with the user.
artifact_contract_output_type: evaluation-run
artifact_contract_required_data:
  - the case
  - the clean working directory
  - the fresh home
artifact_contract_verified_by: "nothing from the user's own environment leaks into the result"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/evals.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Run each case in a clean environment
Each case then runs in a clean working directory with a copy of the skill and a fresh HOME, so the user's own skills, memory and settings do not leak into the result.
The run bypasses the CLI's permission prompts, because nobody is there to answer them
Runs are never deleted or overwritten, so a skill's history stays comparable.
<!-- vpmodule:atom:end run-each-case-in-a-clean-environment -->
<!-- vpmodule:atom:begin run-each-eval-case-three-times -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-toolsmith/help/evals.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Run each evaluation case three times
Firing and output are probabilistic, so one run proves little.
Three runs per case is the floor; more when the user wants a variance figure or a difference between two versions.
A pass that holds on every run is a pass; one that holds on one run out of three is a lead to follow.
<!-- vpmodule:atom:end run-each-eval-case-three-times -->