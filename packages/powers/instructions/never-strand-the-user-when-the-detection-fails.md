---
instruction_id: never-strand-the-user-when-the-detection-fails
title: Never strand the user when the detection fails
summary: "When the situation cannot be detected, the run falls back to reading the state directly or to the progress route, and never errors out and leaves the user without a next step."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: The detection of the current situation can fail or return nothing usable.
conditions_does_not_apply_when: The detection always returns a usable result.
artifact_contract_output_type: fallback-routing
artifact_contract_required_data:
  - the failure of the detection
  - the recovery that was applied
  - the line the user was shown
artifact_contract_verified_by: the user was told what happened and given a route forward
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/smart-entry.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Never strand the user when the detection fails
**Fallback (never strand the user):** `smart-entry --json` can fail for two reasons, and each has a different recovery.
Parse `SNAPSHOT`; if it is empty, not valid JSON, or missing `actions`, apply the first matching recovery below — do NOT error.
**Recover by reading state directly:**
Print one line first: `smart-entry unavailable (gsd-tools error) — reading state directly.`
Print one line first: `smart-entry unavailable — showing progress.`
