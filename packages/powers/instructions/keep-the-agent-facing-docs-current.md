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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/agent-contracts.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/documentation-generation.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Keep the agent-facing docs current

Special consideration for AI agent context:

- **Rules files** — Document project conventions so agents follow them
- **Spec files** — Keep specs updated so agents build the right thing
- **ADRs** — Help agents understand why past decisions were made (prevents re-deciding)
- **Inline gotchas** — Prevent agents from falling into known traps

**Red Flags**

- "Nobody reads docs" Agents do. Future engineers do. Your 3-months-later self does.
Update this table whenever an agent's return contract changes -- a stale row is a violation the check will report, not something to leave for later.
an auditable exemption, never deleted and never silently passed.
System MUST verify generated documentation against actual implementation
