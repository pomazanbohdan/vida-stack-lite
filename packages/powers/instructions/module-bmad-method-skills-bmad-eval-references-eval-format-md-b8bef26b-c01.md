---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-eval-references-eval-format-md-b8bef26b-c01"
title: "bmad-method: skills/bmad-eval/references/eval-format.md module"
summary: "Carrier for 5 atomic instructions from bmad-method:skills/bmad-eval/references/eval-format.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-eval/references/eval-format.md\"}"
atom_ids:
  - critique-the-rubric-alongside-the-grade
  - cut-the-section-that-does-no-work
  - make-the-skill-run-unattended
  - reach-a-mid-workflow-point-without-a-multi-turn-simulator
  - write-an-expectation-a-wrong-output-cannot-pass
atom_count: 5
atoms: "[{\"atom_id\":\"critique-the-rubric-alongside-the-grade\",\"file_sha256\":\"8964f8b4b461424356dd6ebd911c001dca204ebaded431529e97bed083a95864\",\"content_sha256\":\"6d202a0cf1733853961a3970051b5fcea54a37fa94862c4d0b99928059844ee8\",\"file_bytes\":1916,\"body_bytes\":646},{\"atom_id\":\"cut-the-section-that-does-no-work\",\"file_sha256\":\"d76237ff92315ca25aa022839cd5829ef71cd0054b917d20becbd322759a5987\",\"content_sha256\":\"9dd9c6f33c2f5fbeaa88e8fc410781214bc9133482bf143d816af40f95ffa2eb\",\"file_bytes\":1609,\"body_bytes\":457},{\"atom_id\":\"make-the-skill-run-unattended\",\"file_sha256\":\"83c70ca2d48d384a769e05c9b2d920da3583669c52e0764dfd25cca71bc09b87\",\"content_sha256\":\"c988f7eadb02e9e2ac9c018575cbcb9881da5d2451a358d118816ee9c41d4511\",\"file_bytes\":1856,\"body_bytes\":744},{\"atom_id\":\"reach-a-mid-workflow-point-without-a-multi-turn-simulator\",\"file_sha256\":\"40c0bc1e5155bd7b202671c06bd186a6339ab206a3954cd082b293f380f1a6ec\",\"content_sha256\":\"d0ac7b6c2ca142d1edba2a04709078cf7b944e2bf9f03db14b0d5253195af1aa\",\"file_bytes\":1727,\"body_bytes\":589},{\"atom_id\":\"write-an-expectation-a-wrong-output-cannot-pass\",\"file_sha256\":\"24098a83094bd762a54ed2df386b0d49807386d8039d3d339d2db1808ec41fa5\",\"content_sha256\":\"48c381f4b6c159a55dd9aa7e27b802cd9aa58e9be4c46e4814ddbbb299fac5c7\",\"file_bytes\":2757,\"body_bytes\":1583}]"
carrier_sha256: 58a2f8aad6f52fbdbfe3bc791b35c696a1ef4db0195c074ee76d9470a646fefd
carrier_bytes: 10564
revision: 1
status: active
---
<!-- vpmodule:atom:begin critique-the-rubric-alongside-the-grade -->
---
instruction_id: critique-the-rubric-alongside-the-grade
title: Critique the rubric alongside the grade
summary: "Grade the expectations and critique them at the same time: name the assertions a wrong output would also pass and the outcomes no assertion covers."
capability_tags:
  - design-experiments
pattern_tags:
  - test-design
conditions_applies_when: A set of expectations is graded against what an output produced.
conditions_does_not_apply_when: The expectations were fixed by someone else and are not being authored here.
artifact_contract_output_type: rubric-critique
artifact_contract_required_data:
  - the weak assertions named
  - the outcomes no assertion covers
artifact_contract_verified_by: the critique names at least the assertions that would also pass for a wrong output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/grader.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/eval-format.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Critique the rubric alongside the grade
The grader has a second job that matters as much as the first: it critiques the rubric.
A passing grade on a weak assertion is worse than useless, because it reads as proof while measuring nothing, so the grader flags assertions that a wrong output would also pass and names important outcomes that no assertion covers.
After grading, surface assertions that look weak, meaning ones that passed but would also pass for a clearly wrong output, and name important outcomes you observed, good or bad, that no assertion checks.
Keep the bar at what a rubric author would call a good catch rather than a nit.
<!-- vpmodule:atom:end critique-the-rubric-alongside-the-grade -->
<!-- vpmodule:atom:begin cut-the-section-that-does-no-work -->
---
instruction_id: cut-the-section-that-does-no-work
title: Cut the section that does no work
summary: "Strip the suspected ceremony out of the instruction and compare; if the output is the same, the section is decoration and gets cut."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A section of an instruction is suspected of being ceremony rather than work.
conditions_does_not_apply_when: The section is the only place the behaviour is stated.
artifact_contract_output_type: section-ablation
artifact_contract_required_data:
  - the stripped variant
  - the dimension the section was supposed to protect
  - the verdict
