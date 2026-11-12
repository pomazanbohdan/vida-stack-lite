---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-execute-phase-steps-protected-branch-md-e56a37e7-c01"
title: "gsd-core: gsd-core/workflows/execute-phase/steps/protected-branch.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/execute-phase/steps/protected-branch.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/execute-phase/steps/protected-branch.md\"}"
atom_ids:
  - report-an-undetermined-check-as-undetermined
  - warn-without-refusing-on-a-protected-branch
atom_count: 2
atoms: "[{\"atom_id\":\"report-an-undetermined-check-as-undetermined\",\"file_sha256\":\"27136127a70e25739bdd98b5a353ea5f3546f5e653827809943585befa815a35\",\"content_sha256\":\"558de6bac906e31e2e1a52e0f09389c670b05371c4abed9854ab98a0c3850a0d\",\"file_bytes\":2084,\"body_bytes\":522},{\"atom_id\":\"warn-without-refusing-on-a-protected-branch\",\"file_sha256\":\"76ef434901f5c0d83c815b50b92b638defdfe4a5d27288337cbd40e248c380c5\",\"content_sha256\":\"da3f4073aae2d4e342afdf44c703d83d70a2465de7677262809cf0ef3ab52608\",\"file_bytes\":1190,\"body_bytes\":127}]"
carrier_sha256: df0da6812987339178ba9be6db7b9c6b2c9e1e04438b5031208e34b827025402
carrier_bytes: 3563
revision: 1
status: active
---
<!-- vpmodule:atom:begin report-an-undetermined-check-as-undetermined -->
---
instruction_id: report-an-undetermined-check-as-undetermined
title: Report an undetermined check as undetermined
summary: "A check that failed or returned nothing is reported as undetermined — never read as a negative answer, and never silently read as \"not protected\"."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: "A check, query or guard was run and it did not produce an answer."
conditions_does_not_apply_when: The check ran and produced an answer.
artifact_contract_output_type: undetermined-check-report
artifact_contract_required_data:
  - the check that was run
  - the failure or the absence of an answer
  - the reported state
artifact_contract_verified_by: the report says the state is undetermined and does not state it as false
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/protected-branch.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/health.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/verify-phase-goal.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Report an undetermined check as undetermined
A failed query is **not** a capability verdict.
Track the two apart and report which one happened.
degrades **visibly** (an explicit "could not determine" warning) rather than silently reading as "not protected"
Present the error verbatim and stop — never read it as "no status".
means the scope could not be resolved, which is a failed self-check, never "no commits yet"
Exit 69 (UNAVAILABLE) is "could not look", not "no files changed": say so rather than print nothing.
<!-- vpmodule:atom:end report-an-undetermined-check-as-undetermined -->
<!-- vpmodule:atom:begin warn-without-refusing-on-a-protected-branch -->
---
instruction_id: warn-without-refusing-on-a-protected-branch
title: Warn without refusing on a protected branch
summary: The run says that the branch is protected and continues; the warning is not a veto over the work.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - risk-first-ordering
conditions_applies_when: The work continues on a branch that is protected.
conditions_does_not_apply_when: The branch is not protected.
artifact_contract_output_type: protected-branch-warning
artifact_contract_required_data:
  - the branch
  - whether it is protected
  - the fact that the run continued
artifact_contract_verified_by: the warning was printed and the work still ran
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/protected-branch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Warn without refusing on a protected branch
It warns without refusing execution
still runs on whatever branch it started on.
<!-- vpmodule:atom:end warn-without-refusing-on-a-protected-branch -->