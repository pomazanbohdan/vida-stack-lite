---
instruction_id: keep-archived-open-work-visible
title: Keep archived open work visible
summary: Work that was archived while still open stays visible and is never folded into the current total.
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: A report shows the outstanding work of the current scope.
conditions_does_not_apply_when: Everything open is inside the current scope.
artifact_contract_output_type: debt-report
artifact_contract_required_data:
  - the current open count
  - the archived open count
  - the line each is rendered on
artifact_contract_verified_by: the archived open items are shown on their own line and are not hidden inside the current total
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/progress.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep archived open work visible
Archived debt stays VISIBLE — an item archived still-open is still open (the archived set can include an unrun security-boundary test).
Render it as its own labeled line; never fold it into the current-milestone total and never filter it away.
