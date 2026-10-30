---
instruction_id: route-the-abstention-on-an-external-trigger-not-on-self-judgment
title: "Route the abstention on an external trigger, not on self-judgment"
summary: "The abstention is triggered by the external tag that marks the check as non-inferable, never by the verifier's own confidence; the verifier routes, it does not diagnose."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A verifier has to decide what to do with a check that may not be inferable.
conditions_does_not_apply_when: The check carries no external trigger and the verifier is asked for a plain verdict.
artifact_contract_output_type: abstention-routing
artifact_contract_required_data:
  - the external trigger the routing used
  - the verdict the verifier stated
artifact_contract_verified_by: the routing followed the external trigger and the verdict names no omitted rule
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

# Route the abstention on an external trigger, not on self-judgment
1. **Exogenous, not endogenous.** The trigger is the *external tag* (`backstop`), never the verifier's self-judgment. Asking the verifier to "abstain if unsure" barely moves the number (100% → 67%) and only on ambiguity it already notices; on a true blind spot it stays confidently wrong. A confidence gate cannot reach a blind spot the model does not feel - so there is **no "are you sure?" prompt**; routing is on the pre-existing tag only.
2. **Routing, not diagnosis.** The verifier need not name the omitted rule (if it could, it wouldn't be a blind spot). In testing, verifiers abstained correctly while citing the *wrong* edge. The honest verdict requires only "I was told this is under-specified and I cannot rule it out." The omitted rule is carried by a human-authored held-out test, not by the verifier.
Does NOT identify the omitted rule; does NOT recalibrate decisive verdicts; does NOT defend against *malicious compliance* (a self-graded review rationalizing away its own findings). It raises the floor on *honest* uncertainty about non-inferable checks - that is the whole claim.
