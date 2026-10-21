---
instruction_id: escalate-the-whole-review-not-the-one-file
title: "Escalate the whole review, not the one file"
summary: "One sensitive file raises the depth of the entire review, so a sensitive file is never reviewed shallowly."
capability_tags:
  - review-code
pattern_tags:
  - control-tiering
conditions_applies_when: A rule escalates the review depth for a sensitive path.
conditions_does_not_apply_when: No rule matches the files under review.
artifact_contract_output_type: review-depth-decision
artifact_contract_required_data:
  - the sensitive path
  - the resolved depth
  - the rule that fired
artifact_contract_verified_by: the review ran at the raised depth and the rule that raised it is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/scope-code-review-depth-by-path.md
status: active
revision: 1
---

# Escalate the whole review, not the one file
**Escalation is whole-review, not per-file.**
Depth is a single scalar handed to the reviewer agent; one matched sensitive file is enough to raise the whole review, so a sensitive file is never reviewed shallowly because it shared a phase with unrelated code.
A configured sensitive-path policy is not exempt from this downgrade — the same guard that downgrades `--depth=deep` on a large scope also downgrades a rule-sourced `deep`.
