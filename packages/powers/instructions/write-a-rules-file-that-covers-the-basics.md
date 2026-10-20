---
instruction_id: write-a-rules-file-that-covers-the-basics
title: Write a rules file that covers the basics
summary: "Keep one rules file that persists across sessions and states the stack, the commands, the conventions, the boundaries and one pattern."
capability_tags:
  - curate-context
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: "A project has no rules file, or its rules file does not cover the basics."
conditions_does_not_apply_when: The rules file already covers the basics and is current.
artifact_contract_output_type: rules-file
artifact_contract_required_data:
  - the tech stack
  - the commands
  - the code conventions
  - the boundaries
  - one pattern example
artifact_contract_verified_by: the rules file covers all five parts and the output of the agent follows the patterns it shows
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/context-engineering/SKILL.md
status: active
revision: 1
---

# Write a rules file that covers the basics

Create a rules file that persists across sessions. This is the highest-leverage context you can provide.

The file covers:

- Tech Stack
- Commands
- Code Conventions
- Boundaries
- Patterns

[One short example of a well-written component in your style]

Implicit knowledge | Agent doesn't know project-specific rules | Write it down in rules files — if it's not written, it doesn't exist

"The agent should figure out the conventions" | It can't read your mind. Write a rules file — 10 minutes that saves hours.

No rules file exists in the project
