---
instruction_id: place-a-rule-in-the-layer-that-matches-its-scope
title: Place a rule in the layer that matches its scope
summary: "Put each rule in the layer whose scope is the one it needs: every session, every workflow the agent dispatches, one workflow, several workflows, or the shared configuration."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - guidance-selection
conditions_applies_when: A rule has to hold in more than one place and the layers of the installation have different scopes.
conditions_does_not_apply_when: There is only one layer and one place the rule can live.
artifact_contract_output_type: rule-placement
artifact_contract_required_data:
  - the rule
  - the layer
  - the scope it owns
artifact_contract_verified_by: each rule sits in the layer that matches how often it must apply
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/customize/adopt-bmad-across-a-team.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/team-adoption.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Place a rule in the layer that matches its scope
The rule applies wherever an engineer does dev work: customize the **dev agent**.
The rule applies only to one workflow, such as writing a product brief: customize **that workflow**.
The change alters who is on the roster, or a path the whole team shares: edit **central config**.
For a rule that should hold in a plain chat with no skill active, restate it there too, if it is short enough to repeat.
Keep the IDE file short. The model reads it every turn.
A rule for every workflow an agent runs goes on the agent skill: persona, style, principles, facts, menu.
A rule for one workflow goes on that workflow skill:
