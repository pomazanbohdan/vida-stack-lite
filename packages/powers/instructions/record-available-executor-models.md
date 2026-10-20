---
instruction_id: record-available-executor-models
title: Record available executor models
summary: "During setup, list the providers and models that are actually selectable, and record which model serves each role."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "The environment is being configured, or the set of available models and providers changed."
conditions_does_not_apply_when: A current inventory exists and nothing changed the models.
artifact_contract_output_type: executor-inventory
artifact_contract_required_data:
  - providers
  - models
  - families
  - role assignments
  - availability confirmation
artifact_contract_verified_by: every recorded model is selectable in the environment
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=automations/benny/skills/setup-benny/SKILL.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-help/SKILL.md
status: active
revision: 1
---

# Record available executor models
During setup, record which models and providers are actually available, and which model serves each role.
Use only model identifiers you have confirmed as available in this environment. Never write an identifier you have not confirmed.
The setup rule applies to new sessions; a changed model choice has no effect in a session that already started.
Ask for or confirm a model for each working role: verification, review, exploration, implementation, and any role the workflow defines.
A role set to auto or inherit-parent runs on the session's model. Say so, because that is how Auto users stay on Auto.
Record the provider and model family alongside each identifier, so the executor ladder can avoid a shared failure point.
When no model rule exists, every role keeps its default model. Say that explicitly rather than implying a choice was made.
State the reasoning budget that applies, and note that a shorter panel or a smaller budget runs fewer subagents.
Confirm each recorded model is selectable in the current environment before relying on it.
If a recorded model is unavailable, check the family and use the closest valid identifier, then update the record and say what changed.
Keep the inventory outside the delivered package when it is user-owned, so a refresh cannot overwrite it.
Prefer committed, secret-free configuration in the target repository when a fresh run must read it.
Reference the committed path only after confirming it is committed in the repository where the run executes.
Report the providers, the models, the role assignments, and the confirmation that each model is selectable.
