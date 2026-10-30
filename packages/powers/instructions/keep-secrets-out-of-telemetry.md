---
instruction_id: keep-secrets-out-of-telemetry
title: Keep secrets and personal data out of telemetry
summary: "Allowlist the fields you emit and never log secrets, tokens, passwords or full personal data."
capability_tags:
  - redact-sensitive-data
pattern_tags:
  - data-minimization
conditions_applies_when: "You add or review a log line, a metric field, a span attribute or a trace payload."
conditions_does_not_apply_when: The telemetry carries no sensitive value.
artifact_contract_output_type: field-allowlist
artifact_contract_required_data:
  - the allowed fields
  - the rejected fields
artifact_contract_verified_by: "the actual emitted output contains no secret, token or unredacted personal value"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Keep secrets and personal data out of telemetry

**Never log secrets, tokens, passwords, or full PII.**
Telemetry pipelines are a classic data-leak path.
Allowlist fields; don't log whole request bodies.
- [ ] No secrets, tokens, or unredacted PII in any log line (spot-check actual output)
