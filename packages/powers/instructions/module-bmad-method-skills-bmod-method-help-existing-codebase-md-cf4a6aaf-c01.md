---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmod-method-help-existing-codebase-md-cf4a6aaf-c01"
title: "bmad-method: skills/bmod-method/help/existing-codebase.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmod-method/help/existing-codebase.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmod-method/help/existing-codebase.md\"}"
atom_ids:
  - plan-for-an-inherited-codebase-without-a-documentation-pass
  - raise-the-tier-when-the-change-forces-an-undecided-boundary
atom_count: 2
atoms: "[{\"atom_id\":\"plan-for-an-inherited-codebase-without-a-documentation-pass\",\"file_sha256\":\"e86bde4db0b5809f28eed408a8c5d97273d746aed0de7cf5cdd73764088ac6cf\",\"content_sha256\":\"30d944acc04f060849904e2c4d4717efce6d105956b363da5375ea729162197a\",\"file_bytes\":1890,\"body_bytes\":664},{\"atom_id\":\"raise-the-tier-when-the-change-forces-an-undecided-boundary\",\"file_sha256\":\"68d26b8b17f3463b996a6cede88c645a0fa1c666cb528713a80599ec73fe29af\",\"content_sha256\":\"c7149be4c4abd3830d12e4e4b0fc0d31a991d520141585ba97a72d72a28947ce\",\"file_bytes\":1776,\"body_bytes\":388}]"
carrier_sha256: 244bdb03fec8ebf14294d6233090236ea3af9f45a7e4a8549e3dff51625db54f
carrier_bytes: 4017
revision: 1
status: active
---
<!-- vpmodule:atom:begin plan-for-an-inherited-codebase-without-a-documentation-pass -->
---
instruction_id: plan-for-an-inherited-codebase-without-a-documentation-pass
title: Plan for an inherited codebase without a documentation pass
summary: "An inherited codebase needs no up-front documentation pass: too little planning costs one build run, so start with something one session can finish and let the rules file record what the agents must not get wrong."
capability_tags:
  - audit-codebase
pattern_tags:
  - project-conventions-first
conditions_applies_when: The work meets a codebase nobody documented for the agents.
conditions_does_not_apply_when: The codebase already carries a verified set of rules for agents.
artifact_contract_output_type: adoption-plan
artifact_contract_required_data:
  - what the code already does
  - what to reuse
  - what not to change
artifact_contract_verified_by: the first change is small enough to finish in one session
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/existing-codebase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Plan for an inherited codebase without a documentation pass
works on an inherited or long-lived codebase with no up-front documentation pass.
Too little planning costs one build run, so start small and add planning only when the work calls for it.
Pick something one session can finish.
A change that follows established patterns, such as a new route in a layered API, needs no planning skill: a short intent file or a few sentences is enough input.
A good initial `AGENTS.md` is worth having: it records a small, verified set of rules for agents.
Skipping it does not fail a build; the cost is the same mistake every session until someone writes the rule down.
<!-- vpmodule:atom:end plan-for-an-inherited-codebase-without-a-documentation-pass -->
<!-- vpmodule:atom:begin raise-the-tier-when-the-change-forces-an-undecided-boundary -->
---
instruction_id: raise-the-tier-when-the-change-forces-an-undecided-boundary
title: Raise the tier when the change forces an undecided boundary
summary: "Size alone does not raise the tier: a change needs the heavier path when it forces a decision the existing patterns do not cover - a new boundary between components, a schema migration strategy, new authorization rules."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A change turns out to need a decision the codebase does not already make.
conditions_does_not_apply_when: The change follows an established pattern.
artifact_contract_output_type: tier-decision
artifact_contract_required_data:
  - the uncovered decision
  - the tier the change needs
artifact_contract_verified_by: "the heavier path was chosen because of the uncovered decision, not because of the size"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/existing-codebase.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-method/help/implementation-skills.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Raise the tier when the change forces an undecided boundary
Size alone does not.
when it forces a decision the existing patterns do not cover: a new boundary between components, a schema migration strategy, new authorization rules.
The user can also state such a decision in the intent
It is the default, and risky or foundational stories belong here because a human approves the plan.
<!-- vpmodule:atom:end raise-the-tier-when-the-change-forces-an-undecided-boundary -->