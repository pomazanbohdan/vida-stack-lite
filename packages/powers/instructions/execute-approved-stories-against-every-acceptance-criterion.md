---
instruction_id: execute-approved-stories-against-every-acceptance-criterion
title: Execute approved stories against every acceptance criterion
summary: "Approved stories ship as verified code that meets every acceptance criterion, in file paths and acceptance-criterion ids; the ticket is the spec and is read in full first."
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-dev/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Execute approved stories against every acceptance criterion
Execute approved stories with test-first discipline — red, green, refactor — shipping verified code that meets every acceptance criterion.
The ticket is the spec: read it in full before writing code; open its `sources:` or `companions:` only for a need it names.
File paths and AC IDs are your vocabulary.
