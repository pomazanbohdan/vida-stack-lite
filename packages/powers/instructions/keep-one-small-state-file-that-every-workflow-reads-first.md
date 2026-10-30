---
instruction_id: keep-one-small-state-file-that-every-workflow-reads-first
title: Keep one small state file that every workflow reads first
summary: "One small file is read first in every workflow and updated after every significant action, so a session restores itself."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - decision-trail
conditions_applies_when: The state of a project is recorded.
conditions_does_not_apply_when: The state is written once and never read again.
artifact_contract_output_type: state-file
artifact_contract_required_data:
  - the position reached
  - the accumulated context
  - the session continuity
artifact_contract_verified_by: the file is read first by every workflow and updated after every significant action
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/state.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep one small state file that every workflow reads first
A single, small file that's: - Read first in every workflow - Updated after every significant action - Contains digest of accumulated context - Enables instant session restoration
**Reading:** First step of every workflow
**Writing:** After every significant action
