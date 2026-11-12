---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-37signals-way-skill-md-1244a5e0-c02"
title: "wondelai-skills: skills/37signals-way/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/37signals-way/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/37signals-way/SKILL.md\"}"
atom_ids:
  - 37signals-way-shaping
  - 37signals-way-small-teams
atom_count: 2
atoms: "[{\"atom_id\":\"37signals-way-shaping\",\"file_sha256\":\"b609b4529e88bc735b1e377e15f3fe6a21da199d36435e9e6dc81da77c7c2b41\",\"content_sha256\":\"4b7366f1514c0bf31affa354bb392ffba19b9def94ee905a081af5fb5196bcf5\",\"file_bytes\":1984,\"body_bytes\":782},{\"atom_id\":\"37signals-way-small-teams\",\"file_sha256\":\"ee8a2f9b8b4c5f086f8422d1816793c6746f43017d105088e61dac1ea91cb7f2\",\"content_sha256\":\"dc82b4e2c1deff351519f9c5bd6cfbd772c2d7edf4a65d491dc4241dad525cd5\",\"file_bytes\":2029,\"body_bytes\":785}]"
carrier_sha256: 2c87a6c19ba660966f59b8691295966ba305fb7bf73060fa6c3d4aa1cf8ee784
carrier_bytes: 4220
revision: 1
status: active
---
<!-- vpmodule:atom:begin 37signals-way-shaping -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: 37signals-way-shaping
title: Shape work before it reaches a team
summary: "A senior person bridging product and technical work shapes a rough, solved and bounded pitch with problem, appetite, solution, rabbit holes and no-gos; set appetite by value, never by pressure."
capability_tags:
  - bound-product-pitch
pattern_tags:
  - fixed-time-variable-scope
conditions_applies_when: Preparing a problem for a delivery team.
conditions_does_not_apply_when: A small maintenance task that needs no pitch.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The pitch states problem, appetite, solution, rabbit holes and no-gos, and the appetite reflects the problem's value."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/37signals-way/SKILL.md; sha256=b6882f6f197ed4eee0bfe71518f7aa16a2bf30a3bf6446b7738e6f04d39b08b4; locator=skills/37signals-way/SKILL.md#L51-L75"
status: active
revision: 1
---

# Shape work before it reaches a team

Before work reaches a team, a senior person bridging product and technical worlds should shape it to be rough enough to leave maneuvering room, solved enough to establish main elements, and bounded by appetite. Use appetite (how much time the problem is worth) instead of estimating duration. A shaped pitch includes problem, appetite, solution, rabbit holes, and no-gos. Breadboard places, affordances, and connections before visual design; use fat-marker sketches to keep abstraction high and avoid wireframes that invite pixel-level feedback before validation. Address scope-blowing rabbit holes in the pitch, make no-go boundaries visible, and set appetites according to genuine problem value—never artificially small to pressure teams.
<!-- vpmodule:atom:end 37signals-way-shaping -->
<!-- vpmodule:atom:begin 37signals-way-small-teams -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: 37signals-way-small-teams
title: Give a shaped bet to a small autonomous team
summary: "A three-person team of one designer and one or two programmers works autonomously from a shaped pitch, discovers its own tasks, uses hill charts and async updates, and integrates design and programming from day one."
capability_tags:
  - design-team-organization
pattern_tags:
  - team-topology-design
conditions_applies_when: Staffing and running a product cycle.
conditions_does_not_apply_when: A team assembled for a one-off operational task.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The team has the stated composition and autonomy, tracks uphill and downhill work, and fixes shaping rather than overtime."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/37signals-way/SKILL.md; sha256=b6882f6f197ed4eee0bfe71518f7aa16a2bf30a3bf6446b7738e6f04d39b08b4; locator=skills/37signals-way/SKILL.md#L101-L125"
status: active
revision: 1
---

# Give a shaped bet to a small autonomous team

A three-person team—one designer and one or two programmers—works autonomously from a shaped pitch, without standups or a hovering PM; the team discovers its own tasks and tracks progress with hill charts, where uphill means figuring work out and downhill means executing known work. Replace task lists with named scopes that move independently on the hill; write updates instead of holding meetings; prefer working HTML with real data on day 2 to a Figma mockup on day 5; launch and iterate rather than waiting for plans; and integrate design and programming from day one without handoff phases. Autonomy requires genuinely manageable scope; if the team consistently works overtime to meet six weeks, fix the shaping, not the team.
<!-- vpmodule:atom:end 37signals-way-small-teams -->