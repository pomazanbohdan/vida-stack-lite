---
instruction_id: constrain-the-form-and-not-the-reasoning
title: Constrain the form and not the reasoning
summary: "Bound the length and the stance of a reply and leave the substance to the worker, because scripted reasoning produces lifeless answers."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "A delegated reply has to stay short, react to what was said, and still carry an independent point of view."
conditions_does_not_apply_when: The task is mechanical and the substance is fully specified anyway.
artifact_contract_output_type: bounded-reply
artifact_contract_required_data:
  - the length bound
  - the stance
  - the substance left to the worker
artifact_contract_verified_by: the reply is short and reactive and still reaches its own conclusion
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-party-mode/references/mode-subagent.md
status: active
revision: 1
---

# Constrain the form and not the reasoning
Trust their *thinking*: let them decide what to read and how to reach a view; don't script their substance with do-and-don't checklists — that's what produces lifeless blobs.
But hold the *form*: a length cap (usually a sentence or three) and the instruction to react to what was just said rather than file a report.
Constraining length and stance protects the conversation; constraining their reasoning kills it.
Stay in character throughout
