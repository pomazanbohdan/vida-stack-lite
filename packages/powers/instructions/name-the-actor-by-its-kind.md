---
instruction_id: name-the-actor-by-its-kind
title: Name the actor by its kind
summary: "An identity recorded in a document is written as an agent with its version, a person, or an automated process, in one convention."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - trust-signals
conditions_applies_when: An identity is written into a field that records who or what acted.
conditions_does_not_apply_when: The field records a source or an asset rather than an actor.
artifact_contract_output_type: actor-identifier
artifact_contract_required_data:
  - the actor
  - the kind of actor
artifact_contract_verified_by: the identity follows the actor convention and a person is written with the person prefix
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name the actor by its kind
**Actor**: A string identifying who or what performed an action, using the convention `<producer>/<version>` for agents, `human:<id>` for people, and `process:<id>` for automated processes (see §7).
Fields that record an identity (`generated.by`, `verified[].by`) use a single actor convention:
# Name the actor by its convention
Actors follow the convention `<producer>/<version>` for tools, `human:<id>` for people, and `process:<id>` for automated processes.
Only supply a `{by, at}` mapping yourself if you need to override it.
