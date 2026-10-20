---
instruction_id: ask-the-subagent-once-and-take-unsettled-questions-in-the-digest
title: Ask the subagent once and take what it could not settle in the digest
summary: "Each worker gets one message with nothing from the original ask, and whatever it could not settle comes back inside its digest rather than a second message."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A research worker is being dispatched.
conditions_does_not_apply_when: The worker has already been dispatched and is answering.
artifact_contract_output_type: single-message-dispatch
artifact_contract_required_data:
  - the one message sent
  - what the worker could not settle
  - where it landed
artifact_contract_verified_by: the worker received one message and every open point is in its digest
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/codebase.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/run.md
status: active
revision: 1
---

# Ask the subagent once and take what it could not settle in the digest
- No second message: what a subagent could not settle goes in its digest.
- One message, with nothing from the ask
- the return contract: a digest, not raw results
