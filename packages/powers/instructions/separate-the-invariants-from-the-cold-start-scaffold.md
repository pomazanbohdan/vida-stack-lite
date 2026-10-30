---
instruction_id: separate-the-invariants-from-the-cold-start-scaffold
title: Separate the invariants from the cold-start scaffold
summary: "The contract holds only the invariants that keep separately built units aligned; everything structural is a seed the code owns, and the rest is deferred with its reason."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A consistency contract is being written for parts of a system that are built separately.
conditions_does_not_apply_when: The contract is a general design document rather than a cross-unit consistency contract.
artifact_contract_output_type: consistency-contract
artifact_contract_required_data:
  - the invariants
  - the paradigm
  - the seed
  - the deferred decisions
artifact_contract_verified_by: the invariants and the seed are in separate places and the deferred decisions carry a reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-architecture/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-architecture/assets/spine-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Separate the invariants from the cold-start scaffold
You produce a consistency contract that fixes only the **invariants** keeping independently-built units from diverging — the design paradigm, the boundary and dependency rules, how state is mutated, who owns shared data — the durable calls a future builder *can't* read off compliant code.
Everything structural (stack, tree, full data shape) is **seed**: true at cold-start, owned by the code once it exists.
Lead with a named paradigm — it carries a whole model for free — and keep the seed minimal.
Decisions intentionally pushed down, each with the reason it can wait
