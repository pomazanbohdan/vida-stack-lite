---
instruction_id: make-a-persona-unmistakable
title: Make a persona unmistakable
summary: "Give a persona the way it talks, what it values and how it argues, and set the scene in one freeform line."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A cast of personas is being written for a discussion or a review panel.
conditions_does_not_apply_when: A single fixed reviewer or agent is being described.
artifact_contract_output_type: persona-cast
artifact_contract_required_data:
  - the persona
  - the scene
  - the way it argues
artifact_contract_verified_by: "each member names how it talks, what it values and how it argues"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/customize/run-multi-agent-discussions.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/agent/shape.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/memory-agent/shape.md
status: active
revision: 2
---

# Make a persona unmistakable
Personas make a member unmistakable: how they talk, what they value, how they argue.
"Skeptical CFO" is a placeholder.
"Won't approve anything without a payback under eighteen months, and says so first" is a persona.
Scenes set the stage in one freeform line: the setting, what is happening, who is hostile to whom, who pushes hardest.
Define a member once and drop them into different rooms.
The leanness bar stops at the persona.
The identity, the communication style and the principles are what the agent judges by when no capability fits; cutting them makes a worse agent.
Write them, and the persona paragraph in `SKILL.md`, in its own voice, one or two sentences each: an identity with a concrete reference, a style with a simile, three to five principles, each a stance.
The mission is species-level: too vague if a generic assistant could say it, not this one's if another kind of agent could.
Style, principles and menus belong in the sanctum; judge it by what leaked in, not its weight.
