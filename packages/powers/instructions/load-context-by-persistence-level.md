---
instruction_id: load-context-by-persistence-level
title: Load context in order of persistence
summary: Curate what the agent sees and order it from the most persistent source to the most transient one.
capability_tags:
  - curate-context
pattern_tags:
  - bounded-artifact-reading
conditions_applies_when: The material an agent will see is being assembled for a task or a session.
conditions_does_not_apply_when: The material is fixed and small enough to be read whole.
artifact_contract_output_type: context-plan
artifact_contract_required_data:
  - the levels loaded
  - what each level carries
  - when each level is loaded
artifact_contract_verified_by: every level of the hierarchy is loaded at its own trigger
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/context-engineering/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Load context in order of persistence

Feed agents the right information at the right time. Context is the single biggest lever for agent output quality — too little and the agent hallucinates, too much and it loses focus. Context engineering is the practice of deliberately curating what the agent sees, when it sees it, and how it's structured.

Structure context from most persistent to most transient:

```
┌─────────────────────────────────────┐
│  1. Rules Files (rules file)        │ ← Always loaded, project-wide
├─────────────────────────────────────┤
│  2. Spec / Architecture Docs        │ ← Loaded per feature/session
├─────────────────────────────────────┤
│  3. Relevant Source Files            │ ← Loaded per task
├─────────────────────────────────────┤
│  4. Error Output / Test Results      │ ← Loaded per iteration
├─────────────────────────────────────┤
│  5. Conversation History             │ ← Accumulates, compacts
└─────────────────────────────────────┘
```
