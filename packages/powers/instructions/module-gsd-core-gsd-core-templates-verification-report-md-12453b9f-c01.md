---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-verification-report-md-12453b9f-c01"
title: "gsd-core: gsd-core/templates/verification-report.md module"
summary: "Carrier for 5 atomic instructions from gsd-core:gsd-core/templates/verification-report.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/verification-report.md\"}"
atom_ids:
  - an-existing-file-is-not-a-substantive-implementation
  - ask-why-the-truth-holds-and-declare-the-hidden-precondition
  - mark-a-truth-present-but-behavior-unverified
  - separate-a-passed-verification-from-a-gap-and-from-a-human-need
  - write-fix-plans-only-when-there-are-gaps
atom_count: 5
atoms: "[{\"atom_id\":\"an-existing-file-is-not-a-substantive-implementation\",\"file_sha256\":\"8e4db04e2c532ca0ebd40d2e16100ee0fac7ee0facfb97574671dcf6d7e41452\",\"content_sha256\":\"42acd3907c30c8257f135cd7d0d8ccfb45456b9d2fc17835b19033cca560e9bd\",\"file_bytes\":1259,\"body_bytes\":183},{\"atom_id\":\"ask-why-the-truth-holds-and-declare-the-hidden-precondition\",\"file_sha256\":\"7cf823f093a2fe9d91c8b4d2158ab4724ad300a199ab05e7001d6178fa689e08\",\"content_sha256\":\"106a75b162ac79e694b074e7b5fcfe4438759076784201bc00576c3d3cd3b75d\",\"file_bytes\":1503,\"body_bytes\":348},{\"atom_id\":\"mark-a-truth-present-but-behavior-unverified\",\"file_sha256\":\"4771d66e919e372110eb3983d050dace9cb8f9894af2ac64980621730f9246b1\",\"content_sha256\":\"8fc12cac4b8954d0a6de18ed062066abc0accddccd471b77e74c6f93d132e830\",\"file_bytes\":1469,\"body_bytes\":313},{\"atom_id\":\"separate-a-passed-verification-from-a-gap-and-from-a-human-need\",\"file_sha256\":\"2a6c23e48f96b23a5011b4f4fa9a2c99837284ae1305b5cb0a261c8b1f3bb7ea\",\"content_sha256\":\"d1aac365a2999f7e97717d39d2158406ad2e4d1e2dd4722295a341814256d765\",\"file_bytes\":1336,\"body_bytes\":238},{\"atom_id\":\"write-fix-plans-only-when-there-are-gaps\",\"file_sha256\":\"64f972cd6b82b9b30a043cab50a9c6e2b392efa1f3c9404079dc5999c0e4a9d9\",\"content_sha256\":\"781c6e60ae31668da70679d028488d1080aae75dbf3bf014c2ebe555f20f117c\",\"file_bytes\":1230,\"body_bytes\":179}]"
carrier_sha256: 669c6ddcc0b302c260af6da2a37491cda6125bd46005e1d0b9f91fec18ca53b2
carrier_bytes: 7602
revision: 1
status: active
---
<!-- vpmodule:atom:begin an-existing-file-is-not-a-substantive-implementation -->
---
instruction_id: an-existing-file-is-not-a-substantive-implementation
title: An existing file is not a substantive implementation
summary: "Existence and substance are two different verdicts, and a file that returns a placeholder is a stub."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: An artifact required by the plan is checked.
conditions_does_not_apply_when: The artifact was already verified as substantive.
artifact_contract_output_type: artifact-verdict
artifact_contract_required_data:
  - the artifact
  - the verdict
  - the evidence behind it
artifact_contract_verified_by: the verdict distinguishes existence from substance and names the evidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/verification-report.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# An existing file is not a substantive implementation
For EXISTS: "File at path, exports X"
For SUBSTANTIVE: "N lines, has patterns X, Y, Z"
File exists but POST returns placeholder
<!-- vpmodule:atom:end an-existing-file-is-not-a-substantive-implementation -->
<!-- vpmodule:atom:begin ask-why-the-truth-holds-and-declare-the-hidden-precondition -->
---
instruction_id: ask-why-the-truth-holds-and-declare-the-hidden-precondition
title: Ask why the truth holds and declare the hidden precondition
summary: A verified truth is asked why it holds; a truth that holds incidentally is qualified and the hidden assumption is promoted to a declared precondition.
capability_tags:
  - verify-work-results
