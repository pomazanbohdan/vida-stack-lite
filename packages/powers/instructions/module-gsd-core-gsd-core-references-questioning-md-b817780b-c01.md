---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-questioning-md-b817780b-c01"
title: "gsd-core: gsd-core/references/questioning.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/references/questioning.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/questioning.md\"}"
atom_ids:
  - never-walk-a-checklist-when-you-question-the-user
  - stop-the-option-picker-when-the-user-wants-to-type
  - switch-to-plain-text-when-the-user-wants-to-describe-in-their-own-words
atom_count: 3
atoms: "[{\"atom_id\":\"never-walk-a-checklist-when-you-question-the-user\",\"file_sha256\":\"5413c1fa5f658321d44b99c204b1e83813c92bfcf816c7c155096b8e94b57588\",\"content_sha256\":\"ecb8f669447a0a50b41a8e64c9148187460b83762198f08c12fe1ceb3d0c89bc\",\"file_bytes\":1949,\"body_bytes\":885},{\"atom_id\":\"stop-the-option-picker-when-the-user-wants-to-type\",\"file_sha256\":\"def28bc7f390a803ebd802b991307c1c1d7efceaf9d900907d5df51465677a31\",\"content_sha256\":\"1d99cbf7ed2baae403ccd58f33f0fbea6bc12f8583156942a16e675fa533ab58\",\"file_bytes\":1570,\"body_bytes\":451},{\"atom_id\":\"switch-to-plain-text-when-the-user-wants-to-describe-in-their-own-words\",\"file_sha256\":\"945e21866823e94aa05d944595f1efb3d1d7c733092a2a7dda002f24edd946eb\",\"content_sha256\":\"c1d24f7748316c1ff5819084bd5aeb062a044df0d68c5e7e84be25830b915378\",\"file_bytes\":1906,\"body_bytes\":706}]"
carrier_sha256: b341b77154936b694a021d16626120ecd4b767b96273be091446e1bce9ff97f7
carrier_bytes: 5938
revision: 1
status: active
---
<!-- vpmodule:atom:begin never-walk-a-checklist-when-you-question-the-user -->
---
instruction_id: never-walk-a-checklist-when-you-question-the-user
title: Never walk a checklist when you question the user
summary: "The questioning is a collaboration that follows the thread, not a checklist walked item by item."
capability_tags:
  - clarify-requirements
pattern_tags:
  - collaborative-dialogue
conditions_applies_when: The user is being asked for what they want.
conditions_does_not_apply_when: A fixed set of fields is being collected.
artifact_contract_output_type: questioning-session
artifact_contract_required_data:
  - the questions asked
  - the answer each one built on
artifact_contract_verified_by: the questions follow the thread and no domain was walked regardless of what was said
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/questioning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - design-ux
  - product
---

# Never walk a checklist when you question the user
**You are a thinking partner, not an interviewer.**
Don't interrogate. Collaborate. Don't follow a script. Follow the thread
**Challenge vagueness.** Never accept fuzzy answers. "Good" means what? "Users" means who? "Simple" means how?
**Checklist walking** — Going through domains regardless of what they said
**Canned questions** — "What's your core value?" "What's out of scope?" regardless of context
**Corporate speak** — "What are your success criteria?" "Who are your stakeholders?"
**Interrogation** — Firing questions without building on answers
**Rushing** — Minimizing questions to get to "the work"
**Shallow acceptance** — Taking vague answers without probing
**Premature constraints** — Asking about tech stack before understanding the idea
**User skills** — NEVER ask about user's technical experience
<!-- vpmodule:atom:end never-walk-a-checklist-when-you-question-the-user -->
<!-- vpmodule:atom:begin stop-the-option-picker-when-the-user-wants-to-type -->
---
instruction_id: stop-the-option-picker-when-the-user-wants-to-type
title: Stop the option picker when the user wants to type
summary: When the user answers in their own words the follow-up is plain text; the option picker resumes only after that answer is processed.
capability_tags:
  - clarify-requirements
pattern_tags:
  - human-in-the-loop
conditions_applies_when: The user chose the free-form option or answered in their own words.
conditions_does_not_apply_when: The user picked one of the offered options.
artifact_contract_output_type: freeform-continuation
artifact_contract_required_data:
  - the plain-text follow-up
  - the wait for the typed answer
artifact_contract_verified_by: the follow-up was asked in plain text and the picker resumed afterwards
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/questioning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - operations
---

# Stop the option picker when the user wants to type
**When the user wants to explain freely, STOP using AskUserQuestion.**
1. **Ask your follow-up as plain text** — NOT via AskUserQuestion
2. **Wait for them to type at the normal prompt**
3. **Resume AskUserQuestion** only after processing their freeform response
The same applies if YOU include a freeform-indicating option (like "Let me explain" or "Describe in detail") and the user selects it
<!-- vpmodule:atom:end stop-the-option-picker-when-the-user-wants-to-type -->
<!-- vpmodule:atom:begin switch-to-plain-text-when-the-user-wants-to-describe-in-their-own-words -->
---
instruction_id: switch-to-plain-text-when-the-user-wants-to-describe-in-their-own-words
title: Switch to plain text when the user wants to describe in their own words
summary: "As soon as the user signals that they want to answer in their own words, the option menu stops and the follow-up is asked in plain text."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The user replies with an open-ended answer instead of choosing an option.
conditions_does_not_apply_when: The user picked one of the offered options.
artifact_contract_output_type: plain-text-follow-up
artifact_contract_required_data:
  - the signal that stopped the menu
  - the plain-text question
artifact_contract_verified_by: the follow-up was asked in plain text and the menu resumed only after the freeform answer was processed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/questioning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Switch to plain text when the user wants to describe in their own words
**When the user wants to explain freely, STOP using**
the option menu.
If a user selects "Other" and their response signals they want to describe something in their own words (e.g. "let me describe it", "I'll explain", "something else", or any open-ended reply that isn't choosing/modifying an existing option), you MUST:
1. **Ask your follow-up as plain text** - NOT via
the option menu
2. **Wait for them to type at the normal prompt**
3. **Resume**
only after processing their freeform response
The same applies if YOU include a freeform-indicating option (like "Let me explain" or "Describe in detail") and the user selects it.
<!-- vpmodule:atom:end switch-to-plain-text-when-the-user-wants-to-describe-in-their-own-words -->