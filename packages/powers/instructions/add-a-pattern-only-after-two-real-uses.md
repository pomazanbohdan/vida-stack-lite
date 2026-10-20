---
instruction_id: add-a-pattern-only-after-two-real-uses
title: Add a pattern only after two real uses
summary: "A new orchestration pattern is catalogued only after it has been used twice, shown by a concrete artifact, and had its anti-pattern named."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A new pattern is proposed for a catalog of orchestration patterns.
conditions_does_not_apply_when: No new pattern is proposed.
artifact_contract_output_type: pattern-entry-review
artifact_contract_required_data:
  - the uses
  - the artifact that demonstrates the pattern
  - why the existing patterns do not work
  - the anti-pattern shadow
artifact_contract_verified_by: all four admission conditions are met before the entry is added
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/orchestration-patterns.md
status: active
revision: 1
---

# Add a pattern only after two real uses
Add a new entry only after:
1. You've used the pattern at least twice in real work
2. You can name a concrete artifact in this repo that demonstrates it
3. You can explain why an existing pattern wouldn't have worked
4. You can describe its anti-pattern shadow (what people will mistakenly build instead)
Premature catalog entries become aspirational documentation that no one follows.
