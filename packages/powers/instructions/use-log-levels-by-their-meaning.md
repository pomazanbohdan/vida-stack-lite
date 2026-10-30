---
instruction_id: use-log-levels-by-their-meaning
title: Use log levels by their meaning
summary: "Each level carries one meaning and one on-call action, and the level is chosen from that meaning."
capability_tags:
  - instrument-production-code
pattern_tags:
  - structured-observability
conditions_applies_when: You write a log statement and choose its level.
conditions_does_not_apply_when: "The level is dictated by the logging framework's own policy."
artifact_contract_output_type: level-policy
artifact_contract_required_data:
  - the level
  - its meaning
  - the on-call action it triggers
artifact_contract_verified_by: every new log statement uses the level that matches its meaning
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Use log levels by their meaning

Log levels — use them consistently:

| Level | Meaning | On-call action |
|---|---|---|
| `error` | Invariant broken; someone may need to act | Investigate |
| `warn` | Degraded but handled (retry succeeded, fallback used) | Watch for trends |
| `info` | Significant business event (order placed, job finished) | None |
| `debug` | Diagnostic detail | Off in production by default |
