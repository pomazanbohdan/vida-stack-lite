---
instruction_id: treat-the-skill-body-as-an-instruction-surface
title: Treat the skill body as an instruction surface
summary: "A skill body is copied verbatim into the agent's instruction context and is never scanned; what it says is what the agent will do."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A body of text is shipped as a skill that agents will read.
conditions_does_not_apply_when: The text is an inert document no agent reads.
artifact_contract_output_type: skill-body
artifact_contract_required_data:
  - the skill body
  - the instruction it will become
artifact_contract_verified_by: "the body was written as an instruction someone would defend, knowing nothing scans it"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/develop-a-capability.md
status: active
revision: 1
---

# Treat the skill body as an instruction surface
A skill your Capability declares is not an inert asset. Its `SKILL.md` body is copied **verbatim** into the user's runtime skills directory at install, where it becomes an agent-invocable instruction file. GSD does **not** scan it: there is no content inspection of any kind, at install or at any later point. What you write is what reaches the agent.
**Write instructions you would be comfortable defending.** Your reach is bounded only by what the agent will do when told.
