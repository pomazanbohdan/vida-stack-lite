---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-toolsmith-discover-md-84754a8d-c01"
title: "bmad-method: skills/bmad-toolsmith/discover.md module"
summary: "Carrier for 5 atomic instructions from bmad-method:skills/bmad-toolsmith/discover.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-toolsmith/discover.md\"}"
atom_ids:
  - challenge-the-need-for-a-skill
  - mine-the-conversation-before-you-ask
  - offer-what-the-outcome-implies-but-nobody-named
  - settle-the-five-things-before-you-build
  - test-the-bare-model-before-writing-a-skill
atom_count: 5
atoms: "[{\"atom_id\":\"challenge-the-need-for-a-skill\",\"file_sha256\":\"a317813cc11498faf37654f4ef0cbe37e6f118222feaba34e19c2d39acb14489\",\"content_sha256\":\"10dae8fd862e105af3e7716936e899bddf8c2e632623c9e1d30a39e5c2346056\",\"file_bytes\":1719,\"body_bytes\":619},{\"atom_id\":\"mine-the-conversation-before-you-ask\",\"file_sha256\":\"996e7e75759e783e10989569a1bf463930395fb4525665c7e23816ea1256e474\",\"content_sha256\":\"2749df535b0d79fa594ead2261ed4574f6d3cd3f03aa7db4ee88062509bab195\",\"file_bytes\":1854,\"body_bytes\":499},{\"atom_id\":\"offer-what-the-outcome-implies-but-nobody-named\",\"file_sha256\":\"1ec5b8f5b875404ec44c76754f9e7f6dd0cc77c94a74e36d387d29341e97ab61\",\"content_sha256\":\"a0aabc1c972caf9e2c9f3511da9bd98e6ad591f521d5ff6ec7fa937c2ff22e4c\",\"file_bytes\":1422,\"body_bytes\":235},{\"atom_id\":\"settle-the-five-things-before-you-build\",\"file_sha256\":\"67c2d0e1d407facfd113a47607bafd74626499cc85ab84d2ec2d9deba41f0785\",\"content_sha256\":\"dc06b727b13a6dc25914f418923eaa1607d11e2d74648316abbab6c303f3ae6c\",\"file_bytes\":1895,\"body_bytes\":650},{\"atom_id\":\"test-the-bare-model-before-writing-a-skill\",\"file_sha256\":\"406bbd4ee278abe8522d83a06cecd0d36ecfded2b30402fd2ce901b4f27ff376\",\"content_sha256\":\"4af6a39a109b3d0b542e3f989f84a351851cee6e06c3b9ed4854c8b9a2143908\",\"file_bytes\":2024,\"body_bytes\":820}]"
carrier_sha256: 2696e9538a47918188f6483acbfcf94a59494cbba44f4012c24d7481ae4f0afd
carrier_bytes: 9591
revision: 1
status: active
---
<!-- vpmodule:atom:begin challenge-the-need-for-a-skill -->
---
instruction_id: challenge-the-need-for-a-skill
title: Challenge the need for a skill
summary: "A thin idea is pushed back on: a one-off, a project convention, a constraint a script could check, each belongs somewhere else."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A request would be turned into a reusable skill or tool.
conditions_does_not_apply_when: The user has already established that a reusable skill is wanted.
artifact_contract_output_type: challenge
artifact_contract_required_data:
  - the reason it is not a skill
  - where the request belongs instead
artifact_contract_verified_by: "the reason it is not a skill, or the reason it is, is stated before the build starts"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/discover.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Challenge the need for a skill
Push back where the idea is thin: is this a skill at all or a one-off the user could ask for directly; a project convention, which belongs in the project's instructions file; a constraint a script could check, which belongs in a script; what input would break it; what it should require or recommend from the skills already installed. A skill whose job is to hold what the user would otherwise type every time, a format, a preference, a convention, a persona, is warranted by that alone; do not test whether the model can follow the instruction when given it, since nobody doubts that.
<!-- vpmodule:atom:end challenge-the-need-for-a-skill -->
<!-- vpmodule:atom:begin mine-the-conversation-before-you-ask -->
---
instruction_id: mine-the-conversation-before-you-ask
title: Mine the conversation before you ask
summary: "The request, the steps already taken, the corrections and the shown inputs are read first, and only the gaps are asked about."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
  - bounded-artifact-reading
