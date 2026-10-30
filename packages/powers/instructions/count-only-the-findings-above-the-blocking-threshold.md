---
instruction_id: count-only-the-findings-above-the-blocking-threshold
title: Count only the findings above the blocking threshold
summary: The blocking count holds the findings at or above the declared threshold; the ones below it are recorded with their own label and never counted.
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A register mixes findings of different severities and a blocking count is reported.
conditions_does_not_apply_when: Every finding in the register has the same severity.
artifact_contract_output_type: blocking-count
artifact_contract_required_data:
  - the threshold
  - the count of the findings at or above it
  - "the findings below it, recorded separately"
artifact_contract_verified_by: the reported count equals the findings at or above the threshold and no finding below it is counted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-security-auditor.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-security-auditor.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Count only the findings above the blocking threshold
`threats_open` (the SECURITY.md frontmatter gate field) = the count of threats whose status is OPEN AND whose severity rank ≥ the `block_on` rank. `block_on: none` ⇒ 0 (nothing ever blocks). `block_on: Minor` ⇒ all open threats block. `block_on: Important` (default) ⇒ only Important and Critical open threats block.
Open threats BELOW the block threshold are recorded in the return as **open — below {block_on} threshold (non-blocking)** and MUST NOT be counted in `threats_open`.
