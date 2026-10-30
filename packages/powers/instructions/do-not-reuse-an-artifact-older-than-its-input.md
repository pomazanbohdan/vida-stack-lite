---
instruction_id: do-not-reuse-an-artifact-older-than-its-input
title: Do not reuse an artefact older than its input
summary: "An artefact derived from a decision is stale once that decision changes; the reuse is caught deterministically, without a model call."
capability_tags:
  - curate-context
pattern_tags:
  - claim-freshness-window
conditions_applies_when: An artefact derived earlier is about to be reused.
conditions_does_not_apply_when: The artefact was derived from the current input.
artifact_contract_output_type: staleness-check
artifact_contract_required_data:
  - the artefact that would be reused
  - the input it was derived from
  - the order in which the two changed
artifact_contract_verified_by: the reuse was refused because the input changed after the artefact was derived
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/context-drift-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body describes an artifact timestamp comparison and neighboring drift gates but gives no body-level rule, conditional obligation, ordered action, or checklist."
---

# Do not reuse an artefact older than its input
That predates a decision added to the phase's `CONTEXT.md` after that artifact was derived from it.
Deterministic — compares git commit time (falling back to mtime for uncommitted edits), no model call.
Sibling to the existing codebase-drift and schema-drift gates in the `drift` capability.
