---
instruction_id: name-the-counter-metric-beside-the-metric
title: Name the counter-metric beside the metric
summary: "Whenever the document names success metrics, name the counter-metric that stops the wrong thing from being optimized."
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: A document states success metrics.
conditions_does_not_apply_when: The document states no success metrics.
artifact_contract_output_type: metric-set
artifact_contract_required_data:
  - the metric
  - the counter-metric
  - what the counter-metric balances
artifact_contract_verified_by: every primary and secondary metric has the counter-metric that balances it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/assets/prd-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-product-brief/assets/brief-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - business
---

# Name the counter-metric beside the metric
Counter-metrics named when Success Metrics exist.
Counter-metrics counterbalance specific primary or secondary metrics.
Counter-metrics (do not optimize)
SM-C1: Metric — why this should *not* be optimized. Counterbalances SM-1.
Counter-metrics are as load-bearing as primary metrics — they prevent the architect from optimizing the wrong thing and the dev from gaming the wrong target.
Success Criteria
How we know this is working. Mix of user success signals and business objectives. Measurable.
