---
instruction_id: capture-the-journeys-the-user-narrates
title: Capture the journeys the user narrates
summary: "Ask the owner to narrate a real session with a named protagonist and structure the answer, instead of writing the journey yourself."
capability_tags:
  - plan-implementation
pattern_tags:
  - requirements-clarification
conditions_applies_when: The product has journeys worth capturing and the owner is present to narrate them.
conditions_does_not_apply_when: "The product is an internal tool with a single operator, a regulatory-only update or a hobby build with no user-facing flow."
artifact_contract_output_type: user-journeys
artifact_contract_required_data:
  - the named protagonist
  - "the entry state, path, climax and resolution"
  - the edge case
artifact_contract_verified_by: each journey is a named scene the owner narrated and not one the agent invented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/assets/prd-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
  - product
---

# Capture the journeys the user narrates
User Journeys are captured, not authored.
When UJs are warranted (consumer / multi-stakeholder B2B / meaningful UX — drop or downscale for internal tooling with a single operator role, regulatory-only updates, hobby/solo, pure technical PRDs), prompt the user to narrate a real session with a named protagonist (Mary, mom of three — not "the user") — what the person does, in what order, where it lands — then structure the answer into UJ-N form and confirm.
Persona context lives inline at the moments that matter; no standalone persona section.
Default shape: a named scene with entry state, path, climax, and resolution.
Each beat forces specificity the team would otherwise leave implicit — auth assumptions, screen order, what tells the user value landed.
Persona + context: one line, grounded enough to explain the *why*.
Entry state: authenticated? which surface? coming from where?
Path: 3-5 concrete beats — taps, screens, decisions.
Climax: the moment value is delivered and how the user knows.
Resolution: state they're left in, what's next.
