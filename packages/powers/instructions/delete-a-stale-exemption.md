---
instruction_id: delete-a-stale-exemption
title: Delete a stale exemption
summary: An exemption whose subject now resolves to rules is dead weight; the exemption list only ratchets down.
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - technical-debt
conditions_applies_when: An exemption is reported as obsolete because its subject now resolves to rules.
conditions_does_not_apply_when: The exemption still covers a subject that resolves to no rules.
artifact_contract_output_type: exemption-cleanup
artifact_contract_required_data:
  - the stale entry that was deleted
artifact_contract_verified_by: the stale entry is gone and the exemption list holds no dead entries
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-eslint-coverage-findings.md
status: active
revision: 1
---

# Delete a stale exemption
`allowlist_stale` means an allowlisted file now resolves to rules — someone widened a glob and the exemption became dead weight. **Delete the entry.**
The allowlist only ratchets down; it can never quietly accumulate.
