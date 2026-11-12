---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-build-step-01-clarify-and-route-md-f2252cb0-c01"
title: "bmad-method: skills/bmad-build/step-01-clarify-and-route.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-build/step-01-clarify-and-route.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-build/step-01-clarify-and-route.md\"}"
atom_ids:
  - judge-multi-goal-by-independent-shippable-deliverables
  - name-the-plan-file-after-the-intent
atom_count: 2
atoms: "[{\"atom_id\":\"judge-multi-goal-by-independent-shippable-deliverables\",\"file_sha256\":\"203bb071f6569e80b470d74808b340fe31f49feb771294fb45f088db7a868252\",\"content_sha256\":\"f9476f8fd678671fc1fa0db7356ff5d168e8290c10a21ed1de4860d142190b8f\",\"file_bytes\":2448,\"body_bytes\":1043},{\"atom_id\":\"name-the-plan-file-after-the-intent\",\"file_sha256\":\"734cf6c35b7f1ff12da6233b5d91a09be80b9cda33b91a9493da25a2e080d599\",\"content_sha256\":\"498de00f7331a4f110b2b305700ff7710cb0eead863a41c025d9d647d3f862a5\",\"file_bytes\":1553,\"body_bytes\":356}]"
carrier_sha256: 7dae0d72542bc08871ee93ed9c4ad898c37fc3feb590bad64f1e3cc82665648d
carrier_bytes: 4294
revision: 1
status: active
---
<!-- vpmodule:atom:begin judge-multi-goal-by-independent-shippable-deliverables -->
---
instruction_id: judge-multi-goal-by-independent-shippable-deliverables
title: Judge a multi-goal intent by independent shippable deliverables
summary: "Multi-goal means two or more top-level independent shippable deliverables; surface the goals, recommend one, and let the human split or keep them."
capability_tags:
  - clarify-requirements
pattern_tags:
  - code-minimization
conditions_applies_when: An incoming intent could carry more than one deliverable.
conditions_does_not_apply_when: The intent names one deliverable that happens to span several layers.
artifact_contract_output_type: goal-split-decision
artifact_contract_required_data:
  - the detected goals
  - why each qualifies as independently shippable
  - the coupling risk of a split
  - the recommended first goal
  - the decision of the human
artifact_contract_verified_by: the goals were listed and the human chose to split or to keep them all
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/workflow.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-01-clarify-and-route.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
---

# Judge a multi-goal intent by independent shippable deliverables

**Single goal**: One cohesive feature, even if it spans multiple layers/files. Multi-goal means >=2 **top-level independent shippable deliverables** — each could be reviewed, tested, and merged as a separate PR without breaking the others. Never count surface verbs, "and" conjunctions, or noun phrases. Never split cross-layer implementation details inside one user goal.

Split: "add dark mode toggle AND refactor auth to JWT AND build admin dashboard"

Don't split: "add validation and display errors" / "support drag-and-drop AND paste AND retry"

Multi-goal check (see SCOPE STANDARD). If the intent fails the single-goal criteria:

Present detected distinct goals as a bullet list.

Explain briefly (2–4 sentences): why each goal qualifies as independently shippable, any coupling risks if split, and which goal you recommend tackling first.

HALT and give the user a choice:

**Split** — pick first goal, defer the rest.

**Keep all goals** — accept the risks.
<!-- vpmodule:atom:end judge-multi-goal-by-independent-shippable-deliverables -->
<!-- vpmodule:atom:begin name-the-plan-file-after-the-intent -->
---
instruction_id: name-the-plan-file-after-the-intent
title: Name the plan file after the intent
summary: "The plan file is a kebab-case slug taken from the intent, led by the tracking identifier when there is one, and a second plan for the same name gets a numeric suffix."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A new plan file is created for the current intent.
conditions_does_not_apply_when: The plan file already exists and is being resumed.
artifact_contract_output_type: plan-file-name
artifact_contract_required_data:
  - the kebab-case slug
  - the tracking identifier that leads it
  - the decision to resume the draft or to add a suffix
artifact_contract_verified_by: the file name is a kebab-case slug of the intent and an existing plan was never overwritten
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-01-clarify-and-route.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Name the plan file after the intent

Derive a valid kebab-case slug from the current intent.

If the intent references a tracking identifier (story number, issue number, ticket ID), lead the slug with it (e.g. `3-2-digest-delivery`, `gh-47-fix-auth`).

If its status is `draft`, treat it as the same work and resume it

Otherwise append `-2`, `-3`, etc.
<!-- vpmodule:atom:end name-the-plan-file-after-the-intent -->