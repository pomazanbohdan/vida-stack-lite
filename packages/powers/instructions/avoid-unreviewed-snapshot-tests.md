---
instruction_id: avoid-unreviewed-snapshot-tests
title: Avoid snapshot tests nobody reviews
summary: Use a snapshot assertion only when every change to the snapshot is reviewed.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: A snapshot assertion is being added to a suite.
conditions_does_not_apply_when: The suite holds no snapshot assertion.
artifact_contract_output_type: snapshot-decision
artifact_contract_required_data:
  - snapshot assertion
  - reviewed on every change or not
  - alternative assertion
artifact_contract_verified_by: every snapshot assertion in the suite is reviewed on each change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/test-engineer.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Avoid snapshot tests nobody reviews
Avoid snapshot tests unless reviewing every change to the snapshot
