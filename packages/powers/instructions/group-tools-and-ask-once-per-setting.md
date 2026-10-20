---
instruction_id: group-tools-and-ask-once-per-setting
title: Group the tools and ask once per setting
summary: "Tools that belong together share one owner, a setting several of them read is asked once, and the read happens in one call."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - code-minimization
conditions_applies_when: Several tools are brought under one owner.
conditions_does_not_apply_when: A single tool is written on its own.
artifact_contract_output_type: grouping-plan
artifact_contract_required_data:
  - the settings the tools read
  - the question per setting
  - the call per tool
artifact_contract_verified_by: "a setting several tools read is asked once, each tool reads its settings in one call, and nothing else in the tools changed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/package.md
status: active
revision: 1
---

# Group the tools and ask once per setting
The config questions, one per path or setting the skills hardcode or share, each with `key`, `prompt`, `default` and `scope`.
A value several skills read the same way is one question.
one call per skill with every key it needs, dropping the hardcoded value each replaces.
Touch nothing else in the skills.
