---
instruction_id: judge-web-vitals-against-the-good-thresholds
title: Judge web vitals against the Good thresholds
summary: Hold the three web vitals to their Good band and treat anything worse as a defect to fix.
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "A web page's experience is measured or judged."
conditions_does_not_apply_when: The work has no page load or no interaction in the browser.
artifact_contract_output_type: vitals-thresholds
artifact_contract_required_data:
  - the metric
  - the measured value
  - the band it falls in
artifact_contract_verified_by: each vital is inside the Good band or recorded as out of band
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
  - engineering
---

# Judge web vitals against the Good thresholds

Core Web Vitals Targets:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |

- [ ] Core Web Vitals are within "Good" thresholds
