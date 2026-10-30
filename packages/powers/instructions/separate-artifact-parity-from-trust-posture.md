---
instruction_id: separate-artifact-parity-from-trust-posture
title: Separate artifact parity from trust posture
summary: "What an extension is allowed to ship and what evidence it must produce before it runs are two separate questions, and permission to ship is never permission to be trusted."
capability_tags:
  - harden-security-controls
pattern_tags:
  - trust-graded-context
conditions_applies_when: An extension from an outside source is being admitted to a platform.
conditions_does_not_apply_when: "Only the platform's own shipped components are in scope."
artifact_contract_output_type: parity-vs-trust
artifact_contract_required_data:
  - what the extension may ship
  - the evidence and consent it must produce
  - what parity does not grant
artifact_contract_verified_by: the two questions are answered separately and parity was not read as trust
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/capability-trust-model.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Separate artifact parity from trust posture
- The maintainer's response to this is not to deny parity but to draw a sharp line between two things that are often conflated:
- **Artifact parity** — what a third-party capability is *allowed to ship*.
- **Trust posture** — the evidence and consent required before that capability *executes* on your machine.
- GSD grants full artifact parity. It does not grant symmetric trust.
