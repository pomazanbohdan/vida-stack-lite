---
instruction_id: keep-the-agent-facing-docs-current
title: Keep the agent-facing docs current
summary: "Conventions, specs, decision records and inline gotchas are what an agent reads; keep them current so it builds the right thing and does not re-decide."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "A convention, a spec, a decision or a known trap changed, and an agent will act on it."
conditions_does_not_apply_when: The change is internal to one implementation and carries no guidance.
artifact_contract_output_type: agent-docs-update
artifact_contract_required_data:
  - "the convention, spec, decision or gotcha that changed"
  - where it is written
  - that it is current
artifact_contract_verified_by: an agent reading the current document gets the current rule
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/documentation-and-adrs/SKILL.md
status: active
revision: 1
---

# Keep the agent-facing docs current

Special consideration for AI agent context:

- **Rules files** — Document project conventions so agents follow them
- **Spec files** — Keep specs updated so agents build the right thing
- **ADRs** — Help agents understand why past decisions were made (prevents re-deciding)
- **Inline gotchas** — Prevent agents from falling into known traps

**Red Flags**

- "Nobody reads docs" Agents do. Future engineers do. Your 3-months-later self does.
