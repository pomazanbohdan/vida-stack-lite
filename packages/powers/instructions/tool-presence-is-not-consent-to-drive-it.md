---
instruction_id: tool-presence-is-not-consent-to-drive-it
title: Tool presence is not consent to drive it
summary: "A tool that happens to be available is not a licence to use it; the operator has to have opted in, and without that the manual path stays exactly as it was."
capability_tags:
  - detect-the-run-mode
pattern_tags:
  - safe-defaults
conditions_applies_when: An external tool is present in the session and could be driven.
conditions_does_not_apply_when: The operator turned the tool on for this purpose.
artifact_contract_output_type: tool-use-decision
artifact_contract_required_data:
  - the tool that is present
  - the opt-in that is missing or present
  - the path that was taken
artifact_contract_verified_by: the tool was driven only when the operator had opted in and the manual path was unchanged otherwise
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work/steps/automated-ui-verification.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Tool presence is not consent to drive it
**Both conditions are required — tool presence alone is not sufficient.**
A project may have a Chrome-family browser MCP configured for entirely unrelated work; it must not be driven here unless the operator opted in.
This key is default-off.
If automated verification is not available, fall back to the standard manual checkpoint questions defined in this workflow unchanged.
