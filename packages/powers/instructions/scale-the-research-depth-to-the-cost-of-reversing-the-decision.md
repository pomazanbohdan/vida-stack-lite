---
instruction_id: scale-the-research-depth-to-the-cost-of-reversing-the-decision
title: Scale the research depth to the cost of reversing the decision
summary: "Research goes quick or deep: a quick pass for a narrow question, a deep pass with stronger verification when the decision is costly to reverse, and the user says which one it is."
capability_tags:
  - research-primary-sources
pattern_tags:
  - stakes-calibrated-rigor
conditions_applies_when: A research run is about to be scoped.
conditions_does_not_apply_when: The depth of the run was already fixed by the request.
artifact_contract_output_type: research-depth
artifact_contract_required_data:
  - the depth chosen
  - the question it answers
  - what it costs to reverse the decision
artifact_contract_verified_by: a costly-to-reverse decision gets the deeper pass and a narrow question gets the quick one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/research.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Scale the research depth to the cost of reversing the decision
It can go quick or deep: a quick pass for a narrow question, a deep pass with stronger verification when the decision is costly to reverse.
The user just says so.
