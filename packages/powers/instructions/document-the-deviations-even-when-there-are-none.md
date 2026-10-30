---
instruction_id: document-the-deviations-even-when-there-are-none
title: Document the deviations even when there are none
summary: "The deviations section is always present, even when there were none, and every deviation carries where it was found, what was fixed, the files, the verification and the commit."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A unit of work is written up.
conditions_does_not_apply_when: No write-up is produced.
artifact_contract_output_type: deviations-section
artifact_contract_required_data:
  - the deviations
  - the rule that classified each of them
  - the total
artifact_contract_verified_by: the section is present even when the work went exactly as planned
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Document the deviations even when there are none
Summary MUST include deviations section. None? → `## Deviations from Plan\n\nNone - plan executed exactly as written.`
Per deviation: **[Rule N - Category] Title** — Found during: Task X | Issue | Fix | Files modified | Verification | Commit hash
End with: **Total deviations:** N auto-fixed (breakdown). **Impact:** assessment.
