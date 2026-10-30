---
instruction_id: settle-the-decisions-in-conversation-before-you-plan
title: Settle the decisions in conversation before you plan
summary: "The decisions that shape the work are captured in a short conversation with the person who owns them, before the plan is written, so the plan is not built on a guess."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A piece of work is about to be planned and the open decisions are not settled.
conditions_does_not_apply_when: Every decision is already recorded and agreed.
artifact_contract_output_type: decision-capture
artifact_contract_required_data:
  - the decisions that are open
  - who settles them
  - the record the plan reads
artifact_contract_verified_by: the decisions were settled in conversation and recorded before the plan was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/the-phase-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Settle the decisions in conversation before you plan
- Planning cannot begin until you know *how* to build the thing, not just *what* to build.
- Without a Discuss step, the planner must make these calls itself. Sometimes it guesses right. Often it guesses plausibly but wrongly — producing a plan that is coherent but misaligned with your actual preferences.
- The Discuss step is deliberately lightweight. It is a conversation, not a specification exercise.
