---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-capabilities-live-dom-uat-fragments-execute-wave-post-md-b7217c7c-c01"
title: "gsd-core: capabilities/live-dom-uat/fragments/execute-wave-post.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:capabilities/live-dom-uat/fragments/execute-wave-post.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"capabilities/live-dom-uat/fragments/execute-wave-post.md\"}"
atom_ids:
  - keep-an-additive-verification-step-additive
  - mark-out-of-scope-criteria-as-needs-review
  - stop-when-a-shared-resource-is-locked-by-someone-else
atom_count: 3
atoms: "[{\"atom_id\":\"keep-an-additive-verification-step-additive\",\"file_sha256\":\"46a223890c697591e1da11dcf6466d8f6a5f38701264a3d2b053a43d2cdaa047\",\"content_sha256\":\"283ed0b449c9fb045f954058edc56d447786c4333ae8a0581d142346d25d2a35\",\"file_bytes\":1462,\"body_bytes\":360},{\"atom_id\":\"mark-out-of-scope-criteria-as-needs-review\",\"file_sha256\":\"00a8f9e86e7ec74c8b1695c23d61cad4733b889d3548e387f29bbb57d3f7a3a4\",\"content_sha256\":\"629244cb7a41fdffdd2c1593e5eb51b9c833c9fd6948ae5eaaf2a7b86d6acb99\",\"file_bytes\":1555,\"body_bytes\":438},{\"atom_id\":\"stop-when-a-shared-resource-is-locked-by-someone-else\",\"file_sha256\":\"f6ebf83091e5175c7c5f4b33e66719934b9c59e9184dccaa3335a80375636918\",\"content_sha256\":\"21b7f4c288674b659a8b6b7acd62ca3644ca7b3117729b94df1d4b61527fae09\",\"file_bytes\":1867,\"body_bytes\":569}]"
carrier_sha256: 3f6915cc36c127b2089347cfbfca3c36862aeb11c0965c51fd8054f870bafe11
carrier_bytes: 5333
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-an-additive-verification-step-additive -->
---
instruction_id: keep-an-additive-verification-step-additive
title: Keep an additive verification step additive
summary: "A verification step that only observes never halts the work, never fails the phase and never rewrites the record of the work."
capability_tags:
  - verify-work-results
pattern_tags:
  - graceful-degradation
conditions_applies_when: An observation-only verification step is about to run.
conditions_does_not_apply_when: The step is a gate that is meant to block.
artifact_contract_output_type: additive-verification
artifact_contract_required_data:
  - what the step observes
  - what it must not change
  - how an inability to observe is reported
artifact_contract_verified_by: the step observed and changed nothing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/live-dom-uat/fragments/execute-wave-post.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep an additive verification step additive
- This step is ADDITIVE. It never halts the wave, never fails the phase, and never rewrites SUMMARY.md. If you cannot look, say so and finish.
- Never invent a criterion. If the plan states no UI acceptance criteria, that is `outcome: nothing_to_report` / `reason: no_criteria`, and it is a perfectly good result.
<!-- vpmodule:atom:end keep-an-additive-verification-step-additive -->
<!-- vpmodule:atom:begin mark-out-of-scope-criteria-as-needs-review -->
---
instruction_id: mark-out-of-scope-criteria-as-needs-review
title: Mark out-of-scope criteria as needs review
summary: "A criterion that cannot be checked within the declared scope of the check is marked for human review, with the missing check named."
capability_tags:
  - verify-work-results
pattern_tags:
  - scope-routing
conditions_applies_when: A criterion falls outside what the check is able to observe.
conditions_does_not_apply_when: Every criterion is inside the declared scope.
artifact_contract_output_type: scope-marker
artifact_contract_required_data:
  - the criterion
  - the check it needs
  - the review it is handed to
artifact_contract_verified_by: every out-of-scope criterion is marked and names the check it needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/live-dom-uat/fragments/execute-wave-post.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
---

# Mark out-of-scope criteria as needs review
- Scope limit for this version: DOM observation against stated criteria only. No screenshot diffing, no accessibility audit, no performance tracing. If a criterion needs one of those, mark it `needs_review` and say which.
- Record `passed` when the stated condition is observably true, `needs_review` when it is ambiguous or requires human judgement (subjective aesthetics, content accuracy).
<!-- vpmodule:atom:end mark-out-of-scope-criteria-as-needs-review -->
<!-- vpmodule:atom:begin stop-when-a-shared-resource-is-locked-by-someone-else -->
---
instruction_id: stop-when-a-shared-resource-is-locked-by-someone-else
title: Stop when a shared resource is locked by someone else
summary: "When a shared resource is held by another party, the run records the blocked state, names the remedy and stops; it does not wait for the lock."
capability_tags:
  - verify-work-results
pattern_tags:
  - resource-bounds
conditions_applies_when: A shared resource needed by the run is locked by another instance.
conditions_does_not_apply_when: The lock is held by the run itself.
artifact_contract_output_type: blocked-resource
artifact_contract_required_data:
  - the blocked resource
  - the recorded outcome and reason
  - the remedy named for the operator
artifact_contract_verified_by: "the run stopped, named the remedy and did not wait"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/live-dom-uat/fragments/execute-wave-post.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/live-dom-uat-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Stop when a shared resource is locked by someone else
- **Stop.** Do not retry, do not loop, do not wait for the lock.
- Parallel execution waves sharing one profile WILL hit this. It is an expected condition, not a defect, and it is not a reason to fail anything.
- Coordination over a resource you do not own is theatre — it adds machinery, and the lock still happens.
- So the verifier tolerates the lock instead: it reports `could_not_look` / `profile_locked`, names `--isolated` so the operator knows the remedy, and stops. No retry, no wait, no held-up wave.
<!-- vpmodule:atom:end stop-when-a-shared-resource-is-locked-by-someone-else -->