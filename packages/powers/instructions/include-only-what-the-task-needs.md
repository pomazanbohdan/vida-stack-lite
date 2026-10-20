---
instruction_id: include-only-what-the-task-needs
title: Include only what the task needs
summary: "Load the section that applies, not the whole document, and keep the focused context for one task under a named size."
capability_tags:
  - curate-context
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: "A document, error output or project index is about to be loaded into the working context."
conditions_does_not_apply_when: The whole artifact is needed and fits the context.
artifact_contract_output_type: focused-context
artifact_contract_required_data:
  - the part loaded
  - the part left out
  - the size of the focused context
artifact_contract_verified_by: the loaded context is the relevant part and stays under the focused-context budget
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/context-engineering/SKILL.md
status: active
revision: 1
---

# Include only what the task needs

Load the relevant spec section when starting a feature. Don't load the entire spec if only one section applies.

**Effective:** "Here's the authentication section of our spec: [auth spec content]"

**Wasteful:** "Here's our entire 5000-word spec: [full spec]" (when only working on auth)

For large projects, maintain a summary index:

Load only the relevant section when working on a specific area.

When tests fail or builds break, feed the specific error back to the agent:

**Effective:** "The test failed with: `TypeError: Cannot read property 'id' of undefined at UserService.ts:42`"

**Wasteful:** Pasting the entire 500-line test output when only one test failed.

Context starvation | Agent invents APIs, ignores conventions | Load rules file + relevant source files before each task

Context flooding | Agent loses focus when loaded with >5,000 lines of non-task-specific context. More files does not mean better output. | Include only what is relevant to the current task. Aim for <2,000 lines of focused context per task.

Stale context | Agent references outdated patterns or deleted code | Start fresh sessions when context drifts
