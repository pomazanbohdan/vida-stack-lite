---
instruction_id: exclude-what-the-repository-already-states
title: Exclude what the repository already states
summary: "Keep derived copies, platitudes, self-enforced style, transcribed commands, pasted code and history out of the instructions."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The instructions of a repository are being written or pruned.
conditions_does_not_apply_when: The content has no counterpart in the repository and nothing else states it.
artifact_contract_output_type: exclusion-set
artifact_contract_required_data:
  - the excluded kinds
  - the reason for each
  - the personal rules that stay out
artifact_contract_verified_by: no excluded kind is present in the finished instructions
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-project-context/references/best-practices.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-project-context/SKILL.md
status: active
revision: 1
---

# Exclude what the repository already states
Anything included for being interesting | Interest is not need
Platitudes | Already the default
Style rules an agent self-enforces | Belongs in a formatter, linter, hook, or CI check — propose the check instead
Aspirational state | Describe what is; intent belongs in specs
Rules repeating across their projects, or personal rather than the team's, belong in their global agent config.
