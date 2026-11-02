---
instruction_id: trace-the-commit-back-to-the-finding
title: Trace the commit back to the finding
summary: "Every fix commit names the finding it resolves, so the history and the report can be read together."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A fix for a finding is committed.
conditions_does_not_apply_when: The change is not a fix for a named finding.
artifact_contract_output_type: finding-commit-link
artifact_contract_required_data:
  - the finding identifier
  - the commit that resolves it
artifact_contract_verified_by: the commit message names the finding it resolves
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/audit-fix.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Trace the commit back to the finding
Commits atomically with finding IDs for traceability.
The commit message must include the finding ID
