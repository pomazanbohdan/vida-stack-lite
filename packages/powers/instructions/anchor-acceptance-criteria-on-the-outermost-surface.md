---
instruction_id: anchor-acceptance-criteria-on-the-outermost-surface
title: Anchor acceptance criteria on the outermost surface
summary: "A criterion observes the outermost surface the intent refers to, never a more internal stand-in for it."
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: Acceptance criteria are written for a change that has an observable surface.
conditions_does_not_apply_when: The change has no observable surface.
artifact_contract_output_type: acceptance-criteria
artifact_contract_required_data:
  - the surface each criterion observes
artifact_contract_verified_by: no criterion observes a proxy instead of the surface the intent names
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Anchor acceptance criteria on the outermost surface
**Surface-anchored**: ACs observe the outermost surface the intent references — never a more internal proxy for it.
