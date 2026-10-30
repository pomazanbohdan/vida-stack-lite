---
instruction_id: classify-each-guardrail-as-online-or-offline
title: Classify each guardrail as online or offline
summary: "A catastrophic guardrail runs on every request; a quality signal is sampled in a batch, and the set stays small because each one costs latency."
capability_tags:
  - define-quality-bar
pattern_tags:
  - control-tiering
conditions_applies_when: Guardrails are defined for a system.
conditions_does_not_apply_when: The system has no guardrails.
artifact_contract_output_type: guardrail-set
artifact_contract_required_data:
  - the online guardrails
  - the offline signals
artifact_contract_verified_by: every guardrail is classified and the number of guardrails is minimal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-eval-planner.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-eval-planner.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Classify each guardrail as online or offline
Online guardrail (catastrophic) → runs on every request, real-time, must be fast
Offline flywheel (quality signal) → sampled batch, feeds improvement loop
Keep guardrails minimal — each adds latency.
