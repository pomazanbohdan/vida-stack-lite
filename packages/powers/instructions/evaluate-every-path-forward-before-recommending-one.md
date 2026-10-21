---
instruction_id: evaluate-every-path-forward-before-recommending-one
title: Evaluate every path forward before recommending one
summary: "Score each way of resolving the issue on effort and risk, mark it viable or not, and then choose one and say why."
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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-correct-course/checklist.md
status: active
revision: 2
---

# Evaluate every path forward before recommending one
Evaluate Option 1: Direct Adjustment
Evaluate Option 2: Potential Rollback
Evaluate Option 3: PRD MVP Review
Can the issue be addressed by modifying existing stories?
Can new stories be added within the current epic structure?
Would this approach maintain project timeline and scope?
Would reverting recently completed stories simplify addressing this issue?
Which stories would need to be rolled back?
Is the rollback effort justified by the simplification gained?
Is the original PRD MVP still achievable with this issue?
Does MVP scope need to be reduced or redefined?
Do core goals need modification based on new constraints?
What would be deferred to post-MVP if scope is reduced?
Based on analysis of all options, choose the best path
Provide clear rationale considering:
Implementation effort and timeline impact
Technical risk and complexity
Impact on team morale and momentum
Long-term sustainability and maintainability
Stakeholder expectations and business value
Effort estimate: [High/Medium/Low]
Risk level: [High/Medium/Low]
