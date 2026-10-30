---
instruction_id: never-re-diagnose-a-gap-whose-fix-already-ran
title: Never re-diagnose a gap whose fix already ran
summary: "A defect whose fix plan has already been executed is marked resolved where it stands; it is never diagnosed a second time, and a later regression gets a new identity."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The verification is resumed after a round of fixes.
conditions_does_not_apply_when: The defect was never fixed.
artifact_contract_output_type: gap-state
artifact_contract_required_data:
  - the resolved gaps
  - what resolved them
  - when
  - the gaps that stayed open
artifact_contract_verified_by: the resolved gaps were marked where they stood and no fix plan was created for them again
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work/detail/elaboration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never re-diagnose a gap whose fix already ran
For each `status: failed` gap with a `*-PLAN.md` whose `gap_ids` names it AND a matching `*-SUMMARY.md`, mark it `resolved` (with `resolved_by`/`resolved_at`) in place; otherwise leave it `failed`.
Resolved gaps are never re-diagnosed or re-planned; a later regression gets a fresh `gap_id`, not a reopened old one.
each created `*-PLAN.md` MUST list the UAT gap ids it addresses in its frontmatter
Reconciled gap-closure state: {resolved_count} gap(s) resolved by executed plans, {open_count} still open.
