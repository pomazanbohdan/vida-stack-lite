---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-docs-plan-define-requirements-and-a-specification-md-b1eaad91-c01"
title: "bmad-method: docs/plan/define-requirements-and-a-specification.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:docs/plan/define-requirements-and-a-specification.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"docs/plan/define-requirements-and-a-specification.md\"}"
atom_ids:
  - specify-the-what-and-the-boundaries-not-the-how
  - work-backwards-from-the-finished-product
atom_count: 2
atoms: "[{\"atom_id\":\"specify-the-what-and-the-boundaries-not-the-how\",\"file_sha256\":\"47b8a31b0254a5066c97e46f6a17ae79fccb27864aaa0f8d39ef5d89b74ee9cd\",\"content_sha256\":\"7f941a7afcc8384564b2596a4347bcca60eab9d968d82cd282537f9837e6ab3b\",\"file_bytes\":2036,\"body_bytes\":605},{\"atom_id\":\"work-backwards-from-the-finished-product\",\"file_sha256\":\"5c00d0fe175ca2b96965986714d0ef2ce070f2c42318cfccda1b9b8bc5f32d1e\",\"content_sha256\":\"8b88220dd76c8c8c60c75d80e1aeaaa746d61d5cf471f1edab3f2e33ac2e6d2d\",\"file_bytes\":2489,\"body_bytes\":949}]"
carrier_sha256: c1f5b2a3aa9386ec2424c78193f18ae3c5466ddf47b03405af34234ea32d11dd
carrier_bytes: 4814
revision: 1
status: active
---
<!-- vpmodule:atom:begin specify-the-what-and-the-boundaries-not-the-how -->
---
instruction_id: specify-the-what-and-the-boundaries-not-the-how
title: "Specify the what and the boundaries, not the how"
summary: "The plan states what is broken, why it matters and the approach; the how is left to the implementer behind boundaries and examples."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The intent and the boundaries of a change are written down.
conditions_does_not_apply_when: The change has no intent to state.
artifact_contract_output_type: intent-and-boundaries
artifact_contract_required_data:
  - the problem and why it matters
  - the approach
  - the invariant rules
  - the forbidden approaches
artifact_contract_verified_by: "the plan says what and where the limits are, and does not prescribe the how"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/plan-template.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/define-requirements-and-a-specification.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spec-phase.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
---

# Specify the what and the boundaries, not the how
Never over-specify "how" — use boundaries + examples instead.
What is broken or missing, and why it matters. Then the high-level approach — the "what", not the "how".
Cohesive cross-layer changes (DB+BE+UI) stay in ONE file.
Two tiers: Always = invariant rules. Never = out of scope + forbidden approaches.
The PRD describes capabilities, not implementation: features grouped, with functional requirements under stable IDs and non-functional requirements in their own section.
Technical choices go to `addendum.md`.
Do NOT ask about HOW to implement
<!-- vpmodule:atom:end specify-the-what-and-the-boundaries-not-the-how -->
<!-- vpmodule:atom:begin work-backwards-from-the-finished-product -->
---
instruction_id: work-backwards-from-the-finished-product
title: Work backwards from the finished product
summary: "Stress-test a product concept by writing the press release announcing the finished product first, then answering the customer and the internal questions; a concept that cannot be announced is not ready."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - working-backwards
conditions_applies_when: A product concept is being tested before anything is built.
conditions_does_not_apply_when: The product already exists and the work is a change to it.
artifact_contract_output_type: concept-announcement
artifact_contract_required_data:
  - the announcement of the finished product
  - the customer questions and their answers
  - the internal questions and their answers
artifact_contract_verified_by: "the announcement could be written and every question has an honest, specific answer"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-prfaq/references/verdict.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/define-requirements-and-a-specification.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - business
---

# Work backwards from the finished product
Write the press release announcing the finished product before building it.
If you can't write a compelling press release, the product isn't ready.
The customer FAQ validates the value proposition from the outside in.
The internal FAQ addresses feasibility, risks, and hard trade-offs.
Amazon's Working Backwards method where you write the finished-product press release first, then answer the hardest customer and stakeholder questions.
The point is forcing clarity before committing resources.
The user walks in with an idea. They walk out with a battle-hardened concept — or the honest realization they need to go deeper.
Both are wins.
If the user wants to revise, loop back to the relevant stage.
Solution-first and technology-first openings get redirected to the customer's problem.
Vague answers get challenged.
When you are stuck it offers concrete reframings rather than repeating the question.
<!-- vpmodule:atom:end work-backwards-from-the-finished-product -->