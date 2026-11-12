---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-docs-customize-run-multi-agent-discussions-md-a5f6bdc4-c01"
title: "bmad-method: docs/customize/run-multi-agent-discussions.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:docs/customize/run-multi-agent-discussions.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"docs/customize/run-multi-agent-discussions.md\"}"
atom_ids:
  - make-a-persona-unmistakable
  - stop-the-repetition-and-the-fake-disagreement
atom_count: 2
atoms: "[{\"atom_id\":\"make-a-persona-unmistakable\",\"file_sha256\":\"e77b775f79d881ef1b78c88f9b4a9dcd5ec2e5e6a3a8d3cfedef023fcd971218\",\"content_sha256\":\"26b1869ca078a16f6d097e2a76a6b104d77b1eb25470d002cedce9e39cc79493\",\"file_bytes\":2489,\"body_bytes\":1027},{\"atom_id\":\"stop-the-repetition-and-the-fake-disagreement\",\"file_sha256\":\"64dba08cea99772e3c17104d04f950007c5257ff3bab183af4bb4b76d241179f\",\"content_sha256\":\"dd120e5a7e5a5d378c7078805d70fc0f3be5d2e66cee6dd0c518b887fd778130\",\"file_bytes\":1616,\"body_bytes\":477}]"
carrier_sha256: b6a31119f9038abe84cb393de11a2f4e4e5fd94430422e7924c7fc8fc0295ebc
carrier_bytes: 4364
revision: 1
status: active
---
<!-- vpmodule:atom:begin make-a-persona-unmistakable -->
---
instruction_id: make-a-persona-unmistakable
title: Make a persona unmistakable
summary: "Give a persona the way it talks, what it values and how it argues, and set the scene in one freeform line."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A cast of personas is being written for a discussion or a review panel.
conditions_does_not_apply_when: A single fixed reviewer or agent is being described.
artifact_contract_output_type: persona-cast
artifact_contract_required_data:
  - the persona
  - the scene
  - the way it argues
artifact_contract_verified_by: "each member names how it talks, what it values and how it argues"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/customize/run-multi-agent-discussions.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/agent/shape.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/memory-agent/shape.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body specifies agent persona and skill customization but does not ground a supported substantive domain; labeling it product or UX would infer beyond the body.
---

# Make a persona unmistakable
Personas make a member unmistakable: how they talk, what they value, how they argue.
"Skeptical CFO" is a placeholder.
"Won't approve anything without a payback under eighteen months, and says so first" is a persona.
Scenes set the stage in one freeform line: the setting, what is happening, who is hostile to whom, who pushes hardest.
Define a member once and drop them into different rooms.
The leanness bar stops at the persona.
The identity, the communication style and the principles are what the agent judges by when no capability fits; cutting them makes a worse agent.
Write them, and the persona paragraph in `SKILL.md`, in its own voice, one or two sentences each: an identity with a concrete reference, a style with a simile, three to five principles, each a stance.
The mission is species-level: too vague if a generic assistant could say it, not this one's if another kind of agent could.
Style, principles and menus belong in the sanctum; judge it by what leaked in, not its weight.
<!-- vpmodule:atom:end make-a-persona-unmistakable -->
<!-- vpmodule:atom:begin stop-the-repetition-and-the-fake-disagreement -->
---
instruction_id: stop-the-repetition-and-the-fake-disagreement
title: Stop the repetition and the fake disagreement
summary: "Make the room raise objections, check claims and stop the repetition, and return the decision to the human instead of taking a vote."
capability_tags:
  - disagree-with-reasons
pattern_tags:
  - reasoned-disagreement
conditions_applies_when: A multi-voice discussion starts repeating itself or agreeing too easily.
conditions_does_not_apply_when: A single reviewer is judging a change.
artifact_contract_output_type: room-discipline
artifact_contract_required_data:
  - the objection raised
  - the claim checked
  - the decision returned
artifact_contract_verified_by: the room raised objections and returned the decision instead of taking a vote
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/customize/run-multi-agent-discussions.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
  - operations
---

# Stop the repetition and the fake disagreement
It is not a voting body: it raises objections, checks claims, stops repetition, and returns the decision to you.
Option generator — suggests alternative problem statements, assumptions, and examples.
Claim checker — checks support, missing information, and confidence.
Loop stopper — stops repetition, fake disagreement, and unsupported speculation.
Consensus challenger — questions easy agreement and ignored tradeoffs.
<!-- vpmodule:atom:end stop-the-repetition-and-the-fake-disagreement -->