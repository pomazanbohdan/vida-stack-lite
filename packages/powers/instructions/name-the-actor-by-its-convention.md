---
instruction_id: name-the-actor-by-its-convention
title: Name the actor by its convention
summary: "The actor that is recorded in a document is named by the convention of its kind, so that a tool, a person and a process are told apart by the name alone."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A document records who produced it.
conditions_does_not_apply_when: The document records no producer.
artifact_contract_output_type: attribution
artifact_contract_required_data:
  - the actor name
  - the kind of actor
artifact_contract_verified_by: the actor name follows the convention of its kind
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
status: active
revision: 1
---

# Name the actor by its convention
Actors follow the convention `<producer>/<version>` for tools, `human:<id>` for people, and `process:<id>` for automated processes.
Only supply a `{by, at}` mapping yourself if you need to override it.
