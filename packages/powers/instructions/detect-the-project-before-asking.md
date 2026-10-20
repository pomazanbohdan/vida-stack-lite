---
instruction_id: detect-the-project-before-asking
title: Detect the project before you ask
summary: "Read the manifest, runner, lint, coverage, CI and harness first, report the finding in two lines, and then ask at most four questions that each carry a usable default."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "The project's quality bar is being set and its current state can be read from the repository."
conditions_does_not_apply_when: "The project's state is already known and recorded."
artifact_contract_output_type: project-detection
artifact_contract_required_data:
  - "the manifest, runner, lint config, coverage, CI and harness that were read"
  - the two-line finding
  - the questions asked
  - the default behind each question
artifact_contract_verified_by: no question asks for something the repository already states
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/constraints.md
status: active
revision: 1
---

# Detect the project before you ask
1. **Detect first.** Read package.json / pyproject.toml / go.mod, the test runner, existing lint configs, current coverage output, CI workflows, and the agent harness in use. Report what you found in two lines. Never ask for anything you can read.
2. **Interview, at most four questions.** One at a time, each with your best guess and a usable default so "I don't know" still produces a working config:
   - Which dimensions beyond the floor (coverage, security, performance, accessibility, architecture)
   - Block or warn when a check fails mid-task
   - Target numbers, or measure today's values and hold them
   - Slowest check tolerated before handing work back
