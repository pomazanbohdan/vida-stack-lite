---
instruction_id: escalate-only-what-the-agent-cannot-do
title: Escalate only what the agent cannot do
summary: "The handover to a human contains account creation, secret retrieval and dashboard configuration and nothing else."
capability_tags:
  - author-setup-scripts
pattern_tags:
  - scope-routing
conditions_applies_when: A piece of work needs an external service.
conditions_does_not_apply_when: "The external service needs no account, secret or dashboard configuration."
artifact_contract_output_type: human-setup-list
artifact_contract_required_data:
  - the environment variables and their sources
  - the dashboard configuration steps
artifact_contract_verified_by: every listed item needs a human in a browser and no automatable step is listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/phase-prompt.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/user-setup.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/user-setup.compact.md
status: active
revision: 1
---

# Escalate only what the agent cannot do
**The automation-first rule:** `user_setup` contains ONLY what Claude literally cannot do:
Account creation (requires human signup)
Secret retrieval (requires dashboard access)
Dashboard configuration (requires human in browser)
**NOT included:** Package installs, code changes, file creation, CLI commands Claude can run.
