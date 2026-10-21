---
instruction_id: name-the-failure-mode-not-the-mechanism-in-the-reason
title: "Name the failure mode, not the mechanism, in the reason"
summary: A reason that repeats the label states nothing; it names what breaks if the decision fires wrongly and what breaks if it stays silent.
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A policy choice has to be justified in writing.
conditions_does_not_apply_when: The choice has no trade-off to state.
artifact_contract_output_type: justification
artifact_contract_required_data:
  - what breaks if the decision fires wrongly
  - what breaks if it stays silent
artifact_contract_verified_by: the reason names both failure modes instead of restating the label
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/declare-a-hook-crash-policy.md
status: active
revision: 1
---

# Name the failure mode, not the mechanism, in the reason
**A useful reason names the failure mode, not the mechanism.** "Fails open" restates what `ALLOW` already means. What the code cannot say is *why this hook, specifically*: what breaks if it fires wrongly (a legitimate call blocked) versus what breaks if it stays silent (a narrow threat model, a check that runs again downstream, an advisory that was never load-bearing). Write the trade-off, not the translation.
