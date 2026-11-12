---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-planner-reviews-md-a80ce3c2-c01"
title: "gsd-core: gsd-core/references/planner-reviews.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/planner-reviews.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/planner-reviews.md\"}"
atom_ids:
  - append-the-review-disposition-rounds-never-edit-them
  - categorize-review-feedback-by-what-it-can-change
atom_count: 2
atoms: "[{\"atom_id\":\"append-the-review-disposition-rounds-never-edit-them\",\"file_sha256\":\"5c4d92e05954f8026c5f59c95cd8c387c0b9e0babd350fce6a092431206ad724\",\"content_sha256\":\"c5bc8c05baa1a7e893d013cca77963953cf9f563594dbc458e9139485a86bba8\",\"file_bytes\":1716,\"body_bytes\":553},{\"atom_id\":\"categorize-review-feedback-by-what-it-can-change\",\"file_sha256\":\"d924365b62f2a3c91db95d7fa48ad208dc905ceafb24e0c80518109b6b901bd6\",\"content_sha256\":\"1c7c564df2228efc2b6064872b552e384a02fec75bc952defaaf4854dcef712d\",\"file_bytes\":1595,\"body_bytes\":496}]"
carrier_sha256: 815baa15e6e64ef03bddd52bd9618a4fd3fd5680efb4b07df7c4bb52ec05d9ef
carrier_bytes: 3626
revision: 1
status: active
---
<!-- vpmodule:atom:begin append-the-review-disposition-rounds-never-edit-them -->
---
instruction_id: append-the-review-disposition-rounds-never-edit-them
title: "Append the review disposition rounds, never edit them"
summary: "Each review round appends its own disposition tables; a later round never edits or deletes an earlier round's tables."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A second review round touches a plan that already carries a disposition ledger.
conditions_does_not_apply_when: The plan carries no ledger yet.
artifact_contract_output_type: review-disposition-ledger
artifact_contract_required_data:
  - the round
  - the addressed concerns
  - the deferred concerns
  - the superseding reference
artifact_contract_verified_by: the earlier round is unchanged and a reversal is a new row that names the round it supersedes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-reviews.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Append the review disposition rounds, never edit them
**Append-only.** A later round never edits or deletes a prior round's tables. To overturn a prior round's verdict, add a new row in the current round's table whose Reason/How Addressed names the round and concern it supersedes (e.g. "Supersedes Round 1 Deferred: {concern} — now addressed in Plan 3")
**Anchoring.** Any reference to a specific REVIEWS.md line cites `L##@{REVIEWS_sha}` (e.g. `L32@a1b2c3d`) — a bare line number is meaningless once the next round rewrites REVIEWS.md wholesale
<!-- vpmodule:atom:end append-the-review-disposition-rounds-never-edit-them -->
<!-- vpmodule:atom:begin categorize-review-feedback-by-what-it-can-change -->
---
instruction_id: categorize-review-feedback-by-what-it-can-change
title: Categorize review feedback by what it can change
summary: "Review feedback is sorted into the buckets that decide whether it lands in the plan, changes the executable contract or is only noted."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A review produced feedback that has to be placed.
conditions_does_not_apply_when: The feedback is a single finding with no severity.
artifact_contract_output_type: feedback-categorisation
artifact_contract_required_data:
  - the bucket of each piece of feedback
  - the reason for the bucket
artifact_contract_verified_by: every piece of feedback sits in exactly one bucket
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-reviews.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Categorize review feedback by what it can change
Must address: Critical severity consensus concerns
Must represent in PLAN.md: actionable Important/Minor findings that require task, action, acceptance criteria, verify command, must_haves, threat-model, artifact, stale-path, or execution-contract changes
Should address: Important severity concerns from 2+ reviewers that improve quality but do not change the executable contract
Consider: Individual reviewer suggestions, Minor severity items
<!-- vpmodule:atom:end categorize-review-feedback-by-what-it-can-change -->