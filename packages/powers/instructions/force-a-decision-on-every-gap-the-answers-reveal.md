---
instruction_id: force-a-decision-on-every-gap-the-answers-reveal
title: Force a decision on every gap the answers reveal
summary: "When an answer exposes a real gap in the concept, name the gap and force the decision: launch blocker, fast-follow, or accepted trade-off."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - report-triage
conditions_applies_when: An answer revealed a real gap in the concept.
conditions_does_not_apply_when: The answer revealed no gap.
artifact_contract_output_type: gap-decision
artifact_contract_required_data:
  - the gap
  - the class of the decision
  - the decision
artifact_contract_verified_by: "the gap is named and classified as a launch blocker, a fast-follow, or an accepted trade-off"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prfaq/references/customer-faq.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Force a decision on every gap the answers reveal
If an answer reveals a real gap in the concept, name it directly and force a decision: is this a launch blocker, a fast-follow, or an accepted trade-off?
