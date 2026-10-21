---
instruction_id: record-the-prevention-block-when-you-archive-the-session
title: Record the prevention block when you archive the session
summary: Closing a session writes down which gate should have caught the defect and which artifact stops it from coming back.
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A diagnosis is closed and archived.
conditions_does_not_apply_when: The investigation is still open.
artifact_contract_output_type: knowledge-entry
artifact_contract_required_data:
  - why it was not caught
  - the recurrence guard
artifact_contract_verified_by: the entry names the missing gate and a concrete guard
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-debugger.md
status: active
revision: 1
---

# Record the prevention block when you archive the session
produce the **Prevention block** — a blameless postmortem (branching 5-Whys per RCA, "why wasn't this caught?", and a concrete recurrence guard):
Why not caught: {which existing gate (test/typecheck/lint/review/verify/build) should have caught it — or "no gate existed for this class"}
Recurrence guard: {concrete artifact preventing this class from returning — regression test (path:name) / assertion / lint rule / KB pattern / type refinement / config-default change}
