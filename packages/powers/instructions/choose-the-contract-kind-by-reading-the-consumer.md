---
instruction_id: choose-the-contract-kind-by-reading-the-consumer
title: Choose the contract kind by reading the consumer
summary: "The kind of a declared contract is a measured fact about the consumer, not a style preference."
capability_tags:
  - audit-codebase
pattern_tags:
  - decision-trail
conditions_applies_when: A declared contract row has to be given its kind.
conditions_does_not_apply_when: The consumer is not known yet.
artifact_contract_output_type: contract-kind-decision
artifact_contract_required_data:
  - the consumer
  - the line that waits for the producer
  - the chosen kind
artifact_contract_verified_by: the chosen kind names the mechanism the consumer actually uses
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-contract-drift-findings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Choose the contract kind by reading the consumer
Every row declares exactly one of three kinds, and the kind is a **measured fact about the consumer**, not a style preference:
To decide, open the consumer and find the line that waits for the agent. If it greps a marker string → `sentinel-match`. If it reads a file or queries a CLI → `artifact+query`. If it parses the return message → `structured-return`.
