---
instruction_id: read-the-shape-you-actually-get-and-never-paste-raw-tool-output
title: Read the shape you actually get and never paste raw tool output
summary: "The two sources return different shapes, so the result that arrived is read as it is; the raw output of a tool is never pasted into the plan."
capability_tags:
  - curate-context
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: A context source can return more than one shape and its output is about to be used.
conditions_does_not_apply_when: The source has one fixed shape that was already established.
artifact_contract_output_type: context-extract
artifact_contract_required_data:
  - the source that was read
  - the shape it returned
  - the distilled context
artifact_contract_verified_by: the context was distilled from the shape that arrived and no raw tool output was pasted into the artifact
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-load-graph-context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Read the shape you actually get and never paste raw tool output
The two paths return **different shapes**: the CLI emits prose, the built-in emits JSON with per-edge confidence tiers and `budget_met`/`budget_estimate`.
Read whichever you get; do not assume a stable shape and do not paste raw output into PLAN.md.
If nothing comes back, continue without graph context.
