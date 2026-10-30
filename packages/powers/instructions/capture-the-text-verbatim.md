---
instruction_id: capture-the-text-verbatim
title: Capture the text verbatim
summary: "A quick capture is written exactly as it arrived — no edits, no questions, one confirmation line."
capability_tags:
  - capture-an-idea
pattern_tags:
  - evidence-analysis
conditions_applies_when: A short idea is captured for later.
conditions_does_not_apply_when: The capture is a structured form that asks for named fields.
artifact_contract_output_type: captured-note
artifact_contract_required_data:
  - the captured text
  - the scope it was captured in
  - the one confirmation line
artifact_contract_verified_by: the stored text matches the input character for character and no question was asked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/note.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body defines generic verbatim idea capture and confirmation but gives no work context that supports a listed domain.
---

# Capture the text verbatim
Zero-friction idea capture. One Write call, one confirmation line. No questions, no prompts.
**Never modify the note text** — capture verbatim, including typos
**Never ask questions** — just write and confirm
Confirm with exactly one line:
