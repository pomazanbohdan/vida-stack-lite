---
instruction_id: run-the-set-check-on-every-draft
title: Run the set check on every draft
summary: "A proposed set of containers, a proposed breakdown or a re-slice is checked on the draft, before the approval, always, and again after every change to the set."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A proposed set of items is about to be shown to the user for approval.
conditions_does_not_apply_when: The set was already checked and nothing about it changed.
artifact_contract_output_type: check-record
artifact_contract_required_data:
  - the draft that was checked
  - what the check changed
  - what it confirmed
artifact_contract_verified_by: the check ran on the draft before the approval and again after every change to the set
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/validate.md
status: active
revision: 1
---

# Run the set check on every draft
A proposed set of epics, a proposed epic breakdown, or a re-slice: on the draft, before the user is asked to approve it. This always runs; no path, mode, or setting skips it.
First walk the draft through the Dependencies section yourself and fix what that finds, then give the agent the corrected draft as text. Present the draft with what the check changed and what it confirmed. Run it again when the user's changes add, remove, merge, or reorder items.
At initiative slicing, check the tree's scope ownership without requiring stories or full detail in future epics.
