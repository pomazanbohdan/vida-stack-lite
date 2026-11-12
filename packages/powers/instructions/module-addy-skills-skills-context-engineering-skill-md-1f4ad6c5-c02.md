---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-context-engineering-skill-md-1f4ad6c5-c02"
title: "addy-skills: skills/context-engineering/SKILL.md module"
summary: "Carrier for 2 atomic instructions from addy-skills:skills/context-engineering/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/context-engineering/SKILL.md\"}"
atom_ids:
  - trim-context-before-the-window-is-full
  - write-a-rules-file-that-covers-the-basics
atom_count: 2
atoms: "[{\"atom_id\":\"trim-context-before-the-window-is-full\",\"file_sha256\":\"eb942316430a164ebf9fe76888b122486550d647b55910727394ec72dd055099\",\"content_sha256\":\"99835726a0d5cf1842038f6f05c9231f966cf5b8b480faaab74e636d4d57f0d3\",\"file_bytes\":2788,\"body_bytes\":1639},{\"atom_id\":\"write-a-rules-file-that-covers-the-basics\",\"file_sha256\":\"af6bd59b2b8c0266a28d15c29067676c31922b19199ba6866e05250888b3e8c6\",\"content_sha256\":\"6f3151db35d38636847682b1ba6e5e50a2e4eabadb9561fe97317b01b295bf0e\",\"file_bytes\":1770,\"body_bytes\":599}]"
carrier_sha256: 517b28e8f532c274a476a4b88b3970963a9d89ab2e001129cf274baf6f70f1e0
carrier_bytes: 4831
revision: 1
status: active
---
<!-- vpmodule:atom:begin trim-context-before-the-window-is-full -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/context-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Trim the context before the window is full

The context window is not a filing cabinet — it's a working desk. As a session runs, conversation history, tool output, and exploration accumulate. Most of it becomes deadweight. Budget proactively: waiting until the window is full causes abrupt quality drops; managing regularly keeps the agent coherent through long tasks.

**Compact well before the host's limit; the threshold varies by host.** By the time the window is genuinely full, the model's attention is already fragmented across too many signals. The margin gives room to compress gracefully rather than cut desperately mid-task.

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

Context cliff | Waiting until the window is full before managing it — attention fragments and output quality drops abruptly at the limit | Compact well before the host's limit; compress rather than cut
<!-- vpmodule:atom:end trim-context-before-the-window-is-full -->
<!-- vpmodule:atom:begin write-a-rules-file-that-covers-the-basics -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/context-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
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
<!-- vpmodule:atom:end write-a-rules-file-that-covers-the-basics -->