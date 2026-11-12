---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-planner-subagent-prompt-md-a8fd5e4b-c01"
title: "gsd-core: gsd-core/templates/planner-subagent-prompt.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/templates/planner-subagent-prompt.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/planner-subagent-prompt.md\"}"
atom_ids:
  - pass-context-to-the-planner-and-keep-the-method-in-the-role
  - run-a-quality-gate-before-you-report-the-plans-ready
atom_count: 2
atoms: "[{\"atom_id\":\"pass-context-to-the-planner-and-keep-the-method-in-the-role\",\"file_sha256\":\"10ac6a289c8add4603b8fd82cd3ba385bcf50b68818b84a06b5d134a1f3d27cc\",\"content_sha256\":\"f092d19aa78c692acd8280fe237805f5f6c908257bc8fe2dcf7332bb6f7d6cf3\",\"file_bytes\":1414,\"body_bytes\":345},{\"atom_id\":\"run-a-quality-gate-before-you-report-the-plans-ready\",\"file_sha256\":\"973ffffa190289ab0402a0c813e76b892cb0aa86560d5055de5686bc8521860f\",\"content_sha256\":\"94092aa65d893de0b956bc007e79008059e067cebd2e401c3d0160bfe8aa2809\",\"file_bytes\":1373,\"body_bytes\":341}]"
carrier_sha256: db09717168a0e2dad1cd59e705aa1bee5f5841b6dca9fc2afed2d138bfa272bb
carrier_bytes: 3124
revision: 1
status: active
---
<!-- vpmodule:atom:begin pass-context-to-the-planner-and-keep-the-method-in-the-role -->
---
instruction_id: pass-context-to-the-planner-and-keep-the-method-in-the-role
title: Pass the context to the planner and keep the method in the role
summary: The prompt carries the planning context and the role carries the planning method.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A planner is handed the material it needs.
conditions_does_not_apply_when: The method itself is being written into the prompt.
artifact_contract_output_type: planner-handoff
artifact_contract_required_data:
  - the context that is passed
  - the method that stays in the role
artifact_contract_verified_by: the prompt contains the context and the method stays in the role
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/planner-subagent-prompt.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Pass the context to the planner and keep the method in the role
The agent contains all planning expertise - this template provides planning context only.
Planning methodology, task breakdown, dependency analysis, wave assignment, TDD detection, and goal-backward derivation are baked into the planner agent. This template only passes context.
<!-- vpmodule:atom:end pass-context-to-the-planner-and-keep-the-method-in-the-role -->
<!-- vpmodule:atom:begin run-a-quality-gate-before-you-report-the-plans-ready -->
---
instruction_id: run-a-quality-gate-before-you-report-the-plans-ready
title: Run a quality gate before you report the plans ready
summary: The plans are checked against a fixed list before the run announces them as ready.
capability_tags:
  - plan-implementation
pattern_tags:
  - completion-criteria
conditions_applies_when: A planning run is about to report that it finished.
conditions_does_not_apply_when: The run produced no plans.
artifact_contract_output_type: planning-quality-gate
artifact_contract_required_data:
  - the checks that were run
  - the verdict on each
artifact_contract_verified_by: every check on the list is satisfied before the plans are reported as ready
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/planner-subagent-prompt.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Run a quality gate before you report the plans ready
Before returning PLANNING COMPLETE:
- [ ] PLAN.md files created in phase directory - [ ] Each plan has valid frontmatter - [ ] Tasks are specific and actionable - [ ] Dependencies correctly identified - [ ] Waves assigned for parallel execution - [ ] must_haves derived from phase goal
<!-- vpmodule:atom:end run-a-quality-gate-before-you-report-the-plans-ready -->