---
instruction_id: ask-only-what-no-scan-can-answer
title: Ask only what no scan can answer
summary: "Interview the owner only for what no scan reaches, in small batches, and never hand back a selection problem the scan created."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - requirements-clarification
conditions_applies_when: The instructions of a repository are being written and the owner is being interviewed.
conditions_does_not_apply_when: Nothing is being asked of the owner.
artifact_contract_output_type: interview
artifact_contract_required_data:
  - the gaps
  - the questions
  - the batches
artifact_contract_verified_by: no question could have been answered by the scan
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-project-context/SKILL.md
status: active
revision: 1
---

# Ask only what no scan can answer
Only what no scan reaches: what agents keep getting wrong here, what is off limits, what a domain term means, why a constraint exists.
Never ask what a scan could answer.
Asking the user to confirm a path-checked claim, or one a config file already states, is a defect.
Ask recall questions, not review lists.
Never hand the user a selection problem a scan created.
A mistake this session made and caught is observed evidence — offer it.
Batches of at most eight; fewer is better.
A batch yielding nothing new means write.
