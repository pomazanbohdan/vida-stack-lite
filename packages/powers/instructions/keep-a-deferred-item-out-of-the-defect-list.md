---
instruction_id: keep-a-deferred-item-out-of-the-defect-list
title: Keep a deferred item out of the defect list
summary: An item the person defers to a later time is recorded as a deferred follow-up; it never becomes a defect of the current piece of work and never spawns a fix.
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A person postpones an observation instead of reporting it as a problem.
conditions_does_not_apply_when: The observation is a defect of the work that was just done.
artifact_contract_output_type: deferred-follow-up
artifact_contract_required_data:
  - the deferred item
  - the test it belongs to
  - the date it was deferred at
artifact_contract_verified_by: the deferred item is recorded on its own list and never entered the defect list
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep a deferred item out of the defect list
These are future-work ideas, not code issues for the current phase. Capture them WITHOUT creating a gap plan (#1921 — a deferred follow-up must never become a blocking gap or spawn a fix plan):
Do NOT append to `## Gaps` — deferred follow-ups are not blocking gaps. Continue to the next test.
