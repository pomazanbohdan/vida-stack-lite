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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/evals.md
status: active
revision: 1
---

# Run each case in a clean environment
Each case then runs in a clean working directory with a copy of the skill and a fresh HOME, so the user's own skills, memory and settings do not leak into the result.
The run bypasses the CLI's permission prompts, because nobody is there to answer them
Runs are never deleted or overwritten, so a skill's history stays comparable.
