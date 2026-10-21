---
instruction_id: defer-a-gap-only-against-specific-evidence-in-a-later-phase
title: Defer a gap only against specific evidence in a later phase
summary: A gap moves to the deferred list only when a later phase names it; a vague match keeps it a real gap.
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A gap could be scheduled for a later phase of the same milestone.
conditions_does_not_apply_when: No later phase exists.
artifact_contract_output_type: gap-triage
artifact_contract_required_data:
  - the gap
  - the later phase that covers it
  - the quoted evidence
artifact_contract_verified_by: "every deferred gap names the later phase and quotes it, and the deferred ones do not change the verdict"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-verifier.md
status: active
revision: 1
---

# Defer a gap only against specific evidence in a later phase
**Important:** Be conservative when matching. Only defer a gap when there is clear, specific evidence in a later phase's roadmap section. Vague or tangential matches should NOT cause a gap to be deferred — when in doubt, keep it as a real gap.
**Deferred items do NOT affect the status determination.**
