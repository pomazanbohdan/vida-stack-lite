---
instruction_id: choose-the-agent-surface-or-the-workflow-surface
title: Choose the agent surface or the workflow surface
summary: An agent surface covers every workflow the agent runs; a workflow surface covers one workflow only.
capability_tags:
  - write-configuration-override
pattern_tags:
  - instruction-authoring
conditions_applies_when: A customization request has to be placed on a surface.
conditions_does_not_apply_when: The request names the surface itself.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - the chosen surface
  - the reason for the choice
artifact_contract_verified_by: the surface matches how many workflows the change covers
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-customize/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Choose the agent surface or the workflow surface
- Every workflow a given agent runs → agent surface
- One workflow only → workflow surface
- Several specific workflows → multiple workflow overrides in sequence, not an agent override
- Workflow-level: template swap, output path, step-specific behavior, or a named scalar already exposed
  Surgical, reliable.
- Agent-level: persona, communication style, org-wide facts, menu changes, behavior that should apply to every workflow the agent dispatches.
When ambiguous, present both with tradeoff, recommend one, let the user decide.
