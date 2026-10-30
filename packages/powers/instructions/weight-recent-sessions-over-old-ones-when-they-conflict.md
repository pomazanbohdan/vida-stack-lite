---
instruction_id: weight-recent-sessions-over-old-ones-when-they-conflict
title: Weight recent sessions over old ones when they conflict
summary: "When an old pattern and a recent one disagree, the recent one wins the rating and the change is noted."
capability_tags:
  - redact-sensitive-data
pattern_tags:
  - claim-freshness-window
conditions_applies_when: Evidence from different times points in different directions.
conditions_does_not_apply_when: All evidence comes from the same period.
artifact_contract_output_type: recency-weighting
artifact_contract_required_data:
  - the window
  - the weight
  - the evolution that was noted
artifact_contract_verified_by: the recent pattern decided the rating and the change is recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/user-profiling.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Weight recent sessions over old ones when they conflict
Recent sessions (last 30 days) should be weighted approximately 3x compared to older sessions when analyzing patterns.
When patterns conflict between recent and older sessions, the recent pattern takes precedence for the rating, but note the evolution: "recently shifted from terse-direct to conversational"
