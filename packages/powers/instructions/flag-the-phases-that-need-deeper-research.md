---
instruction_id: flag-the-phases-that-need-deeper-research
title: Flag the phases that need deeper research
summary: "Every suggested phase is marked with whether it needs deeper research and why, or that its patterns are standard."
capability_tags:
  - plan-implementation
pattern_tags:
  - decision-scoped-research
conditions_applies_when: A research summary proposes a phase structure.
conditions_does_not_apply_when: No phase structure is proposed.
artifact_contract_output_type: research-flags
artifact_contract_required_data:
  - the phases that need deeper research and the reason
  - the phases whose patterns are standard
artifact_contract_verified_by: every proposed phase carries a research flag or a standard-pattern note
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/research-project/SUMMARY.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Flag the phases that need deeper research
Phases likely needing deeper research during planning:
**Phase [X]:** [reason — e.g., "complex integration, needs API research"]
Phases with standard patterns (skip research-phase):
**Phase [X]:** [reason — e.g., "well-documented, established patterns"]
Include research flags for each suggested phase
