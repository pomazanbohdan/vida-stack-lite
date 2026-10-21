---
instruction_id: probe-the-domain-without-running-the-checklist
title: Probe the domain without running the checklist
summary: A technology area is probed with the two or three most relevant questions to surface assumptions the user did not consider.
capability_tags:
  - clarify-requirements
pattern_tags:
  - domain-language
conditions_applies_when: The user names a technology area and the design is still open.
conditions_does_not_apply_when: The technology and its constraints are already settled.
artifact_contract_output_type: domain-probes
artifact_contract_required_data:
  - the technology area
  - the probes asked
  - the assumptions they surfaced
artifact_contract_verified_by: "two or three relevant probes were asked, not the whole list"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/domain-probes.md
status: active
revision: 1
---

# Probe the domain without running the checklist
When the user mentions a technology area, use these probes to ask insightful follow-up questions.
Don't run through them as a checklist -- pick the 2-3 most relevant based on context.
The goal is to surface hidden assumptions and trade-offs the user may not have considered yet.