pattern_tags:
  - adversarial-self-review
conditions_applies_when: A truth has been marked as verified.
conditions_does_not_apply_when: The truth did not reach the verified state.
artifact_contract_output_type: reliance-qualification
artifact_contract_required_data:
  - why the truth holds
  - the reason it is incidental
  - the precondition to declare
artifact_contract_verified_by: every verified truth is asked why it holds and the incidental ones are qualified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/verification-report.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Ask why the truth holds and declare the hidden precondition
**Filling this column — apply the reliance check to every `✓ VERIFIED` truth before writing the row.** Ask why the truth holds and classify the evidence you already recorded, not your confidence in it.
The usual fix is to promote the hidden assumption into a declared precondition.
<!-- vpmodule:atom:end ask-why-the-truth-holds-and-declare-the-hidden-precondition -->
<!-- vpmodule:atom:begin mark-a-truth-present-but-behavior-unverified -->
---
instruction_id: mark-a-truth-present-but-behavior-unverified
title: Mark a truth present but behaviour-unverified
summary: "A truth that is present and wired but never exercised by a test is marked as such, excluded from the score and sent to a human."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A truth was found present but no test exercises its behaviour.
conditions_does_not_apply_when: A test exercises the behaviour of the truth.
artifact_contract_output_type: behaviour-unverified-record
artifact_contract_required_data:
  - the truth
  - the test that would exercise it
  - the expected state afterwards
artifact_contract_verified_by: "the truth is marked behaviour-unverified, excluded from the score and routed to a human"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/verification-report.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Mark a truth present but behaviour-unverified
`⚠️ PRESENT_BEHAVIOR_UNVERIFIED` — present + wired, but a state transition or cancellation/cleanup/ordering invariant was not exercised by any test.
Counts toward `behavior_unverified`, routes to human verification, and is *excluded* from the verified score.
<!-- vpmodule:atom:end mark-a-truth-present-but-behavior-unverified -->
<!-- vpmodule:atom:begin separate-a-passed-verification-from-a-gap-and-from-a-human-need -->
---
instruction_id: separate-a-passed-verification-from-a-gap-and-from-a-human-need
title: Separate a passed verification from a gap and from a human need
summary: "The report states whether the goal was reached, whether critical gaps were found, or whether a human is still needed."
capability_tags:
  - verify-work-results
pattern_tags:
  - report-triage
conditions_applies_when: A verification report is written.
conditions_does_not_apply_when: The report is a single verdict with no states.
artifact_contract_output_type: verification-status
artifact_contract_required_data:
  - the status
  - the criteria that decide it
artifact_contract_verified_by: the status is one of the three named states and the criteria for it are stated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/verification-report.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Separate a passed verification from a gap and from a human need
`passed` — All must-haves verified, no blockers
`gaps_found` — One or more critical gaps found
`human_needed` — Automated checks pass but human verification required
<!-- vpmodule:atom:end separate-a-passed-verification-from-a-gap-and-from-a-human-need -->
<!-- vpmodule:atom:begin write-fix-plans-only-when-there-are-gaps -->
---
instruction_id: write-fix-plans-only-when-there-are-gaps
title: Write the fix plans only when there are gaps
summary: "The repair plans are written only when gaps were found, and each one groups the related fixes and carries its own verification task."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - completion-criteria
conditions_applies_when: A verification report found gaps.
conditions_does_not_apply_when: No gaps were found.
artifact_contract_output_type: fix-plan-set
artifact_contract_required_data:
  - the fixes each plan carries
  - the verification task it ends with
artifact_contract_verified_by: the plans exist only for the gaps and each one ends with a verification task
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/verification-report.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Write the fix plans only when there are gaps
Only generate if gaps_found
Group related fixes into single plans
Keep to 2-3 tasks per plan
Include verification task in each plan
<!-- vpmodule:atom:end write-fix-plans-only-when-there-are-gaps -->