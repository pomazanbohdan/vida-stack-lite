---
instruction_id: verify-the-telemetry-you-added
title: Verify the telemetry you added
summary: Trigger the paths and look at the real output before calling the instrumentation done.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: "You have added logging, metrics, traces or alerts and are about to call the work done."
conditions_does_not_apply_when: Nothing was instrumented.
artifact_contract_output_type: telemetry-verification
artifact_contract_required_data:
  - the induced failure
  - the record that was found
  - the alert that was fired
artifact_contract_verified_by: "an induced failure is located through telemetry alone, without reading the source"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 1
---

# Verify the telemetry you added

Instrumentation is code; it can be wrong.
Before calling the work done, trigger the paths and look at the actual output:

- Force an error in staging → find it in the logs by `requestId`, confirm fields are structured (not `[object Object]`)
- Send test traffic → confirm metric series appear with the expected labels and sane values
- Follow one request across services in the tracing UI → no broken spans
- Fire each new alert once (lower the threshold temporarily) → confirm it reaches the right channel and the runbook link works
