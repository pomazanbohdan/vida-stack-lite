---
instruction_id: run-each-case-in-a-clean-room
title: Run each case in a clean room
summary: "Every case runs in an environment built from scratch, so host configuration, earlier runs, the project instructions and the installed skills cannot bias the result."
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: A case is run to see what a skill or an agent actually produces.
conditions_does_not_apply_when: The run deliberately continues the state of an earlier session.
artifact_contract_output_type: isolated-run
artifact_contract_required_data:
  - the empty workspace the case ran in
  - the environment it was given
artifact_contract_verified_by: nothing outside the case was present in the workspace or the home directory it ran with
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/harness.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Run each case in a clean room
Each case runs in a clean room, a temporary folder outside the project with a copy of the skill staged into its workspace and an environment built from scratch, so host config, prior runs, the project's instruction files and its installed skills cannot bias the result.
The runner starts it once per case from an empty workspace in a fresh HOME, with the skill under test copied where the CLI reads skills, stdin closed and output captured.
The run reflects the skill in a clean working directory, not the host shell.
