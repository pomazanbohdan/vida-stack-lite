---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-eval-references-self-improvement-md-9311a55f-c01"
title: "bmad-method: skills/bmad-eval/references/self-improvement.md module"
summary: "Carrier for 5 atomic instructions from bmad-method:skills/bmad-eval/references/self-improvement.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-eval/references/self-improvement.md\"}"
atom_ids:
  - change-one-thing-per-round
  - fix-the-intent-category-not-the-failing-case
  - keep-the-human-as-the-judge
  - prefer-the-explanation-over-the-shouting-rule
  - scale-the-loop-to-the-stakes
atom_count: 5
atoms: "[{\"atom_id\":\"change-one-thing-per-round\",\"file_sha256\":\"1177ac9ca0cf1c83b7a2d1bd4ebb26defc046604eeaf69f2e65bdb79ab08fbb3\",\"content_sha256\":\"b0e9b06ab93e65d4d607677781b1b9f1c243ea193412211103b89bbb07753df6\",\"file_bytes\":1757,\"body_bytes\":514},{\"atom_id\":\"fix-the-intent-category-not-the-failing-case\",\"file_sha256\":\"ea4bda79197578447dd5be49628c07b1a2940a6bd3a5c0e5be1fffb9a00f73c0\",\"content_sha256\":\"10b68a3bbfbd0acf0e0f1623df019f8d9050e50aac17f3634dd979e8df5d799c\",\"file_bytes\":1685,\"body_bytes\":525},{\"atom_id\":\"keep-the-human-as-the-judge\",\"file_sha256\":\"828bf266e384a42347474f5e958d52a1481aea694f8f6958dd19d36d55001e3c\",\"content_sha256\":\"1ca7082ddb141b93663f83d8c138bed4f5f57752aec64b6b627e4e9753555134\",\"file_bytes\":1632,\"body_bytes\":501},{\"atom_id\":\"prefer-the-explanation-over-the-shouting-rule\",\"file_sha256\":\"3a61a0b3325ff7277dbc80cf703cda6a8693dfaae56e8a0fcb1ad2a251603799\",\"content_sha256\":\"ee6e1ce43bb5c65a39e7916945258871a4176c44d1ee0c7c00c3af570531464f\",\"file_bytes\":1635,\"body_bytes\":412},{\"atom_id\":\"scale-the-loop-to-the-stakes\",\"file_sha256\":\"82ecdcb09270a0b6e1c513a3f79d81c89018af0908beabfc706df09ffdb6c703\",\"content_sha256\":\"71ae5ad6bcd107d963b0f7078aacc776743bbca2be1d25e5a522f9a59253dea4\",\"file_bytes\":2179,\"body_bytes\":1015}]"
carrier_sha256: 6b8a387a6635b99842f2229e1d9112d906f9a788129645e3ad38b2a4524b7ec1
carrier_bytes: 9517
revision: 1
status: active
---
<!-- vpmodule:atom:begin change-one-thing-per-round -->
---
instruction_id: change-one-thing-per-round
title: Change one thing per round
summary: "One change per round, small enough that the next evaluation can attribute the delta to it; a round that regresses anything is reverted."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A round of an automatic loop applies a change that is then measured.
conditions_does_not_apply_when: The change is a single edit with nothing else in it.
artifact_contract_output_type: round-change
artifact_contract_required_data:
  - the single change of the round
  - the score it moved
  - the revert reason when it regressed
artifact_contract_verified_by: the delta of the round is attributable to the one change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/self-improvement.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/debugger-philosophy.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Change one thing per round
Keep the change small enough that the next eval can attribute the delta to it; a round that rewrites five things at once cannot tell you which one moved the score.
A round that improves the score and breaks nothing else is kept; a round that regresses any mode is reverted before the next round, because an applied change that made things worse is not a base to build on.
Change one variable: Make one change, test, observe, document, repeat. Multiple changes = no idea what mattered.
<!-- vpmodule:atom:end change-one-thing-per-round -->
<!-- vpmodule:atom:begin fix-the-intent-category-not-the-failing-case -->
---
instruction_id: fix-the-intent-category-not-the-failing-case
title: "Fix the intent category, not the failing case"
summary: Read each finding as a representative of an intent category and fix the category; a patch that special-cases one input passes the case and leaves the class broken.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A case failed and a fix is proposed for it.
conditions_does_not_apply_when: The failure is unique to that one input and needs no general rule.
artifact_contract_output_type: category-fix
artifact_contract_required_data:
  - the intent category the finding stands for
  - the change made at that level
