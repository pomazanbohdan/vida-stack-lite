---
instruction_id: check-then-fix-what-the-request-names
title: "Check, report, then fix what the request names"
summary: "The check and the report come first; when the request already says what to do, it is done without asking again — and a deletion or a migration is always confirmed."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: "A request asks for a setup, a status, a repair or an update."
conditions_does_not_apply_when: The request asks for a decision.
artifact_contract_output_type: check-and-fix-report
artifact_contract_required_data:
  - the check result
  - the report
  - what was fixed
artifact_contract_verified_by: "the check and the report precede the change, and a deletion or a migration was confirmed first"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad/references/setup.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Check, report, then fix what the request names
Setup, status, update, repair and doctor are one flow: check, report, then fix what the user wants fixed. When the request already says what to do, such as "update" or a first setup, do it without asking again. Always ask before deleting anything or running a migration.
