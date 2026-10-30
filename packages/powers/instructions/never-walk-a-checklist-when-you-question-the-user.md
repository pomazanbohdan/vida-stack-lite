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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/questioning.md
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
