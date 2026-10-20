---
instruction_id: say-that-the-run-is-uncontained
title: Say that the run is uncontained
summary: "The run bypasses the permission prompts and is not contained unless the command wraps it in a sandbox, and the confirmation says so."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A confirmation is given before an agent run that is asked to execute without prompts.
conditions_does_not_apply_when: The command wraps the run in a sandbox of its own.
artifact_contract_output_type: run-disclosure
artifact_contract_required_data:
  - the harness command
  - the fact that permission prompts are off
  - the fact that the run is not contained
artifact_contract_verified_by: the confirmation names the harness command and says that the run is uncontained
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/harness.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/SKILL.md
status: active
revision: 1
---

# Say that the run is uncontained
A run bypasses your permission prompts and is not contained unless the command wraps it in a sandbox, so say that when confirming a run.
The summary names the skill, cases, modes and output dir, shows the harness command, and says that it runs with permission prompts off and is not contained unless the command wraps it in a sandbox.
