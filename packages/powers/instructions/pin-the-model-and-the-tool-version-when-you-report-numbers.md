---
instruction_id: pin-the-model-and-the-tool-version-when-you-report-numbers
title: Pin the model and the tool version when you report numbers
summary: "Skill invocation is stochastic, so the report is read instead of the exit code, and the model and the tool version are recorded with every number."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: "A measurement of the agent's behaviour is about to be reported."
conditions_does_not_apply_when: The result is a deterministic check with no model in the loop.
artifact_contract_output_type: run-record
artifact_contract_required_data:
  - the pinned model
  - the tool version
  - the turn budget
  - the counts read from the report
artifact_contract_verified_by: the reported numbers name the model and the tool version they came from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=evals/README.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/cross-ai-peer-review.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Pin the model and the tool version when you report numbers
Two practical rules from the same day: pin the model and record the tool version whenever you report numbers, because the tool updates itself and the default model changed twice between morning and evening;
and give a case a turn budget of 10 or more,
since the model may reach a skill through its slash command
which costs two turns.
Skill invocation is stochastic: the review skill fired in 5 of 7 runs on the phrasing the case uses, and
a test-first skill
fired in 2 of 7 runs on the test-first prompt, so read `Δ` and the report rather than the exit code, or pass the threshold the CI example in the docs does.
In one run the review skill did not fire and the reply still used its severity taxonomy as headings, which no baseline run did in nine; the loaded skill descriptions may shape the reply even without an invocation.
Phrasing matters, and the description is the lever.
The fix records the model *and its provenance*.
Provenance is what makes the value trustworthy
A recorded `unknown` is a real answer — a wrong model name attributed to a review would be worse than none.
