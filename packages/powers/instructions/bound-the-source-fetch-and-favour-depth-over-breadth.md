---
instruction_id: bound-the-source-fetch-and-favour-depth-over-breadth
title: Bound the source fetch and favour depth over breadth
summary: "A small number of pages is read well rather than many pages read shallowly, and what is quoted matches the real package."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: Documentation is fetched to answer a specific implementation question.
conditions_does_not_apply_when: The answer is already in the repository and needs no external source.
artifact_contract_output_type: research-note
artifact_contract_required_data:
  - the pages read
  - the installation command
  - the imports
  - the pitfalls
artifact_contract_verified_by: the note names at most the bound and every import matches the real package structure
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ai-researcher.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ai-researcher.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - research
---

# Bound the source fetch and favour depth over breadth
Fetch 2-4 pages maximum — prioritize depth over breadth: quickstart, the `system_type`-specific pattern page, best practices/pitfalls.
Imports match actual package structure (not approximate)
All code snippets syntactically correct for the fetched version
