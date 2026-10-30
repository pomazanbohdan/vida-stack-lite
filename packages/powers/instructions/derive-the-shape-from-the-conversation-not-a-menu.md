---
instruction_id: derive-the-shape-from-the-conversation-not-a-menu
title: "Derive the shape from the conversation, not from a menu"
summary: "The kind of thing to build is a conclusion of the conversation about purpose, user and output, named with one line of reason; the user is not asked to pick from a menu of shapes."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The kind of thing to build has to be decided before anything is written.
conditions_does_not_apply_when: The user has already named the shape and the conversation agrees with it.
artifact_contract_output_type: agent-skill-shape
artifact_contract_required_data:
  - the shape
  - the one line on why
  - the conversation it came from
artifact_contract_verified_by: the shape is a conclusion of the conversation and is named with a reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/shapes.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body chooses an artifact shape from purpose, user, and output in a conversation; the conditions identify no artifact subject, leaving all listed content domains unsupported."
---

# Derive the shape from the conversation, not from a menu
decides the shape from the conversation about purpose, user and output
and names it in the read-back with one line on why
Do not ask the user to pick a shape; a user who names one up front is heard
still says if the conversation points elsewhere
