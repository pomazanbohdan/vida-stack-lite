---
instruction_id: halt-and-name-the-recovery-instead-of-proceeding-on-an-empty-record
title: Halt and name the recovery instead of proceeding on an empty record
summary: "When the bookkeeping of a run is short of what it must contain, the run stops with the failing item and the recovery named; it never continues on an empty record."
capability_tags:
  - verify-work-results
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: "A run's record is missing an entry that the run needs."
conditions_does_not_apply_when: The record is complete.
artifact_contract_output_type: halt-record
artifact_contract_required_data:
  - the failing item
  - the recovery to apply
  - what is deliberately not done
artifact_contract_verified_by: the run stopped with the failing item and the recovery named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/claude-orchestration/docs/workflow-backend-dispatch.md
status: active
revision: 1
---

# Halt and name the recovery instead of proceeding on an empty record
- STOP the phase with the failing plan id and the recovery hint below; do NOT run `worktree.cleanup-wave` and do NOT proceed to step 4.
- Recover the missing metadata from the run's per-agent result journal (`journal.jsonl` — one `{"type":"result",…}` line per agent — in the Workflow run's transcript dir), re-run `worktree.record-agent` by hand, then re-run cleanup. If the journal cannot be recovered either, merge the branch manually after review — never discard it.
- a resumed run must never report success over silently-dropped agent work.
