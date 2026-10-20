---
instruction_id: resolve-every-placeholder-to-a-defined-source
title: Resolve every placeholder to a defined source
summary: "Every token in an instruction resolves to a declared value, a configured key, a runtime value or a path anchor."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An instruction file carries tokens that the agent is expected to fill in.
conditions_does_not_apply_when: The file carries no token.
artifact_contract_output_type: token-rule
artifact_contract_required_data:
  - the token
  - the source it resolves to
  - the placeholder that is left for the consumer
artifact_contract_verified_by: no token is left without a source it resolves to
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/skill-validator.md
status: active
revision: 1
---

# Resolve every placeholder to a defined source
- `{name}` — a frontmatter variable in the same file, a config key, a runtime variable set during execution, or the path anchors `{project-root}` and `{skill-root}`.
- Plain double-curly `{{name}}` with **no** `config.` or `workflow.` prefix — an artifact placeholder that survives rendering into the generated document, to be filled in by whoever consumes it (e.g. `{{story_key}}` in a story template).
Every token must resolve to a defined source, per the Token Forms table above:
Flag any token that cannot be traced to a source.
