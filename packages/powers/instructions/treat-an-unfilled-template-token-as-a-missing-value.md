---
instruction_id: treat-an-unfilled-template-token-as-a-missing-value
title: Treat an unfilled template token as a missing value
summary: "A placeholder still carrying its template spelling is the template speaking, not the artefact; it counts as absent, never as a value."
capability_tags:
  - review-code
pattern_tags:
  - empty-result-policy
conditions_applies_when: A document under review carries placeholder tokens that were never filled in.
conditions_does_not_apply_when: Every placeholder has been replaced by a real value.
artifact_contract_output_type: review-verdict
artifact_contract_required_data:
  - the unfilled token
  - the verdict it forced
artifact_contract_verified_by: every unfilled token is treated as absent and no verdict rests on the template text
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ui-checker.md
status: active
revision: 1
---

# Treat an unfilled template token as a missing value
The line still carries the template's **unfilled placeholders** — a literal `` `<command>` ``, `<N>`, `<package>@<version>`, `<YYYY-MM-DD>` or `<reason>` is the template speaking, not the spec. Treat an unfilled token as absent, exactly as Dimension 6 treats `shadcn view + diff required` as intent rather than evidence.
