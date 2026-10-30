---
instruction_id: measure-the-number-instead-of-believing-the-stale-document
title: Measure the number instead of believing the stale document
summary: A number from an older document is measured again; when it cannot be measured the discrepancy is reported without picking a winner.
capability_tags:
  - verify-work-results
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A plan and an earlier document disagree about a number or a fact.
conditions_does_not_apply_when: The two sources agree.
artifact_contract_output_type: plan-review
artifact_contract_required_data:
  - the measurement
  - the discrepancy
artifact_contract_verified_by: the number was measured live or the discrepancy was reported without a prescribed value
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-plan-checker.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Measure the number instead of believing the stale document
RESEARCH.md is produced at research time and may be stale.
Attempt live measurement first with a targeted read-only command (e.g., `find . -name '*.test.*' | wc -l`). Run it. Use the result as ground truth:
NEVER prescribe a specific value by assuming RESEARCH.md is authoritative for a numeric/factual claim.
If live measurement is not possible (external system, future state): report the discrepancy WITHOUT prescribing which value is correct:
