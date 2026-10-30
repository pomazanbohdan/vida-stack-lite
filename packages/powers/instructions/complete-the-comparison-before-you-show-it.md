---
instruction_id: complete-the-comparison-before-you-show-it
title: Complete the comparison before you show it
summary: A delegated comparison is completed and brought to the right size before it is shown.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A comparison produced by a research agent is about to be shown.
conditions_does_not_apply_when: "The comparison was produced directly, not delegated."
artifact_contract_output_type: comparison-table
artifact_contract_required_data:
  - the options
  - the trade-off columns
  - the recommendation
artifact_contract_verified_by: every column is present and the number of options matches the calibration tier
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/modes/advisor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Complete the comparison before you show it
Verify all 5 columns present (Option | Pros | Cons | Complexity | Recommendation) — fill any missing columns rather than showing broken table
Verify option count matches calibration tier:
`full_maturity`: 3-5 options acceptable
`standard`: 2-4 options acceptable
`minimal_decisive`: 1-2 options acceptable
If agent returned too many, trim least viable. If too few, accept as-is.
If agent returned only 1 option, convert from table format to direct recommendation
Rewrite rationale paragraph to weave in project context and ongoing discussion context that the agent did not have access to
