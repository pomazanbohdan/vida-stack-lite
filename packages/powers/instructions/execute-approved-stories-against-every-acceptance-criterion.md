---
instruction_id: execute-approved-stories-against-every-acceptance-criterion
title: Execute approved stories against every acceptance criterion
summary: "Approved stories ship as verified code that meets every acceptance criterion, in file paths and acceptance-criterion ids."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: An approved story is being implemented.
conditions_does_not_apply_when: "The story is not approved yet, or the work is a throwaway spike."
artifact_contract_output_type: implementation-report
artifact_contract_required_data:
  - the acceptance criteria met
  - the file paths that changed
artifact_contract_verified_by: every acceptance criterion is named and every reported change carries a file path
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-agent-dev/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Execute approved stories against every acceptance criterion
Execute approved stories with test-first discipline — red, green, refactor — shipping verified code that meets every acceptance criterion.
File paths and AC IDs are your vocabulary.
