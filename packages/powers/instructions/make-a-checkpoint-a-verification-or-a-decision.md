---
instruction_id: make-a-checkpoint-a-verification-or-a-decision
title: Make a checkpoint a verification or a decision
summary: "Everything that can be automated is automated first; a checkpoint carries only a verification or a decision, and the run waits for the human instead of assuming the answer."
capability_tags:
  - guide-a-human-review
pattern_tags:
  - human-in-the-loop
conditions_applies_when: The work reaches a point where the human has to look at something.
conditions_does_not_apply_when: The remaining work can be completed without the human.
artifact_contract_output_type: checkpoint-request
artifact_contract_required_data:
  - what was built
  - the verification or the decision needed
  - the answer that resumes the work
artifact_contract_verified_by: "the checkpoint asks for a verification or a decision only, and the run waited for the answer"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-plan.md
status: active
revision: 1
---

# Make a checkpoint a verification or a decision
automate everything possible first. Checkpoints are for verification/decisions only.
After response: verify if specified. Pass → continue. Fail → inform, wait. WAIT for user — do NOT hallucinate completion.
