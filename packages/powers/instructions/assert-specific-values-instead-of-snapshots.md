---
instruction_id: assert-specific-values-instead-of-snapshots
title: Assert specific values instead of snapshots
summary: "A snapshot nobody reviews proves nothing, and an assertion that accepts anything catches no regression."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: "An assertion is written, or a snapshot is introduced."
conditions_does_not_apply_when: The work adds no assertion.
artifact_contract_output_type: assertion-review
artifact_contract_required_data:
  - the value asserted
  - the regression it would catch
artifact_contract_verified_by: every assertion names the specific value it expects and no snapshot stands in for it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/testing-patterns.md
status: active
revision: 1
---

# Assert specific values instead of snapshots
Snapshot everything | No one reviews snapshot diffs | Assert specific values
Overly broad assertions | Doesn't catch regressions | Be specific
