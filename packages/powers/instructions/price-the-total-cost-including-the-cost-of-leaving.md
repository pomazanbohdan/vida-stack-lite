---
instruction_id: price-the-total-cost-including-the-cost-of-leaving
title: Price the total cost including the cost of leaving
summary: "The cost of a candidate covers the whole horizon and the cost of leaving it, and a vendor that has repriced before is expected to reprice again."
capability_tags:
  - design-experiments
pattern_tags:
  - decision-trail
conditions_applies_when: A candidate is being costed.
conditions_does_not_apply_when: The candidates differ only in feature fit.
artifact_contract_output_type: total-cost-case
artifact_contract_required_data:
  - the recurring and one-off costs
  - the operating load
  - the cost of leaving
artifact_contract_verified_by: the cost covers the horizon and the exit cost is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/selection.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - business
  - operations
---

# Price the total cost including the cost of leaving
- **Cost & lock-in.** Total cost over the product’s horizon — license/subscription, hosting, operational load, learning curve — and the cost of leaving. Current pricing pages read directly (≤ 3 mo, always); pricing-change history — a vendor that repriced once will again; migration-away accounts for real exit costs.
