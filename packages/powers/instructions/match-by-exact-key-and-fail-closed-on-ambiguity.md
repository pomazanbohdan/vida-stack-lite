---
instruction_id: match-by-exact-key-and-fail-closed-on-ambiguity
title: Match by the exact key and fail closed on ambiguity
summary: "A record is matched to its owner by the exact key, and when more than one record matches, or the matched record is not readable, the run surfaces the conflict and stops instead of picking one."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: A record written by another component has to be matched to the thing it belongs to.
conditions_does_not_apply_when: Exactly one record matches and it is readable.
artifact_contract_output_type: exact-key-match
artifact_contract_required_data:
  - the key that is matched
  - the number of records that matched
  - what happens when the match is ambiguous
artifact_contract_verified_by: the record was matched by its exact key and an ambiguous match stopped the run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/planning-artifacts.md
status: active
revision: 1
---

# Match by the exact key and fail closed on ambiguity
- Match a manifest to a plan by its exact `plan_id` (string-equal — phase ids may contain `.`).
- If more than one manifest matches a single `plan_id`, or a matched manifest is not valid JSON, fail closed: surface the conflict and stop; never pick one heuristically.