conditions_applies_when: A tool or a skill is built from an existing request or conversation.
conditions_does_not_apply_when: Nothing has been said yet and there is nothing to read.
artifact_contract_output_type: mined-input
artifact_contract_required_data:
  - the request
  - the steps already taken
  - the corrections made
  - the inputs and outputs shown
  - the gaps that remain
artifact_contract_verified_by: the questions asked cover only the gaps the conversation and the files do not answer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/discover.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/shapes/plain-skill/assets/sample-skill/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Mine the conversation before you ask
Read what the user already gave you: the request, the conversation so far (tools used, the order of steps, corrections they made, inputs and outputs they showed), files or skills they pointed at. When the conversation itself is the workflow ("turn this into a skill"), most answers are in it. Ask only for the gaps.
Ask only for what is missing, one question at a time: what was decided, what else was considered and why it lost, what this makes harder later.
<!-- vpmodule:atom:end mine-the-conversation-before-you-ask -->
<!-- vpmodule:atom:begin offer-what-the-outcome-implies-but-nobody-named -->
---
instruction_id: offer-what-the-outcome-implies-but-nobody-named
title: Offer what the outcome implies but nobody named
summary: "The sibling intent and the forgotten input are offered in one line each, and a decline is not proposed again."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The settled purpose implies work or input that nobody named.
conditions_does_not_apply_when: Nothing is implied beyond the request.
artifact_contract_output_type: offered-implication
artifact_contract_required_data:
  - the implied sibling intent
  - the implied input
artifact_contract_verified_by: each offer is one line and a declined offer is not raised again
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/discover.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The source describes generic scope clarification without identifying an engineering, design, product, business, research, or concrete operational subject."
---

# Offer what the outcome implies but nobody named
Offer what the outcome implies but nobody named: the sibling intent (update beside create), the input nobody mentioned. One line each; the user picks, and a decline is not re-proposed.
<!-- vpmodule:atom:end offer-what-the-outcome-implies-but-nobody-named -->
<!-- vpmodule:atom:begin settle-the-five-things-before-you-build -->
---
instruction_id: settle-the-five-things-before-you-build
title: Settle the five things before you build
summary: "Five things settle what a tool is for: its purpose, its consumer, its trigger phrases, the know-how it holds and whether its output can be checked."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A new tool or skill is about to be designed.
conditions_does_not_apply_when: The five things are already written down.
artifact_contract_output_type: settled-brief
artifact_contract_required_data:
  - what it gets done and for whom
  - who consumes the output and what must be true of it
  - the trigger phrases and the nearby requests it must stay quiet on
  - where the know-how lives
  - whether the output can be checked objectively
artifact_contract_verified_by: all five are answered before any file is written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/discover.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - product
---

# Settle the five things before you build
Five things settle a skill: what it gets done and for whom (two purposes are two skills); who or what consumes the output and what must be true of it for them to act without this conversation in the room, the one line that sets every bar; the phrases a user would type to reach it and the nearby requests it must stay quiet on; what it runs on and where the know-how lives that a model would not already have (a runbook, an incident, a transcript of doing it by hand, the corrections the user keeps making); and whether the output can be checked objectively, which decides how much the build leans on evals.
<!-- vpmodule:atom:end settle-the-five-things-before-you-build -->
<!-- vpmodule:atom:begin test-the-bare-model-before-writing-a-skill -->
---
instruction_id: test-the-bare-model-before-writing-a-skill
title: Test the bare model before writing a skill
summary: "When a skill claims to teach something, one real input runs through the bare model first; what it already gets right needs no skill."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A skill is claimed to teach the model something it does not already do.
conditions_does_not_apply_when: The skill only holds what the user would type every time.
artifact_contract_output_type: baseline-trial
artifact_contract_required_data:
  - the real input
  - the trigger phrase alone
  - what the bare model produced
  - the part it got wrong
artifact_contract_verified_by: "the bare model was run on the input before the skill was written, and the trace shows what the skill has to teach"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-toolsmith/discover.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Test the bare model before writing a skill
Where the skill instead claims to teach the model something, the target model is fixed (the user's own, or their organisation's), and the user has not asked to move fast or run on their own, ask for one real input and run its trigger phrase alone, not the specification, through a subagent with no skill. If that already gives what the user wants, say so and propose no skill, or one for only the part it got wrong; if it fails, the trace is the first evidence of what the skill has to teach.
And ask where it will run, with the inferred answer offered: the user's own agent and model, an organisation whose harness and model are known, or distributed to people whose model is unknown. That last answer decides whether anything can be measured against the model in the room.
<!-- vpmodule:atom:end test-the-bare-model-before-writing-a-skill -->