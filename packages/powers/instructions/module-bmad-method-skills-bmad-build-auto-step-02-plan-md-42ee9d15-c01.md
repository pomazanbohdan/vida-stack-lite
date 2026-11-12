---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-build-auto-step-02-plan-md-42ee9d15-c01"
title: "bmad-method: skills/bmad-build-auto/step-02-plan.md module"
summary: "Carrier for 4 atomic instructions from bmad-method:skills/bmad-build-auto/step-02-plan.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-build-auto/step-02-plan.md\"}"
atom_ids:
  - plan-from-distilled-summaries
  - re-check-a-research-claim-against-the-current-code
  - run-the-steps-without-human-interaction
  - score-the-risk-by-the-impact-if-the-change-is-wrong
atom_count: 4
atoms: "[{\"atom_id\":\"plan-from-distilled-summaries\",\"file_sha256\":\"d88893ad1d29c2775feb2551f214ccd352aaec805ddb0c6365d399c9ad7b84ba\",\"content_sha256\":\"00969abcb2e22a26316154b46018130a72ef73f62e0740b6644231e9e7ee863b\",\"file_bytes\":1475,\"body_bytes\":343},{\"atom_id\":\"re-check-a-research-claim-against-the-current-code\",\"file_sha256\":\"ea34a73721344446f4ac000574155de04c70162c5bee11ece954499f7b22c6b1\",\"content_sha256\":\"7b03be6ef0fc02af1b3a098bf7f77ed0ac4ccd54ecd20027bfff9e2687379c89\",\"file_bytes\":1964,\"body_bytes\":530},{\"atom_id\":\"run-the-steps-without-human-interaction\",\"file_sha256\":\"964e81297a145036a04b5f01076261ab4e0c7c4b27899e589e2459340709b96b\",\"content_sha256\":\"8eef781bfaf970b30eac8b695b91044c5a226de4175d1a79f53d3d438d357a94\",\"file_bytes\":1596,\"body_bytes\":267},{\"atom_id\":\"score-the-risk-by-the-impact-if-the-change-is-wrong\",\"file_sha256\":\"5f481282b713e2445a47ff7db704eadb6a2029bacd80558046b5e861ba093f10\",\"content_sha256\":\"dc431661ed92aa8fe39e6e772db7f3e9dcd504e8755cb88d77c6caf81df4157e\",\"file_bytes\":1294,\"body_bytes\":188}]"
carrier_sha256: 65aee4f9da7fdad6d7200c4d19f55a8b01fe9d116f21c7458ff6bd8459573198
carrier_bytes: 6898
revision: 1
status: active
---
<!-- vpmodule:atom:begin plan-from-distilled-summaries -->
---
instruction_id: plan-from-distilled-summaries
title: Plan from distilled summaries
summary: "Narrow work is read directly; deep exploration goes to a subagent that returns only a distilled summary, and the plan is written from that summary."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: The planning needs an exploration that is larger than the plan itself.
conditions_does_not_apply_when: The task is narrow and localized and can be read directly.
artifact_contract_output_type: planning-context
artifact_contract_required_data:
  - the findings that mattered
  - "the files, symbols and reuse points carried forward"
artifact_contract_verified_by: the plan holds the findings instead of the raw exploration
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-02-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Plan from distilled summaries
Read the code yourself for narrow, localized tasks.
Isolate deep exploration in synchronous subagents: instruct them to give you distilled summaries only, and plan from those summaries.
This is where the investigation lands: the plan preserves it so it is never re-narrated to the implementer at dispatch time.
<!-- vpmodule:atom:end plan-from-distilled-summaries -->
<!-- vpmodule:atom:begin re-check-a-research-claim-against-the-current-code -->
---
instruction_id: re-check-a-research-claim-against-the-current-code
title: Re-check a research claim against the current code
summary: A research document is evidence as of its commit; a claim the plan rests on is re-checked against the current code when the file it cites changed since that commit.
capability_tags:
  - verify-work-results
  - research-primary-sources
pattern_tags:
  - evidence-analysis
conditions_applies_when: A plan takes a claim from a research document written at an earlier commit.
conditions_does_not_apply_when: The claim was read from the current code during this investigation.
artifact_contract_output_type: claim-recheck
artifact_contract_required_data:
  - the commit the research document was written at
  - the claim the plan rests on
  - the change to the cited file since that commit
  - the re-checked claim
artifact_contract_verified_by: the claim was re-checked against the current code or investigated afresh
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-02-plan.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-02-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Re-check a research claim against the current code

Treat a codebase research document as evidence for this investigation, read at its `commit`.

Before the plan uses a claim from it, re-check it against the current code when the plan rests on it or its cited file changed since that commit (`git diff --stat <commit> -- <path>`).

Investigate afresh any claim that no longer holds.
Before the plan uses a claim from it, re-check it against the current code when the plan rests on it or its cited file changed since that commit
<!-- vpmodule:atom:end re-check-a-research-claim-against-the-current-code -->
<!-- vpmodule:atom:begin run-the-steps-without-human-interaction -->
---
instruction_id: run-the-steps-without-human-interaction
title: Run the steps without human interaction
summary: "An unattended run asks nothing and waits for no approval: every step decides and records on its own."
capability_tags:
  - execute-plan
pattern_tags:
  - unattended-execution
conditions_applies_when: The run has no live person to answer a question or approve a step.
conditions_does_not_apply_when: A person is present and answers within the run.
artifact_contract_output_type: unattended-run-record
artifact_contract_required_data:
  - the questions that were not asked
  - the decisions the run took on its own
artifact_contract_verified_by: no question was asked and no approval was waited for
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-02-plan.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-03-implement.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Run the steps without human interaction
No human interaction: do not ask questions or wait for approval in this step.
Stop if the intent left out something the user would notice in the result.
If intent gaps exist, do not fantasize and do not leave open questions.
<!-- vpmodule:atom:end run-the-steps-without-human-interaction -->
<!-- vpmodule:atom:begin score-the-risk-by-the-impact-if-the-change-is-wrong -->
---
instruction_id: score-the-risk-by-the-impact-if-the-change-is-wrong
title: Score the risk by the impact if the change is wrong
summary: The risk of a change is the business impact if it is wrong; an inherited risk may be raised by the investigation but never lowered.
capability_tags:
  - plan-implementation
pattern_tags:
  - risk-first-ordering
conditions_applies_when: The change is about to be planned and its risk has to be recorded.
conditions_does_not_apply_when: The risk was already scored and cannot change.
artifact_contract_output_type: risk-score
artifact_contract_required_data:
  - the risk level
  - the business impact if the change is wrong
artifact_contract_verified_by: the recorded risk names the level and the impact that produced it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/step-02-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Score the risk by the impact if the change is wrong
Score the change's risk:
low, medium, or high, the business impact if this change is wrong
Raise it when the investigation shows more
<!-- vpmodule:atom:end score-the-risk-by-the-impact-if-the-change-is-wrong -->