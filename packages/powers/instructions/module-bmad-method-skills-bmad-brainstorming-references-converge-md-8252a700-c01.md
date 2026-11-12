---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-brainstorming-references-converge-md-8252a700-c01"
title: "bmad-method: skills/bmad-brainstorming/references/converge.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-brainstorming/references/converge.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-brainstorming/references/converge.md\"}"
atom_ids:
  - include-the-buried-ideas-when-you-reflect-the-field-back
  - keep-divergence-and-convergence-apart
atom_count: 2
atoms: "[{\"atom_id\":\"include-the-buried-ideas-when-you-reflect-the-field-back\",\"file_sha256\":\"b8a4bcd1158a29db88929ca187efcf73956a1e4e555b1dbbb354fe5fe97ea295\",\"content_sha256\":\"5df0963265dd23dd30a65d08e67b78eacf2eb3bd4b754f5dc5e841c94e8185f0\",\"file_bytes\":1643,\"body_bytes\":361},{\"atom_id\":\"keep-divergence-and-convergence-apart\",\"file_sha256\":\"00fd1dcb41dd352520715b17db2b8614b4043894458f2a76f6f97561f7459167\",\"content_sha256\":\"0a74f1734ec7fe89f86ed349be0f2fea6cd41d55227daa342d74fd68bf88f9b9\",\"file_bytes\":1598,\"body_bytes\":326}]"
carrier_sha256: f068ea02b6ef93272e7e1a005579d129857dd7daeaa8c1bfc753049dd13d274e
carrier_bytes: 3542
revision: 1
status: active
---
<!-- vpmodule:atom:begin include-the-buried-ideas-when-you-reflect-the-field-back -->
---
instruction_id: include-the-buried-ideas-when-you-reflect-the-field-back
title: Include the buried ideas when you reflect the field back
summary: "The field reflected back to the user includes the odd and buried ideas from earlier, not only the recent obvious ones."
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: The ideas of a session are pulled back for the user to judge.
conditions_does_not_apply_when: The session produced a single idea and nothing to sample.
artifact_contract_output_type: reflected-field
artifact_contract_required_data:
  - the sampled ideas
  - the buried ones that were included
artifact_contract_verified_by: "the reflection includes ideas from earlier in the session, not only the recent ones"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/finalize.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/converge.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Include the buried ideas when you reflect the field back
Reflect a vivid sampling of *their* ideas back — deliberately include the odd, random, or buried ones from earlier, not just the recent obvious ones
pull the live candidates from the session log (include the odd and buried ones, not just the recent obvious ones) so there's a concrete set to work on
<!-- vpmodule:atom:end include-the-buried-ideas-when-you-reflect-the-field-back -->
<!-- vpmodule:atom:begin keep-divergence-and-convergence-apart -->
---
instruction_id: keep-divergence-and-convergence-apart
title: Keep divergence and convergence apart
summary: Generation and narrowing are deliberate opposites and keeping them apart is the point; premature judgement is what kills good ideas.
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: An ideation session moves from generating to narrowing.
conditions_does_not_apply_when: The session never generates and only narrows an existing set.
artifact_contract_output_type: phase-separation
artifact_contract_required_data:
  - the phase the session was in
  - the moment the narrowing started
artifact_contract_verified_by: no narrowing happened while ideas were still flowing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/converge.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body describes a generic transition between idea generation and narrowing without grounding it in a supported domain; assigning product, design, research, or business would infer the ideation subject."
---

# Keep divergence and convergence apart
The whole catalog is *divergent* by design (it generates); this is the deliberate opposite phase, and keeping the two apart is the point.
Never run convergence while ideas are still flowing, and never let it leak into a generating batch — premature judgment is what kills good ideas.
<!-- vpmodule:atom:end keep-divergence-and-convergence-apart -->