artifact_contract_verified_by: the change names the category and not the single input that exposed it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/self-improvement.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Fix the intent category, not the failing case
The failure that ends most auto-iterate loops is fixing the example instead of the cause.
A case fails because the skill mishandled a class of input; patching the skill to special-case that one input passes the case and leaves the class broken, and often the patch is a hardcoded branch that makes the skill worse.
Read each finding as a representative of an intent category and fix the category.
Address the cause the finding names rather than the single case that exposed it
<!-- vpmodule:atom:end fix-the-intent-category-not-the-failing-case -->
<!-- vpmodule:atom:begin keep-the-human-as-the-judge -->
---
instruction_id: keep-the-human-as-the-judge
title: Keep the human as the judge
summary: "The benchmark is a guardrail, never the judge; a green run means the change cleared the bar it was given, and the human decides whether it is right."
capability_tags:
  - verify-work-results
pattern_tags:
  - approval-policy
conditions_applies_when: An automated loop applies changes and reports that a run went green.
conditions_does_not_apply_when: A human has already judged the result.
artifact_contract_output_type: judgement-handover
artifact_contract_required_data:
  - the bar the run cleared
  - the findings the evidence could not confirm
  - the fix and the evidence handed back
artifact_contract_verified_by: the run is reported as a cleared bar and not as a correct change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/self-improvement.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Keep the human as the judge
The benchmark is a guardrail, never the judge. The human stays the judge.
A green run means the change cleared the bar the loop was given, not that the change is correct, and the loop's job is to do the mechanical iteration a human would otherwise do by hand and then hand back a fix plus the evidence for it.
The review says what looks wrong; the eval says whether it measurably is. A finding the eval cannot confirm is a candidate to note for a human, not to auto-fix.
<!-- vpmodule:atom:end keep-the-human-as-the-judge -->
<!-- vpmodule:atom:begin prefer-the-explanation-over-the-shouting-rule -->
---
instruction_id: prefer-the-explanation-over-the-shouting-rule
title: Prefer the explanation over the shouting rule
summary: A stack of MUSTs and ALWAYS is read as a symptom of a fix that patches the case; a sharper outcome statement or a worked example generalises where a louder rule does not.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - rule-authority-policy
conditions_applies_when: A proposed fix to an instruction is stated as a rule the model cannot miss.
conditions_does_not_apply_when: The rule states a hard boundary the model is allowed to enforce.
artifact_contract_output_type: rule-tone-choice
artifact_contract_required_data:
  - the shouted form
  - the form that explains the reasoning
artifact_contract_verified_by: the chosen form states the outcome instead of commanding it
compatibility_excludes:
  - write-directive-rules
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/self-improvement.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Prefer the explanation over the shouting rule
When a proposed fix reaches for ALL-CAPS ALWAYS or NEVER or a stack of MUSTs, treat that as a warning sign.
Shouting at the model is usually a sign the fix is patching a symptom; a sharper outcome statement or a small worked example generalizes where a louder rule does not.
Prefer the version that explains the reasoning over the version that issues the command.
<!-- vpmodule:atom:end prefer-the-explanation-over-the-shouting-rule -->
<!-- vpmodule:atom:begin scale-the-loop-to-the-stakes -->
---
instruction_id: scale-the-loop-to-the-stakes
title: Scale the loop to the stakes
summary: "The loop is opt-in, its aggressiveness follows the stakes, and the round bound and the pass condition are agreed with the user before the first round."
capability_tags:
  - design-experiments
pattern_tags:
  - resource-bounds
conditions_applies_when: An automated loop is set up to change something over several rounds.
conditions_does_not_apply_when: The loop runs against a throwaway artefact that is already agreed.
artifact_contract_output_type: loop-terms
artifact_contract_required_data:
  - the round bound
  - the pass condition
  - the length of the bar
artifact_contract_verified_by: the bound and the pass condition were agreed before the first round and are written into the run report
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/self-improvement.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Scale the loop to the stakes
The loop is opt-in. It never starts on its own, because applying changes to a skill in a loop is a stronger action than reporting findings, and the user decides when that is warranted.
Calibrate the aggressiveness to the stakes.
A throwaway skill the user is still shaping can take a longer loop and a looser bar, because a wrong iteration costs little and is easy to throw away.
A skill that other skills already depend on, or one that is shipped and in use, takes a short loop, a strict pass bar, and a close human read of every applied change, because a regression there propagates.
Agree the round bound and the pass condition with the user before the first round, and write both into the run report so the run is auditable against the terms it was given.
Stop when the pass condition is met or the round bound is reached, whichever comes first. The bound is a hard stop: hitting it without passing ends the loop and reports the best state reached, it does not earn extra rounds.
<!-- vpmodule:atom:end scale-the-loop-to-the-stakes -->