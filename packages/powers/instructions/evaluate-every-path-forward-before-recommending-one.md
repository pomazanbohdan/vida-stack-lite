---
instruction_id: evaluate-every-path-forward-before-recommending-one
title: Evaluate every path forward before recommending one
summary: "Compare adjusting the remaining entries, rolling back built work, and cutting scope, then recommend one with the reason; the user decides."
capability_tags:
  - assess-change-impact
pattern_tags:
  - decision-trail
conditions_applies_when: More than one way of resolving the change is possible and one has to be recommended.
conditions_does_not_apply_when: Only one way of resolving the change is in scope.
artifact_contract_output_type: path-evaluation
artifact_contract_required_data:
  - the options
  - the effort estimate
  - the risk level
  - the viability
  - the recommendation
  - the justification
artifact_contract_verified_by: "every option carries an effort estimate, a risk level and a viability mark, and one option is recommended with a reason"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/replan.md
status: active
revision: 6
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
  - business
---

# Evaluate every path forward before recommending one
Evaluate each way forward:
- **Adjust remaining entries** — change the unstarted entries and tickets in place, keeping their ids.
- **Roll back built work** — revert only what the change makes wrong, with the cost and the evidence.
- **Cut scope** — drop what no longer belongs, record the reason, and clear what waited on it.
Weigh each by what it costs, what it leaves true, and whether it rewrites built work. Recommend one with the reason. The user decides; the architecture or design companion is never edited from here.
