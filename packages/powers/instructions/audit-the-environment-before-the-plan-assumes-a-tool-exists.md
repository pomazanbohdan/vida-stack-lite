---
instruction_id: audit-the-environment-before-the-plan-assumes-a-tool-exists
title: Audit the environment before the plan assumes a tool exists
summary: "Every external tool the work needs is checked on the machine, and each missing one gets a fallback or is called out as blocking."
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - project-conventions-first
conditions_applies_when: A piece of work depends on tools or services outside the project.
conditions_does_not_apply_when: "The work touches only the project's own code and configuration."
artifact_contract_output_type: environment-audit
artifact_contract_required_data:
  - the dependencies
  - their availability
  - their fallback
artifact_contract_verified_by: every dependency was probed and each missing one has a fallback or is marked blocking
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-phase-researcher.md
status: active
revision: 1
---

# Audit the environment before the plan assumes a tool exists
Plans that assume a tool is available without checking lead to silent failures at execution time.
Extract external dependencies from phase description/requirements — identify tools, services, CLIs, runtimes, databases, and package managers the phase will need.
Available, wrong version: Tool found but version too old → document upgrade path
Missing, blocking: Not found, no fallback → planner must address (install step, or descope feature)
