---
instruction_id: admit-a-rule-by-the-cost-of-not-having-it
title: Admit a rule by the cost of not having it
summary: "A line earns its place by what it costs the agent when it is missing, not by whether the agent could derive it."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A candidate rule is being considered for the instructions of a repository.
conditions_does_not_apply_when: The rule is a reference value the agent can read from the code at any time.
artifact_contract_output_type: admitted-rule
artifact_contract_required_data:
  - the rule
  - the cost of not having it
  - the point of use
artifact_contract_verified_by: the admission test names what the agent would do wrong without the line
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-project-context/references/best-practices.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Admit a rule by the cost of not having it
Not *could an agent derive this* but *what does it cost when it doesn't*: how much exploration finding it takes, how likely the agent is to search the right place in time rather than guess, whether it is available at the point of use or only after the mistake, what a retrieval failure costs — a wasted search, or corrupt data — and whether it is a rule that must hold or a detail the code already shows.
A line that stops the same rediscovery every session earns its place, derivable or not.
A stored copy of what the agent reads more accurately first-hand does not — it rots, and it is charged every session.
