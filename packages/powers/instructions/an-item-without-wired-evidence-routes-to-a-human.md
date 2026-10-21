---
instruction_id: an-item-without-wired-evidence-routes-to-a-human
title: An item without wired evidence routes to a human
summary: "An item that has no check behind it is never counted as passed; it is routed to the human, and a session that observed nothing at all does not flip the report."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A verdict is about to be written for an item that no check covers.
conditions_does_not_apply_when: The item is covered by a check that ran and passed.
artifact_contract_output_type: evidence-routed-verdict
artifact_contract_required_data:
  - the item
  - the check behind it
  - the route it takes when there is none
artifact_contract_verified_by: the item was routed to a human and the report was not flipped on an empty session
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ui-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work.md
status: active
revision: 1
---

# An item without wired evidence routes to a human
at verify time each one with no wired evidence routes to `insufficient_spec → human_needed` — never a silent pass (#1154).
That surfacing is the intended honest-verifier behavior, not over-flagging.
Zero issues is NOT pass evidence on its own — blocked rows are not issues by this workflow's own rule, so a session that observed nothing (0 passed / 0 issues / N blocked) must NOT flip the report.
