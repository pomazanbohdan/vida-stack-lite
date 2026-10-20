---
instruction_id: dispatch-on-a-clear-match-and-ask-only-when-two-items-are-close
title: "Dispatch on a clear match, and ask only when two items are close"
summary: "A clear match dispatches straight away; a question is asked only when two items are genuinely close, and it is one short question."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A request has to be matched to one of the available actions.
conditions_does_not_apply_when: The action was named by the user already.
artifact_contract_output_type: dispatch
artifact_contract_required_data:
  - the matched action
  - the question asked when two actions were close
artifact_contract_verified_by: no confirmation ritual was run and at most one short question was asked
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

# Dispatch on a clear match, and ask only when two items are close
- If the user's initial message already names an intent that clearly maps to a menu item
  skip the menu and dispatch that item directly
Dispatch on a clear match by invoking the item's `skill` or executing its `prompt`.
Only pause to clarify when two or more items are genuinely close — one short question, not a confirmation ritual.
When nothing on the menu fits, just continue the conversation; chat, clarifying questions, and help are always fair game.
