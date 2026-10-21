---
instruction_id: cite-the-evidence-and-the-consequence-for-every-assumption
title: Cite the evidence and the consequence for every assumption
summary: "Every assumption names the evidence it rests on, what breaks when it is wrong, and how confident it is."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: An assumption is put to the user as a decision to confirm.
conditions_does_not_apply_when: "The item is a plain fact taken from a source, not an assumption."
artifact_contract_output_type: assumption-record
artifact_contract_required_data:
  - the assumption
  - the evidence
  - the consequence if wrong
  - the confidence
artifact_contract_verified_by: every assumption names the files it came from and what breaks when it is wrong
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase-assumptions.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase.md
status: active
revision: 1
---

# Cite the evidence and the consequence for every assumption
Every assumption must cite evidence (file paths, patterns found)
Every assumption must state consequences if wrong
Display all assumptions grouped by area with confidence badges.
**Confidence:** Confident | Likely | Unclear
