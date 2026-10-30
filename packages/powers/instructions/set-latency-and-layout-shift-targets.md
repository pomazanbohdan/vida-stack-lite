---
instruction_id: set-latency-and-layout-shift-targets
title: Set latency and layout-shift targets
summary: "The interface is judged against written targets for paint, interaction and layout shift, and the API against a written response-time target."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: Performance is being judged for a release.
conditions_does_not_apply_when: The work has no performance target.
artifact_contract_output_type: performance-target-review
artifact_contract_required_data:
  - the target for each metric
  - the measured value
  - the verdict
artifact_contract_verified_by: each measured value is compared against its written target and the verdict is recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Set latency and layout-shift targets
| LCP (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |
Response times < 200ms (p95)
