---
instruction_id: set-and-enforce-performance-budgets
title: Set and enforce performance budgets
summary: "Write the budgets down and enforce them in the build, so the number cannot drift back."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A user-facing surface has a known size or latency budget.
conditions_does_not_apply_when: There is no budget to enforce.
artifact_contract_output_type: performance-budget
artifact_contract_required_data:
  - the budgets
  - the enforcement check
  - its result
artifact_contract_verified_by: the budget check runs and its result is recorded
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
  - engineering
  - design-ux
---

# Set and enforce performance budgets

**Set budgets and enforce them:**

```
JavaScript bundle: < 200KB gzipped (initial load)
CSS: < 50KB gzipped
Images: < 200KB per image (above the fold)
Fonts: < 100KB total
API response time: < 200ms (p95)
Time to Interactive: < 3.5s on 4G
Lighthouse Performance score: ≥ 90
```

**Enforce in CI.**
