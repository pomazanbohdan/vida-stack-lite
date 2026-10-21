---
instruction_id: trace-the-whole-chain-and-name-the-break
title: Trace the whole chain and name the break
summary: "The path is traced from one end to the other, in both directions, and the break is named with a file and a line."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A user flow crosses several parts of the system.
conditions_does_not_apply_when: The flow lives inside one component.
artifact_contract_output_type: integration-report
artifact_contract_required_data:
  - the chain
  - the break point
artifact_contract_verified_by: the break is named with a file and a line and the whole chain was traced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-integration-checker.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-integration-checker.compact.md
status: active
revision: 1
---

# Trace the whole chain and name the break
Trace full paths. Component → API → DB → Response → Display. Break at any point = broken flow.
Check both directions. Export exists AND import exists AND import is used AND used correctly.
Be specific about breaks. "Dashboard doesn't work" is useless. "Dashboard.tsx line 45 fetches /api/users but doesn't await response" is actionable.
