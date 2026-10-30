---
instruction_id: ask-whether-memory-is-warranted-before-building-it
title: Ask whether memory is warranted before building it
summary: "Memory earns its place only when the work is daily for a month and the thirtieth session differs from the first; otherwise a stateless agent with standing facts serves, and the layers are asked for as questions."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: An agent that is supposed to remember between sessions is being designed.
conditions_does_not_apply_when: The agent already keeps state between sessions.
artifact_contract_output_type: shape-decision
artifact_contract_required_data:
  - the sessions in a month
  - what the thirtieth session adds
  - the layers asked for
artifact_contract_verified_by: the thirtieth session differs from the first
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/how-to-memory-agent.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/shape-memory-agent.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Ask whether memory is warranted before building it
asks whether memory is warranted: used daily for a month, would the thirtieth session differ from the first?
proposes a stateless agent with standing facts instead
The gradient comes as questions, not a menu: remember you between sessions; be given material to keep (transcripts, recordings, notes); be taught new things over time; work on its own on a schedule. Each yes adds a layer.
The agent writes nothing about you from config; everything comes from talking to you.
