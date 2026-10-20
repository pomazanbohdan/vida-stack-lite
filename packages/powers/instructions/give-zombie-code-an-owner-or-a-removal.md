---
instruction_id: give-zombie-code-an-owner-or-a-removal
title: Give zombie code an owner or a removal
summary: "Code nobody owns but everybody depends on either gets an owner and maintenance, or a deprecation with a concrete migration plan."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - technical-debt
conditions_applies_when: A piece of code has active consumers but no owner.
conditions_does_not_apply_when: The code has an owner and is maintained.
artifact_contract_output_type: zombie-code-decision
artifact_contract_required_data:
  - the signs that the code is unowned
  - the assigned owner or the migration plan
artifact_contract_verified_by: "the code has an owner or a dated migration plan, and is in neither limbo nor both"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 1
---

# Give zombie code an owner or a removal

Zombie code is code that nobody owns but everybody depends on. It's not actively maintained, has no clear owner, and accumulates security vulnerabilities and compatibility issues. Signs:

- No commits in 6+ months but active consumers exist
- No assigned maintainer or team
- Failing tests that nobody fixes
- Dependencies with known vulnerabilities that nobody updates
- Documentation that references systems that no longer exist

**Response:** Either assign an owner and maintain it properly, or deprecate it with a concrete migration plan. Zombie code cannot stay in limbo — it either gets investment or removal.
