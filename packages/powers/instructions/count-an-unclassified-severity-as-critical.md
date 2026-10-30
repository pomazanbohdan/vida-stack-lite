---
instruction_id: count-an-unclassified-severity-as-critical
title: Count an unclassified severity as Critical
summary: A finding whose severity is missing or unrecognised counts as Critical; only a finding that is explicitly Minor is an advisory.
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
  - impact-based-severity
conditions_applies_when: The severity of a reported finding has to be counted.
conditions_does_not_apply_when: Every finding carries a severity that is already known.
artifact_contract_output_type: severity-count
artifact_contract_required_data:
  - the findings and the severity each one carries
  - the count of the findings that block
artifact_contract_verified_by: a finding without a usable severity was counted as Critical and an advisory count was only taken from explicitly Minor findings
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Count an unclassified severity as Critical
Parse issue count from checker return:

an entry whose severity is missing or unrecognized counts as a Critical (fail closed)

If the checker's return contains no YAML issues block (i.e., the plan was approved with no issues), treat `issue_count` as 0 and skip the stall check — the plan passed.

every entry in the block is explicitly Minor

display any advisories and proceed
