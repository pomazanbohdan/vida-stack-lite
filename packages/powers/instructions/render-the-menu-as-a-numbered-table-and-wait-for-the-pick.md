---
instruction_id: render-the-menu-as-a-numbered-table-and-wait-for-the-pick
title: Render the menu as a numbered table and wait for the pick
summary: "When the host cannot carry a menu selection back, every question is a plain-text numbered list, the user types the number, and a free-text answer is treated as the open-ended branch."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - subagent-delegation
conditions_applies_when: The available actions have to be offered to the user.
conditions_does_not_apply_when: The request already names the action to run.
artifact_contract_output_type: menu
artifact_contract_required_data:
  - the numbered rows
  - "the code, the description and the action of each row"
artifact_contract_verified_by: the menu is a numbered table and the turn ends there
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-agent-analyst/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-agent-architect/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-agent-dev/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-agent-pm/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-agent-ux-designer/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/modes/text.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Render the menu as a numbered table and wait for the pick
Render the menu
as a numbered table: `Code`, `Description`, `Action` (the item's `skill` name, or a short label derived from its `prompt` text).
Stop and wait for input. Accept a number, menu `code`, or fuzzy description match.
present every question as a plain-text numbered list and ask the user to type their choice number.
Numeric reply → mapped to that option
Free text → treated as "Other" — reflect it back, confirm, then proceed
do not use
at all
