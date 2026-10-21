---
instruction_id: triage-the-open-items-into-blockers-and-deferred
title: Triage the open items into blockers and deferred
summary: "Resolve the open questions and assumptions that would make the document unsafe, one at a time, and defer the rest with an owner and a revisit condition."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: "The document holds open questions, assumption tags and callouts that still need a decision."
conditions_does_not_apply_when: There is nothing open.
artifact_contract_output_type: open-item-triage
artifact_contract_required_data:
  - the open items
  - the blocker verdict for each
  - the owner and the revisit condition of each deferred item
artifact_contract_verified_by: every blocker is resolved and every deferred item carries an owner and a revisit condition
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/assets/prd-validation-checklist.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/audit-uat.md
status: active
revision: 2
---

# Triage the open items into blockers and deferred
Triage open items. All Open Questions, `[ASSUMPTION]` tags, `[NOTE FOR PM]` callouts.
Phase-blockers (would make the PRD unsafe for UX/architecture/epics) surfaced one at a time and resolved; non-blockers deferred with owner + revisit condition
If phase-blocker count is high, flag it.
An outstanding item does not stop mattering because its phase belongs to an already-archived milestone.
