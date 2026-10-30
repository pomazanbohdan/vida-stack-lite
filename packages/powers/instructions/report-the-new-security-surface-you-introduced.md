---
instruction_id: report-the-new-security-surface-you-introduced
title: Report the new security surface you introduced
summary: "A change that opened an endpoint, an auth path or a trust boundary is reported even when the plan did not mention it."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: The change added a surface the plan did not describe.
conditions_does_not_apply_when: The change opened no new surface.
artifact_contract_output_type: task-report
artifact_contract_required_data:
  - the new surface
  - the file
artifact_contract_verified_by: every new surface outside the plan is listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-executor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Report the new security surface you introduced
Before writing the SUMMARY, check if any files created/modified introduce security-relevant surface NOT in the plan's `<threat_model>` — new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries.
Omit section if nothing found.
