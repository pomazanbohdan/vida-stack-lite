---
instruction_id: make-the-acknowledged-baseline-shrink-only
title: Make the acknowledged baseline shrink-only
summary: "A recorded acknowledgement set ratchets down only: a stale entry fails as loudly as a new one."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - bar-weakening-detection
conditions_applies_when: A finding has to be acknowledged instead of fixed.
conditions_does_not_apply_when: The finding can be fixed now.
artifact_contract_output_type: acknowledged-baseline
artifact_contract_required_data:
  - the acknowledged sites
  - the stale entries that were removed
artifact_contract_verified_by: no acknowledged entry is older than the site it acknowledges and the baseline shrank
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-unreachable-guard-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Make the acknowledged baseline shrink-only
The baseline is **shrink-only**: a stale entry fails as loudly as a new one, so it cannot quietly become a parking lot.
The guard ships with a **zero-entry** baseline. Growing it is a real decision, not a way to make the build green — if you find yourself running `--update` because the finding is inconvenient, you are turning a gate back into a suggestion. Fix the site instead.
