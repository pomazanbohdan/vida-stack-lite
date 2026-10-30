---
instruction_id: record-every-referenced-document-with-its-full-path
title: Record every referenced document with its full path
summary: A document the user names is read at once and recorded with a full path for the agents that come after.
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: "The user names a document, specification or decision record during a discussion."
conditions_does_not_apply_when: The reference is an informal mention with no document behind it.
artifact_contract_output_type: reference-list
artifact_contract_required_data:
  - the document path
  - what it decides
artifact_contract_verified_by: every entry carries a full relative path and is marked as one the downstream agents must read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/modes/default.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/templates/context.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Record every referenced document with its full path
When the user references a doc, spec, or ADR during any answer — e.g., "read adr-014", "check the MCP spec", "per browse-spec.md" — immediately:
Read the referenced doc (or confirm it exists)
Add it to the canonical refs accumulator with full relative path
Use what you learned from the doc to inform subsequent questions
These user-referenced docs are often MORE important than ROADMAP.md refs because they represent docs the user specifically wants downstream agents to follow. Never drop them.
Every entry needs a full relative path — not just a name.
**Downstream agents MUST read these before planning or implementing.**
