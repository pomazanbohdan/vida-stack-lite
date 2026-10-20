---
instruction_id: record-the-assumptions-made-without-the-user
title: Record the assumptions made without the user
summary: "A headless run decides alone, so every choice it made alone is written into the Assumptions section and the acceptance fail-safe still applies."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
  - unattended-execution
  - code-audit
conditions_applies_when: A retrospective runs without a person to answer.
conditions_does_not_apply_when: The person confirmed the choices and they are recorded where the person confirmed them.
artifact_contract_output_type: assumptions-record
artifact_contract_required_data:
  - every choice made without the user
  - the machine verdict
artifact_contract_verified_by: "the Assumptions section names every choice made without the user, and none was invented as a confirmation"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/workflow.md
status: active
revision: 1
---

# Record the assumptions made without the user
Headless mode.
Skip every confirmation, take the epic from the invocation, never open the team discussion, render the verdict on the evidence alone, and record each assumption made without the user (which epic was selected, the machine verdict, each proposed item) into the retrospective document's Assumptions section so the audit trail survives.
The Phase 4 acceptance fail-safe still applies in headless runs.
Headless with nothing named stops and reports.
The offer of finished epics
is a human convenience, not an automation contract.
