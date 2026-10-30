---
instruction_id: invoke-the-other-unit-instead-of-reaching-into-its-files
title: Invoke the other unit instead of reaching into its files
summary: Another unit is invoked by name in prose; a file inside another unit is never referenced by path.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An instruction file needs another unit or a resource that another unit owns.
conditions_does_not_apply_when: The resource belongs to this unit or to a location outside both units.
artifact_contract_output_type: invocation-rule
artifact_contract_required_data:
  - the unit to invoke
  - the wording used
  - where a shared resource goes instead
artifact_contract_verified_by: no path crosses into another unit and every cross-unit reference says invoke
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/skill-validator.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/insert-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-milestone/steps/project-md-milestone-write.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Invoke the other unit instead of reaching into its files
A skill must never reference a file inside another skill's directory by path.
A skill's files are private to it, and a path into another skill breaks when that skill is moved or reorganized.
When a skill references another skill by name in prose, the surrounding instruction must use the word "invoke".
The canonical form is ``Invoke the `skill-name` skill``.
Phrases like "Read fully and follow", "Execute", "Run", "Load", "Open", or "Follow" are invalid — they imply file-level operations on a document, not skill invocation.

A record that has an owner is updated through that owner, never by editing the file behind its back - the owner may guard the file.
A shared record is written by one owner: a scoped context must not write it, because the last writer would silently win.
