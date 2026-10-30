---
instruction_id: enforce-a-quality-gate-pipeline
title: Enforce a quality-gate pipeline
summary: "No change reaches production without passing tests, lint, type checking and build, and no gate is skipped."
capability_tags:
  - automate-rule-enforcement
pattern_tags:
  - automated-enforcement
conditions_applies_when: "A project has automated checks, or a change must be verified before it ships."
conditions_does_not_apply_when: The work is a local experiment that is never shipped.
artifact_contract_output_type: quality-gate-pipeline
artifact_contract_required_data:
  - the gates in order
  - the rule that a failure blocks the change
artifact_contract_verified_by: a failing gate blocks the change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/ci-cd-and-automation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Enforce a quality-gate pipeline
Automate quality gates so that no change reaches production without passing tests, lint, type checking, and build. CI/CD is the enforcement mechanism for every other skill — it catches what humans and agents miss, and it does so consistently on every single change.

Every change goes through these gates before merge:

**No gate can be skipped.** If lint fails, fix lint — don't disable the rule. If a test fails, fix the code — don't skip the test.
