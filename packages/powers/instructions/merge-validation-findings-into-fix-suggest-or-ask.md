---
instruction_id: merge-validation-findings-into-fix-suggest-or-ask
title: "Merge the findings into fix, suggest, or ask"
summary: "Every finding of a check becomes a mechanical fix, a suggestion with its reason, or a question for the user; coverage gaps, missing prerequisites and contradictions are resolved before the work proceeds."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A check has produced findings.
conditions_does_not_apply_when: There are no findings.
artifact_contract_output_type: finding-routing
artifact_contract_required_data:
  - each finding in one of the three classes
  - the reason for a suggestion
  - what is resolved before the work proceeds
artifact_contract_verified_by: "every finding is fixed, suggested with a reason, or put to the user, and the gaps are resolved before the work proceeds"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/validate.md
status: active
revision: 1
---

# Merge the findings into fix, suggest, or ask
Merge findings into fix (mechanical), suggest (a guideline, with its reason), or ask (needs the user). Resolve coverage gaps, missing prerequisites, and contradictions before proceeding; the user decides suggestions and scope changes.
