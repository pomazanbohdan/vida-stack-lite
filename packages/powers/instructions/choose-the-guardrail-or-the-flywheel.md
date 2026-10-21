---
instruction_id: choose-the-guardrail-or-the-flywheel
title: Choose the guardrail or the flywheel
summary: A behaviour whose failure would be catastrophic is guarded online and immediately; the rest is measured offline in batches.
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: A behaviour is monitored in a running system.
conditions_does_not_apply_when: The behaviour is verified before release only.
artifact_contract_output_type: monitoring-mode
artifact_contract_required_data:
  - the question that decided the mode
  - the mode
  - what the mode does when the behaviour breaks
artifact_contract_verified_by: the mode follows from the stated consequence of the failure
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/ai-evals.md
status: active
revision: 1
---

# Choose the guardrail or the flywheel
Ask: "If this behavior goes wrong, would it be catastrophic for my business?"
Yes → Guardrail — run online, real-time, with immediate intervention (block, escalate, hand off). Be selective: guardrails add latency.
No → Flywheel — run offline as batch analysis feeding system refinements over time.
