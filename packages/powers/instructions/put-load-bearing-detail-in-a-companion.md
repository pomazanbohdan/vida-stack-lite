---
instruction_id: put-load-bearing-detail-in-a-companion
title: Put load-bearing detail in a companion
summary: "A claim is load-bearing when a consumer would change a decision without it; detail too long for one line goes in a companion beside the ticket."
capability_tags:
  - clarify-requirements
pattern_tags:
  - progressive-disclosure
  - living-specification
conditions_applies_when: Requirements or constraints are written from an input.
conditions_does_not_apply_when: The content fits one line or no consumer would change a decision without it.
artifact_contract_output_type: requirement-companion
artifact_contract_required_data:
  - the load-bearing claims
  - the companion each one went into
  - the lines left in the ticket
artifact_contract_verified_by: every load-bearing claim is in the ticket or a named companion, and no adopted companion was edited
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/spec.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - engineering
---

# Put load-bearing detail in a companion
A claim is load-bearing if any consumer — a downstream skill, an implementing agent, a verification pass — would change a decision without it.
Load-bearing content that needs more than one line (tables, diagrams, long reference material) goes in a companion; a line growing sub-bullets wants one.
Spec-authored companions sit beside the ticket and `spec.md` may edit them on update.
Adopted companions such as `DESIGN.md` or an architecture spine keep their names and are never edited or duplicated.
