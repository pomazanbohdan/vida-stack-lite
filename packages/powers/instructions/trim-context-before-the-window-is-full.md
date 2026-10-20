---
instruction_id: trim-context-before-the-window-is-full
title: Trim the context before the window is full
summary: "Start trimming at seventy-five percent of the context window, cut the dead weight first and protect the live task material."
capability_tags:
  - curate-context
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: "A long session accumulates history, tool output and exploration that no longer serves the task."
conditions_does_not_apply_when: The session is short and its history still carries live decisions.
artifact_contract_output_type: context-trim
artifact_contract_required_data:
  - the fill level of the window
  - what was cut
  - what was protected
artifact_contract_verified_by: the trim started before the window was full and the protected material was kept
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/context-engineering/SKILL.md
status: active
revision: 1
---

# Trim the context before the window is full

The context window is not a filing cabinet — it's a working desk. As a session runs, conversation history, tool output, and exploration accumulate. Most of it becomes deadweight. Budget proactively: waiting until the window is full causes abrupt quality drops; managing regularly keeps the agent coherent through long tasks.

**Start trimming at 75% capacity, not 100%.** By the time the window is genuinely full, the model's attention is already fragmented across too many signals. The 75% threshold gives room to compress gracefully rather than cut desperately mid-task.

**What to cut first:**

| Content | When to cut |
|---|---|
| Past failed attempts and their error output | Once you've moved past them — keep the conclusion, not the journey |
| Verbose tool output (long `find` results, full file listings) | After you've extracted what you needed |
| Conversational back-and-forth | As soon as the decision is reached |
| Earlier drafts of code that were replaced | Immediately on replacement — the current file is the record |

**What to protect until the end:**

- The original task definition and key constraints
- The current error message or failing test output you are actively debugging
- The file currently being edited, or its most recent version
- Any hard constraints the agent has been asked to enforce (auth rules, naming conventions, etc.)

Context cliff | Waiting until the window is full before managing it — attention fragments and output quality drops abruptly at the limit | Start trimming at 75% capacity; compress rather than cut
