---
instruction_id: treat-a-command-word-as-a-command-only-when-it-is-the-whole-argument
title: Treat a command word as a command only when it is the whole argument
summary: A keyword is a subcommand only when it is the entire argument; anything else is content.
capability_tags:
  - capture-an-idea
pattern_tags:
  - strict-argument-parsing
conditions_applies_when: The input line could be read as a command or as content.
conditions_does_not_apply_when: The command was already recognised and the content was already separated.
artifact_contract_output_type: argument-parsing
artifact_contract_required_data:
  - the parsed subcommand
  - the text that was kept as content
artifact_contract_verified_by: "a keyword that was part of a longer phrase was stored as content, not executed"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/note.md
status: active
revision: 1
---

# Treat a command word as a command only when it is the whole argument
**Critical**: `list` is only a subcommand when it's the ENTIRE argument.
Same for `promote` — only a subcommand when followed by exactly one number.
