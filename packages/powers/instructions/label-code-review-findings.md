---
instruction_id: label-code-review-findings
title: Label every finding with a severity
summary: "Give every finding one of four labels - Critical, Required, Optional or Nit - and let the label decide whether the change can be approved."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review has produced findings that need a severity and a merge decision.
conditions_does_not_apply_when: The findings already carry a settled severity from an earlier review.
artifact_contract_output_type: labelled-findings
artifact_contract_required_data:
  - finding
  - severity label
  - fix recommendation for Critical and Required
artifact_contract_verified_by: no Critical finding is left without a fix recommendation and the approval follows the labels
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/code-reviewer.md
status: active
revision: 2
---

# Label every finding with a severity
Categorize every finding.

**Critical** — Blocks merge (security vulnerability, data loss risk, broken functionality)

**Important** — Must address before merge (missing test, wrong abstraction, poor error handling)

**Minor** — Worth considering but not required (a simpler design, a useful refactor)

**Minor** — Minor and optional; the author may ignore (formatting, naming, style preferences)

Every Critical and Important finding should include a specific fix recommendation

Don't approve code with Critical issues
