---
instruction_id: render-the-menu-as-a-numbered-table-and-wait-for-the-pick
title: Render the menu as a numbered table and wait for the pick
summary: "The menu is a numbered table of code, description and action, and the pick comes from a number, the code, or a fuzzy match."
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
status: active
revision: 1
---

# Render the menu as a numbered table and wait for the pick
Render the menu
as a numbered table: `Code`, `Description`, `Action` (the item's `skill` name, or a short label derived from its `prompt` text).
Stop and wait for input. Accept a number, menu `code`, or fuzzy description match.
