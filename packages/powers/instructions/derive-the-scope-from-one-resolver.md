---
instruction_id: derive-the-scope-from-one-resolver
title: Derive the scope from one resolver
summary: "One resolver owns the scope; a later step never derives a range of its own, and a scope that could not be read is reported as unresolvable instead of as an empty scope."
capability_tags:
  - review-code
pattern_tags:
  - single-source-of-truth
conditions_applies_when: The set of files in scope is computed and later steps consume it.
conditions_does_not_apply_when: The scope is given directly.
artifact_contract_output_type: scope-resolution
artifact_contract_required_data:
  - the resolver that owns the scope
  - the scope it returned
  - "what it dropped, by name"
artifact_contract_verified_by: no second derivation of the range exists and an unreadable scope is not reported as empty
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/code-review.md
status: active
revision: 1
---

# Derive the scope from one resolver
This step derives no commit range of its own.
An unreadable phase or repository is `unresolvable`, never an empty scope that reports success.
The resolver also reports, by name rather than by count, what the union dropped
