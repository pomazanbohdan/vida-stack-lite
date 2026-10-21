---
instruction_id: bind-a-recorded-decision-to-the-finding-not-the-id
title: "Bind a recorded decision to the finding, not to the id"
summary: "A recorded decision travels with the finding it names, not with the reusable label, so a renumbered finding does not inherit an old decision."
capability_tags:
  - triage-reports
pattern_tags:
  - stable-identity
conditions_applies_when: A decision about a finding is recorded in a ledger that survives a re-review.
conditions_does_not_apply_when: The finding identifier is never reused.
artifact_contract_output_type: finding-identity
artifact_contract_required_data:
  - the finding the decision belongs to
  - the identity the decision is bound to
  - what the decision says about it
artifact_contract_verified_by: a decision is carried forward only while the identifier still names the same finding
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/code-review-pipeline.md
status: active
revision: 1
---

# Bind a recorded decision to the finding, not to the id
A decision belongs to a finding, not to an ID.
IDs are reused across re-reviews — `--auto` renumbers — so the ledger records each finding's title alongside its disposition, and a recorded decision is carried forward only while the ID still names the same finding.
Without that, a prior `CR-01 fixed` would be inherited by a brand-new `CR-01`, which is a false decision in the one artifact whose purpose is telling triaged from forgotten.
Titles are compared with runs of whitespace collapsed, so a fixer that re-spaces a title still reconciles.
Reconciliation applies an outcome only when the fix report names the **same** finding, because finding IDs are reused across re-reviews and a stale report would otherwise declare a brand-new `CR-01` already fixed.
The drop is reported on the console, naming the ID and what had been decided — for a *recorded* decision.
