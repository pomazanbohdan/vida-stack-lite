---
instruction_id: present-the-next-step-with-its-name-and-its-context
title: Present the next step with its name and its context
summary: "The next step is named, described and copied as one runnable line; a bare command leaves the reader without context."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - output-formatting
conditions_applies_when: A run hands the next step back to the reader.
conditions_does_not_apply_when: The next step is executed by the same session.
artifact_contract_output_type: next-step
artifact_contract_required_data:
  - the name of the next step
  - its one-line description
  - the command to copy
artifact_contract_verified_by: "the step is named and described, not only given as a command"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/continuation-format.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
  - operations
---

# Present the next step with its name and its context
Always show what it is — name + description, never just a command path
Pull context from source
Command in inline code — backticks, easy to copy-paste, renders as clickable link
always show `/clear` before the command so users run it in the correct order
Project identity in heading — include `[PROJECT_CODE] PROJECT_TITLE` from init context so handoffs are self-identifying across sessions.
Fenced blocks inside templates create nesting ambiguity. Use inline backticks instead.
