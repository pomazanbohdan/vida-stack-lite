---
instruction_id: reconcile-the-artifacts-before-you-classify-the-outcome
title: Reconcile the artifacts before you classify the outcome
summary: "The artifacts on disk and in git decide the outcome, not the way the session ended."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A delegated agent ended without a normal terminal response.
conditions_does_not_apply_when: The agent returned a normal terminal response.
artifact_contract_output_type: reconciliation-report
artifact_contract_required_data:
  - the summary artifact
  - the commits
  - the verdict
artifact_contract_verified_by: the verdict was decided by the artifacts and not by the way the session ended
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/completion-reconciliation.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Reconcile the artifacts before you classify the outcome
Reconcile FIRST, classify SECOND.
How the child's session ended is bookkeeping about the transport; what it wrote to disk and to git is the evidence about the work.
An abnormally-ended child is not evidence of failure
the orchestrator's own interrupt/close says nothing about whether the work completed; only the artifacts do.
Evidence is BOTH probes or neither: a summary without matching commits, and matching commits without a summary, are each incomplete evidence — never auto-complete on one of them.
Never block indefinitely waiting for a signal; verify via filesystem and git state.
the agent may still be running or may have failed silently
Check `git log --oneline -5` for recent activity. If commits are still appearing, wait longer.
