---
instruction_id: check-the-second-order-effect-of-removing-a-file-the-workers-read
title: Check the second-order effect of removing a file the workers read
summary: Taking a file out of version control also takes it out of the checkout every isolated worker starts from.
capability_tags:
  - assess-change-impact
pattern_tags:
  - change-impact-assessment
conditions_applies_when: A file that isolated workers read is about to leave the tracked set.
conditions_does_not_apply_when: No worker reads the file.
artifact_contract_output_type: impact-note
artifact_contract_required_data:
  - the file that leaves the tracked set
  - what the workers lose with it
artifact_contract_verified_by: the consequence for the isolated workers is named before the removal is made
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/keep-planning-docs-private.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Check the second-order effect of removing a file the workers read
**parallel executor worktrees stop working.** A worktree is checked out from a commit, so an untracked or ignored `.planning/` does not exist inside it and the executor has no `PLAN.md` to read. Untracked planning also has no git history, so `/gsd-undo` and revert paths have nothing to restore.
