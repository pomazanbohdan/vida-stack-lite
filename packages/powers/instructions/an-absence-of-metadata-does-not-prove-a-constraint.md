---
instruction_id: an-absence-of-metadata-does-not-prove-a-constraint
title: An absence of metadata does not prove a constraint
summary: "A project that declares nothing is silent about every version, so the silence proves nothing; only a falsification attempt settles it."
capability_tags:
  - research-primary-sources
pattern_tags:
  - empty-result-policy
conditions_applies_when: A compatibility claim rests on a declaration that is missing.
conditions_does_not_apply_when: The project states an explicit range or an upper bound.
artifact_contract_output_type: research-note
artifact_contract_required_data:
  - the claim
  - the evidence
  - the falsification attempt
artifact_contract_verified_by: the claim was not upgraded on the strength of an absence and a falsification attempt was made
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-phase-researcher.md
status: active
revision: 1
---

# An absence of metadata does not prove a constraint
Absence is silence about **every** value, not a constraint on one:
a project declaring no supported versions says nothing about the version you want *and* nothing about the version you are standardizing on
speaks only about the versions it lists and stays silent on yours, so it is still a governed absence unless the project states the list is exhaustive
The only route from an absence to `[VERIFIED]` is a **positive falsification attempt**: run it against the real target and **paste the failing output**
asserting that you ran it does not earn the tag
