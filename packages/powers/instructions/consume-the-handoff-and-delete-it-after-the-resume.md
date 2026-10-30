---
instruction_id: consume-the-handoff-and-delete-it-after-the-resume
title: Consume the handoff and delete it after the resume
summary: "The structured handoff is the primary source for a resume: its blockers and pending human actions are surfaced at once, its claims are checked against the live state, and the handoff is deleted once the resume succeeded."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: A run resumes from a handoff written by an earlier session.
conditions_does_not_apply_when: There is no handoff.
artifact_contract_output_type: handoff-consumption
artifact_contract_required_data:
  - the blockers surfaced
  - the divergence found
  - the deleted handoff
artifact_contract_verified_by: the handoff was checked against the live state and removed after the resume
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/resume-project.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Consume the handoff and delete it after the resume
This is the primary resumption source
Check `blockers` and `human_actions_pending` — surface these immediately
Check `completed_tasks` for `in_progress` items — these need attention first
Validate `uncommitted_files` against `git status` — flag divergence
After successful resumption, delete
it's a one-shot artifact
