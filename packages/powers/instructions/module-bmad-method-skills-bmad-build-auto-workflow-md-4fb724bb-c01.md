---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-build-auto-workflow-md-4fb724bb-c01"
title: "bmad-method: skills/bmad-build-auto/workflow.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmad-build-auto/workflow.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-build-auto/workflow.md\"}"
atom_ids:
  - anchor-acceptance-criteria-on-the-outermost-surface
  - check-the-plan-against-the-readiness-standard
  - run-every-activation-step-before-the-main-workflow
  - treat-a-required-delegation-as-mandatory
atom_count: 4
atoms: "[{\"atom_id\":\"anchor-acceptance-criteria-on-the-outermost-surface\",\"file_sha256\":\"b6f216ed126dce517efa2facb9c1be254f93d7e6e6d68998f3f0a797501099ae\",\"content_sha256\":\"40bc120cb3b9ab731262af06b2b28147b2b114a89f507f6ee9e365e3fb43c38f\",\"file_bytes\":1231,\"body_bytes\":172},{\"atom_id\":\"check-the-plan-against-the-readiness-standard\",\"file_sha256\":\"d83efb6172a07a1796502a110b7e7832c71a1a73f8e0c675c96abe5871864d2e\",\"content_sha256\":\"e09a4644f2eb15ab6a3003558a55a3dcae9268a68da3766410069882e8850615\",\"file_bytes\":1541,\"body_bytes\":426},{\"atom_id\":\"run-every-activation-step-before-the-main-workflow\",\"file_sha256\":\"86b10b9e67d7e3e5b09ed21481581671cf824db8906519848210b9859024e14f\",\"content_sha256\":\"8e41c65604e94d9a84d06e965aa256fcfe73c14385772816d65336fc33f4fe78\",\"file_bytes\":1432,\"body_bytes\":345},{\"atom_id\":\"treat-a-required-delegation-as-mandatory\",\"file_sha256\":\"74ac2ee253823b2513b38fd8ec3a3694c24446056f04efb566fb53a939c53eaa\",\"content_sha256\":\"c309a418e1f82c57f4ecfa8e9b121991f38c5076768eb54a1eda8812e94874e7\",\"file_bytes\":1791,\"body_bytes\":448}]"
carrier_sha256: 7d9688c265429ed2612258c73bd1a6fb82f1156905755ae7a9a6e62619eda4d5
carrier_bytes: 6598
revision: 1
status: active
---
<!-- vpmodule:atom:begin anchor-acceptance-criteria-on-the-outermost-surface -->
---
instruction_id: anchor-acceptance-criteria-on-the-outermost-surface
title: Anchor acceptance criteria on the outermost surface
summary: "A criterion observes the outermost surface the intent refers to, never a more internal stand-in for it."
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: Acceptance criteria are written for a change that has an observable surface.
conditions_does_not_apply_when: The change has no observable surface.
artifact_contract_output_type: acceptance-criteria
artifact_contract_required_data:
  - the surface each criterion observes
artifact_contract_verified_by: no criterion observes a proxy instead of the surface the intent names
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Anchor acceptance criteria on the outermost surface
**Surface-anchored**: ACs observe the outermost surface the intent references — never a more internal proxy for it.
<!-- vpmodule:atom:end anchor-acceptance-criteria-on-the-outermost-surface -->
<!-- vpmodule:atom:begin check-the-plan-against-the-readiness-standard -->
---
instruction_id: check-the-plan-against-the-readiness-standard
title: Check the plan against the readiness standard
summary: "The plan is checked against a fixed readiness standard, and each criterion is one the implementer can settle without asking."
capability_tags:
  - plan-implementation
pattern_tags:
  - completion-criteria
conditions_applies_when: The plan is written and has to pass a readiness standard before the work starts.
conditions_does_not_apply_when: There is no written readiness standard for the work.
artifact_contract_output_type: readiness-check
artifact_contract_required_data:
  - the criteria
  - the criterion that failed
  - the evidence for the verdict
artifact_contract_verified_by: every criterion of the standard was checked against the plan
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/workflow.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Check the plan against the readiness standard
**Actionable**: Every task has a file path and specific action.
**Verifiable**: `## Verification` runs every test file a loaded ticket companion lists, and each command names the result that makes it pass.
**Sufficient**: No known requirement, acceptance, dependency, or implementation gaps remain unresolved.
**Coherent**: No unresolved ambiguities or internal contradictions.
<!-- vpmodule:atom:end check-the-plan-against-the-readiness-standard -->
<!-- vpmodule:atom:begin run-every-activation-step-before-the-main-workflow -->
---
instruction_id: run-every-activation-step-before-the-main-workflow
title: Run every activation step before the main workflow
summary: "The activation steps run first and in order, and everything they load is foundational context for the whole run."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: A run carries activation steps or persistent facts.
conditions_does_not_apply_when: There are no activation steps and no persistent facts.
artifact_contract_output_type: activation-record
artifact_contract_required_data:
  - the activation steps run
  - the persistent facts loaded
  - the order they ran in
artifact_contract_verified_by: every activation step ran before the first workflow step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Run every activation step before the main workflow
Execute each of these steps in order before proceeding (`_None._` means skip):
Treat every entry below as foundational context you carry for the rest of the workflow run.
Execute each of these steps in order (`_None._` means skip):
Activation is complete after all activation steps have run.
<!-- vpmodule:atom:end run-every-activation-step-before-the-main-workflow -->
<!-- vpmodule:atom:begin treat-a-required-delegation-as-mandatory -->
---
instruction_id: treat-a-required-delegation-as-mandatory
title: Treat a required delegation as mandatory
summary: "When a step says to use a subagent, that is not an option: when the capability is missing, the run stops as blocked instead of doing the work itself."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
  - delegation-requirement-policy
conditions_applies_when: A step requires work to be handed to a subagent.
conditions_does_not_apply_when: The work is done in the current session by the step itself.
artifact_contract_output_type: delegation-block-report
artifact_contract_required_data:
  - the required delegation
  - the missing capability
  - the blocked status
artifact_contract_verified_by: the run stopped as blocked instead of doing the delegated work itself
compatibility_excludes:
  - run-the-discussion-inline-when-the-agents-are-unavailable
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/workflow.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Treat a required delegation as mandatory
Using subagents when instructed is mandatory. If you cannot, HALT with status `blocked` and blocking condition `no subagents`.
Never absorb these roles inline.
Role separation is required regardless of the options — those options suppress interactive prompts only; they NEVER authorize collapsing plan roles into the orchestrator context.
Only a real tool-unavailable error is a reliable absence signal
<!-- vpmodule:atom:end treat-a-required-delegation-as-mandatory -->