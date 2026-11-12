---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmod-method-help-implementation-skills-md-ab68cf2d-c01"
title: "bmad-method: skills/bmod-method/help/implementation-skills.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmod-method/help/implementation-skills.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmod-method/help/implementation-skills.md\"}"
atom_ids:
  - fix-the-clear-findings-and-ask-when-the-intent-is-in-doubt
  - size-a-build-session-to-one-goal
atom_count: 2
atoms: "[{\"atom_id\":\"fix-the-clear-findings-and-ask-when-the-intent-is-in-doubt\",\"file_sha256\":\"855c34d5a324958bce9d22c896f8e45b8b94249cabd5b33ff42893ff71f23208\",\"content_sha256\":\"b21940adc5e92068c8ae4389301ad2fe4026c04bffe1635c0cdbee6e1a245a9e\",\"file_bytes\":1537,\"body_bytes\":382},{\"atom_id\":\"size-a-build-session-to-one-goal\",\"file_sha256\":\"ffce694fbd31782aeb460baa9d46c7f3b30d62cb7dc0bba8bd58ae1b63215a62\",\"content_sha256\":\"1221a9500f6b9cd1590cdeb7526fc87ec0876a35ab55f5d6b8e9101cd5548b16\",\"file_bytes\":1302,\"body_bytes\":191}]"
carrier_sha256: 4a5018e539a92ec18dbce0915442f4241f74e592fb32643181a8ed4ecd8b9a38
carrier_bytes: 3134
revision: 1
status: active
---
<!-- vpmodule:atom:begin fix-the-clear-findings-and-ask-when-the-intent-is-in-doubt -->
---
instruction_id: fix-the-clear-findings-and-ask-when-the-intent-is-in-doubt
title: Fix the clear findings and ask when the intent is in doubt
summary: "Fix the findings that are clear and come back to the human when the intent cannot settle one; edits to the other documents are drafted, not applied, and the owning tool applies them."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A change has been built and reviewed.
conditions_does_not_apply_when: The review produced no findings.
artifact_contract_output_type: review-outcome
artifact_contract_required_data:
  - the findings fixed
  - the findings left open
  - the drafted edits
artifact_contract_verified_by: a finding whose fix depends on the intent was handed to the human
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/implementation-skills.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - product
---

# Fix the clear findings and ask when the intent is in doubt
It fixes clear findings itself and returns to the human when intent is in doubt.
It drafts the edits to the PRD, architecture, UX, and stories and does not apply them: the user applies those through the owning skills.
Its handoff lists the added, removed, resequenced, or rescoped epics and stories for the user to apply
<!-- vpmodule:atom:end fix-the-clear-findings-and-ask-when-the-intent-is-in-doubt -->
<!-- vpmodule:atom:begin size-a-build-session-to-one-goal -->
---
instruction_id: size-a-build-session-to-one-goal
title: Size a build session to one goal
summary: "One session is one goal of roughly five hundred changed lines in a handful of files, started in a fresh chat; the session commits and never pushes."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A piece of work is about to be started as a single session.
conditions_does_not_apply_when: The work is a single edit the user is directing.
artifact_contract_output_type: session-plan
artifact_contract_required_data:
  - the one goal
  - the size of the change
  - the branch it runs on
artifact_contract_verified_by: the session ends with one goal delivered and a local commit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/implementation-skills.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Size a build session to one goal
Size: one session is one goal, roughly 500 changed lines, not counting tests, in a handful of files.
Start it in a fresh chat.
It commits and never pushes.
<!-- vpmodule:atom:end size-a-build-session-to-one-goal -->