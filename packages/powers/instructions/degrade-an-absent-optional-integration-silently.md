---
instruction_id: degrade-an-absent-optional-integration-silently
title: Degrade an absent optional integration silently
summary: "An optional integration that is not present is a silent no-op: the step is skipped without a warning and without a failure, and the primary output stays."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: A workflow step calls an integration that may not be installed.
conditions_does_not_apply_when: The integration is present and used.
artifact_contract_output_type: optional-integration-outcome
artifact_contract_required_data:
  - the integration that was looked for
  - whether it was present
  - the primary output
artifact_contract_verified_by: the run neither warned nor failed and the primary output was produced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/extract-learnings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Degrade an absent optional integration silently
If no such tool is present, the step is a silent no-op
If not available (no MCP server in the session exposes this tool, or the runtime does not support it), skip the step silently and continue.
The workflow must not fail or warn — this is expected behavior for users who do not run a knowledge-base MCP.
