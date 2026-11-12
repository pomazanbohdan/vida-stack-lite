---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-brainstorming-references-finalize-md-817f5f1c-c01"
title: "bmad-method: skills/bmad-brainstorming/references/finalize.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmad-brainstorming/references/finalize.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-brainstorming/references/finalize.md\"}"
atom_ids:
  - do-not-pour-the-artefact-into-a-template
  - hand-back-the-mirror-before-adding-connections
  - write-the-handoff-for-the-next-tool
atom_count: 3
atoms: "[{\"atom_id\":\"do-not-pour-the-artefact-into-a-template\",\"file_sha256\":\"afed017d6a16cda96d81bbf5b514d9cc9d9cf95a16d7b012fc9d00f2e1c32c5b\",\"content_sha256\":\"efed1f951516814e8b358daff55f17b085caf55eb122b6518e172e33eccd8a56\",\"file_bytes\":1503,\"body_bytes\":340},{\"atom_id\":\"hand-back-the-mirror-before-adding-connections\",\"file_sha256\":\"fd2e45677d5c2297fefa3e9075f19aa413804ab9ee4ed67707efe9e8ead19a58\",\"content_sha256\":\"15c8a3e1fdb7e6bee2533a23cfb3b7a141b6d5ab3178c89309efe5910d33e93b\",\"file_bytes\":1733,\"body_bytes\":588},{\"atom_id\":\"write-the-handoff-for-the-next-tool\",\"file_sha256\":\"1cc93966312b1e954aee3a678f99668dfb6ba8a568aa1215ba47b9f426d6e3cd\",\"content_sha256\":\"24f72a7cc8b25e99684850e5f940493f36f7d83448202f61702a2901787c918a\",\"file_bytes\":1647,\"body_bytes\":503}]"
carrier_sha256: 61e8108682ae3039f857d5085a2365ba64b71f4fcb7cd2596225a7a229eb0f86
carrier_bytes: 5298
revision: 1
status: active
---
<!-- vpmodule:atom:begin do-not-pour-the-artefact-into-a-template -->
---
instruction_id: do-not-pour-the-artefact-into-a-template
title: Do not pour the artefact into a template
summary: "The deliverable is a genuine artefact and not a report poured into a template: the subject, the energy and the whimsy of the session drive its form."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A session ends with a deliverable that could be produced from a template.
conditions_does_not_apply_when: The deliverable is a fixed record with a fixed shape.
artifact_contract_output_type: session-artefact
artifact_contract_required_data:
  - the artefact
  - the form the subject of the session drove
artifact_contract_verified_by: the artefact could not have been produced from the same template for a different subject
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/finalize.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - design-ux
---

# Do not pour the artefact into a template
A genuine creative artifact, not a report poured into a template.
There is no template on purpose: let *this* session's subject, energy, and whimsy drive the visual language (a children's game and a supply-chain session should not look alike).
Inline all CSS and any JS; no external dependencies.
<!-- vpmodule:atom:end do-not-pour-the-artefact-into-a-template -->
<!-- vpmodule:atom:begin hand-back-the-mirror-before-adding-connections -->
---
instruction_id: hand-back-the-mirror-before-adding-connections
title: Hand back the mirror before adding connections
summary: The user gets their own ideas reflected back and connects them first; only then does the coach add the connections they would miss.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - explore-then-exploit
conditions_applies_when: An ideation session reaches the point where the ideas are pulled together.
conditions_does_not_apply_when: The session produced nothing to reflect back.
artifact_contract_output_type: mirror-then-connections
artifact_contract_required_data:
  - the reflection of their ideas
  - the connections added afterwards
artifact_contract_verified_by: the reflection comes before the connections and the user was asked what they see
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/finalize.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Hand back the mirror before adding connections
In Facilitator mode this is the one place your own creative contribution is welcome
Hand them the mirror first.
Ask what they see now: conclusions, synergies, themes, the few that actually matter.
Let them connect first; their own pattern-recognition is the point.
Then add the connections they would miss.
Lean in creatively — not new raw ideas, but the non-obvious links: this idea from technique one quietly solves that tension from technique four; these three are one idea wearing three hats; this wildcard is the real breakthrough.
<!-- vpmodule:atom:end hand-back-the-mirror-before-adding-connections -->
<!-- vpmodule:atom:begin write-the-handoff-for-the-next-tool -->
---
instruction_id: write-the-handoff-for-the-next-tool
title: Write the handoff for the next tool
summary: "The handoff carries the chosen and critical discoveries only, structured to drop straight into the next tool, with none of the report bloat."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A session ends and its result has to be handed to another tool.
conditions_does_not_apply_when: No downstream tool is going to read the result.
artifact_contract_output_type: handoff-document
artifact_contract_required_data:
  - the chosen discoveries
  - the critical ones
  - the points that matter downstream
artifact_contract_verified_by: the document holds only the discoveries that matter downstream and nothing of the report bloat
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/finalize.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Write the handoff for the next tool
The chosen and critical discoveries only, structured to drop straight into a downstream skill as clean input, with none of the report's bloat - token usage matters and it must really be on point.
When the next step is requirements, the downstream skill is Sofia (`bmad-agent-po`): hand her the intent and the decisions, not a rewritten brief.
Confirm what the user wants to capture as the intent from the overall findings as there may be many divergent discoveries
<!-- vpmodule:atom:end write-the-handoff-for-the-next-tool -->