---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-brainstorming-references-headless-md-5b617bfe-c01"
title: "bmad-method: skills/bmad-brainstorming/references/headless.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-brainstorming/references/headless.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-brainstorming/references/headless.md\"}"
atom_ids:
  - record-the-assumptions-you-had-to-infer
  - treat-a-present-human-as-interactive
atom_count: 2
atoms: "[{\"atom_id\":\"record-the-assumptions-you-had-to-infer\",\"file_sha256\":\"8d5cab9c7bd0a3e867269c2062528151928302b403b4e1990433d371fb390968\",\"content_sha256\":\"15fa959714373c256df4a3066d93b274e40cae1718aabd4d83253011c4bf52cd\",\"file_bytes\":1229,\"body_bytes\":198},{\"atom_id\":\"treat-a-present-human-as-interactive\",\"file_sha256\":\"cec74895ed82f57149ba77421ddb64dabaaa74e1b15dba773340be92c5bdb222\",\"content_sha256\":\"0467d0950f9c7e948a389c9728aba2252fdddba57aebcf01a8514a17aee05127\",\"file_bytes\":1488,\"body_bytes\":419}]"
carrier_sha256: f4a58f12d5fbf41b25c5de24748756c83aefe6e0ffb3fca731723b4b1802a1bf
carrier_bytes: 2982
revision: 1
status: active
---
<!-- vpmodule:atom:begin record-the-assumptions-you-had-to-infer -->
---
instruction_id: record-the-assumptions-you-had-to-infer
title: Record the assumptions you had to infer
summary: An unattended run asks nothing and infers what it must; every assumption it made goes into the result.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A run works without a person to ask and an input was missing.
conditions_does_not_apply_when: Every input was given.
artifact_contract_output_type: assumption-record
artifact_contract_required_data:
  - the inferred topic
  - the invented goal
  - the assumptions list
artifact_contract_verified_by: every value the run had to infer is listed in the result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/headless.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Record the assumptions you had to infer
Do not ask questions; do not greet.
Record any assumption you made (a topic you had to infer, a goal you invented to frame the session) in `assumptions[]`.
<!-- vpmodule:atom:end record-the-assumptions-you-had-to-infer -->
<!-- vpmodule:atom:begin treat-a-present-human-as-interactive -->
---
instruction_id: treat-a-present-human-as-interactive
title: Treat a present human as interactive
summary: "A human in the session means interactive, whatever the payload says; when in doubt, the run is interactive."
capability_tags:
  - detect-the-run-mode
pattern_tags:
  - safe-defaults
conditions_applies_when: A run may be interactive or unattended and the signal is ambiguous.
conditions_does_not_apply_when: An unambiguous machine signal says the run has no user.
artifact_contract_output_type: run-mode-decision
artifact_contract_required_data:
  - the signal that decided the mode
  - the mode
artifact_contract_verified_by: a human in the session was treated as interactive regardless of the payload
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/headless.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Treat a present human as interactive
If a human is sending messages in this session, you are interactive — no payload shape or phrasing overrides that.
Headless requires the *absence* of an interactive user.
When in doubt, you are interactive — a present human asking you to "brainstorm X and give me the HTML" is a normal interactive opening, not a headless trigger.
Facilitate them; do not brainstorm for them.
<!-- vpmodule:atom:end treat-a-present-human-as-interactive -->