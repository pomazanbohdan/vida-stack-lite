---
instruction_id: skip-and-announce-the-lenses-that-do-not-apply
title: Skip and announce the lenses that do not apply
summary: "A lens that names a condition the current context does not satisfy is skipped, and the skip is announced with its reason before anything is launched."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The review has a list of lenses and each of them may name a condition for running.
conditions_does_not_apply_when: Every lens applies to the change under review.
artifact_contract_output_type: active-lens-set
artifact_contract_required_data:
  - the active lenses
  - the skipped lenses
  - the reason for each skip
artifact_contract_verified_by: every skipped lens is named and its reason is stated before the launch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-code-review/step-02-review.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Skip and announce the lenses that do not apply
`Run only when` present and not satisfied by the current context (`{review_mode}`, `{plan_file}`, `{ticket_file}`, `{verbatim_intent}`) → skip the lens and tell the user which lens was skipped and why.
otherwise → the lens is active.
