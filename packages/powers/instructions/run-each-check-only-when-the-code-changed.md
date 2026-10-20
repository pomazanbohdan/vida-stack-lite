---
instruction_id: run-each-check-only-when-the-code-changed
title: Run each check only when the code changed
summary: "Run a verification command after a change that could affect it, and do not repeat it while the code has not changed since."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
  - verification-rerun-policy
conditions_applies_when: A verification command has just run successfully and no code has changed since.
conditions_does_not_apply_when: "The code changed since the last run, so the check has to run again."
artifact_contract_output_type: check-trigger
artifact_contract_required_data:
  - the command that was run
  - the code change that triggered it
artifact_contract_verified_by: no command was repeated without an intervening code change
compatibility_excludes:
  - verify-before-completion
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/incremental-implementation/SKILL.md
status: active
revision: 2
---

# Run each check only when the code changed

Run each verification command after a change that could affect it. After a successful run, don't repeat the same command unless the code has changed since — re-running on unchanged code adds no information.

Running the same build/test command twice in a row without any intervening code change is a red flag.
