---
instruction_id: sanitize-agent-authored-text-before-appending-it
title: Sanitize agent-authored text before appending it
summary: "Agent-authored fields are collapsed to one line and stripped of a leading heading or list marker before they are appended to a shared file, so an embedded newline cannot forge an extra record."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: Text an agent produced is appended to a shared file that a later reader scans.
conditions_does_not_apply_when: The text was written by you and you know every character in it.
artifact_contract_output_type: sanitized-record
artifact_contract_required_data:
  - the sanitized field
  - the record it was appended as
artifact_contract_verified_by: every appended record is one line and none of them can be read as a second record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/revision-loop.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-revision.md
status: active
revision: 1
---

# Sanitize agent-authored text before appending it
**Sanitize before writing - the conflict text is agent-authored.** Every field comes from the producing agent. Before appending, for EACH field: collapse every newline and tab to a single space, and strip any leading `#`, `-`, `|` or backtick-fence run. Otherwise an embedded newline can forge an extra conflict-shaped record inside the owned slot. One conflict is exactly one line beginning `- [ ]`. Never append agent text verbatim, and never append a fenced block.
**Every field is one line of plain text.** No newlines inside a cell, and never begin a field with `#`, `-`, `|` or a code fence. These fields are appended to a shared markdown file that a later reader scans by heading; a field that starts a heading truncates that scan and hides conflicts below it.
