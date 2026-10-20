---
instruction_id: never-pull-the-library-whole-into-context
title: Never pull the library whole into context
summary: The library is large and is never loaded whole; confirm the exact names with a targeted lookup on the categories you draw from.
capability_tags:
  - curate-context
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: "A catalogue of methods, techniques or personas has to be chosen from."
conditions_does_not_apply_when: The catalogue is small enough to hold.
artifact_contract_output_type: bounded-lookup
artifact_contract_required_data:
  - the categories drawn from
  - the confirmed names
artifact_contract_verified_by: only the drawn-from categories were listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-brainstorming/references/in-chat-techniques.md
status: active
revision: 1
---

# Never pull the library whole into context
The library is large — never pull it whole into context.
Confirm exact names with a targeted `list --category` on only the categories you're drawing from; never enumerate the library to choose.
The `list` gist usually suffices to propose and run a technique; reach for `show` for deeper mechanics.
