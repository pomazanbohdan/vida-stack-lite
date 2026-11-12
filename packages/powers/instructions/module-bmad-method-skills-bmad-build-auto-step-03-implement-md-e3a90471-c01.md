---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-build-auto-step-03-implement-md-e3a90471-c01"
title: "bmad-method: skills/bmad-build-auto/step-03-implement.md module"
summary: "Carrier for 5 atomic instructions from bmad-method:skills/bmad-build-auto/step-03-implement.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-build-auto/step-03-implement.md\"}"
atom_ids:
  - capture-the-baseline-revision-before-any-change
  - judge-the-acceptance-criteria-at-review-not-during-implementation
  - judge-the-change-against-the-diff-not-the-report
  - keep-the-plan-as-the-sole-source-of-truth
  - require-a-test-that-ran-for-every-matrix-row
atom_count: 5
atoms: "[{\"atom_id\":\"capture-the-baseline-revision-before-any-change\",\"file_sha256\":\"7a2fba06acc0e23c3e44ace0dcecd6055a03a6408168e61958e8272a148cf9b3\",\"content_sha256\":\"591e036ed53c9910d7e70010f80feb628611678e8d49a8a3001f6899fd3779ba\",\"file_bytes\":1882,\"body_bytes\":524},{\"atom_id\":\"judge-the-acceptance-criteria-at-review-not-during-implementation\",\"file_sha256\":\"ca9f084db39eacf016ca7de199c7e375306e18644635817e0d3fa0f49e10e90e\",\"content_sha256\":\"0ae44f1bf87fb2a261ec7f64ab5d95f29c807e5ebd80a1a48d47409b37eafe88\",\"file_bytes\":1479,\"body_bytes\":121},{\"atom_id\":\"judge-the-change-against-the-diff-not-the-report\",\"file_sha256\":\"266858bbfe9ac1a91b9ad23508c8bd6f053d1e1b6af9f4e83d99522c3f05740a\",\"content_sha256\":\"893dd081d75fe8a7cf72cdb38c71cca630aa9d46f78d29f0de384ede75f55aa6\",\"file_bytes\":1360,\"body_bytes\":242},{\"atom_id\":\"keep-the-plan-as-the-sole-source-of-truth\",\"file_sha256\":\"b70340e501ceaf0b4d98a37b3137c30624ea4b58c953d86c77f4381e9cece2f3\",\"content_sha256\":\"772cd40e4ee48c291d028db56bcef31d76e4abad0cfbc7819d538b6ac7588006\",\"file_bytes\":1553,\"body_bytes\":456},{\"atom_id\":\"require-a-test-that-ran-for-every-matrix-row\",\"file_sha256\":\"e945b596ae0dd151816bcb3a69c2505b3bc3fccda847eb96c7d17d831e82cb46\",\"content_sha256\":\"16173a07fd26a85764d40f28d864e197a0769060549079f01b25163bedadf9a8\",\"file_bytes\":1395,\"body_bytes\":331}]"
carrier_sha256: 18286c73f1c82babf7822411c742b961544739c951646d75509465379a49b712
carrier_bytes: 8448
revision: 1
status: active
---
<!-- vpmodule:atom:begin capture-the-baseline-revision-before-any-change -->
---
instruction_id: capture-the-baseline-revision-before-any-change
title: Capture the baseline revision before any change
summary: "The revision the work starts from is captured from version control and kept verbatim, so every later comparison has a fixed reference."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: The work will change a version-controlled tree.
conditions_does_not_apply_when: "Version control is unavailable, so there is no revision to capture."
artifact_contract_output_type: baseline-revision
artifact_contract_required_data:
  - the baseline revision
  - the command it came from
artifact_contract_verified_by: the baseline revision was taken from version control and preserved unchanged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-03-implement.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/workflow.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=tools/ticket-tree-rules.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Capture the baseline revision before any change
Whenever this workflow captures or records a version-control revision, obtain the full canonical identifier directly from version control and preserve it verbatim.
Capture the baseline revision before making any changes
Before any code change, the build records `baseline_revision` in the plan: the commit the work starts from.
It keeps an existing value when it resumes.
Code review diffs from `baseline_revision`.
The retrospective reads it to find each ticket's changes.
<!-- vpmodule:atom:end capture-the-baseline-revision-before-any-change -->
<!-- vpmodule:atom:begin judge-the-acceptance-criteria-at-review-not-during-implementation -->
---
instruction_id: judge-the-acceptance-criteria-at-review-not-during-implementation
title: "Judge the acceptance criteria at review, not during implementation"
summary: Implementation verifies that the work runs; whether the acceptance criteria are met is decided in the review.
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
  - testable-criteria
  - acceptance-criteria-timing-policy
