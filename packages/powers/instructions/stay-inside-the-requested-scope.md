---
instruction_id: stay-inside-the-requested-scope
title: Stay inside the requested scope
summary: "Touch only what the request names: no orthogonal clean-up, no side-effect refactoring, no deletion of unused code and no unrequested features."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: A change is implemented next to code that is not part of the request.
conditions_does_not_apply_when: The change removes the code that the request itself makes dead.
artifact_contract_output_type: scope-boundary
artifact_contract_required_data:
  - the files in scope
  - the neighbours left untouched
artifact_contract_verified_by: no file outside the request changed and no unrequested feature was added
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/using-agent-skills/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/edit.md
status: active
revision: 2
---

# Stay inside the requested scope

## Maintain Scope Discipline

Touch only what you're asked to touch.

Do NOT:
- Remove comments you don't understand
- "Clean up" code orthogonal to the task
- Refactor adjacent systems as a side effect
- Delete code that seems unused without explicit approval
- Add features not in the spec because they "seem useful"

Your job is surgical precision, not unsolicited renovation.

Read the entry and only the files the change touches; the rest stays unread so it stays unchanged.
