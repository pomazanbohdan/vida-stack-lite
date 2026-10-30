---
instruction_id: write-both-representations-of-every-phase-not-only-the-summary
title: "Write both representations of every phase, not only the summary"
summary: A phase needs its checklist entry and its detail section; the detail headers are what the downstream lookups parse.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A document holds both a summary list and per-item detail sections.
conditions_does_not_apply_when: The document has only one of the two forms by design.
artifact_contract_output_type: document-with-two-forms
artifact_contract_required_data:
  - the summary entry of every item
  - the detail section of every item
artifact_contract_verified_by: every item appears in both forms and the detail form carries the header the tools parse
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-roadmapper.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Write both representations of every phase, not only the summary
**CRITICAL: ROADMAP.md requires TWO phase representations. Both are mandatory.**
**The `### Phase X:` headers are parsed by downstream tools.** If you only write the summary checklist, phase lookups will fail. Use the correct form for the configured convention so downstream parsing succeeds.
