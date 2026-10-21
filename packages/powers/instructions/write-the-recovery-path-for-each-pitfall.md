---
instruction_id: write-the-recovery-path-for-each-pitfall
title: Write the recovery path for each pitfall
summary: Each pitfall also carries the steps that recover from it and what the recovery costs.
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: The pitfalls of a domain are written down.
conditions_does_not_apply_when: The pitfall cannot occur in this project.
artifact_contract_output_type: recovery-path
artifact_contract_required_data:
  - the pitfall
  - the recovery steps
  - the cost of the recovery
artifact_contract_verified_by: every pitfall carries its recovery steps and its recovery cost
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/research-project/PITFALLS.md
status: active
revision: 1
---

# Write the recovery path for each pitfall
When pitfalls occur despite prevention, how to recover.
| Pitfall | Recovery Cost | Recovery Steps |
