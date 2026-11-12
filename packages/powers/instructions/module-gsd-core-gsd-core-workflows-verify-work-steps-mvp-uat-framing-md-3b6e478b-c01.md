---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-verify-work-steps-mvp-uat-framing-md-3b6e478b-c01"
title: "gsd-core: gsd-core/workflows/verify-work/steps/mvp-uat-framing.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/verify-work/steps/mvp-uat-framing.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/verify-work/steps/mvp-uat-framing.md\"}"
atom_ids:
  - refuse-to-derive-a-user-flow-from-a-goal-that-is-not-a-user-story
  - run-the-user-flow-before-the-technical-checks
atom_count: 2
atoms: "[{\"atom_id\":\"refuse-to-derive-a-user-flow-from-a-goal-that-is-not-a-user-story\",\"file_sha256\":\"9059fa3c5683d9d77771448da1affe72a231498e5744bf892f9a2ee9d8bb52c1\",\"content_sha256\":\"02442a79cdab7e467b59aad39bdbf22ae7a990e7c9ee72cf8a211cc7160bf385\",\"file_bytes\":1511,\"body_bytes\":332},{\"atom_id\":\"run-the-user-flow-before-the-technical-checks\",\"file_sha256\":\"cc7954637b33c4353da8a28858a1425f3b5587072054323f4d7974177ab9b53c\",\"content_sha256\":\"130c12a236adacd6ca860c09eadfacb140141cb539d0defa2aee52068f30d70b\",\"file_bytes\":1982,\"body_bytes\":795}]"
carrier_sha256: eb5f72f10779914cf294eed456bb7c5fd06df51fd85cff6a42bb11f9b11beb7c
carrier_bytes: 3828
revision: 1
status: active
---
<!-- vpmodule:atom:begin refuse-to-derive-a-user-flow-from-a-goal-that-is-not-a-user-story -->
---
instruction_id: refuse-to-derive-a-user-flow-from-a-goal-that-is-not-a-user-story
title: Refuse to derive a user flow from a goal that is not a user story
summary: "The goal has to be written as a user story before the flow can be derived from it; when it is not, the run stops instead of inventing a poor script."
capability_tags:
  - harden-validation
pattern_tags:
  - specification-gate
conditions_applies_when: A verification script is derived from the goal of the work.
conditions_does_not_apply_when: The goal is already a user story.
artifact_contract_output_type: user-story-check
artifact_contract_required_data:
  - the goal
  - the validation verdict
  - the guidance that comes with it
artifact_contract_verified_by: the script was not derived from a goal that failed the user-story check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work/steps/mvp-uat-framing.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
---

# Refuse to derive a user flow from a goal that is not a user story
The verb owns the canonical regex `/^As a .+, I want to .+, so that .+\.$/` and returns slot extractions plus per-error guidance when invalid.
Halt UAT generation on failure — never attempt to derive user-flow steps from a non-User-Story goal (low-quality UAT).
<!-- vpmodule:atom:end refuse-to-derive-a-user-flow-from-a-goal-that-is-not-a-user-story -->
<!-- vpmodule:atom:begin run-the-user-flow-before-the-technical-checks -->
---
instruction_id: run-the-user-flow-before-the-technical-checks
title: Run the user flow before the technical checks
summary: "The script is written in three ordered parts; the user's own steps come first, the technical checks wait until that flow passed, and a failed step stops the run."
capability_tags:
  - guide-a-human-review
pattern_tags:
  - named-protagonist-journey
conditions_applies_when: A script of checks is written for a feature that has a user-facing flow.
conditions_does_not_apply_when: The feature has no user-facing flow.
artifact_contract_output_type: verification-script
artifact_contract_required_data:
  - the user-flow steps
  - the deferred technical checks
  - the coverage check
artifact_contract_verified_by: the user flow ran first and a failure in it stopped the run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/verify-work/steps/mvp-uat-framing.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
  - operations
---

# Run the user flow before the technical checks
Generate the UAT script in three ordered sections: (a) user-flow walk-through derived from the phase's user-story goal, (b) technical checks (deferred — only run after user flow passes), (c) coverage check (goal-backward, narrowed to the user story's outcome clause).
**User-flow steps run first.** Each step is one user action: open, fill, click, type, observe. No HTTP verbs, no JSON shapes, no error codes in user-flow steps.
**Technical checks are deferred.** They run AFTER the user flow passes — same checks as non-MVP mode (endpoint schemas, error states, edge cases), just reordered.
**If user-flow step N fails, do not advance.** The verdict is FAIL; technical checks do not run. The user can re-run after fixing the underlying flow.
<!-- vpmodule:atom:end run-the-user-flow-before-the-technical-checks -->