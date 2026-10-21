---
instruction_id: surface-what-you-already-know-before-you-gather-new-context
title: Surface what you already know before you gather new context
summary: "Before new context is gathered, what is already stored about the topic is brought up, and the gathering is skipped when the store cannot answer."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A discussion or investigation is about to gather new material.
conditions_does_not_apply_when: There is nothing stored about the topic.
artifact_contract_output_type: recall-first
artifact_contract_required_data:
  - what was recalled
  - the topic it was recalled for
  - what happened when the store was unreachable
artifact_contract_verified_by: the prior knowledge was surfaced before anything new was gathered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/mempalace/fragments/recall-discuss.md
status: active
revision: 1
---

# Surface what you already know before you gather new context
- Otherwise — before gathering new context, surface what you already know. This is read-only and side-effect-free; if MemPalace is unreachable, note "memory unavailable" and continue — recall never blocks discussion.
- In every mode an unreachable palace falls back to native memory — recall never blocks.
