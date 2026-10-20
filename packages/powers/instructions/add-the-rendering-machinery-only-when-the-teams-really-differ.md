---
instruction_id: add-the-rendering-machinery-only-when-the-teams-really-differ
title: Add the rendering machinery only when the teams really differ
summary: "The rendering machinery earns its place only when teams genuinely differ in which steps run; with one set of steps and a few settable values the skill stays plain, and template syntax in a skill that never renders is a defect."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A skill is offered to several teams that want it to run differently.
conditions_does_not_apply_when: All users run the same steps.
artifact_contract_output_type: shape-decision
artifact_contract_required_data:
  - the teams
  - the steps that differ
  - the switch mechanism
artifact_contract_verified_by: the machinery is only there because the teams genuinely differ
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/shape-rendered-skill.md
status: active
revision: 1
---

# Add the rendering machinery only when the teams really differ
It is worth the machinery only when teams genuinely differ in which steps run.
A skill with one set of steps and a few settable values is a plain skill with a `customize.toml`
nobody edits the skill, so the copies never drift
Jinja or `{{ }}` syntax in a skill that never renders is a defect the review catches, because the agent would read it verbatim.
