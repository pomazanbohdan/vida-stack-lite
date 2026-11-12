---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-walkthrough-step-01-orientation-md-22259e32-c01"
title: "bmad-method: skills/bmad-walkthrough/step-01-orientation.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-walkthrough/step-01-orientation.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-walkthrough/step-01-orientation.md\"}"
atom_ids:
  - ask-until-you-know-what-the-target-is-and-what-it-is-for
  - keep-the-bookkeeping-out-of-the-session
atom_count: 2
atoms: "[{\"atom_id\":\"ask-until-you-know-what-the-target-is-and-what-it-is-for\",\"file_sha256\":\"4cd3b679d67a363ac8125c7ca7b285eafa51dc36eaa8774a2613a2c35cc4b7d3\",\"content_sha256\":\"2c1f43a8a72173bf0f682ce8558e9c5b21a9bdc56e32e880688b6caa937aed40\",\"file_bytes\":1542,\"body_bytes\":397},{\"atom_id\":\"keep-the-bookkeeping-out-of-the-session\",\"file_sha256\":\"fbbb0144f3f4815f775d818621e240ef2095c7e79d04b9c8e74c69691e55a94a\",\"content_sha256\":\"a27bd79b365bb83e4039d807474cd9ad9932a4744ec20365d66657fc87990cce\",\"file_bytes\":1699,\"body_bytes\":407}]"
carrier_sha256: f9be5d78389078ad6e0631a5d34626a650c2bba6e73af925a1139e6de7b708a0
carrier_bytes: 3546
revision: 1
status: active
---
<!-- vpmodule:atom:begin ask-until-you-know-what-the-target-is-and-what-it-is-for -->
---
instruction_id: ask-until-you-know-what-the-target-is-and-what-it-is-for
title: Ask until you know what the target is and what it is for
summary: "Orient on the target from its ticket first, then its plan, description and commits, and ask until both the what and the why are known."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A review starts and the target and its purpose are not both known yet.
conditions_does_not_apply_when: The target and its purpose are already established in this session.
artifact_contract_output_type: orientation-note
artifact_contract_required_data:
  - what the target is
  - what it is for
artifact_contract_verified_by: both the target and its purpose are known before the next step starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-01-orientation.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Ask until you know what the target is and what it is for
Understand what the target is and what it is for. When a ticket covers the target (initiative-, epic-, story-, spike- or bug-*.md under the initiative folder, or an older SPEC*.md), read it first and in full and trust it. Then use the plan, PR description, and commit messages when they exist.
Ask the user questions until you know both.
<!-- vpmodule:atom:end ask-until-you-know-what-the-target-is-and-what-it-is-for -->
<!-- vpmodule:atom:begin keep-the-bookkeeping-out-of-the-session -->
---
instruction_id: keep-the-bookkeeping-out-of-the-session
title: Keep the bookkeeping out of the session
summary: "The log, the narrative, the lookups and the reasoning happen out of band, so the human sees only what they need."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A long guided session writes files and notes that do not need the user attention.
conditions_does_not_apply_when: "There is no human in the session to protect, or no subagent is available to take the work."
artifact_contract_output_type: delegation-note
artifact_contract_required_data:
  - the files the background worker owns
  - the point at which the background worker is running
artifact_contract_verified_by: the background worker is running before the next step loads
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/workflow.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-walkthrough/step-01-orientation.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep the bookkeeping out of the session
Show only what a human needs to see. Do not distract them. Write the log, edit the narrative, look things up, reason — but do not put it in the session.
When subagents are available, spawn a cheap background one for writing log and narrative files. Doing that work in the main session distracts the user.
Do not load the next step until that subagent is running.
<!-- vpmodule:atom:end keep-the-bookkeeping-out-of-the-session -->