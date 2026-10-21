---
instruction_id: enumerate-the-whole-surface-and-record-every-opt-out
title: Enumerate the whole surface and record every opt-out
summary: The whole surface is listed first and every exclusion is a decision with a reason; the record is what the next round starts from.
capability_tags:
  - assess-change-impact
pattern_tags:
  - exhaustive-path-enumeration
conditions_applies_when: "A surface — an interface, an integration, a set of capabilities — is taken on."
conditions_does_not_apply_when: The surface was enumerated and decided in an earlier round.
artifact_contract_output_type: coverage-matrix
artifact_contract_required_data:
  - every element of the surface
  - the decision per element
  - the reason for every exclusion
artifact_contract_verified_by: every element has a decision and every exclusion has a reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/api-coverage.md
status: active
revision: 1
---

# Enumerate the whole surface and record every opt-out
Full coverage is the default starting position; the coverage matrix is the *subtraction record*.
Every gap is an explicit, reasoned opt-out rather than a surprise.
INTEGRATE is the default. Every capability starts as INTEGRATE.
Every OPT-OUT MUST carry a one-line reason
An opt-out without a reason is an un-decided hole — the exact failure mode this gate exists to close.
Do not carry over the first integration's opt-outs silently — re-decide each capability for the new surface
The matrix is the durable subtraction record.
