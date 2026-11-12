---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-toolsmith-skill-md-92449a37-c01"
title: "bmad-method: skills/bmad-toolsmith/SKILL.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmad-toolsmith/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-toolsmith/SKILL.md\"}"
atom_ids:
  - get-the-read-back-approved-before-you-write
  - let-the-shape-surface-from-the-answers
  - load-a-route-file-only-when-its-branch-is-reached
  - run-the-lenses-and-fix-what-they-find
atom_count: 4
atoms: "[{\"atom_id\":\"get-the-read-back-approved-before-you-write\",\"file_sha256\":\"229dd1a381955a053cb0a1fb93d1758df6ad2ea6425a436c8b138371b6291059\",\"content_sha256\":\"47efc8d34c41b671d3834ea1d9bf0dd5e043905d5164665f237ac0d74ea1f724\",\"file_bytes\":2340,\"body_bytes\":707},{\"atom_id\":\"let-the-shape-surface-from-the-answers\",\"file_sha256\":\"9bfa7ba8eacd49a4fc4e41f2f99ba4c5b1c253490600d8e439007ac6f1dd3d23\",\"content_sha256\":\"66348920add55bf0099f4f1f5c687a030abf29c6fbe79dc52b66733aa9085bb9\",\"file_bytes\":1655,\"body_bytes\":508},{\"atom_id\":\"load-a-route-file-only-when-its-branch-is-reached\",\"file_sha256\":\"bcd9f8d765cdf0ea8f078382e9e69b2ff2e639c49fc4956b5fbf1bc89db0067c\",\"content_sha256\":\"8df33531d9b99a25a0fc22506df6eff2dfc20ce1fe5db5e068e0b747f535dd48\",\"file_bytes\":1750,\"body_bytes\":421},{\"atom_id\":\"run-the-lenses-and-fix-what-they-find\",\"file_sha256\":\"4c1853564c7ec4e1ae4adaa09100d6643808c4feba59076561ab0d833b9d9835\",\"content_sha256\":\"3417c6c6d9897ef0ee47dff0e60a2b8e900a4b877df99ce40cb23cebf7d8b2a7\",\"file_bytes\":2497,\"body_bytes\":1003}]"
carrier_sha256: bac465729581af5debd2335eab7ced17d02ac0311b6b706aedd8dd674a74d1b7
carrier_bytes: 8807
revision: 1
status: active
---
<!-- vpmodule:atom:begin get-the-read-back-approved-before-you-write -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/discover.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/modes/edit.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/modes/convert.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/approaches/lean.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Get the read-back approved before you write
Nothing is written to disk until the user has approved a read-back of what will be built.
Present, and wait for a yes or changes:
The read-back lists what will change and nothing is touched before approval:
The user can change it at any point afterwards; a change redoes only what it touches.
One read-back, then wait: what changes, what stays, whether the shape changes (a menu added to a plain skill, memory added to an agent), whether the description changes. A description change is a trigger change; say so.
Show the draft and the description in chat before writing any further file, because a user who moves the bar now saves every file written after it.
<!-- vpmodule:atom:end get-the-read-back-approved-before-you-write -->
<!-- vpmodule:atom:begin let-the-shape-surface-from-the-answers -->
---
instruction_id: let-the-shape-surface-from-the-answers
title: Let the shape surface from the answers
summary: "The shape of a tool is a conclusion drawn from what the user said, not a menu offered to them."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The form of the thing being built is decided.
conditions_does_not_apply_when: The form was fixed by the user or by the platform.
artifact_contract_output_type: chosen-shape
artifact_contract_required_data:
  - the shape
  - the answers it was drawn from
artifact_contract_verified_by: the shape is named with the reason the conversation led to it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/discover.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
---

# Let the shape surface from the answers
The shape surfaces on its own from those answers: a persona with a menu of things it does is an agent; a persona whose capabilities teams must change without forking is a rendered agent; memory across sessions is a memory agent; teams swapping steps without forking is a rendered skill; mostly deterministic work is a script-backed utility; shipping with other skills or needing its own config questions is a module.
The shape of a skill is a conclusion, not a menu.
<!-- vpmodule:atom:end let-the-shape-surface-from-the-answers -->
<!-- vpmodule:atom:begin load-a-route-file-only-when-its-branch-is-reached -->
---
instruction_id: load-a-route-file-only-when-its-branch-is-reached
title: Load a route file only when its branch is reached
summary: "One route file at a time: a file is loaded when its branch fires, never ahead of the conversation that needs it."
capability_tags:
  - curate-context
pattern_tags:
  - progressive-disclosure
  - bounded-artifact-reading
conditions_applies_when: A document is split into route files or reference files.
conditions_does_not_apply_when: The whole document is small enough to load at once.
artifact_contract_output_type: route-loading
artifact_contract_required_data:
  - the branch that fired
  - the file loaded for it
artifact_contract_verified_by: no file is loaded before the branch that needs it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/lenses/lens-architecture.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=tools/skill-validator.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Load a route file only when its branch is reached
One route file at a time. Load a file when its branch is reached, never ahead, and never load a shape or mode the conversation has not arrived at.
A route or step file loaded ahead of its branch:
- Important; the model pays for text it may never need
A step must not load or read future step files until the current step is complete. Load each step when it is reached.
<!-- vpmodule:atom:end load-a-route-file-only-when-its-branch-is-reached -->
<!-- vpmodule:atom:begin run-the-lenses-and-fix-what-they-find -->
---
instruction_id: run-the-lenses-and-fix-what-they-find
title: Run the lenses and fix what they find
summary: "Every file-writing path ends with the lenses over what was written, every defect they name is applied, and a judgment call is left alone."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
  - review-fix-application-policy
conditions_applies_when: A tool or a skill has been written and is about to be handed over.
conditions_does_not_apply_when: Nothing was written in this session.
artifact_contract_output_type: lens-round
artifact_contract_required_data:
  - the lenses run
  - the findings applied
  - the judgment calls left
  - the rounds run
artifact_contract_verified_by: "every defect finding was applied, the judgment calls were left, and the lenses were re-run after a critical or important fix"
compatibility_excludes:
  - keep-review-read-only
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/ship.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/modes/review.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Run the lenses and fix what they find
Launch one subagent per lens, in parallel
If subagents are unavailable, run the lenses inline one at a time and say so.
Apply what is a defect against the standards or the canon's tests: a path that does not resolve, a description without its `Use when` or past its two parts, a declared customization value the body never reads, prose doing a script's work, a line a capable model follows unasked. Apply every leanness finding too, its `proposed_smallest` included: the lean version is the default, and the check below guards it. Leave what is a judgment call: a persona line, a split into two skills. Never apply a finding that undoes the approved read-back (name, purpose, shape, location) without asking. When an Important or Critical finding was fixed, run the lenses once more; stop after two rounds.
Every path that writes files ends by loading the shipping step, where the lenses run over what was written and it fixes what they find before handing over.
<!-- vpmodule:atom:end run-the-lenses-and-fix-what-they-find -->