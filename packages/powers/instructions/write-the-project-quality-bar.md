---
instruction_id: write-the-project-quality-bar
title: "Write the project's quality bar as a written contract"
summary: "Record the project's bar in one written file with a floor, numbered dimensions, measured metrics and exceptions, and point the agent instructions at it."
capability_tags:
  - define-quality-bar
pattern_tags:
  - quality-bar-contract
conditions_applies_when: "The project has no written quality bar, or the bar needs to be recorded with numbers."
conditions_does_not_apply_when: The project already has a written constraints file and the user is not changing it.
artifact_contract_output_type: quality-bar-document
artifact_contract_required_data:
  - floor rules
  - dimensions with numbers
  - the command behind each dimension
  - where each dimension runs
  - measured metrics with a direction
  - exceptions with owner and expiry
  - pointer from the agent instructions
artifact_contract_verified_by: "the constraints file exists, the agent instructions point at it, and the floor passes on the current codebase"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/constraint-driven-development/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Write the project's quality bar as a written contract

This skill produces something different: a written record of **this project's** bar, with numbers, that outlives the conversation and can be checked mechanically.

One file at the repo root. Any agent on any harness can read it, and a change to it shows up in review where it belongs.

**Floor (always enforced, no setup required)**

- No new suppression comments
- No unimplemented stubs
- No skipped or deleted tests without a reason in the commit message
- No secrets in source
- This file does not get weakened to make a change pass

**Enforced with numbers**

| Dimension | Rule | Checked by | Runs at |
|-----------|------|-----------|---------|

**Measured, not yet enforced**

| Metric | Today | Direction |
|--------|-------|-----------|

**Exceptions**

| ID | Rule | Path | Reason | Owner | Expires |
|----|------|------|--------|-------|---------|

Then add one line to the agent instructions file: read the constraints file before writing code, and do not weaken it to make a change pass.

The commands now live in two places — the `Checked by` column in the constraints file and these scripts. The constraints file is the canonical source: it carries the reason alongside each command and it shows up in review. The scripts are convenience wrappers that must mirror it, not a second source of truth; if they drift, the file wins.
