---
instruction_id: admit-a-new-condition-only-with-a-consumer-and-a-computable-fact
title: Admit a new condition only with a consumer and a computable fact
summary: A new condition enters the vocabulary only when a marked section needs it and the fact it reads can be computed ahead of the evaluation; otherwise it stays out.
capability_tags:
  - harden-validation
pattern_tags:
  - verified-loading
conditions_applies_when: A new condition is proposed for the vocabulary.
conditions_does_not_apply_when: A section already needs the condition and its fact is computed.
artifact_contract_output_type: condition-admission
artifact_contract_required_data:
  - the consuming section
  - the fact the condition reads
  - the entry point that computes it
artifact_contract_verified_by: the condition has a consuming section and a fact that is computed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/workflow-fragments.md
status: active
revision: 1
---

# Admit a new condition only with a consumer and a computable fact
- An atom only ships once it clears **two independent admission gates**, both required:
- **A named consuming section.** Some workflow's marked section actually needs the condition — an atom with no section that uses it is dead vocabulary, and dead vocabulary is how a closed list rots into an open one.
- **A fact the init seam can actually compute.**
- Only a workflow with a dedicated `cmdInit*` entry point (see [The manifest artifact](#the-manifest-artifact-and-per-workflow-keying) below) can carry a manifest, and only a condition that entry point can resolve at init time — from parsed CLI options or from `.planning/` state — may become an atom.
