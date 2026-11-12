---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-onboard-md-3b3d40b8-c01"
title: "gsd-core: gsd-core/workflows/onboard.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/onboard.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/onboard.md\"}"
atom_ids:
  - route-to-the-missing-planning-artifact
  - state-what-a-skip-costs
  - stop-at-the-setup-boundary
atom_count: 3
atoms: "[{\"atom_id\":\"route-to-the-missing-planning-artifact\",\"file_sha256\":\"635035d870e8002fbc1799be27cf443b7278b297572f876f82a5eac7a8b906c0\",\"content_sha256\":\"12915a3a67169df2dd4e753aa535b4095ce36bcc2b60e79f097252864ca02ac8\",\"file_bytes\":1410,\"body_bytes\":216},{\"atom_id\":\"state-what-a-skip-costs\",\"file_sha256\":\"39fe87f42e5d69834ad4c3a8e74753afd4a85c8d5a4c3701e6fc6c562b52fcbf\",\"content_sha256\":\"90ef59cc5390ca2752c872f9e3a5a3c1ebe9440cb5b5cb4b90d07ee4b5092297\",\"file_bytes\":1145,\"body_bytes\":150},{\"atom_id\":\"stop-at-the-setup-boundary\",\"file_sha256\":\"4d490e438880343b9aa720ce261bbc5b30a7338784c0e23f48090697475b123d\",\"content_sha256\":\"e0f85b863856a819fd4a46a3ac429eaf59f3104defafce47b30f70ef631f0a9b\",\"file_bytes\":1076,\"body_bytes\":94}]"
carrier_sha256: af588721f802ad0aaa88b7ce1f77c39d94cd5da427233ec5d4424fb81dc92526
carrier_bytes: 3978
revision: 1
status: active
---
<!-- vpmodule:atom:begin route-to-the-missing-planning-artifact -->
---
instruction_id: route-to-the-missing-planning-artifact
title: Route to the missing planning artifact
summary: "When the planning state is incomplete, the run names the missing artifact and routes to the step that fills it."
capability_tags:
  - plan-implementation
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: The planning state exists but some of its artifacts are missing.
conditions_does_not_apply_when: All planning artifacts are present.
artifact_contract_output_type: missing-artifact-route
artifact_contract_required_data:
  - the missing artifact
  - the command that fills it
artifact_contract_verified_by: the missing artifact is named and the run does not continue past it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/onboard.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/reviews-prerequisite.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Route to the missing planning artifact
Project planning exists but is incomplete.
Run the appropriate lower-level command to fill the missing planning artifact(s)
Run the review first
Then re-run the planning step
<!-- vpmodule:atom:end route-to-the-missing-planning-artifact -->
<!-- vpmodule:atom:begin state-what-a-skip-costs -->
---
instruction_id: state-what-a-skip-costs
title: State what a skip costs
summary: "When the user skips a preparation step, the weaker context they will get is named before the run continues."
capability_tags:
  - communicate-concisely
pattern_tags:
  - risk-first-ordering
conditions_applies_when: The user is offered the option to skip a preparation step.
conditions_does_not_apply_when: No step was offered to skip.
artifact_contract_output_type: skip-notice
artifact_contract_required_data:
  - the step that was skipped
  - the weaker context it leaves behind
artifact_contract_verified_by: the consequence of the skip is stated before the run continues
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/onboard.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# State what a skip costs
Skipping codebase mapping may give downstream steps weaker context
Skip mapping — continue with weaker onboarding context
<!-- vpmodule:atom:end state-what-a-skip-costs -->
<!-- vpmodule:atom:begin stop-at-the-setup-boundary -->
---
instruction_id: stop-at-the-setup-boundary
title: Stop at the setup boundary
summary: A setup step prepares the workspace and stops there; it does not run the work or ship it.
capability_tags:
  - execute-plan
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A setup or onboarding step is running.
conditions_does_not_apply_when: The run has already moved past setup into execution.
artifact_contract_output_type: setup-boundary
artifact_contract_required_data:
  - what the setup prepared
  - the step that was handed on to
artifact_contract_verified_by: no implementation was executed and nothing was shipped by the setup step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/onboard.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Stop at the setup boundary
Do not run implementation execution or shipping from onboarding.
<!-- vpmodule:atom:end stop-at-the-setup-boundary -->