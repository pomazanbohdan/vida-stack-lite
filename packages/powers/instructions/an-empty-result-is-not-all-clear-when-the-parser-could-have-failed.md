---
instruction_id: an-empty-result-is-not-all-clear-when-the-parser-could-have-failed
title: An empty result is not all-clear when the parser could have failed
summary: "When files could not be parsed, an empty item list is not an all-clear: the unparsed files are reported first, because they may hide outstanding work."
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A scan reports nothing and some of the files it read could not be parsed.
conditions_does_not_apply_when: Every file was parsed.
artifact_contract_output_type: unparsed-report
artifact_contract_required_data:
  - the files that could not be parsed
  - the reason the result is not all-clear
artifact_contract_verified_by: the unparsed files are reported and the run does not call the state clear
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/audit-uat.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/autonomous.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# An empty result is not all-clear when the parser could have failed
This is NOT all-clear - one or more files have test blocks that could not be parsed and may be hiding outstanding work.
The report's `status` is outside the closed set
Never read it as "no results".