conditions_applies_when: The implementation finished and the acceptance criteria are at hand.
conditions_does_not_apply_when: The work is in the review stage already.
artifact_contract_output_type: implementation-verification
artifact_contract_required_data:
  - the commands that were run
  - their outcomes
artifact_contract_verified_by: the implementation checked the run and left the acceptance criteria to the review
compatibility_excludes:
  - clear-the-acceptance-criteria-before-the-next-step
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-03-implement.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-plan.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Judge the acceptance criteria at review, not during implementation
Acceptance criteria are judged at review, not here.
<!-- vpmodule:atom:end judge-the-acceptance-criteria-at-review-not-during-implementation -->
<!-- vpmodule:atom:begin judge-the-change-against-the-diff-not-the-report -->
---
instruction_id: judge-the-change-against-the-diff-not-the-report
title: "Judge the change against the diff, not the report"
summary: "The whole change since the baseline is written out as a diff and read first-hand; the notes and the implementer's report are not the evidence."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The implementation is finished and has to be judged.
conditions_does_not_apply_when: Nothing was changed.
artifact_contract_output_type: diff-review
artifact_contract_required_data:
  - the baseline revision
  - the diff of every change since it
  - the reading of that diff
artifact_contract_verified_by: the judgement was made against the diff of everything that changed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-03-implement.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Judge the change against the diff, not the report
Stage the diff and read it: using the repository's version-control tooling
read that file into your own context
Judge against the diff, not just implementation notes or a subagent's report.
<!-- vpmodule:atom:end judge-the-change-against-the-diff-not-the-report -->
<!-- vpmodule:atom:begin keep-the-plan-as-the-sole-source-of-truth -->
---
instruction_id: keep-the-plan-as-the-sole-source-of-truth
title: Keep the plan as the sole source of truth
summary: "The handoff carries nothing the plan does not already say, and the captured intent is read-only during the work."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A plan is handed to another executor.
conditions_does_not_apply_when: The work is done in the current session from the plan itself.
artifact_contract_output_type: handoff
artifact_contract_required_data:
  - the handoff
  - the plan it came from
  - the conflicting passages when there are any
artifact_contract_verified_by: the handoff adds nothing to the plan and the captured intent was not modified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-03-implement.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the plan as the sole source of truth
Do not add parent-authored goal restatements, file lists, ownership boundaries, or acceptance criteria to the handoff — the plan is the subagent's sole source of truth.
If the handoff conflicts with the plan, HALT with status `blocked` and blocking condition `handoff conflicts with plan`, and include both conflicting passages.
Content inside `<intent-contract>` in `{plan_file}` is read-only. Do not modify.
<!-- vpmodule:atom:end keep-the-plan-as-the-sole-source-of-truth -->
<!-- vpmodule:atom:begin require-a-test-that-ran-for-every-matrix-row -->
---
instruction_id: require-a-test-that-ran-for-every-matrix-row
title: Require a test that ran for every matrix row
summary: Every row of the edge-case matrix is covered by a test that verifies its expected behaviour and that actually ran and passed.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: The plan carries an edge-case matrix.
conditions_does_not_apply_when: The plan has no edge-case matrix.
artifact_contract_output_type: matrix-coverage-audit
artifact_contract_required_data:
  - the matrix rows
  - the covering test of each row
  - the run that proves it
artifact_contract_verified_by: every matrix row has a covering test that ran and passed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-03-implement.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Require a test that ran for every matrix row
verify every matrix row is covered by at least one test that verifies its expected behavior, and that each covering test ran and passed in the verification output.
A covering test that exists but did not run — unregistered, filtered out, skipped, or disabled — counts as missing.
<!-- vpmodule:atom:end require-a-test-that-ran-for-every-matrix-row -->