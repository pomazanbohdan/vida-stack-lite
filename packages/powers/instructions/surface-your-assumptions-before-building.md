---
instruction_id: surface-your-assumptions-before-building
title: Surface your assumptions before building
summary: "State the assumptions about requirements, architecture and scope before the work starts, and let them be corrected."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "A non-trivial piece of work is about to start, or a specification is about to be written."
conditions_does_not_apply_when: The change is a single-line fix with no assumption behind it.
artifact_contract_output_type: assumption-list
artifact_contract_required_data:
  - the assumptions
  - the correction request
artifact_contract_verified_by: the assumptions are stated before the implementation starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/spec-driven-development/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/using-agent-skills/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/list-phase-assumptions.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Surface your assumptions before building
Before implementing anything non-trivial, explicitly state your assumptions.

Before writing any spec content, list what you're assuming:

ASSUMPTIONS I'M MAKING:
1. [assumption about requirements]
2. [assumption about architecture]
3. [assumption about scope]
→ Correct me now or I'll proceed with these.

Don't silently fill in ambiguous requirements. The most common failure mode is making wrong assumptions and running with them unchecked. Surface uncertainty early — it's cheaper than rework.

The spec's entire purpose is to surface misunderstandings *before* code gets written — assumptions are the most dangerous form of misunderstanding.

## Red Flags

- Starting to write code without any written requirements
- Asking "should I just start building?" before clarifying what "done" means

Surface the assumptions across five areas: the technical approach, the implementation order, the scope boundaries (in, out and ambiguous), the risk areas and the dependencies.
Mark each assumption with its confidence: fairly confident, assuming, or unclear.
This is an analysis of what you think, not an intake of what the user knows - it produces no file and only a conversation.
Ask whether the assumptions are accurate, and fold the corrections into the understanding before continuing.
