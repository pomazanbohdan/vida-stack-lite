---
instruction_id: make-every-file-reference-clickable
title: Make every file reference clickable
summary: "A file reference in human-facing output is never plain text: it is a link in the file and a host-clickable form in the session."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: "A file path or a file:line reference is written into human-facing output."
conditions_does_not_apply_when: "The reference is written for a machine that reads paths, not for a human reader."
artifact_contract_output_type: review-narrative
artifact_contract_required_data:
  - the reference form used in the narrative file
  - the reference form used in the session
artifact_contract_verified_by: "no file and no file:line appears as plain text in human-facing output"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/workflow.md
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Make every file reference clickable
Never write a file or `file:line` reference in human-facing output as plain text.
In the review narrative file, every file and `file:line` must be a markdown link relative to that file (`[label](../src/foo.ts)`).
In the session, never write a markdown link. Use a form the host can click: a Cursor code citation (`startLine:endLine:path` on the opening fence); a VS Code `#file:path`; or a CWD-relative `path:line` with no leading `/`. If unsure, use `path:line`.
