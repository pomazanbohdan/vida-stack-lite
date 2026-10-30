---
instruction_id: stamp-the-log-entry-with-the-real-session-id-and-time
title: Stamp the log entry with the real session id and time
summary: "Each entry carries the session id the environment supplied and a local-time ISO 8601 stamp; an unavailable id is written as unavailable, never invented."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A log entry is written.
conditions_does_not_apply_when: The log format carries no session field at all.
artifact_contract_output_type: review-log
artifact_contract_required_data:
  - the session id
  - the ISO 8601 timestamp with local timezone
artifact_contract_verified_by: "the session id is the one the environment supplied, and an unavailable one is written as unavailable"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-walkthrough/templates/log-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Stamp the log entry with the real session id and time
Record the actual session ID supplied by the environment and an ISO 8601 timestamp with local timezone for each entry. If the session ID is unavailable, write "unavailable" rather than inventing one.
