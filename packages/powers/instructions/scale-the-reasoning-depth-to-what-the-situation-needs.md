---
instruction_id: scale-the-reasoning-depth-to-what-the-situation-needs
title: Scale the reasoning depth to what the situation needs
summary: The structured reasoning models are skipped where the situation cannot benefit from them.
capability_tags:
  - plan-implementation
pattern_tags:
  - stakes-calibrated-rigor
conditions_applies_when: A decision point is reached.
conditions_does_not_apply_when: The situation is ambiguous or the research is unresolved.
artifact_contract_output_type: reasoning-scope
artifact_contract_required_data:
  - the situation
  - the models that were applied
artifact_contract_verified_by: the applied models match the situation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-planning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Scale the reasoning depth to what the situation needs
Skip structured reasoning models when the situation does not benefit from them
**Single-task plans** -- If the phase has one clear requirement and one obvious task, do not run Pre-Mortem or MECE analysis. Write the task directly
**Revision iterations** -- When revising a plan based on checker feedback, focus on fixing the flagged issues. Do not re-run the full model suite on every revision pass -- apply only the model relevant to the specific issue
**Boilerplate plans** -- Configuration changes, version bumps, documentation updates. These do not have failure modes worth pre-mortem analysis
