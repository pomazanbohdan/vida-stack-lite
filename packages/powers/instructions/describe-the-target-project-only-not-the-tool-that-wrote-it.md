---
instruction_id: describe-the-target-project-only-not-the-tool-that-wrote-it
title: "Describe the target project only, not the tool that wrote it"
summary: The generated document talks about the project and never about the method that produced it.
capability_tags:
  - write-technical-prose
pattern_tags:
  - source-conversion
conditions_applies_when: A document is generated for a project by an agent.
conditions_does_not_apply_when: The document is a note about the method itself.
artifact_contract_output_type: documentation-update
artifact_contract_required_data:
  - the project description
artifact_contract_verified_by: the document names nothing about the generating method
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-writer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-writer.compact.md
status: active
revision: 1
---

# Describe the target project only, not the tool that wrote it
Generated docs describe the TARGET PROJECT exclusively.
NEVER include the generating tool's methodology content in generated docs — no references to phases, plans, commands, or any workflow concepts
