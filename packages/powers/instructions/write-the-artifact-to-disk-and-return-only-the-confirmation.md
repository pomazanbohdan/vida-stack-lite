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
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
status: active
revision: 2
---

# Write the artifact to disk and return only the confirmation
Returns confirmation only — do not return doc content to the orchestrator.
Do NOT return the file contents in your response. Your return message is a brief confirmation; the content lives on disk.
If writing still fails, surface the actual error in your return message.
Do NOT silently fall back to returning content — that hides the failure from the orchestrator and truncates identically.
Default: write the whole file in a single `Write` call.
build the file incrementally so no single tool call carries the whole payload:
Each invocation enriches exactly **one** concept and finishes by calling `write_concept_doc` exactly once.
Do **not** print the document, the frontmatter, or the body in your reply — the only way to persist a concept is the `write_concept_doc` call.
Do not call any tools after that.
