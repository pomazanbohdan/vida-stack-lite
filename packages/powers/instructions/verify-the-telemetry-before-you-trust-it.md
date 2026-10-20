---
instruction_id: verify-the-telemetry-before-you-trust-it
title: Verify the telemetry before you trust it
summary: "Instrumentation is code, so it is proven by inducing an error, sending traffic and diagnosing a failure from the telemetry alone."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: Telemetry has been added or changed and its behaviour is about to be relied on.
conditions_does_not_apply_when: No telemetry was added or changed.
artifact_contract_output_type: telemetry-verification-record
artifact_contract_required_data:
  - the induced error and where it was found
  - the test traffic and the series it produced
  - the request followed end to end
  - the failure diagnosed from telemetry alone
artifact_contract_verified_by: all four checks were run against the current build and the induced failure was diagnosed without reading the source
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/observability-checklist.md
status: active
revision: 1
---

# Verify the telemetry before you trust it
Instrumentation is code; it can be wrong:
Forced an error in staging → found it in the logs by correlation ID
Sent test traffic → metric series appear with expected labels and sane values
Followed one request end-to-end in the tracing UI → no broken spans
An induced failure was diagnosed from telemetry alone, without reading the source
