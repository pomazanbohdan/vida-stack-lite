---
instruction_id: get-the-read-back-approved-before-you-write
title: Get the read-back approved before you write
summary: "Nothing is written until the user has approved a read-back of what will be built, and later work follows that plan."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - approval-policy-gate
conditions_applies_when: "A tool, a skill or a change is about to be written."
conditions_does_not_apply_when: The user has already approved the plan in this conversation.
artifact_contract_output_type: approved-read-back
artifact_contract_required_data:
  - what will be built
  - what changes
  - what stays
  - the approval
artifact_contract_verified_by: "the approval came before any file was written, and later work follows the approved read-back"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/discover.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/edit.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/modes/convert.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/approaches/lean.md
status: active
revision: 1
---

# Get the read-back approved before you write
Nothing is written to disk until the user has approved a read-back of what will be built.
Present, and wait for a yes or changes:
The read-back lists what will change and nothing is touched before approval:
The user can change it at any point afterwards; a change redoes only what it touches.
One read-back, then wait: what changes, what stays, whether the shape changes (a menu added to a plain skill, memory added to an agent), whether the description changes. A description change is a trigger change; say so.
Show the draft and the description in chat before writing any further file, because a user who moves the bar now saves every file written after it.
