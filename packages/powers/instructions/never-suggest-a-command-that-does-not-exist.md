---
instruction_id: never-suggest-a-command-that-does-not-exist
title: Never suggest a command that does not exist
summary: "Only the routes that exist are offered; a command name is never invented or hallucinated, and an internal step is never offered as a command."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy
conditions_applies_when: The next step is presented to the user as a choice of routes.
conditions_does_not_apply_when: The route was named by the user.
artifact_contract_output_type: route-menu
artifact_contract_required_data:
  - the routes that exist
  - the route that is recommended
artifact_contract_verified_by: every offered route exists and the recommended one is marked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/offer-next.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never suggest a command that does not exist
Only suggest the commands listed above. Do not invent or hallucinate command names.
