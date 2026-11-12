---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-advanced-elicitation-skill-md-7f6b119a-c01"
title: "bmad-method: skills/bmad-advanced-elicitation/SKILL.md module"
summary: "Carrier for 5 atomic instructions from bmad-method:skills/bmad-advanced-elicitation/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-advanced-elicitation/SKILL.md\"}"
atom_ids:
  - give-the-session-an-outside-voice
  - match-the-language-of-the-session
  - never-change-the-work-without-acceptance
  - offer-the-methods-and-stop-for-a-choice
  - refine-the-target-and-scale-the-depth
atom_count: 5
atoms: "[{\"atom_id\":\"give-the-session-an-outside-voice\",\"file_sha256\":\"0fb1e7f026cb64b5b8197cb8feb706dc6de5dd6cd1d9df37fd9a653cfc5dc6e2\",\"content_sha256\":\"4c3b938cc1f88d170ee3e15fc8adf9b30d62fb8afce97eeb83a136815e40a40c\",\"file_bytes\":2291,\"body_bytes\":1033},{\"atom_id\":\"match-the-language-of-the-session\",\"file_sha256\":\"130be095b583e8e62e38a61aa2e07ae8aff33aed33a4910d786f12a347a8fef5\",\"content_sha256\":\"bc1cece220d53468185c47ff1a6a3086a2cf93a52c6f10049e26f957fcd35e21\",\"file_bytes\":4366,\"body_bytes\":1598},{\"atom_id\":\"never-change-the-work-without-acceptance\",\"file_sha256\":\"af0f9e347cd71091ad7f331c8134a29366bbb09f2894ed1fc42a5005847f24db\",\"content_sha256\":\"2e419d60878b24d9ae212523a426d96b1bb1cc4d0d9df12955c7bac56bcc3ac0\",\"file_bytes\":1761,\"body_bytes\":539},{\"atom_id\":\"offer-the-methods-and-stop-for-a-choice\",\"file_sha256\":\"dc69e00b21c9eb3691771c16886028691056fecc66939d5fb5223b566c8d0d5c\",\"content_sha256\":\"d0916d0fe4d17cc281e048bcab7b10bfb644d80583684f13b4c196bb5b04a712\",\"file_bytes\":2151,\"body_bytes\":1001},{\"atom_id\":\"refine-the-target-and-scale-the-depth\",\"file_sha256\":\"59035337d7b47b689a432a049716a0807034bd2ebe736bef181c6cd43a0ac253\",\"content_sha256\":\"60d3e14304b66a66b9f8622f7a916fc56b8be788947a188ac97a16438d8a7578\",\"file_bytes\":1615,\"body_bytes\":477}]"
carrier_sha256: f4c44caf50c17285e9bf06d2f7d00bb4152ab6c1e1d6db8a0333144acbe55842
carrier_bytes: 12837
revision: 1
status: active
---
<!-- vpmodule:atom:begin give-the-session-an-outside-voice -->
---
instruction_id: give-the-session-an-outside-voice
title: Give the session an outside voice
summary: "Every turn carries one real voice and one invented outside voice, used in character to find the sharper objection; the session is not a panel debate."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: An idea has to be pressure-tested from more than one angle.
conditions_does_not_apply_when: The pressure test needs one voice and one point of view only.
artifact_contract_output_type: adversarial-dialogue
artifact_contract_required_data:
  - the voices used
  - the objection each one raised
  - the question that came out of it
artifact_contract_verified_by: the session stays a pressure test and does not become a panel performance
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-forge-idea/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-advanced-elicitation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Give the session an outside voice
Each turn uses two voices:
One available persona — choose an installed agent or user-defined persona whose expertise fits the current branch. Vary this voice every few turns; do not let one voice dominate.
One generated persona — create a fresh outside voice, such as a competitor, buyer, finance reviewer, domain expert, or critic. Give it a name and enough characterization to keep its viewpoint distinct.
If no pool is available, generate this voice yourself.
Use these voices in character to pressure-test the current branch: find sharper objections, missing assumptions, and stronger defenses.
Cross-examine them for what matters, then synthesize their input into your next question.
Do not let the session turn into a panel debate or persona performance.
Voice the personas yourself by default. Spawn separate agents only when a branch needs independent reasoning that should not be influenced by one shared voice.
If neither yields a fit, invent named viewpoints suited to the content.
<!-- vpmodule:atom:end give-the-session-an-outside-voice -->
<!-- vpmodule:atom:begin match-the-language-of-the-session -->
---
instruction_id: match-the-language-of-the-session
title: Match the language of the session
summary: The refinement is written in the communication language of the surrounding session; every user-facing output follows it and technical terms stay in English.
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A result is handed back into a running session.
conditions_does_not_apply_when: The result goes to a store with a fixed language of its own.
artifact_contract_output_type: language-matched-result
artifact_contract_required_data:
  - the language of the session
  - the language of the result
artifact_contract_verified_by: the result uses the communication language of the surrounding session
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-advanced-elicitation/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/help/modes/brief.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/help/modes/default.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/help/modes/full.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/help/modes/full.compact.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/import.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/ingest-docs.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/manager.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/mvp-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-milestone.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-workspace.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/execute-phase-response-language.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/response-language-directive.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Match the language of the session
Work in the surrounding session's communication language.

