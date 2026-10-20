---
instruction_id: rename-for-content-and-keep-the-why-comments
title: Rename for content and keep the comments that carry intent
summary: "Names describe their content, abbreviations are spelled out, and comments survive only when they carry the why."
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: Names or comments in the code under simplification do not carry their meaning.
conditions_does_not_apply_when: The names and comments already describe the content and the intent.
artifact_contract_output_type: naming-and-comment-pass
artifact_contract_required_data:
  - the generic names renamed
  - the misleading names renamed
  - the comments deleted
  - the comments kept
artifact_contract_verified_by: every kept comment carries intent the code cannot express
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/code-simplification/SKILL.md
status: active
revision: 1
---

# Rename for content and keep the comments that carry intent

**Naming and readability:**

| Pattern | Signal | Simplification |
|---------|--------|----------------|
| Generic names | `data`, `result`, `temp`, `val`, `item` | Rename to describe the content: `userProfile`, `validationErrors` |
| Abbreviated names | `usr`, `cfg`, `btn`, `evt` | Use full words unless the abbreviation is universal (`id`, `url`, `api`) |
| Misleading names | Function named `get` that also mutates state | Rename to reflect actual behavior |
| Comments explaining "what" | `// increment counter` above `count++` | Delete the comment — the code is clear enough |
| Comments explaining "why" | `// Retry because the API is flaky under load` | Keep these — they carry intent the code can't express |
