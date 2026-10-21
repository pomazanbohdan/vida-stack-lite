---
instruction_id: declare-todays-behaviour-not-the-behaviour-you-wish-for
title: "Declare today's behaviour, not the behaviour you wish for"
summary: "A declared contract records what the code does; a row that describes the intended behaviour is a document that lies, and the code is fixed separately."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: "A contract, schema or table declares what the implementation does."
conditions_does_not_apply_when: The declaration is about a plan rather than about the implementation.
artifact_contract_output_type: declared-contract
artifact_contract_required_data:
  - the declared behaviour
  - the change that brings the code to it
artifact_contract_verified_by: every declared row matches the code as it is and the intended change is recorded separately
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/change-the-state-md-schema.md
status: active
revision: 1
---

# Declare today's behaviour, not the behaviour you wish for
the schema declares what the code does, not what it should do. If you find yourself writing a row that describes intended behavior, you are writing a document that lies — declare today's behavior and fix the code separately.