The language covers every user-facing prose: narration between tool calls, status updates, progress notes, findings, questions, prompts and explanations included.
Technical terms, code, file paths and subagent prompts stay in English - only user-facing output is translated.
User-facing orchestrator output (questions, narration, report-template prose) in `{response_language}`; technical terms, code, file paths, and subagent prompts stay in English.
Pass `response_language: {value}` into every spawned subagent prompt so any user-facing output they produce stays in the configured language.
are a structural source, not literal output to copy verbatim — render their prose translated into `{response_language}` while keeping headings' structural markers, table columns, IDs, commands, and file paths unchanged.
ALL user-facing output MUST be in the configured language — narration between tool calls, status updates, progress notes, findings, banners, report prose, questions (asked as options or as plain text), and summaries. Technical terms, code, file paths, commands, and identifiers stay in English.
Literal English report/banner templates embedded in a workflow are a structural SOURCE, not literal output to copy verbatim — render their prose in the configured language while keeping headings' structural markers, table columns, IDs, commands, and file paths unchanged.
Pass the configured language into every spawned subagent prompt so any user-facing output they produce stays in it.
<!-- vpmodule:atom:end match-the-language-of-the-session -->
<!-- vpmodule:atom:begin never-change-the-work-without-acceptance -->
---
instruction_id: never-change-the-work-without-acceptance
title: Never change the work without acceptance
summary: The proposed changes are shown and the work is left alone until the user accepts; a rejection drops the proposal entirely.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy
conditions_applies_when: A refinement has proposed changes to a piece of work.
conditions_does_not_apply_when: The caller has already authorised the change.
artifact_contract_output_type: accepted-proposal
artifact_contract_required_data:
  - what the method revealed
  - the proposed changes
  - the decision of the user
artifact_contract_verified_by: the work only changes after an acceptance and a rejection removes the proposal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-advanced-elicitation/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/mvp-phase.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never change the work without acceptance
Show what the method revealed and the changes it proposes, then HALT and give the user a choice:
Apply — accept the proposed changes.
Reject — drop the proposal entirely.
Never change the work unless the user accepts the proposal.
If they reject it, drop the proposal entirely.
Any other reply is instruction to follow.

Refuse to convert a unit that is already under way or finished: the change would invalidate the plans and summaries that already exist, and it needs an explicit override.
<!-- vpmodule:atom:end never-change-the-work-without-acceptance -->
<!-- vpmodule:atom:begin offer-the-methods-and-stop-for-a-choice -->
---
instruction_id: offer-the-methods-and-stop-for-a-choice
title: Offer the methods and stop for a choice
summary: "A short menu of five methods that attack the target from different angles, with reshuffle, list all and proceed; the menu is offered again after each run."
capability_tags:
  - review-code
pattern_tags:
  - approval-policy
conditions_applies_when: A piece of work is to be deepened and the user chooses how.
conditions_does_not_apply_when: The method was named by the caller and there is nothing to choose.
artifact_contract_output_type: method-menu
artifact_contract_required_data:
  - the five methods offered
  - the choice the user made
  - the next menu after the run
artifact_contract_verified_by: the menu offers five methods from different angles and the run stops for the choice
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-advanced-elicitation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Offer the methods and stop for a choice
pick the 2–4 categories that fit the target (risk before a launch, technical for code, collaboration when stakeholders compete, creative when the content is flat)
hand-pick five methods that attack the target from different angles
HALT and give the user a choice:
The five offered methods, listed by name. The user may pick one or several.
Reshuffle — replace the list with five new options.
List all — show the full catalog with descriptions.
Proceed — no further elicitation.
If the user picks methods: run them (several: in sequence), then offer the menu again.
If the user chooses Proceed: done. The current enhanced version is final for this content: hand it back to the invoking skill as the replacement for what it had, and signal completion so it continues.
Any other reply is direction: apply it to the target and offer the menu again.
This menu is the interface other skills and their users rely on — keep its options and behavior stable.
<!-- vpmodule:atom:end offer-the-methods-and-stop-for-a-choice -->
<!-- vpmodule:atom:begin refine-the-target-and-scale-the-depth -->
---
instruction_id: refine-the-target-and-scale-the-depth
title: Refine the target and scale the depth
summary: "The target is the most recent output unless something else is pointed at, and the depth of the refinement is scaled to it; each pass works on the current version."
capability_tags:
  - review-code
pattern_tags:
  - adversarial-self-review
conditions_applies_when: A piece of work is to be deepened against a chosen critique.
conditions_does_not_apply_when: The target is named explicitly and is not the last output.
artifact_contract_output_type: refined-target
artifact_contract_required_data:
  - the target
  - the depth the refinement ran at
  - the refined version
artifact_contract_verified_by: the refinement was applied to the current version and sized to the target
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-advanced-elicitation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Refine the target and scale the depth
The target is the most recent output in the conversation — a section, plan, draft, or decision — unless the caller or user points at something else.
Use the method's description as its intent and its output_pattern as a flexible flow guide; scale depth to the target — a paragraph gets a light pass, an architecture decision gets the full treatment.
Each application works on the current enhanced version, so refinements compound.
<!-- vpmodule:atom:end refine-the-target-and-scale-the-depth -->