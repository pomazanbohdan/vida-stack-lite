---
instruction_id: triage-the-open-items-one-blocker-at-a-time
title: Triage the open items one blocker at a time
summary: "The open questions, the assumptions and the notes are triaged: a phase blocker is settled one at a time, everything else is logged and carried."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: Open items are waiting when the design is closed.
conditions_does_not_apply_when: There are no open items.
artifact_contract_output_type: open-item-triage
artifact_contract_required_data:
  - the open items
  - the blocker that was settled
  - the items that were carried
artifact_contract_verified_by: each phase blocker was settled on its own and the rest were logged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - operations
---

# Triage the open items one blocker at a time
Open Questions, `[ASSUMPTION]`, `[NOTE FOR UX]`.
Phase-blockers one at a time; non-blockers → `memlog.py append`.
