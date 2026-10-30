---
instruction_id: re-ground-on-the-shared-record-before-each-step
title: Re-ground on the shared record before each step
summary: "Before every step of a long session the shared record is read again, so the step cannot drift away from what the earlier steps established."
capability_tags:
  - curate-context
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A long session runs many steps against one shared record.
conditions_does_not_apply_when: The session is short enough that nothing can drift.
artifact_contract_output_type: re-grounding-check
artifact_contract_required_data:
  - the record that was re-read
  - the requirements it holds
  - the contradiction check
artifact_contract_verified_by: the record was re-read before the step and the step contradicts none of its requirements
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spike.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Re-ground on the shared record before each step
Before starting each spike (not just the first), re-read the manifest and the conventions to prevent drift within long sessions.
Check the current idea's Requirements list — make sure the spike doesn't contradict any established requirement for this idea. Do not apply another idea's requirements.
