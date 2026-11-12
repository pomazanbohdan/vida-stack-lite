---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-eval-skill-md-724b15a1-c01"
title: "bmad-method: skills/bmad-eval/SKILL.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmad-eval/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-eval/SKILL.md\"}"
atom_ids:
  - measure-the-trigger-by-whether-the-skill-fired
  - retire-the-skill-when-it-stops-beating-the-bare-model
  - run-each-case-in-a-clean-room
  - say-that-the-run-is-uncontained
atom_count: 4
atoms: "[{\"atom_id\":\"measure-the-trigger-by-whether-the-skill-fired\",\"file_sha256\":\"3161b6887a63beffeb6d710c0b9137bfe5f28fb26cfe44f8e3a839c9e7eff989\",\"content_sha256\":\"64a80b25ba915bfb2d6b82d67c3532b7ba68044c241f9f116347711fbb64255a\",\"file_bytes\":2389,\"body_bytes\":916},{\"atom_id\":\"retire-the-skill-when-it-stops-beating-the-bare-model\",\"file_sha256\":\"c662f4ee7f39995832e63ff9858be2d66af18d871aad4c69c610f2989edf7ed2\",\"content_sha256\":\"82eb1599ac0bfc0e9b9416d5a7cdc93cc44e08c7a8692295509c50e7a49e0699\",\"file_bytes\":1837,\"body_bytes\":589},{\"atom_id\":\"run-each-case-in-a-clean-room\",\"file_sha256\":\"9a42fcf73e1416bcf59a5672d98ea5fb5d4598c502f79acf288c1518da333dd3\",\"content_sha256\":\"d6fa8d07bc2174f15fd91a2c834c467904e93f2ab305f58ec182d1335bb97970\",\"file_bytes\":1802,\"body_bytes\":550},{\"atom_id\":\"say-that-the-run-is-uncontained\",\"file_sha256\":\"d81a8ff4bbc80ed1158554b7391a68ba56223c24372ca42760a79c242999b5d5\",\"content_sha256\":\"1874b892edc4356e3c094f50643e047c11a4fcb8cffebaf44408bfb9b5209c1c\",\"file_bytes\":1641,\"body_bytes\":369}]"
carrier_sha256: 885993b63dd21df4c5dc0502feba153674e94526cbe130f468b35cf0412fd177
carrier_bytes: 8218
revision: 1
status: active
---
<!-- vpmodule:atom:begin measure-the-trigger-by-whether-the-skill-fired -->
---
instruction_id: measure-the-trigger-by-whether-the-skill-fired
title: Measure the trigger by whether the skill fired
summary: "A trigger is measured by what the harness actually loaded, not by how the wording matches; an attempt that failed is unmeasured and rerun, never scored."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: The rate at which a skill fires is measured over a set of queries.
conditions_does_not_apply_when: Firing is known from the routing decision itself and needs no run.
artifact_contract_output_type: trigger-measurement
artifact_contract_required_data:
  - the per-query trigger rate
  - the threshold the rate is judged against
  - the verdicts against the labels
artifact_contract_verified_by: every scored query comes from completed runs that loaded the skill or did not
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/description-optimization.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/harness.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Measure the trigger by whether the skill fired
Trigger mode detects a load with a canary: the staged skill's body asks for a token at the start of the reply, and the token in the output is the load, on any CLI.
Run every query through the harness with the current description in place, several times per query because firing is probabilistic.
The trigger rate for a query is the fraction of completed runs that loaded the skill; a query with a failed attempt is unmeasured and rerun, never scored.
Turn each rate into a verdict against a threshold (a query "triggers" when its rate clears the bar, for example more than half its runs loaded the skill), then score against the labels:
A result from fewer than 3 runs per case (or per trigger query) is reported as a quick look, never as settled.
Token counts are read when the output is line-delimited JSON with usage blocks; otherwise elapsed time is the measure.
<!-- vpmodule:atom:end measure-the-trigger-by-whether-the-skill-fired -->
<!-- vpmodule:atom:begin retire-the-skill-when-it-stops-beating-the-bare-model -->
---
instruction_id: retire-the-skill-when-it-stops-beating-the-bare-model
title: Retire the skill when it stops beating the bare model
summary: "The bare model is the floor a skill has to beat; the day it stops beating it, the answer is retirement, not another patch."
capability_tags:
  - design-experiments
pattern_tags:
  - metric-gated-decision
conditions_applies_when: A skill is kept or retired on the strength of the results it produces.
conditions_does_not_apply_when: The skill does something the bare model cannot do at all.
artifact_contract_output_type: retirement-decision
artifact_contract_required_data:
  - the skill result
  - the bare-model result
  - the decision
artifact_contract_verified_by: the decision names the comparison the skill lost or won
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/eval-format.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - research
---

# Retire the skill when it stops beating the bare model
Run the case input twice in parallel in the same turn, once wrapped by the skill and once against the bare model with nothing around it.
The bare-model run is the long-term floor.
The skill earns its existence only by producing something the bare model cannot, so when the skill stops beating the bare model the right call is retirement, not another patch.
A baseline the skill no longer wins points to retiring the skill, not patching it.
Use baseline when the user asks whether the skill is worth keeping, or as the release check.
<!-- vpmodule:atom:end retire-the-skill-when-it-stops-beating-the-bare-model -->
<!-- vpmodule:atom:begin run-each-case-in-a-clean-room -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/harness.md
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
<!-- vpmodule:atom:end run-each-case-in-a-clean-room -->
<!-- vpmodule:atom:begin say-that-the-run-is-uncontained -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/harness.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Say that the run is uncontained
A run bypasses your permission prompts and is not contained unless the command wraps it in a sandbox, so say that when confirming a run.
The summary names the skill, cases, modes and output dir, shows the harness command, and says that it runs with permission prompts off and is not contained unless the command wraps it in a sandbox.
<!-- vpmodule:atom:end say-that-the-run-is-uncontained -->