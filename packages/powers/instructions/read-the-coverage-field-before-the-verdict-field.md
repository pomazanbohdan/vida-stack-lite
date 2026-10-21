---
instruction_id: read-the-coverage-field-before-the-verdict-field
title: Read the coverage field before the verdict field
summary: The verdict is never derived from the coverage; a clean verdict under an incomplete scope says only that nothing was found in what could be looked at.
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A report carries both a verdict and the scope of the scan behind it.
conditions_does_not_apply_when: The report carries no scope field.
artifact_contract_output_type: scan-report
artifact_contract_required_data:
  - the scope
  - the verdict
artifact_contract_verified_by: the scope was read first and a verdict under an incomplete scope is not read as a clean bill of health
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/interpret-state-validate-results.md
status: active
revision: 1
---

# Read the coverage field before the verdict field
`valid` is **never** derived from `scope`. A document the scan could not check at all (`scope` other than `complete`) still reports `valid:true`, because zero warnings really were raised — there just wasn't anything to raise them from. Reading `valid:true` alone as "STATE.md is clean" is the trap: always check `scope` first.
`--strict` reads `valid`, **not** `scope` — so it stays silent about a scan that could not run.
