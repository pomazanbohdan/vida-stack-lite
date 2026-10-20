---
instruction_id: name-the-exact-tool-and-when-to-call-it
title: Name the exact tool and when to call it
summary: "A shared rule that requires a tool names the exact tool and says when to call it, because the teammates who have to use it must connect that tool themselves."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A shared team rule says that a tool has to be used.
conditions_does_not_apply_when: The rule names no tool.
artifact_contract_output_type: tool-requirement
artifact_contract_required_data:
  - the exact tool
  - when to call it
artifact_contract_verified_by: the rule names one tool and the moment it is called
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/team-adoption.md
status: active
revision: 1
---

# Name the exact tool and when to call it
Name the exact tool and when to call it.
Teammates need that tool connected.
