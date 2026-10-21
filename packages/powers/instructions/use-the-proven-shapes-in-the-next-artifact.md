---
instruction_id: use-the-proven-shapes-in-the-next-artifact
title: Use the proven shapes in the next artifact
summary: "The next artifact is built from what the earlier work already proved — the real field names, the real data shapes and the real interaction states — instead of generic placeholders."
capability_tags:
  - curate-context
pattern_tags:
  - context-relay
conditions_applies_when: "An artifact is produced after earlier work has already proven data shapes, components or interaction patterns."
conditions_does_not_apply_when: No earlier work has proven anything that this artifact could carry.
artifact_contract_output_type: carried-context
artifact_contract_required_data:
  - the proven shapes
  - the states the artifact shows
  - the components it names
artifact_contract_verified_by: the artifact uses the proven names and states and no generic placeholder
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/sketch.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ultraplan-phase.md
status: active
revision: 1
---

# Use the proven shapes in the next artifact
Mockups are still pure HTML, but they should reflect what's actually been proven — real data shapes, real component names, real interaction patterns.
Use real field names and data shapes from spike findings instead of generic placeholders
Show realistic UI states that match what the spikes proved (e.g., if streaming was validated, show a streaming message state)
Reference real component names and patterns from the target stack
Include interaction states that reflect what the spikes discovered (loading, error, reconnection states)
Read REQUIREMENTS.md if it exists (`requirements_path` is not null) — extract a concise summary (key requirements relevant to this phase, not the full document).
Read RESEARCH.md if it exists (`research_path` is not null) — extract a concise summary of technical findings. Including this reduces redundant cloud research.
