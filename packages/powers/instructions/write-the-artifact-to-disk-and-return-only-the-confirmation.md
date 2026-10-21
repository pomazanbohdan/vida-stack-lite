---
instruction_id: write-the-artifact-to-disk-and-return-only-the-confirmation
title: Write the artifact to disk and return only the confirmation
summary: "The file holds the content and the reply holds the confirmation; a failed write is reported, never worked around by returning the text."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - context-relay
conditions_applies_when: An agent produces a file that the next step reads from disk.
conditions_does_not_apply_when: The deliverable is the answer itself.
artifact_contract_output_type: run-status
artifact_contract_required_data:
  - the file written
  - the confirmation
artifact_contract_verified_by: "the file holds the content, the reply is a short confirmation, and a write failure was surfaced"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-writer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-writer.compact.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-project-researcher.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-project-researcher.compact.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-executor.md
status: active
revision: 1
---

# Write the artifact to disk and return only the confirmation
Returns confirmation only — do not return doc content to the orchestrator.
Do NOT return the file contents in your response. Your return message is a brief confirmation; the content lives on disk.
If writing still fails, surface the actual error in your return message.
Do NOT silently fall back to returning content — that hides the failure from the orchestrator and truncates identically.
Default: write the whole file in a single `Write` call.
build the file incrementally so no single tool call carries the whole payload:
