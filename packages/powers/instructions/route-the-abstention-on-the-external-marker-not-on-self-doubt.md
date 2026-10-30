---
instruction_id: route-the-abstention-on-the-external-marker-not-on-self-doubt
title: "Route the abstention on the external marker, not on self-doubt"
summary: The abstention trigger is the external marker that already exists; no self-assessment prompt is used.
capability_tags:
  - verify-work-results
pattern_tags:
  - scope-routing
conditions_applies_when: A check must be routed to an abstention or a verdict.
conditions_does_not_apply_when: No external marker exists for the check and it is graded by the spec.
artifact_contract_output_type: abstention-routing
artifact_contract_required_data:
  - the external marker
  - the routing decision
artifact_contract_verified_by: the routing follows the external marker alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/honest-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - research
---

# Route the abstention on the external marker, not on self-doubt
Exogenous, not endogenous. The trigger is the *external tag* (`backstop`), never the verifier's self-judgment
A confidence gate cannot reach a blind spot the model does not feel — so there is no "are you sure?" prompt; routing is on the pre-existing tag only
Routing, not diagnosis. The verifier need not name the omitted rule (if it could, it wouldn't be a blind spot)
The honest verdict requires only "I was told this is under-specified and I cannot rule it out."
The omitted rule is carried by a human-authored held-out test, not by the verifier
