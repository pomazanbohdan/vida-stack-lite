---
instruction_id: write-a-durable-agent-brief
title: Write a durable agent brief
summary: "Write an agent brief that stays useful as the code moves: behavioral not procedural, durable over precise, with complete acceptance criteria and explicit scope boundaries."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: Work moves to a ready-for-agent state and another agent will pick it up.
conditions_does_not_apply_when: The work is done in the same session.
artifact_contract_output_type: agent-brief
artifact_contract_required_data:
  - current behavior
  - desired behavior
  - key interfaces
  - acceptance criteria
  - out of scope
artifact_contract_verified_by: "the brief names interfaces and behavior, cites no file paths or line numbers, and lists testable criteria"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/triage/AGENT-BRIEF.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spike-wrap-up.md
status: active
revision: 2
---

# Write a durable agent brief
An agent brief is a structured comment posted on an issue or PR when it moves to `ready-for-agent`. It is the authoritative specification that an AFK agent will work from. The original body and discussion are context: the agent brief is the contract.
The brief states **what the agent should do**, which stretches to both surfaces: for an issue, that's building the change from nothing; for a PR, it's what's left to do *to the existing diff*: finish it, close gaps, address review points. Same principles either way.
## Durability over precision
The issue may sit in `ready-for-agent` for days or weeks. The codebase will change in the meantime. Write the brief so it stays useful even as files are renamed, moved, or refactored.
- **Do** describe interfaces, types, and behavioral contracts
- **Do** name specific types, function signatures, or config shapes that the agent should look for or modify
- **Don't** reference file paths: they go stale
- **Don't** reference line numbers
- **Don't** assume the current implementation structure will remain the same
## Behavioral, not procedural
Describe **what** the system should do, not **how** to implement it. The agent will explore the codebase fresh and make its own implementation decisions.
## Complete acceptance criteria
The agent needs to know when it's done. Every agent brief must have concrete, testable acceptance criteria. Each criterion should be independently verifiable.
## Explicit scope boundaries
State what is out of scope. This prevents the agent from gold-plating or making assumptions about adjacent features.
write a reference file at `references/[feature-area-name].md` as an **implementation blueprint** — it should read like a recipe, not a research paper.
A future build session should be able to follow this and build the feature correctly without re-spiking anything.
