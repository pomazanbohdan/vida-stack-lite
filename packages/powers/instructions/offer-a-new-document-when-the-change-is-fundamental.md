---
instruction_id: offer-a-new-document-when-the-change-is-fundamental
title: Offer a new document when the change is fundamental
summary: "A patch applied without context drifts; when the change is fundamental, offer to write a new document instead of patching the old one."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: An existing document has to change and the change may be fundamental.
conditions_does_not_apply_when: "The change is a small, local edit."
artifact_contract_output_type: change-decision
artifact_contract_required_data:
  - the change signal
  - the decision to patch or to write anew
artifact_contract_verified_by: a fundamental change was offered as a new document instead of a patch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 1
---

# Offer a new document when the change is fundamental
Reconcile an existing brief with a change signal.
A patch applied without context becomes drift
If the change is fundamental, offer
a new document instead of patching.
Surface conflicts with prior decisions before changing.