artifact_contract_verified_by: the verdict says whether the stripped variant ties or is durably worse on the protected dimension
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/eval-format.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Cut the section that does no work
Run the full skill against a stripped smallest-version of the same skill
or against a snapshot of the prior version for an edit, on the same input.
It settles whether a section suspected of being ceremony does real work.
If the two outputs tie on the dimension the section was supposed to protect, the section is decoration and gets cut.
If the small version is materially and durably worse, the section earned its keep.
<!-- vpmodule:atom:end cut-the-section-that-does-no-work -->
<!-- vpmodule:atom:begin make-the-skill-run-unattended -->
---
instruction_id: make-the-skill-run-unattended
title: Make the skill run unattended
summary: "The single-shot run needs the skill to produce its deliverable without stopping to ask, which means triggering its unattended path from the input."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A skill is run in one shot and it would normally stop to ask a question.
conditions_does_not_apply_when: A human is in the loop and answers the questions.
artifact_contract_output_type: unattended-path
artifact_contract_required_data:
  - the trigger put in the input
  - the context that answers the questions
artifact_contract_verified_by: the run reaches the deliverable without a question being asked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/eval-format.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Make the skill run unattended
Single-shot modes need the skill to produce its deliverable without stopping to ask.
Most multi-turn skills expose a headless flag or keyword that suppresses clarifying questions and ends with a structured status block.
Trigger it from the input: the literal `Run headless.` at the start, a skill-specific keyword from the skill's own headless section, or enough context that no clarification is genuinely needed.
The `state_prefix` also helps here, because a turn that already supplies the answer the skill would ask for keeps the run moving.
If a skill has no headless path and the input cannot satisfy its questions, either add a headless mode to the skill or accept that this case needs a human in the loop.
<!-- vpmodule:atom:end make-the-skill-run-unattended -->
<!-- vpmodule:atom:begin reach-a-mid-workflow-point-without-a-multi-turn-simulator -->
---
instruction_id: reach-a-mid-workflow-point-without-a-multi-turn-simulator
title: Reach a mid-workflow point without a multi-turn simulator
summary: "A mid-workflow moment is reached by prefixing the input with the state the skill is in, so one case can play any turn of the flow."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A skill has to be judged at a moment that sits in the middle of its own flow.
conditions_does_not_apply_when: The conversation arc itself is the thing being judged.
artifact_contract_output_type: mid-workflow-case
artifact_contract_required_data:
  - the state the skill is in
  - the moment the case reaches
artifact_contract_verified_by: the case reaches the mid-workflow moment in a single message
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/eval-format.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Reach a mid-workflow point without a multi-turn simulator
Most multi-turn skills can be evaluated single-shot if the case is designed right.
The `state_prefix` is the trick that makes mid-workflow points reachable without a multi-turn simulator.
It is a bracketed prime prepended to the input that tells the skill where in its own flow this turn lands and what the user already said:
One input then exercises any mid-workflow moment: a clarifying turn, a correction, a resume after an interruption.
Only a case where the conversation arc itself is the deliverable needs real multi-turn.
<!-- vpmodule:atom:end reach-a-mid-workflow-point-without-a-multi-turn-simulator -->
<!-- vpmodule:atom:begin write-an-expectation-a-wrong-output-cannot-pass -->
---
instruction_id: write-an-expectation-a-wrong-output-cannot-pass
title: Write an expectation a wrong output cannot pass
summary: "An expectation is discriminating when a wrong output cannot pass it; a weak expectation is worse than none, because a green check on it reads as proof when it is noise."
capability_tags:
  - design-experiments
pattern_tags:
  - testable-criteria
conditions_applies_when: An expectation is written for a check that grades what an output produced.
conditions_does_not_apply_when: "The check has no expectation to grade, only a count or a threshold."
artifact_contract_output_type: expectation-set
artifact_contract_required_data:
  - the expectations written
  - the weak ones removed before they ship
artifact_contract_verified_by: a clearly wrong output would fail every expectation in the set
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-eval/references/eval-format.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Write an expectation a wrong output cannot pass
The grader's job is easier and the result is more honest when an expectation is discriminating, meaning a wrong output cannot pass it.
A weak expectation is worse than no expectation, because a green check on it reads as proof when it is noise.
The grader flags weak expectations when it sees them; write them out of the rubric before they ship.
Filename-only checks. "brief.md exists" passes for an empty file. Pair existence with a content check.
Wholly subjective phrasing. "the brief is high quality" cannot be graded. State the property concretely.
Tautologies. Anything that follows automatically from the prompt being understood proves nothing.
Specific facts that must appear, such as "incorporates at least two findings from section X."
Structural claims a wrong output would fail, such as "word count between 250 and 1500."
Negative assertions, such as "does not introduce content from unrelated sections."
Frontmatter checks, such as "frontmatter contains title, status, created (ISO 8601), updated."
Bounded output blocks, such as "the final message contains a JSON object with intent='create'."
Side-artifact existence paired with content
Phase ordering, such as "the polish call occurs after the brief Write and before the final JSON block."
Read-only enforcement, such as "the input brief.md is byte-identical to the fixture and no Write or Edit targeted it."
Bidirectional fidelity, such as "every decision in the run log is reflected in the brief, and no claim in the brief is absent from the input or the run log."
<!-- vpmodule:atom:end write-an-expectation-a-wrong-output-cannot-pass -->