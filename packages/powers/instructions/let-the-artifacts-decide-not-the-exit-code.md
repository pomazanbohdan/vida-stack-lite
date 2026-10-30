---
instruction_id: let-the-artifacts-decide-not-the-exit-code
title: "Let the artifacts decide, not the exit code"
summary: "The produced artefacts and the recorded commits decide whether a worker is done; a zero exit without artefacts is not done, and a non-zero exit with complete artefacts may still merge."
capability_tags:
  - verify-work-results
pattern_tags:
  - completion-criteria
conditions_applies_when: A delegated worker has reached a terminal state and its outcome must be decided.
conditions_does_not_apply_when: The worker produced no artefact and no commit at all.
artifact_contract_output_type: worker-outcome-verdict
artifact_contract_required_data:
  - the artefacts found
  - the commits found
  - the outcome decision
artifact_contract_verified_by: "the outcome follows the artefacts and the commits, not the process exit code"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Let the artifacts decide, not the exit code
SUMMARY + plan-scoped commits + branch state decide the outcome: a worker that exits 0 with no artifacts is not done, and one that exits non-zero with artifacts complete may still merge.
Only then record the terminal outcome
While a worker's record is `running`, it is a reconciliation candidate the moment its process dies — a crash between classification and recording can never strand it.
Merge artifact-complete workers through the manifest-only gauntlet below; preserve a blocked/failed worktree untouched.
