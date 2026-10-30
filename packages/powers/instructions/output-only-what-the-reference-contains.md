---
instruction_id: output-only-what-the-reference-contains
title: Output only what the reference contains
summary: "When a reference is requested, the reference is emitted as it stands - no added analysis, no status, no next-step suggestions."
capability_tags:
  - communicate-concisely
pattern_tags:
  - output-formatting
conditions_applies_when: A reference document or a command reference is requested for display.
conditions_does_not_apply_when: "The task is to analyse, decide or act rather than to show a reference."
artifact_contract_output_type: reference-output
artifact_contract_required_data:
  - the reference content
  - nothing else
artifact_contract_verified_by: "the output carries the reference and no analysis, status or next-step suggestions"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/help/modes/brief.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/help/modes/default.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/help/modes/full.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/help/modes/full.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body restricts reference display generically and contains no domain-specific subject.
---

# Output only what the reference contains
Output ONLY the reference content.
Do NOT add project-specific analysis, git status, next-step suggestions, or any commentary beyond the reference.
No additions.
